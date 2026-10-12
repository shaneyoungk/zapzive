// Payout-run lifecycle. Each exported operation runs in one database
// transaction that starts with an atomic claim (see claimRun), validates the
// state transition, and writes audit events.

import prisma from '../lib/prisma';
import { ApiError } from '../lib/security';
import { countryCode, COUNTRIES, parseDetails, PAYOUT_METHODS } from './catalog';
import { formatMinor, isSupportedCurrency, normalizeAmountText, parseMinor, tryParseMinor } from './money';
import { providerFor } from './providers/sandbox';
import { EDITABLE_RUN_STATES, assertMovementTransition, assertRunTransition } from './states';
import { type Actor, type Tx, claimRun, getFunding, getPolicy, movementReference, nextRunReference, parseAcknowledged, parseIssues, recordEvent, revalidateRun, settleRunStatus } from './core';

const APPROVER_ROLES = ['owner', 'admin', 'approver'];
const MAX_PAYOUTS_PER_RUN = 2000;
/** Sending is blocked if refreshed quotes cost more than this share above what was approved. */
const MAX_QUOTE_DRIFT_BPS = 200; // 2%

async function lockEditable(tx: Tx, actor: Actor, runId: string) {
    await claimRun(tx, actor.companyId, runId, EDITABLE_RUN_STATES);
    return tx.payoutRun.findUniqueOrThrow({ where: { id: runId } });
}

async function assertCapacity(tx: Tx, runId: string, adding: number) {
    const existing = await tx.movement.count({ where: { runId, state: { not: 'cancelled' } } });
    if (existing + adding > MAX_PAYOUTS_PER_RUN) {
        throw new ApiError(422, 'RUN_TOO_LARGE', `A payout run can hold at most ${MAX_PAYOUTS_PER_RUN.toLocaleString()} payouts. This one has ${existing}; split the rest into another run.`);
    }
}

/** Processing dates must be today or later, and within a year. */
export function validateScheduledFor(value: Date | null | undefined): void {
    if (!value) return;
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    // Allow one day of slack for time zones ahead of UTC.
    if (value.getTime() < startOfToday.getTime() - 86_400_000) throw new ApiError(422, 'DATE_IN_PAST', 'The processing date is in the past. Choose today or a later date.');
    if (value.getTime() > Date.now() + 366 * 86_400_000) throw new ApiError(422, 'DATE_TOO_FAR', 'The processing date must be within the next 12 months.');
}

export interface CreateRunInput {
    name: string;
    purpose?: string;
    scheduledFor?: Date | null;
    fundingCurrency?: string;
}

export async function createRun(actor: Actor, input: CreateRunInput) {
    validateScheduledFor(input.scheduledFor);
    return prisma.$transaction(async (tx) => {
        await getFunding(tx, actor.companyId, input.fundingCurrency ?? 'USD');
        const run = await tx.payoutRun.create({
            data: {
                companyId: actor.companyId,
                reference: await nextRunReference(tx, actor.companyId),
                name: input.name,
                purpose: input.purpose,
                scheduledFor: input.scheduledFor ?? null,
                fundingCurrency: input.fundingCurrency ?? 'USD',
                createdById: actor.id,
                createdByName: actor.name,
            },
        });
        await recordEvent(tx, actor, actor.companyId, 'payout_run.created', 'payout_run', run.id, { reference: run.reference, name: run.name });
        return run;
    });
}

export async function updateRun(actor: Actor, runId: string, input: Partial<CreateRunInput>) {
    if (input.scheduledFor !== undefined) validateScheduledFor(input.scheduledFor);
    return prisma.$transaction(async (tx) => {
        const run = await lockEditable(tx, actor, runId);
        const updated = await tx.payoutRun.update({ where: { id: run.id }, data: { name: input.name ?? run.name, purpose: input.purpose ?? run.purpose, scheduledFor: input.scheduledFor === undefined ? run.scheduledFor : input.scheduledFor } });
        await recordEvent(tx, actor, actor.companyId, 'payout_run.updated', 'payout_run', run.id, { reference: run.reference });
        return updated;
    });
}

