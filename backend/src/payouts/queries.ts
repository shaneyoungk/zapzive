// Read models for the payout-operations product. No writes happen here.

import type { Movement, PayoutRun, Worker } from '@prisma/client';
import prisma from '../lib/prisma';
import { ApiError } from '../lib/security';
import { SANDBOX_RATES_PER_USD } from './catalog';
import { convertMinor, formatMinor } from './money';
import { getFunding, getPolicy, movementDto, parseAcknowledged, parseIssues, recipientSummary } from './core';
import { summarizeIssues } from './validation';

type RunWithMovements = PayoutRun & { movements: Movement[] };

function sumByCurrency(items: Array<{ currency: string; amountMinor: number }>): Array<{ currency: string; amountMinor: number }> {
    const map = new Map<string, number>();
    for (const item of items) map.set(item.currency, (map.get(item.currency) ?? 0) + item.amountMinor);
    return [...map.entries()].map(([currency, amountMinor]) => ({ currency, amountMinor })).sort((a, b) => b.amountMinor - a.amountMinor);
}

export function reconciliationFor(run: RunWithMovements) {
    const lines = run.movements.filter((item) => item.state !== 'cancelled');
    const count = (states: string[]) => lines.filter((item) => states.includes(item.state)).length;
    const delivered = lines.filter((item) => item.state === 'delivered');
    const outstanding = lines.filter((item) => ['failed', 'on_hold', 'queued', 'processing'].includes(item.state));
    return {
        requested: lines.length,
        delivered: delivered.length,
        processing: count(['queued', 'processing']),
        failed: count(['failed']),
        onHold: count(['on_hold']),
        cancelled: run.movements.length - lines.length,
        expected: sumByCurrency(lines.map((item) => ({ currency: item.currency, amountMinor: item.amountMinor }))),
        deliveredTotals: sumByCurrency(delivered.map((item) => ({ currency: item.currency, amountMinor: item.deliveredAmountMinor ?? item.amountMinor }))),
        outstandingTotals: sumByCurrency(outstanding.map((item) => ({ currency: item.currency, amountMinor: item.amountMinor }))),
        fundingCurrency: run.fundingCurrency,
        fundingCostMinor: delivered.reduce((sum, item) => sum + (item.sourceAmountMinor ?? 0), 0),
        feesMinor: delivered.reduce((sum, item) => sum + (item.feeMinor ?? 0), 0),
        reconciledAt: run.reconciledAt,
        canReconcile: ['completed', 'completed_with_failures'].includes(run.status) && !run.reconciledAt,
    };
}

function runSummary(run: RunWithMovements) {
    const lines = run.movements.filter((item) => item.state !== 'cancelled');
    const validation = summarizeIssues(lines.map((item) => parseIssues(item.validationIssues)), lines.map((item) => new Set(parseAcknowledged(item.acknowledgedIssues))));
    return {
        id: run.id,
        reference: run.reference,
        name: run.name,
        purpose: run.purpose,
        status: run.status,
        scheduledFor: run.scheduledFor,
        fundingCurrency: run.fundingCurrency,
        requiredApprovals: run.requiredApprovals,
        policySummary: run.policySummary,
        createdByName: run.createdByName,
        createdById: run.createdById,
        submittedById: run.submittedById,
        submittedAt: run.submittedAt,
        approvedAt: run.approvedAt,
        executedAt: run.executedAt,
        completedAt: run.completedAt,
        reconciledAt: run.reconciledAt,
        cancelledAt: run.cancelledAt,
        createdAt: run.createdAt,
        updatedAt: run.updatedAt,
        isSample: run.isSample,
        payoutCount: lines.length,
        recipientCount: new Set(lines.map((item) => item.recipientId ?? item.recipientName)).size,
        totals: sumByCurrency(lines.map((item) => ({ currency: item.currency, amountMinor: item.amountMinor }))),
        fundingRequiredMinor: lines.reduce((sum, item) => sum + (item.sourceAmountMinor ?? 0), 0),
        feesMinor: lines.reduce((sum, item) => sum + (item.feeMinor ?? 0), 0),
        methods: [...new Set(lines.map((item) => item.payoutMethod))],
        validation,
        reconciliation: reconciliationFor(run),
    };
}

