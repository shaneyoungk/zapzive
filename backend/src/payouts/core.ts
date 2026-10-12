// Shared building blocks for the payout services: events, references, policy,
// funding, recipient mapping, and run revalidation.

import crypto from 'crypto';
import type { Prisma, Worker, Movement, PayoutRun } from '@prisma/client';
import prisma from '../lib/prisma';
import { ApiError } from '../lib/security';
import { COUNTRIES, countryCode, maskDestination, parseDetails, PAYOUT_METHODS, type PayoutDetails } from './catalog';
import { DEFAULT_POLICY, evaluatePolicy, type PolicyRules } from './policy';
import { providerFor } from './providers/sandbox';
import { validateLines, type Issue, type LineInput, type RecipientHistory } from './validation';
import { assertMovementTransition, assertRunTransition, EDITABLE_RUN_STATES } from './states';

export type Tx = Prisma.TransactionClient;

export interface Actor {
    id: string;
    name: string;
    role: string;
    companyId: string;
    requestId?: string;
}

// ---------------------------------------------------------------- events

export async function recordEvent(tx: Tx, actor: Actor | null, companyId: string, action: string, entityType: string, entityId: string | null, metadata: Record<string, unknown> = {}) {
    await tx.auditEvent.create({
        data: {
            companyId,
            action,
            entityType,
            entityId: entityId ?? undefined,
            actorId: actor?.id,
            requestId: actor?.requestId,
            metadata: JSON.stringify({ ...metadata, actorName: actor?.name ?? 'Zapzive sandbox provider' }),
        },
    });
}

// ---------------------------------------------------------------- atomic claims
//
// Every state change starts with a conditional update that only succeeds if the
// record is still in an expected state. It is the first write in its
// transaction, so concurrent requests are serialised and only one can win;
// the loser gets a clear conflict instead of repeating the action.

export async function claimRun(tx: Tx, companyId: string, runId: string, fromStates: readonly string[], data: Prisma.PayoutRunUpdateManyMutationInput = {}) {
    const result = await tx.payoutRun.updateMany({ where: { id: runId, companyId, status: { in: [...fromStates] } }, data: { ...data, updatedAt: new Date() } });
    if (result.count === 1) return;
    const current = await tx.payoutRun.findFirst({ where: { id: runId, companyId }, select: { status: true } });
    if (!current) throw new ApiError(404, 'RUN_NOT_FOUND', 'Payout run not found.');
    throw new ApiError(409, 'RUN_CHANGED', `This payout run is now "${current.status.replace(/_/g, ' ')}". It may have been changed by someone else. Refresh to see its current state.`, { status: current.status });
}

export async function claimMovement(tx: Tx, companyId: string, movementId: string, fromStates: readonly string[], data: Prisma.MovementUpdateManyMutationInput = {}) {
    const result = await tx.movement.updateMany({ where: { id: movementId, companyId, state: { in: [...fromStates] } }, data: { ...data, updatedAt: new Date() } });
    if (result.count === 1) return;
    const current = await tx.movement.findFirst({ where: { id: movementId, companyId }, select: { state: true } });
    if (!current) throw new ApiError(404, 'MOVEMENT_NOT_FOUND', 'Payout not found.');
    throw new ApiError(409, 'PAYOUT_CHANGED', `This payout is now "${current.state.replace(/_/g, ' ')}". It may have been changed by someone else. Refresh to see its current state.`, { state: current.state });
}

/** A reconciled run whose outcomes change again is no longer reconciled. */
export async function reopenReconciliation(tx: Tx, actor: Actor | null, runId: string | null, reason: string) {
    if (!runId) return;
    const run = await tx.payoutRun.findUnique({ where: { id: runId }, select: { id: true, companyId: true, reference: true, name: true, reconciledAt: true } });
    if (!run?.reconciledAt) return;
    await tx.payoutRun.update({ where: { id: run.id }, data: { reconciledAt: null, reconciledById: null } });
    await recordEvent(tx, actor, run.companyId, 'payout_run.reconciliation_reopened', 'payout_run', run.id, { reference: run.reference, name: run.name, reason });
}