export interface LineItemInput {
    recipientId: string;
    amount: string;
    currency?: string;
    externalReference?: string;
}

export async function addItems(actor: Actor, runId: string, items: LineItemInput[]) {
    if (!items.length || items.length > 500) throw new ApiError(422, 'INVALID_ITEMS', 'Add between 1 and 500 payouts at a time.');
    return prisma.$transaction(async (tx) => {
        const run = await lockEditable(tx, actor, runId);
        await assertCapacity(tx, run.id, items.length);
        const recipients = await tx.worker.findMany({ where: { companyId: actor.companyId, id: { in: items.map((item) => item.recipientId) } } });
        for (const item of items) {
            const recipient = recipients.find((entry) => entry.id === item.recipientId);
            if (!recipient) throw new ApiError(404, 'RECIPIENT_NOT_FOUND', 'One of the selected recipients no longer exists.');
            if (recipient.status === 'archived') throw new ApiError(422, 'RECIPIENT_ARCHIVED', `${recipient.name} is archived. Restore the recipient before paying them.`);
            const currency = item.currency ?? recipient.payoutCurrency ?? COUNTRIES[countryCode(recipient.country) ?? 'US']?.currency ?? 'USD';
            if (!isSupportedCurrency(currency)) throw new ApiError(422, 'UNSUPPORTED_CURRENCY', `${currency} is not supported.`);
            await tx.movement.create({
                data: {
                    companyId: actor.companyId, runId: run.id, reference: movementReference(), recipientId: recipient.id, recipientName: recipient.name,
                    externalReference: item.externalReference?.slice(0, 80) || null, amountMinor: parseMinor(item.amount, currency, `Amount for ${recipient.name}`), currency,
                    payoutMethod: recipient.payoutMethod ?? 'unassigned', country: countryCode(recipient.country), requestedById: actor.id,
                },
            });
        }
        await revalidateRun(tx, run);
        await recordEvent(tx, actor, actor.companyId, 'payout_run.items_added', 'payout_run', run.id, { reference: run.reference, count: items.length });
    });
}

export interface ImportRow {
    name?: string;
    email?: string;
    amount?: string;
    currency?: string;
    reference?: string;
}

/**
 * Adds imported rows. Rows are matched to recipients by email, then by exact
 * name when that name is unique. Unmatched or ambiguous rows are kept as lines
 * that need correction, so nothing the operator imported is silently dropped.
 */