export async function listRuns(companyId: string, filters: { status?: string } = {}) {
    const runs = await prisma.payoutRun.findMany({
        where: { companyId, ...(filters.status ? { status: filters.status } : {}) },
        include: { movements: true },
        orderBy: { createdAt: 'desc' },
        take: 200,
    });
    return runs.map(runSummary);
}

async function eventsFor(companyId: string, entityIds: string[], limit = 60) {
    const events = await prisma.auditEvent.findMany({ where: { companyId, entityId: { in: entityIds } }, orderBy: { createdAt: 'desc' }, take: limit });
    return events.map(eventDto);
}

export function eventDto(event: { id: string; action: string; entityType: string; entityId: string | null; actorId: string | null; requestId: string | null; metadata: string | null; createdAt: Date }) {
    let metadata: Record<string, unknown> = {};
    try { metadata = event.metadata ? JSON.parse(event.metadata) : {}; } catch { /* ignore malformed */ }
    return { id: event.id, action: event.action, entityType: event.entityType, entityId: event.entityId, actorId: event.actorId, actorName: (metadata.actorName as string) ?? null, requestId: event.requestId, metadata, createdAt: event.createdAt };
}

export async function getRun(companyId: string, runId: string, viewerId?: string) {
    const run = await prisma.payoutRun.findFirst({ where: { id: runId, companyId }, include: { movements: { orderBy: { createdAt: 'asc' } }, approvals: { orderBy: { createdAt: 'asc' } } } });
    if (!run) throw new ApiError(404, 'RUN_NOT_FOUND', 'Payout run not found.');
    const policy = await getPolicy(prisma, companyId);
    const funding = await getFunding(prisma, companyId, run.fundingCurrency);
    const approvalsSinceSubmit = run.approvals.filter((item) => item.decision === 'approved' && run.submittedAt && item.createdAt >= run.submittedAt);
    const viewerApproved = Boolean(viewerId && approvalsSinceSubmit.some((item) => item.actorId === viewerId));
    const viewerIsSubmitter = Boolean(viewerId && run.submittedById === viewerId);
    // How many distinct people could approve this run. If fewer than the policy needs, it can never be approved.
    const approverIds = (await prisma.user.findMany({ where: { companyId, role: { in: ['owner', 'admin', 'approver'] }, status: 'active' }, select: { id: true } })).map((user) => user.id);
    const submitter = run.submittedById ?? viewerId ?? null;
    const approverCapacity = policy.allowSelfApproval ? approverIds.length : approverIds.filter((id) => id !== submitter).length;
    return {
        ...runSummary(run),
        movements: run.movements.map(movementDto),
        approvals: run.approvals,
        approvalsReceived: approvalsSinceSubmit.length,
        viewer: { hasApproved: viewerApproved, isSubmitter: viewerIsSubmitter, selfApprovalAllowed: policy.allowSelfApproval },
        approverCapacity,
        funding: { currency: funding.currency, availableMinor: funding.availableMinor, reservedMinor: funding.reservedMinor, isSandbox: funding.isSandbox },
        events: await eventsFor(companyId, [run.id, ...run.movements.map((item) => item.id)]),
    };
}

export async function listMovements(companyId: string, filters: { state?: string[]; runId?: string; recipientId?: string; q?: string; limit?: number } = {}) {
    const movements = await prisma.movement.findMany({
        where: {
            companyId,
            ...(filters.state?.length ? { state: { in: filters.state } } : { state: { notIn: ['draft', 'cancelled'] } }),
            ...(filters.runId ? { runId: filters.runId } : {}),
            ...(filters.recipientId ? { recipientId: filters.recipientId } : {}),
            ...(filters.q ? { OR: [{ recipientName: { contains: filters.q } }, { reference: { contains: filters.q.toUpperCase() } }, { providerReference: { contains: filters.q.toUpperCase() } }, { externalReference: { contains: filters.q } }] } : {}),
        },
        include: { run: { select: { reference: true, name: true, status: true } } },
        orderBy: { updatedAt: 'desc' },
        take: Math.min(filters.limit ?? 100, 500),
    });
    return movements.map((item) => ({ ...movementDto(item), run: item.run }));
}