// ---------------------------------------------------------------- references

export async function nextRunReference(tx: Tx, companyId: string): Promise<string> {
    const count = await tx.payoutRun.count({ where: { companyId } });
    for (let n = 1001 + count; n < 1001 + count + 50; n++) {
        const reference = `PR-${n}`;
        if (!(await tx.payoutRun.findUnique({ where: { companyId_reference: { companyId, reference } } }))) return reference;
    }
    return `PR-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

export function movementReference(): string {
    return `MV-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

// ---------------------------------------------------------------- policy & funding

export async function getPolicy(tx: Tx | typeof prisma, companyId: string): Promise<PolicyRules & { configured: boolean; updatedAt: Date | null }> {
    const policy = await tx.approvalPolicy.findUnique({ where: { companyId } });
    if (!policy) return { ...DEFAULT_POLICY, configured: false, updatedAt: null };
    return {
        currency: policy.currency,
        singleApprovalAboveMinor: policy.singleApprovalAboveMinor,
        dualApprovalAboveMinor: policy.dualApprovalAboveMinor,
        newRecipientRequiresApproval: policy.newRecipientRequiresApproval,
        changedDetailsRequiresApproval: policy.changedDetailsRequiresApproval,
        allowSelfApproval: policy.allowSelfApproval,
        configured: Boolean(policy.updatedById),
        updatedAt: policy.updatedAt,
    };
}

export async function getFunding(tx: Tx | typeof prisma, companyId: string, currency = 'USD') {
    const existing = await tx.fundingAccount.findUnique({ where: { companyId_currency: { companyId, currency } } });
    if (existing) return existing;
    return tx.fundingAccount.create({ data: { companyId, currency, availableMinor: 0, reservedMinor: 0, isSandbox: true } });
}

// ---------------------------------------------------------------- recipients

/**
 * The payout-details check status. Only Zapzive's own sandbox check counts:
 * a legacy KYC flag on older worker records is not treated as a check.
 */
export function verificationOf(worker: Pick<Worker, 'kycStatus' | 'verifiedAt' | 'payoutMethod'>): 'verified' | 'pending' | 'failed' | 'unverified' {
    if (!worker.payoutMethod) return 'unverified';
    if (worker.kycStatus === 'failed') return 'failed';
    if (worker.verifiedAt) return 'verified';
    return 'unverified';
}

export function recipientSummary(worker: Worker) {
    const details = parseDetails(worker.payoutDetails);
    const country = countryCode(worker.country);
    return {
        id: worker.id,
        name: worker.name,
        email: worker.email,
        phone: worker.phone || null,
        type: worker.recipientType,
        title: worker.role || null,
        country,
        countryName: country ? COUNTRIES[country].name : worker.country || null,
        status: worker.status,
        verification: verificationOf(worker),
        payoutMethod: worker.payoutMethod,
        payoutMethodLabel: worker.payoutMethod ? PAYOUT_METHODS[worker.payoutMethod as keyof typeof PAYOUT_METHODS]?.label ?? worker.payoutMethod : null,
        payoutCurrency: worker.payoutCurrency,
        destination: maskDestination(worker.payoutMethod, details),
        detailsUpdatedAt: worker.detailsUpdatedAt,
        isSample: worker.isSample,
        createdAt: worker.createdAt,
    };
}

// ---------------------------------------------------------------- history used by validation

export async function recipientHistories(tx: Tx, companyId: string, recipientIds: string[], excludeRunId?: string): Promise<Map<string, RecipientHistory & { currencyAmounts: Map<string, number[]> }>> {
    const delivered = await tx.movement.findMany({
        where: { companyId, recipientId: { in: recipientIds }, state: 'delivered', ...(excludeRunId ? { NOT: { runId: excludeRunId } } : {}) },
        select: { recipientId: true, amountMinor: true, currency: true, externalReference: true, deliveredAt: true },
        orderBy: { deliveredAt: 'desc' },
    });
    const map = new Map<string, RecipientHistory & { currencyAmounts: Map<string, number[]> }>();
    for (const row of delivered) {
        if (!row.recipientId) continue;
        const entry = map.get(row.recipientId) ?? { deliveredAmountsMinor: [], paidReferences: new Set<string>(), lastDeliveredAt: null, currencyAmounts: new Map<string, number[]>(), recentDeliveries: [] as NonNullable<RecipientHistory['recentDeliveries']> };
        if (row.deliveredAt && entry.recentDeliveries!.length < 10) entry.recentDeliveries!.push({ amountMinor: row.amountMinor, currency: row.currency, deliveredAt: row.deliveredAt, externalReference: row.externalReference });
        entry.currencyAmounts.set(row.currency, [...(entry.currencyAmounts.get(row.currency) ?? []), row.amountMinor]);
        if (row.externalReference) entry.paidReferences.add(row.externalReference.toLowerCase());
        if (row.deliveredAt && (!entry.lastDeliveredAt || row.deliveredAt > entry.lastDeliveredAt)) entry.lastDeliveredAt = row.deliveredAt;
        map.set(row.recipientId, entry);
    }
    return map;
}

export function parseIssues(value: string | null): Issue[] {
    if (!value) return [];
    try { return JSON.parse(value) as Issue[]; } catch { return []; }
}

export function parseAcknowledged(value: string | null): string[] {
    if (!value) return [];
    try { return JSON.parse(value) as string[]; } catch { return []; }
}

/**
 * Recomputes snapshots, validation, quotes and the approval decision for an
 * editable run, inside the caller's transaction.
 */
export async function revalidateRun(tx: Tx, run: PayoutRun): Promise<void> {
    if (!EDITABLE_RUN_STATES.includes(run.status as typeof EDITABLE_RUN_STATES[number])) return;
    const movements = await tx.movement.findMany({ where: { runId: run.id, state: { not: 'cancelled' } }, include: { recipient: true } });
    const recipientIds = movements.map((item) => item.recipientId).filter((id): id is string => Boolean(id));
    const histories = await recipientHistories(tx, run.companyId, recipientIds, run.id);
    // Names that match more than one recipient cannot be resolved safely.
    const unmatchedNames = movements.filter((item) => !item.recipientId).map((item) => item.recipientName.toLowerCase());
    const ambiguous = new Set<string>();
    if (unmatchedNames.length) {
        const sameName = await tx.worker.findMany({ where: { companyId: run.companyId, status: 'active' }, select: { name: true } });
        const counts = new Map<string, number>();
        for (const item of sameName) counts.set(item.name.toLowerCase(), (counts.get(item.name.toLowerCase()) ?? 0) + 1);
        for (const name of unmatchedNames) if ((counts.get(name) ?? 0) > 1) ambiguous.add(name);
    }
    // The same recipient in another run that has not been sent yet is a double-payment risk.
    const otherOpen = recipientIds.length ? await tx.movement.findMany({
        where: { companyId: run.companyId, recipientId: { in: recipientIds }, runId: { not: run.id }, state: { in: ['ready', 'needs_correction', 'awaiting_approval', 'approved', 'on_hold'] }, run: { status: { notIn: ['cancelled', 'completed', 'completed_with_failures', 'processing'] } } },
        select: { recipientId: true, run: { select: { reference: true } } },
    }) : [];
    const openRunsByRecipient = new Map<string, Set<string>>();
    for (const item of otherOpen) if (item.recipientId && item.run) openRunsByRecipient.set(item.recipientId, new Set([...(openRunsByRecipient.get(item.recipientId) ?? []), item.run.reference]));

    const lines: LineInput[] = movements.map((item) => {
        const recipient = item.recipient;
        return {
            id: item.id,
            recipientId: item.recipientId,
            recipientName: recipient?.name ?? item.recipientName,
            recipientStatus: recipient?.status ?? null,
            verification: recipient ? verificationOf(recipient) : null,
            amountMinor: item.amountMinor,
            currency: item.currency,
            payoutMethod: recipient?.payoutMethod ?? null,
            details: recipient ? parseDetails(recipient.payoutDetails) : null,
            country: recipient ? countryCode(recipient.country) : item.country,
            externalReference: item.externalReference,
            detailsUpdatedAt: recipient?.detailsUpdatedAt ?? null,
            ambiguousName: !item.recipientId && ambiguous.has(item.recipientName.toLowerCase()),
            otherOpenRuns: item.recipientId ? [...(openRunsByRecipient.get(item.recipientId) ?? [])] : [],
        };
    });
    const historyForValidation = new Map<string, RecipientHistory>();
    for (const line of lines) {
        if (!line.recipientId) continue;
        const history = histories.get(line.recipientId);
        if (history) historyForValidation.set(line.recipientId, { ...history, deliveredAmountsMinor: history.currencyAmounts.get(line.currency) ?? [], recentDeliveries: history.recentDeliveries });
    }
    const issuesById = validateLines(lines, historyForValidation);

    const policy = await getPolicy(tx, run.companyId);
    let anyError = false;
    for (const movement of movements) {
        const line = lines.find((item) => item.id === movement.id)!;
        const issues = issuesById.get(movement.id) ?? [];
        const hasError = issues.some((issue) => issue.severity === 'error');
        anyError ||= hasError;
        const nextState = hasError ? 'needs_correction' : 'ready';
        if (movement.state !== nextState) assertMovementTransition(movement.state === 'draft' ? 'draft' : movement.state, nextState);
        let quote = null;
        if (!hasError && line.payoutMethod) {
            quote = providerFor(line.payoutMethod).quote({
                sourceCurrency: run.fundingCurrency, destinationCurrency: movement.currency, destinationAmountMinor: movement.amountMinor, payoutMethod: line.payoutMethod, country: line.country,
            });
        }
        if (quote && quote.principalMinor > 0 && quote.feeMinor * 10 > quote.principalMinor) {
            const share = Math.round((quote.feeMinor / quote.principalMinor) * 100);
            issues.push({ code: 'fee_disproportionate', severity: 'warning', message: `Provider fees are about ${share}% of this payout. Consider combining small payouts or another payout method.` });
        }
        const flags = new Set(issues.map((issue) => issue.code));
        await tx.movement.update({
            where: { id: movement.id },
            data: {
                state: nextState,
                validationIssues: JSON.stringify(issues),
                // Acknowledgements only survive while the warnings they cover still exist.
                acknowledgedIssues: JSON.stringify(parseAcknowledged(movement.acknowledgedIssues).filter((code) => flags.has(code))),
                payoutMethod: line.payoutMethod ?? movement.payoutMethod,
                destination: maskDestination(line.payoutMethod, line.details),
                country: line.country,
                recipientName: line.recipientName,
                requiresApproval: flags.has('new_recipient') || flags.has('details_changed'),
                sourceCurrency: run.fundingCurrency,
                provider: quote?.provider ?? null,
                rail: quote?.rail ?? null,
                fxRate: quote?.fxRate ?? null,
                feeMinor: quote?.feeMinor ?? null,
                sourceAmountMinor: quote?.totalMinor ?? null,
                quotedAt: quote?.quotedAt ?? null,
                quoteExpiresAt: quote?.expiresAt ?? null,
            },
        });
    }

    const decision = evaluatePolicy(policy, lines.filter((line) => line.amountMinor > 0).map((line) => {
        const flags = new Set((issuesById.get(line.id) ?? []).map((issue) => issue.code));
        return { amountMinor: line.amountMinor, currency: line.currency, isNewRecipient: flags.has('new_recipient'), detailsChanged: flags.has('details_changed') };
    }));
    const status = movements.length === 0 ? 'draft' : anyError ? 'needs_correction' : 'ready';
    if (status !== run.status) assertRunTransition(run.status, status);
    await tx.payoutRun.update({ where: { id: run.id }, data: { status, requiredApprovals: decision.requiredApprovals, policySummary: decision.summary } });
}

export async function loadRunForUpdate(tx: Tx, companyId: string, runId: string) {
    const run = await tx.payoutRun.findFirst({ where: { id: runId, companyId } });
    if (!run) throw new ApiError(404, 'RUN_NOT_FOUND', 'Payout run not found.');
    return run;
}

export async function loadMovementForUpdate(tx: Tx, companyId: string, movementId: string) {
    const movement = await tx.movement.findFirst({ where: { id: movementId, companyId }, include: { recipient: true, run: true } });
    if (!movement) throw new ApiError(404, 'MOVEMENT_NOT_FOUND', 'Payout not found.');
    return movement;
}

/** Updates a run's terminal state once nothing is queued or processing. */
export async function settleRunStatus(tx: Tx, runId: string): Promise<void> {
    const run = await tx.payoutRun.findUnique({ where: { id: runId } });
    if (!run || !['processing', 'completed_with_failures'].includes(run.status)) return;
    const states = await tx.movement.findMany({ where: { runId }, select: { state: true } });
    if (states.some((item) => ['queued', 'processing'].includes(item.state))) {
        if (run.status !== 'processing') await tx.payoutRun.update({ where: { id: runId }, data: { status: 'processing', completedAt: null } });
        return;
    }
    const unresolved = states.some((item) => ['failed', 'on_hold'].includes(item.state));
    const next = unresolved ? 'completed_with_failures' : 'completed';
    if (next !== run.status) {
        assertRunTransition(run.status, next);
        await tx.payoutRun.update({ where: { id: runId }, data: { status: next, completedAt: new Date() } });
        await recordEvent(tx, null, run.companyId, next === 'completed' ? 'payout_run.completed' : 'payout_run.completed_with_failures', 'payout_run', runId, { reference: run.reference, name: run.name });
    }
}

export type MovementWithRelations = Movement & { recipient: Worker | null };

export function movementDto(movement: Movement) {
    const issues = parseIssues(movement.validationIssues);
    return {
        id: movement.id,
        reference: movement.reference,
        runId: movement.runId,
        recipientId: movement.recipientId,
        recipientName: movement.recipientName,
        externalReference: movement.externalReference,
        amountMinor: movement.amountMinor,
        currency: movement.currency,
        payoutMethod: movement.payoutMethod,
        payoutMethodLabel: PAYOUT_METHODS[movement.payoutMethod as keyof typeof PAYOUT_METHODS]?.label ?? 'No payout method',
        destination: movement.destination,
        country: movement.country,
        sourceCurrency: movement.sourceCurrency,
        sourceAmountMinor: movement.sourceAmountMinor,
        feeMinor: movement.feeMinor,
        fxRate: movement.fxRate,
        quotedAt: movement.quotedAt,
        quoteExpiresAt: movement.quoteExpiresAt,
        provider: movement.provider,
        rail: movement.rail,
        providerReference: movement.providerReference,
        state: movement.state,
        issues,
        acknowledgedIssues: parseAcknowledged(movement.acknowledgedIssues),
        requiresApproval: movement.requiresApproval,
        exceptionType: movement.exceptionType,
        failureReason: movement.failureReason,
        holdReason: movement.holdReason,
        attempt: movement.attempt,
        deliveredAmountMinor: movement.deliveredAmountMinor,
        submittedAt: movement.submittedAt,
        deliveredAt: movement.deliveredAt,
        failedAt: movement.failedAt,
        resolvedAt: movement.resolvedAt,
        isSample: movement.isSample,
        createdAt: movement.createdAt,
        updatedAt: movement.updatedAt,
    };
}

export function parseDetailsInput(value: unknown): PayoutDetails {
    if (!value || typeof value !== 'object') return {};
    const input = value as Record<string, unknown>;
    const pick = (key: string) => (typeof input[key] === 'string' ? (input[key] as string).slice(0, 120) : undefined);
    return { phone: pick('phone'), bankName: pick('bankName'), accountNumber: pick('accountNumber'), bankCode: pick('bankCode'), walletAddress: pick('walletAddress'), network: pick('network') };
}