export async function importItems(actor: Actor, runId: string, rows: ImportRow[]) {
    const usable = rows.filter((row) => [row.name, row.email, row.amount, row.reference].some((value) => value && value.trim()));
    if (!usable.length || usable.length > 1000) throw new ApiError(422, 'INVALID_IMPORT', usable.length ? 'Import at most 1,000 rows at a time.' : 'The file has no payout rows.');
    return prisma.$transaction(async (tx) => {
        const run = await lockEditable(tx, actor, runId);
        await assertCapacity(tx, run.id, usable.length);
        const recipients = await tx.worker.findMany({ where: { companyId: actor.companyId } });
        const byName = new Map<string, typeof recipients>();
        for (const recipient of recipients) byName.set(recipient.name.toLowerCase(), [...(byName.get(recipient.name.toLowerCase()) ?? []), recipient]);
        let matched = 0;
        let unknown = 0;
        let ambiguous = 0;
        let invalidAmounts = 0;
        for (const row of usable) {
            const email = row.email?.trim().toLowerCase();
            const name = row.name?.trim().replace(/\s+/g, ' ');
            const byEmail = email ? recipients.find((item) => item.email.toLowerCase() === email) : undefined;
            const nameMatches = name ? byName.get(name.toLowerCase()) ?? [] : [];
            const recipient = byEmail ?? (nameMatches.length === 1 ? nameMatches[0] : null);
            if (recipient) matched++; else if (nameMatches.length > 1) ambiguous++; else unknown++;
            const fallbackCurrency = recipient?.payoutCurrency ?? COUNTRIES[countryCode(recipient?.country) ?? '']?.currency ?? 'USD';
            const currency = (row.currency?.trim().toUpperCase() || fallbackCurrency);
            const amountText = normalizeAmountText(row.amount ?? '');
            const amountMinor = isSupportedCurrency(currency) && amountText ? tryParseMinor(amountText, currency) : null;
            if (amountMinor === null) invalidAmounts++;
            await tx.movement.create({
                data: {
                    companyId: actor.companyId, runId: run.id, reference: movementReference(), recipientId: recipient?.id ?? null,
                    recipientName: recipient?.name ?? name ?? email ?? 'Unknown recipient', externalReference: row.reference?.trim().slice(0, 80) || null,
                    amountMinor: amountMinor ?? 0, currency: isSupportedCurrency(currency) ? currency : 'USD',
                    payoutMethod: recipient?.payoutMethod ?? 'unassigned', country: countryCode(recipient?.country), requestedById: actor.id,
                },
            });
        }
        await revalidateRun(tx, run);
        await recordEvent(tx, actor, actor.companyId, 'payout_run.imported', 'payout_run', run.id, { reference: run.reference, rows: usable.length, matched, unknown, ambiguous, invalidAmounts });
        return { rows: usable.length, matched, unknown, ambiguous, invalidAmounts, skippedBlank: rows.length - usable.length };
    }, { timeout: 30_000 });
}

export async function updateItem(actor: Actor, runId: string, movementId: string, input: { amount?: string; currency?: string; externalReference?: string | null; recipientId?: string }) {
    return prisma.$transaction(async (tx) => {
        const run = await lockEditable(tx, actor, runId);
        const movement = await tx.movement.findFirst({ where: { id: movementId, runId: run.id, state: { not: 'cancelled' } } });
        if (!movement) throw new ApiError(404, 'MOVEMENT_NOT_FOUND', 'Payout not found in this run.');
        let recipientId = movement.recipientId;
        let recipientName = movement.recipientName;
        let defaultCurrency = movement.currency;
        if (input.recipientId) {
            const recipient = await tx.worker.findFirst({ where: { id: input.recipientId, companyId: actor.companyId } });
            if (!recipient) throw new ApiError(404, 'RECIPIENT_NOT_FOUND', 'Recipient not found.');
            recipientId = recipient.id;
            recipientName = recipient.name;
            // A newly matched recipient is paid in their own currency unless the operator says otherwise.
            if (!movement.recipientId && recipient.payoutCurrency) defaultCurrency = recipient.payoutCurrency;
        }
        const currency = input.currency ?? defaultCurrency;
        if (!isSupportedCurrency(currency)) throw new ApiError(422, 'UNSUPPORTED_CURRENCY', `${currency} is not supported.`);
        await tx.movement.update({
            where: { id: movement.id },
            data: {
                recipientId, recipientName, currency,
                amountMinor: input.amount !== undefined ? parseMinor(input.amount, currency) : movement.amountMinor,
                externalReference: input.externalReference === undefined ? movement.externalReference : (input.externalReference?.slice(0, 80) || null),
            },
        });
        await revalidateRun(tx, run);
        await recordEvent(tx, actor, actor.companyId, 'payout.updated', 'movement', movement.id, { reference: movement.reference, run: run.reference });
    });
}