export async function getMovement(companyId: string, movementId: string) {
    const movement = await prisma.movement.findFirst({ where: { id: movementId, companyId }, include: { run: true, recipient: true } });
    if (!movement) throw new ApiError(404, 'MOVEMENT_NOT_FOUND', 'Payout not found.');
    return {
        ...movementDto(movement),
        run: movement.run ? { id: movement.run.id, reference: movement.run.reference, name: movement.run.name, status: movement.run.status, requiredApprovals: movement.run.requiredApprovals, reconciledAt: movement.run.reconciledAt } : null,
        recipient: movement.recipient ? recipientSummary(movement.recipient) : null,
        approvals: movement.runId ? await prisma.approval.findMany({ where: { runId: movement.runId }, orderBy: { createdAt: 'asc' } }) : [],
        events: await eventsFor(companyId, [movement.id, ...(movement.runId ? [movement.runId] : [])], 40),
    };
}

// ---------------------------------------------------------------- approvals & exceptions

export async function approvalsQueue(companyId: string, viewerId: string) {
    const policy = await getPolicy(prisma, companyId);
    const runs = await prisma.payoutRun.findMany({ where: { companyId, status: 'awaiting_approval' }, include: { movements: true, approvals: true }, orderBy: { submittedAt: 'asc' } });
    const held = await prisma.movement.findMany({ where: { companyId, state: 'on_hold' }, include: { run: { select: { id: true, reference: true, name: true } }, recipient: true }, orderBy: { updatedAt: 'asc' } });
    return {
        policy,
        runs: runs.map((run) => {
            const received = run.approvals.filter((item) => item.decision === 'approved' && run.submittedAt && item.createdAt >= run.submittedAt);
            return {
                ...runSummary(run),
                approvalsReceived: received.length,
                approvers: received.map((item) => ({ name: item.actorName, at: item.createdAt, selfApproval: item.selfApproval })),
                viewerCanApprove: !received.some((item) => item.actorId === viewerId) && (policy.allowSelfApproval || run.submittedById !== viewerId),
                viewerBlockedReason: received.some((item) => item.actorId === viewerId) ? 'You already approved this run.' : (!policy.allowSelfApproval && run.submittedById === viewerId) ? 'Your policy requires a different approver than the submitter.' : null,
            };
        }),
        heldPayouts: held.map((item) => ({ ...movementDto(item), run: item.run, newDestination: item.recipient ? recipientSummary(item.recipient).destination : null })),
    };
}

const EXCEPTION_GUIDANCE: Record<string, { title: string; action: string; reapproval: boolean }> = {
    recipient_unavailable: { title: 'Recipient unavailable', action: 'Confirm the number with the recipient, update payout details if needed, then retry.', reapproval: false },
    invalid_account: { title: 'Invalid account', action: 'Update the recipient’s bank details. Changed details need approval before the retry.', reapproval: true },
    provider_failure: { title: 'Provider failure', action: 'Retry the payout, or change the payout method.', reapproval: false },
    details_changed: { title: 'Payout details changed', action: 'An approver must confirm the new payout details before this payout can be sent.', reapproval: true },
};