export async function removeItem(actor: Actor, runId: string, movementId: string) {
    return prisma.$transaction(async (tx) => {
        const run = await lockEditable(tx, actor, runId);
        const movement = await tx.movement.findFirst({ where: { id: movementId, runId: run.id, state: { not: 'cancelled' } } });
        if (!movement) throw new ApiError(404, 'MOVEMENT_NOT_FOUND', 'Payout not found in this run.');
        await tx.movement.update({ where: { id: movement.id }, data: { state: 'cancelled', resolvedAt: new Date() } });
        await revalidateRun(tx, run);
        await recordEvent(tx, actor, actor.companyId, 'payout.removed', 'movement', movement.id, { reference: movement.reference, run: run.reference, recipient: movement.recipientName });
    });
}

export async function acknowledgeIssues(actor: Actor, runId: string, movementId: string, codes: string[]) {
    return prisma.$transaction(async (tx) => {
        const run = await lockEditable(tx, actor, runId);
        const movement = await tx.movement.findFirst({ where: { id: movementId, runId: run.id } });
        if (!movement) throw new ApiError(404, 'MOVEMENT_NOT_FOUND', 'Payout not found in this run.');
        const warnings = parseIssues(movement.validationIssues).filter((issue) => issue.severity === 'warning').map((issue) => issue.code);
        const accepted = codes.filter((code) => warnings.includes(code));
        if (!accepted.length) throw new ApiError(409, 'NOTHING_TO_ACKNOWLEDGE', 'These warnings no longer apply. Refresh to see the current validation.');
        const next = Array.from(new Set([...parseAcknowledged(movement.acknowledgedIssues), ...accepted]));
        await tx.movement.update({ where: { id: movement.id }, data: { acknowledgedIssues: JSON.stringify(next) } });
        await recordEvent(tx, actor, actor.companyId, 'payout.warnings_acknowledged', 'movement', movement.id, { reference: movement.reference, run: run.reference, codes: accepted });
    });
}

export async function submitRun(actor: Actor, runId: string) {
    return prisma.$transaction(async (tx) => {
        const run = await lockEditable(tx, actor, runId);
        await revalidateRun(tx, run);
        const fresh = await tx.payoutRun.findUniqueOrThrow({ where: { id: run.id } });
        const movements = await tx.movement.findMany({ where: { runId: run.id, state: { not: 'cancelled' } } });
        if (!movements.length) throw new ApiError(409, 'RUN_EMPTY', 'Add at least one payout before submitting.');
        if (fresh.status !== 'ready') throw new ApiError(409, 'RUN_NEEDS_CORRECTION', 'Resolve the payouts that need correction before submitting.');
        validateScheduledFor(fresh.scheduledFor);
        const unreviewed = movements.filter((item) => {
            const acked = new Set(parseAcknowledged(item.acknowledgedIssues));
            return parseIssues(item.validationIssues).some((issue) => issue.severity === 'warning' && !acked.has(issue.code));
        });
        if (unreviewed.length) throw new ApiError(409, 'WARNINGS_UNREVIEWED', `Review the warnings on ${unreviewed.length} payout${unreviewed.length === 1 ? '' : 's'} before submitting.`);

        const needsApproval = fresh.requiredApprovals > 0;
        const runState = needsApproval ? 'awaiting_approval' : 'approved';
        assertRunTransition(fresh.status, runState);
        for (const movement of movements) assertMovementTransition(movement.state, runState);
        await tx.movement.updateMany({ where: { runId: run.id, state: 'ready' }, data: { state: runState } });
        const now = new Date();
        await tx.payoutRun.update({ where: { id: run.id }, data: { status: runState, submittedById: actor.id, submittedAt: now, approvedAt: needsApproval ? null : now } });
        await recordEvent(tx, actor, actor.companyId, 'payout_run.submitted', 'payout_run', run.id, {
            reference: run.reference, name: run.name, payouts: movements.length, requiredApprovals: fresh.requiredApprovals, policy: fresh.policySummary,
        });
        if (!needsApproval) await recordEvent(tx, actor, actor.companyId, 'payout_run.approved', 'payout_run', run.id, { reference: run.reference, reason: 'No approval required by policy' });
    });
}