export async function exceptions(companyId: string) {
    const movements = await prisma.movement.findMany({ where: { companyId, state: { in: ['failed', 'on_hold'] } }, include: { run: { select: { id: true, reference: true, name: true, fundingCurrency: true } }, recipient: true }, orderBy: { updatedAt: 'desc' } });
    const correctionRuns = await prisma.payoutRun.findMany({ where: { companyId, status: 'needs_correction' }, include: { movements: true }, orderBy: { updatedAt: 'desc' } });
    return {
        payouts: movements.map((item) => {
            const guidance = EXCEPTION_GUIDANCE[item.exceptionType ?? ''] ?? { title: item.state === 'on_hold' ? 'On hold' : 'Failed', action: 'Review the payout and decide whether to retry or cancel.', reapproval: false };
            const changedAfterFailure = Boolean(item.state === 'failed' && item.recipient?.detailsUpdatedAt && item.failedAt && item.recipient.detailsUpdatedAt > item.failedAt);
            return {
                ...movementDto(item),
                run: item.run,
                title: changedAfterFailure ? 'Updated details waiting for approval' : guidance.title,
                whatHappened: item.state === 'on_hold' ? item.holdReason : item.failureReason,
                moneyMoved: item.state === 'failed' ? `No money reached the recipient. The reserved ${item.sourceAmountMinor ? formatMinor(item.sourceAmountMinor, item.sourceCurrency) : 'amount'} was returned to your available funding.` : 'Nothing has been sent. The payout is waiting for approval.',
                nextStep: changedAfterFailure ? 'Approve the new payout details to resend this payout.' : guidance.action,
                requiresReapproval: item.state === 'on_hold' || changedAfterFailure,
                whoCanAct: item.state === 'on_hold' || changedAfterFailure ? 'Owners, admins and approvers' : 'Owners, admins and operators',
                actions: item.state === 'on_hold' || changedAfterFailure ? ['approve_details', 'cancel'] : ['retry', 'edit_recipient', 'cancel'],
            };
        }),
        runsNeedingCorrection: correctionRuns.map((run) => ({ ...runSummary(run) })),
    };
}

// ---------------------------------------------------------------- reconciliation

export async function reconciliationList(companyId: string) {
    const runs = await prisma.payoutRun.findMany({ where: { companyId, status: { in: ['processing', 'completed', 'completed_with_failures'] } }, include: { movements: true }, orderBy: { executedAt: 'desc' } });
    return runs.map(runSummary);
}

// ---------------------------------------------------------------- funding

export async function fundingSummary(companyId: string, currency = 'USD') {
    const funding = await getFunding(prisma, companyId, currency);
    const upcoming = await prisma.payoutRun.findMany({ where: { companyId, fundingCurrency: currency, status: { in: ['ready', 'awaiting_approval', 'approved'] } }, include: { movements: true }, orderBy: { scheduledFor: 'asc' } });
    const required = upcoming.reduce((sum, run) => sum + run.movements.filter((item) => ['ready', 'awaiting_approval', 'approved'].includes(item.state)).reduce((acc, item) => acc + (item.sourceAmountMinor ?? 0), 0), 0);
    return {
        currency: funding.currency,
        availableMinor: funding.availableMinor,
        reservedMinor: funding.reservedMinor,
        requiredForUpcomingMinor: required,
        shortfallMinor: Math.max(0, required - funding.availableMinor),
        upcomingRuns: upcoming.map((run) => ({ id: run.id, reference: run.reference, name: run.name, scheduledFor: run.scheduledFor })),
        isSandbox: funding.isSandbox,
    };
}

// ---------------------------------------------------------------- home

export async function home(companyId: string, viewerId: string) {
    const [runs, failed, held, recipientsCount, policy, funding, events, users] = await Promise.all([
        prisma.payoutRun.findMany({ where: { companyId, status: { not: 'cancelled' } }, include: { movements: true }, orderBy: { createdAt: 'desc' }, take: 50 }),
        prisma.movement.findMany({ where: { companyId, state: 'failed' }, select: { amountMinor: true, currency: true, failedAt: true } }),
        prisma.movement.findMany({ where: { companyId, state: 'on_hold' }, select: { amountMinor: true, currency: true, updatedAt: true } }),
        prisma.worker.count({ where: { companyId, status: 'active' } }),
        getPolicy(prisma, companyId),
        fundingSummary(companyId),
        prisma.auditEvent.findMany({ where: { companyId, entityType: { in: ['payout_run', 'movement', 'recipient', 'approval_policy', 'funding'] } }, orderBy: { createdAt: 'desc' }, take: 8 }),
        prisma.user.count({ where: { companyId } }),
    ]);
    const summaries = runs.map(runSummary);
    const awaiting = summaries.filter((run) => run.status === 'awaiting_approval');
    const correction = summaries.filter((run) => run.status === 'needs_correction');
    const unreconciled = summaries.filter((run) => ['completed', 'completed_with_failures'].includes(run.status) && !run.reconciledAt);
    const oldest = (dates: Array<Date | null>) => dates.filter((d): d is Date => Boolean(d)).sort((a, b) => a.getTime() - b.getTime())[0] ?? null;

    const attention = [
        awaiting.length && { kind: 'approval', title: `${awaiting.length} payout run${awaiting.length === 1 ? '' : 's'} awaiting approval`, detail: awaiting.map((run) => `${run.reference} · ${run.payoutCount} payouts`).join(', '), since: oldest(awaiting.map((run) => run.submittedAt)), href: '/dashboard/approvals', action: 'Review' },
        failed.length && { kind: 'failed', title: `${failed.length} failed payout${failed.length === 1 ? '' : 's'}`, detail: sumByCurrency(failed).map((item) => formatMinor(item.amountMinor, item.currency)).join(' + ') + ' not delivered', since: oldest(failed.map((item) => item.failedAt)), href: '/dashboard/exceptions', action: 'Resolve' },
        held.length && { kind: 'details_changed', title: `${held.length} payout${held.length === 1 ? '' : 's'} on hold after a payout-detail change`, detail: 'Re-approval required before sending', since: oldest(held.map((item) => item.updatedAt)), href: '/dashboard/approvals', action: 'Approve details' },
        correction.length && { kind: 'correction', title: `${correction.length} payout run${correction.length === 1 ? '' : 's'} need${correction.length === 1 ? 's' : ''} correction`, detail: correction.map((run) => `${run.reference}: ${run.validation.needsCorrection} to fix`).join(', '), since: oldest(correction.map((run) => run.updatedAt)), href: `/dashboard/payouts/runs/${correction[0]?.id}`, action: 'Fix' },
        funding.shortfallMinor > 0 && { kind: 'funding', title: `Add ${formatMinor(funding.shortfallMinor, funding.currency)} of funding`, detail: 'Upcoming approved and pending runs need more than your available balance', since: null, href: '/dashboard/funding', action: 'Add funds' },
        unreconciled.length && { kind: 'reconcile', title: `${unreconciled.length} finished run${unreconciled.length === 1 ? '' : 's'} not reconciled`, detail: unreconciled.map((run) => run.reference).join(', '), since: oldest(unreconciled.map((run) => run.completedAt)), href: '/dashboard/reconciliation', action: 'Reconcile' },
    ].filter(Boolean);

    const upcoming = summaries.filter((run) => ['draft', 'needs_correction', 'ready', 'rejected', 'awaiting_approval', 'approved'].includes(run.status)).sort((a, b) => (a.scheduledFor?.getTime() ?? Infinity) - (b.scheduledFor?.getTime() ?? Infinity));
    const inMotion = summaries.filter((run) => ['processing', 'completed_with_failures'].includes(run.status) || (run.status === 'completed' && run.completedAt && Date.now() - run.completedAt.getTime() < 14 * 86400000)).slice(0, 3);

    const hasRun = summaries.length > 0;
    return {
        attention,
        nextRun: upcoming[0] ?? null,
        moneyInMotion: inMotion,
        funding,
        recentActivity: events.map(eventDto),
        onboarding: {
            isNew: !hasRun,
            steps: [
                { key: 'recipients', label: 'Add recipients', done: recipientsCount > 0, href: '/dashboard/recipients' },
                { key: 'run', label: 'Create a payout run', done: hasRun, href: '/dashboard/payouts/new' },
                { key: 'policy', label: 'Configure an approval rule', done: policy.configured, href: '/dashboard/settings?tab=approvals' },
                { key: 'submit', label: 'Submit in sandbox', done: summaries.some((run) => run.submittedAt), href: '/dashboard/payouts' },
                { key: 'reconcile', label: 'Review the reconciliation record', done: summaries.some((run) => run.reconciledAt), href: '/dashboard/reconciliation' },
            ],
        },
        team: { members: users },
        viewerId,
    };
}

// ---------------------------------------------------------------- reports

export interface ReportFilters { from?: Date; to?: Date; country?: string; currency?: string; method?: string; status?: string }