export async function approveRun(actor: Actor, runId: string, comment?: string) {
    if (!APPROVER_ROLES.includes(actor.role)) throw new ApiError(403, 'INSUFFICIENT_PERMISSION', 'Only owners, admins and approvers can approve payout runs.');
    return prisma.$transaction(async (tx) => {
        // Claim first so concurrent approvals are serialised; counts below are then current.
        await claimRun(tx, actor.companyId, runId, ['awaiting_approval']);
        const run = await tx.payoutRun.findUniqueOrThrow({ where: { id: runId } });
        const policy = await getPolicy(tx, actor.companyId);
        const selfApproval = run.submittedById === actor.id;
        if (selfApproval && !policy.allowSelfApproval) throw new ApiError(403, 'SELF_APPROVAL_BLOCKED', 'Your approval policy requires someone other than the submitter to approve.');
        const since = run.submittedAt ?? run.createdAt;
        const previous = await tx.approval.findMany({ where: { runId: run.id, decision: 'approved', createdAt: { gte: since } } });
        if (previous.some((item) => item.actorId === actor.id)) throw new ApiError(409, 'ALREADY_APPROVED', 'You have already approved this run. Another approver is required.');
        await tx.approval.create({ data: { companyId: actor.companyId, runId: run.id, actorId: actor.id, actorName: actor.name, decision: 'approved', comment: comment?.slice(0, 500), selfApproval, beforeStatus: run.status, afterStatus: 'pending', requestId: actor.requestId } });
        // Recount after recording, inside the claimed transaction.
        const distinct = new Set((await tx.approval.findMany({ where: { runId: run.id, decision: 'approved', createdAt: { gte: since } }, select: { actorId: true } })).map((item) => item.actorId));
        const complete = distinct.size >= run.requiredApprovals;
        const afterStatus = complete ? 'approved' : 'awaiting_approval';
        assertRunTransition(run.status, afterStatus);
        await tx.approval.updateMany({ where: { runId: run.id, actorId: actor.id, afterStatus: 'pending' }, data: { afterStatus } });
        if (complete) {
            await tx.movement.updateMany({ where: { runId: run.id, state: 'awaiting_approval' }, data: { state: 'approved' } });
            await tx.payoutRun.update({ where: { id: run.id }, data: { status: 'approved', approvedAt: new Date() } });
        }
        await recordEvent(tx, actor, actor.companyId, complete ? 'payout_run.approved' : 'payout_run.approval_recorded', 'payout_run', run.id, {
            reference: run.reference, name: run.name, approvals: `${distinct.size} of ${run.requiredApprovals}`, selfApproval, comment: comment?.slice(0, 500),
        });
    });
}

export async function rejectRun(actor: Actor, runId: string, comment: string) {
    if (!APPROVER_ROLES.includes(actor.role)) throw new ApiError(403, 'INSUFFICIENT_PERMISSION', 'Only owners, admins and approvers can reject payout runs.');
    if (!comment.trim()) throw new ApiError(422, 'COMMENT_REQUIRED', 'Explain why the run is rejected so the operator can fix it.');
    return prisma.$transaction(async (tx) => {
        await claimRun(tx, actor.companyId, runId, ['awaiting_approval'], { status: 'rejected', approvedAt: null });
        const run = await tx.payoutRun.findUniqueOrThrow({ where: { id: runId } });
        await tx.approval.create({ data: { companyId: actor.companyId, runId: run.id, actorId: actor.id, actorName: actor.name, decision: 'rejected', comment: comment.slice(0, 500), selfApproval: run.submittedById === actor.id, beforeStatus: 'awaiting_approval', afterStatus: 'rejected', requestId: actor.requestId } });
        await tx.movement.updateMany({ where: { runId: run.id, state: { in: ['awaiting_approval', 'approved'] } }, data: { state: 'ready' } });
        await recordEvent(tx, actor, actor.companyId, 'payout_run.rejected', 'payout_run', run.id, { reference: run.reference, name: run.name, comment: comment.slice(0, 500) });
    });
}