export async function reports(companyId: string, filters: ReportFilters) {
    const movements = await prisma.movement.findMany({
        where: {
            companyId,
            submittedAt: { not: null, ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) },
            ...(filters.country ? { country: filters.country } : {}),
            ...(filters.currency ? { currency: filters.currency } : {}),
            ...(filters.method ? { payoutMethod: filters.method } : {}),
            ...(filters.status ? { state: filters.status } : {}),
        },
        include: { run: { select: { reference: true, submittedAt: true, approvedAt: true, requiredApprovals: true, reconciledAt: true } } },
        orderBy: { submittedAt: 'asc' },
    });
    const runs = await prisma.payoutRun.findMany({ where: { companyId, submittedAt: { not: null, ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } } });
    const delivered = movements.filter((item) => item.state === 'delivered');
    const failed = movements.filter((item) => item.state === 'failed');
    const everFailed = movements.filter((item) => item.failedAt || item.attempt > 1 || item.state === 'failed');
    const everFailedOrHeld = movements.filter((item) => item.failedAt || item.attempt > 1 || item.holdReason || item.state === 'on_hold');
    const resolved = movements.filter((item) => item.failedAt && item.resolvedAt && item.resolvedAt >= item.failedAt);
    const approvalDurations = runs.filter((run) => run.requiredApprovals > 0 && run.submittedAt && run.approvedAt).map((run) => run.approvedAt!.getTime() - run.submittedAt!.getTime());
    const usd = (item: Movement) => convertMinor(item.amountMinor, item.currency, 'USD', SANDBOX_RATES_PER_USD);
    const group = (key: (item: Movement) => string) => {
        const map = new Map<string, { key: string; count: number; deliveredCount: number; failedCount: number; usdMinor: number }>();
        for (const item of movements) {
            const entry = map.get(key(item)) ?? { key: key(item), count: 0, deliveredCount: 0, failedCount: 0, usdMinor: 0 };
            entry.count++;
            if (item.state === 'delivered') { entry.deliveredCount++; entry.usdMinor += usd(item); }
            if (item.state === 'failed') entry.failedCount++;
            map.set(entry.key, entry);
        }
        return [...map.values()].sort((a, b) => b.usdMinor - a.usdMinor);
    };
    const weekly = new Map<string, number>();
    for (const item of delivered) {
        const date = item.deliveredAt ?? item.submittedAt!;
        const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - ((date.getUTCDay() + 6) % 7)));
        const key = monday.toISOString().slice(0, 10);
        weekly.set(key, (weekly.get(key) ?? 0) + usd(item));
    }
    const unreconciled = delivered.filter((item) => !item.run?.reconciledAt);
    const average = (values: number[]) => (values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null);
    return {
        filters,
        hasData: movements.length > 0,
        metrics: {
            runsSubmitted: runs.length,
            runsCompleted: runs.filter((run) => ['completed', 'completed_with_failures'].includes(run.status)).length,
            payoutsSubmitted: movements.length,
            deliveredCount: delivered.length,
            deliveredTotals: sumByCurrency(delivered.map((item) => ({ currency: item.currency, amountMinor: item.deliveredAmountMinor ?? item.amountMinor }))),
            deliveredUsdMinor: delivered.reduce((sum, item) => sum + usd(item), 0),
            // Share of submitted payouts that failed at least once, including ones later retried or cancelled.
            failureRate: movements.length ? everFailed.length / movements.length : null,
            openFailures: failed.length,
            exceptionRate: movements.length ? everFailedOrHeld.length / movements.length : null,
            averageApprovalMs: average(approvalDurations),
            averageResolutionMs: average(resolved.map((item) => item.resolvedAt!.getTime() - item.failedAt!.getTime())),
            unreconciledTotals: sumByCurrency(unreconciled.map((item) => ({ currency: item.currency, amountMinor: item.amountMinor }))),
            providerFeesUsdMinor: delivered.reduce((sum, item) => sum + (item.sourceCurrency === 'USD' ? item.feeMinor ?? 0 : 0), 0),
        },
        byMethod: group((item) => item.payoutMethod),
        byCorridor: group((item) => `${item.country ?? '—'}:${item.currency}`),
        deliveredByWeek: [...weekly.entries()].sort().map(([week, usdMinor]) => ({ week, usdMinor })),
        rows: movements.map((item) => ({ ...movementDto(item), runReference: item.run?.reference ?? null })),
    };
}

// ---------------------------------------------------------------- activity

export async function activity(companyId: string, options: { entityType?: string; cursor?: string; limit?: number }) {
    const limit = Math.min(options.limit ?? 50, 100);
    const events = await prisma.auditEvent.findMany({
        where: { companyId, ...(options.entityType ? { entityType: options.entityType } : {}) },
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    });
    return { items: events.slice(0, limit).map(eventDto), nextCursor: events.length > limit ? events[limit - 1].id : null };
}

// ---------------------------------------------------------------- recipients

export async function listRecipients(companyId: string, filters: { q?: string; status?: string } = {}) {
    const recipients = await prisma.worker.findMany({
        where: { companyId, ...(filters.status ? { status: filters.status } : {}), ...(filters.q ? { OR: [{ name: { contains: filters.q } }, { email: { contains: filters.q } }] } : {}) },
        orderBy: { name: 'asc' },
        take: 1000,
    });
    const ids = recipients.map((item) => item.id);
    const movements = await prisma.movement.findMany({ where: { companyId, recipientId: { in: ids }, state: { notIn: ['draft', 'cancelled'] } }, select: { recipientId: true, state: true, amountMinor: true, currency: true, deliveredAt: true } });
    return recipients.map((recipient) => {
        const mine = movements.filter((item) => item.recipientId === recipient.id);
        const last = mine.filter((item) => item.deliveredAt).sort((a, b) => b.deliveredAt!.getTime() - a.deliveredAt!.getTime())[0];
        const pending = mine.filter((item) => ['ready', 'awaiting_approval', 'approved', 'queued', 'processing'].includes(item.state)).length;
        const failedCount = mine.filter((item) => item.state === 'failed').length;
        const held = mine.filter((item) => item.state === 'on_hold').length;
        const summary = recipientSummary(recipient);
        const nextAction = !recipient.payoutMethod ? 'Add payout details' : summary.verification === 'failed' ? 'Fix payout details' : held ? 'Approve changed details' : failedCount ? 'Resolve failed payout' : summary.verification !== 'verified' ? 'Run sandbox check' : null;
        return { ...summary, lastPayout: last ? { amountMinor: last.amountMinor, currency: last.currency, deliveredAt: last.deliveredAt } : null, pendingCount: pending, failedCount, heldCount: held, nextAction };
    });
}

export async function getRecipient(companyId: string, recipientId: string) {
    const recipient = await prisma.worker.findFirst({ where: { id: recipientId, companyId } });
    if (!recipient) throw new ApiError(404, 'RECIPIENT_NOT_FOUND', 'Recipient not found.');
    const movements = await prisma.movement.findMany({ where: { companyId, recipientId, state: { notIn: ['draft', 'cancelled'] } }, include: { run: { select: { id: true, reference: true, name: true } } }, orderBy: { createdAt: 'desc' }, take: 100 });
    const events = await prisma.auditEvent.findMany({ where: { companyId, entityType: 'recipient', entityId: recipientId }, orderBy: { createdAt: 'desc' }, take: 50 });
    const delivered = movements.filter((item) => item.state === 'delivered');
    return {
        ...recipientSummary(recipient as Worker),
        verifiedAt: recipient.verifiedAt,
        totalsPaid: sumByCurrency(delivered.map((item) => ({ currency: item.currency, amountMinor: item.deliveredAmountMinor ?? item.amountMinor }))),
        pending: movements.filter((item) => ['ready', 'awaiting_approval', 'approved', 'queued', 'processing'].includes(item.state)).map((item) => ({ ...movementDto(item), run: item.run })),
        exceptions: movements.filter((item) => ['failed', 'on_hold'].includes(item.state)).map((item) => ({ ...movementDto(item), run: item.run })),
        history: movements.map((item) => ({ ...movementDto(item), run: item.run })),
        detailChanges: events.filter((event) => event.action === 'recipient.payout_details_changed').map(eventDto),
        events: events.map(eventDto),
    };
}

// ---------------------------------------------------------------- exports