/** Sends approved payouts to the provider after reserving funding. */
export async function executeRun(actor: Actor, runId: string) {
    return prisma.$transaction(async (tx) => {
        // The claim is the first write: a second concurrent "send" finds the run already processing.
        await claimRun(tx, actor.companyId, runId, ['approved'], { status: 'processing', executedAt: new Date() });
        const run = await tx.payoutRun.findUniqueOrThrow({ where: { id: runId } });
        const movements = await tx.movement.findMany({ where: { runId: run.id, state: 'approved' }, include: { recipient: true } });
        if (!movements.length) throw new ApiError(409, 'NOTHING_TO_SEND', 'There are no approved payouts to send. Payouts on hold need approval first.');

        // Quotes expire; refresh stale ones and make sure the cost has not moved materially since approval.
        const now = new Date();
        const quotes = new Map<string, ReturnType<ReturnType<typeof providerFor>['quote']>>();
        let total = 0;
        let approvedBasis = 0;
        let refreshedBasis = 0;
        for (const movement of movements) {
            const stale = !movement.quoteExpiresAt || movement.quoteExpiresAt <= now || movement.sourceAmountMinor === null;
            if (stale) {
                const quote = providerFor(movement.payoutMethod).quote({ sourceCurrency: run.fundingCurrency, destinationCurrency: movement.currency, destinationAmountMinor: movement.amountMinor, payoutMethod: movement.payoutMethod, country: movement.country });
                quotes.set(movement.id, quote);
                if (movement.sourceAmountMinor !== null) { approvedBasis += movement.sourceAmountMinor; refreshedBasis += quote.totalMinor; }
                total += quote.totalMinor;
            } else {
                total += movement.sourceAmountMinor!;
            }
        }
        if (approvedBasis > 0 && (refreshedBasis - approvedBasis) * 10_000 > approvedBasis * MAX_QUOTE_DRIFT_BPS) {
            const drift = ((refreshedBasis - approvedBasis) / approvedBasis * 100).toFixed(1);
            throw new ApiError(409, 'QUOTE_MOVED', `Rates and fees moved ${drift}% since this run was approved (${formatMinor(approvedBasis, run.fundingCurrency)} → ${formatMinor(refreshedBasis, run.fundingCurrency)}). Cancel the run and resubmit it so approvers see the new cost.`);
        }

        const funding = await getFunding(tx, actor.companyId, run.fundingCurrency);
        if (funding.availableMinor < total) {
            const shortfall = total - funding.availableMinor;
            throw new ApiError(409, 'INSUFFICIENT_FUNDING', `Add ${formatMinor(shortfall, run.fundingCurrency)} of funding before sending this run.`, { requiredMinor: total, availableMinor: funding.availableMinor, shortfallMinor: shortfall, currency: run.fundingCurrency });
        }
        const reserved = await tx.fundingAccount.updateMany({ where: { id: funding.id, availableMinor: { gte: total } }, data: { availableMinor: { decrement: total }, reservedMinor: { increment: total } } });
        if (reserved.count !== 1) throw new ApiError(409, 'FUNDING_CHANGED', 'Funding changed while sending. Review the balance and try again.');

        for (const movement of movements) {
            assertMovementTransition('approved', 'queued');
            assertMovementTransition('queued', 'processing');
            const quote = quotes.get(movement.id);
            const details = parseDetails(movement.recipient?.payoutDetails ?? null);
            const submitted = providerFor(movement.payoutMethod).submit({ movementId: movement.id, reference: movement.reference, payoutMethod: movement.payoutMethod, destinationAmountMinor: movement.amountMinor, currency: movement.currency, details: details as Record<string, unknown> | null });
            const claimed = await tx.movement.updateMany({
                where: { id: movement.id, state: 'approved' },
                data: {
                    state: 'processing', submittedAt: now, providerReference: submitted.providerReference, providerReadyAt: submitted.expectedSettlementAt,
                    providerPayload: JSON.stringify(details ?? {}),
                    ...(quote ? { fxRate: quote.fxRate, feeMinor: quote.feeMinor, sourceAmountMinor: quote.totalMinor, quotedAt: quote.quotedAt, quoteExpiresAt: quote.expiresAt, provider: quote.provider, rail: quote.rail } : {}),
                },
            });
            if (claimed.count !== 1) throw new ApiError(409, 'PAYOUT_CHANGED', `${movement.recipientName}'s payout changed while sending. Refresh and try again.`);
        }
        await recordEvent(tx, actor, actor.companyId, 'payout_run.sent', 'payout_run', run.id, {
            reference: run.reference, name: run.name, payouts: movements.length, reserved: formatMinor(total, run.fundingCurrency), quotesRefreshed: quotes.size,
        });
    });
}