const csvCell = (value: unknown) => {
    const text = value === null || value === undefined ? '' : String(value);
    // Neutralise spreadsheet formula injection.
    const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
};
export const toCsv = (rows: unknown[][]) => rows.map((row) => row.map(csvCell).join(',')).join('\n');

const decimal = (minor: number | null | undefined, currency: string) => (minor === null || minor === undefined ? '' : formatMinor(minor, currency).split(' ')[1].replace(/,/g, ''));

export async function runExport(companyId: string, runId: string, format: 'ledger' | 'journal' | 'receipt') {
    const run = await prisma.payoutRun.findFirst({ where: { id: runId, companyId }, include: { movements: { orderBy: { createdAt: 'asc' } }, approvals: true } });
    if (!run) throw new ApiError(404, 'RUN_NOT_FOUND', 'Payout run not found.');
    const lines = run.movements.filter((item) => item.state !== 'cancelled');
    if (format === 'ledger') {
        return toCsv([
            ['Run', 'Internal reference', 'Provider reference', 'External reference', 'Recipient', 'Method', 'Destination', 'Status', 'Expected amount', 'Currency', 'Delivered amount', 'FX rate', 'Fee', 'Funding cost', 'Funding currency', 'Submitted at', 'Delivered at', 'Failed at', 'Failure reason'],
            ...lines.map((item) => [run.reference, item.reference, item.providerReference, item.externalReference, item.recipientName, item.payoutMethod, item.destination, item.state, decimal(item.amountMinor, item.currency), item.currency, decimal(item.deliveredAmountMinor, item.currency), item.fxRate, decimal(item.feeMinor, item.sourceCurrency), decimal(item.sourceAmountMinor, item.sourceCurrency), item.sourceCurrency, item.submittedAt?.toISOString(), item.deliveredAt?.toISOString(), item.failedAt?.toISOString(), item.failureReason]),
        ]);
    }
    if (format === 'journal') {
        const delivered = lines.filter((item) => item.state === 'delivered');
        const principal = delivered.reduce((sum, item) => sum + ((item.sourceAmountMinor ?? 0) - (item.feeMinor ?? 0)), 0);
        const fees = delivered.reduce((sum, item) => sum + (item.feeMinor ?? 0), 0);
        const date = (run.completedAt ?? new Date()).toISOString().slice(0, 10);
        return toCsv([
            ['Date', 'Journal reference', 'Account', 'Debit', 'Credit', 'Currency', 'Memo'],
            [date, run.reference, 'Contractor and vendor payouts', decimal(principal, run.fundingCurrency), '', run.fundingCurrency, `${run.name}: ${delivered.length} delivered payouts`],
            [date, run.reference, 'Payment provider fees', decimal(fees, run.fundingCurrency), '', run.fundingCurrency, 'Provider fees (sandbox)'],
            [date, run.reference, 'Payout funding account', '', decimal(principal + fees, run.fundingCurrency), run.fundingCurrency, 'Funding used for delivered payouts'],
        ]);
    }
    const summary = reconciliationFor(run);
    return toCsv([
        ['Zapzive payout run receipt (sandbox)'],
        ['Run', `${run.reference} · ${run.name}`],
        ['Status', run.status],
        ['Submitted', run.submittedAt?.toISOString() ?? ''],
        ['Approved', run.approvedAt?.toISOString() ?? ''],
        ['Approvals', run.approvals.filter((item) => item.decision === 'approved').map((item) => `${item.actorName} (${item.createdAt.toISOString()})`).join('; ')],
        ['Requested payouts', summary.requested],
        ['Delivered payouts', summary.delivered],
        ['Failed payouts', summary.failed],
        ...summary.expected.map((item) => [`Expected ${item.currency}`, decimal(item.amountMinor, item.currency)]),
        ...summary.deliveredTotals.map((item) => [`Delivered ${item.currency}`, decimal(item.amountMinor, item.currency)]),
        ['Provider fees', `${decimal(summary.feesMinor, run.fundingCurrency)} ${run.fundingCurrency}`],
        ['Reconciled', run.reconciledAt?.toISOString() ?? 'Not yet'],
    ]);
}