export async function cancelRun(actor: Actor, runId: string, reason?: string) {
    return prisma.$transaction(async (tx) => {
        try {
            await claimRun(tx, actor.companyId, runId, ['draft', 'needs_correction', 'ready', 'rejected', 'awaiting_approval', 'approved'], { status: 'cancelled', cancelledAt: new Date() });
        } catch (error) {
            if (error instanceof ApiError && error.code === 'RUN_CHANGED') throw new ApiError(409, 'RUN_NOT_CANCELLABLE', 'Payouts in this run have already been sent. Cancel individual failed or held payouts instead.');
            throw error;
        }
        const run = await tx.payoutRun.findUniqueOrThrow({ where: { id: runId } });
        await tx.movement.updateMany({ where: { runId: run.id, state: { in: ['draft', 'needs_correction', 'ready', 'awaiting_approval', 'approved', 'on_hold'] } }, data: { state: 'cancelled', resolvedAt: new Date() } });
        await recordEvent(tx, actor, actor.companyId, 'payout_run.cancelled', 'payout_run', run.id, { reference: run.reference, name: run.name, reason: reason?.slice(0, 300) });
    });
}

export async function reconcileRun(actor: Actor, runId: string, note?: string) {
    return prisma.$transaction(async (tx) => {
        const claimed = await tx.payoutRun.updateMany({ where: { id: runId, companyId: actor.companyId, status: { in: ['completed', 'completed_with_failures'] }, reconciledAt: null }, data: { reconciledAt: new Date(), reconciledById: actor.id } });
        if (claimed.count !== 1) {
            const current = await tx.payoutRun.findFirst({ where: { id: runId, companyId: actor.companyId } });
            if (!current) throw new ApiError(404, 'RUN_NOT_FOUND', 'Payout run not found.');
            if (current.reconciledAt) throw new ApiError(409, 'ALREADY_RECONCILED', 'This run is already reconciled.');
            throw new ApiError(409, 'RUN_NOT_FINISHED', 'A run can be reconciled once every payout has a final outcome.');
        }
        const run = await tx.payoutRun.findUniqueOrThrow({ where: { id: runId } });
        const movements = await tx.movement.findMany({ where: { runId: run.id } });
        if (movements.some((item) => ['queued', 'processing'].includes(item.state))) throw new ApiError(409, 'RUN_IN_FLIGHT', 'Some payouts are still processing.');
        const delivered = movements.filter((item) => item.state === 'delivered');
        const outstanding = movements.filter((item) => ['failed', 'on_hold'].includes(item.state));
        await recordEvent(tx, actor, actor.companyId, 'payout_run.reconciled', 'payout_run', run.id, {
            reference: run.reference, name: run.name, delivered: delivered.length, outstanding: outstanding.length, note: note?.slice(0, 500),
        });
    });
}

export { settleRunStatus, PAYOUT_METHODS };
