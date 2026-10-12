// Actions on individual payouts (movements): retry, cancel, release holds, and
// the sandbox settlement processor. Every action starts with an atomic claim.

import prisma from '../lib/prisma';
import { ApiError } from '../lib/security';
import { maskDestination, parseDetails } from './catalog';
import { formatMinor } from './money';
import { providerFor } from './providers/sandbox';
import { assertMovementTransition } from './states';
import { type Actor, type Tx, claimMovement, getFunding, loadMovementForUpdate, recordEvent, reopenReconciliation, settleRunStatus } from './core';

const APPROVER_ROLES = ['owner', 'admin', 'approver'];

/** Quote, reserve funding and hand a queued movement to the provider. Caller owns the transaction. */
async function sendToProvider(tx: Tx, movement: Awaited<ReturnType<typeof loadMovementForUpdate>>) {
    const fundingCurrency = movement.run?.fundingCurrency ?? movement.sourceCurrency;
    const method = movement.recipient?.payoutMethod ?? movement.payoutMethod;
    const provider = providerFor(method);
    const quote = provider.quote({ sourceCurrency: fundingCurrency, destinationCurrency: movement.currency, destinationAmountMinor: movement.amountMinor, payoutMethod: method, country: movement.country });
    const funding = await getFunding(tx, movement.companyId, fundingCurrency);
    if (funding.availableMinor < quote.totalMinor) {
        throw new ApiError(409, 'INSUFFICIENT_FUNDING', `Add ${formatMinor(quote.totalMinor - funding.availableMinor, fundingCurrency)} of funding to send this payout.`);
    }
    const reserved = await tx.fundingAccount.updateMany({ where: { id: funding.id, availableMinor: { gte: quote.totalMinor } }, data: { availableMinor: { decrement: quote.totalMinor }, reservedMinor: { increment: quote.totalMinor } } });
    if (reserved.count !== 1) throw new ApiError(409, 'FUNDING_CHANGED', 'Funding changed while sending. Try again.');
    const details = parseDetails(movement.recipient?.payoutDetails ?? null);
    const submitted = provider.submit({ movementId: movement.id, reference: movement.reference, payoutMethod: method, destinationAmountMinor: movement.amountMinor, currency: movement.currency, details: details as Record<string, unknown> | null });
    assertMovementTransition('queued', 'processing');
    await tx.movement.update({
        where: { id: movement.id },
        data: {
            state: 'processing', submittedAt: new Date(), providerReference: submitted.providerReference, providerReadyAt: submitted.expectedSettlementAt,
            providerPayload: JSON.stringify(details ?? {}),
            fxRate: quote.fxRate, feeMinor: quote.feeMinor, sourceAmountMinor: quote.totalMinor, quotedAt: quote.quotedAt, quoteExpiresAt: quote.expiresAt,
            provider: quote.provider, rail: quote.rail, destination: maskDestination(method, details), payoutMethod: method,
            failureReason: null, exceptionType: null, holdReason: null,
        },
    });
    if (movement.runId) await settleRunStatus(tx, movement.runId);
    return { quote, submitted };
}

export async function retryMovement(actor: Actor, movementId: string) {
    return prisma.$transaction(async (tx) => {
        await claimMovement(tx, actor.companyId, movementId, ['failed'], { state: 'queued', attempt: { increment: 1 } });
        const movement = await loadMovementForUpdate(tx, actor.companyId, movementId);
        if (movement.recipient && movement.failedAt && movement.recipient.detailsUpdatedAt && movement.recipient.detailsUpdatedAt > movement.failedAt) {
            throw new ApiError(409, 'REAPPROVAL_REQUIRED', 'Payout details changed after this failure. An approver must approve the new details first.');
        }
        if (movement.recipient?.status === 'archived') throw new ApiError(409, 'RECIPIENT_ARCHIVED', 'This recipient is archived. Restore them or cancel the payout.');
        await sendToProvider(tx, movement);
        await reopenReconciliation(tx, actor, movement.runId, 'A failed payout was retried');
        await recordEvent(tx, actor, actor.companyId, 'payout.retried', 'movement', movement.id, { reference: movement.reference, recipient: movement.recipientName, attempt: movement.attempt, amount: formatMinor(movement.amountMinor, movement.currency) });
    });
}

export async function cancelMovement(actor: Actor, movementId: string, reason?: string) {
    return prisma.$transaction(async (tx) => {
        await claimMovement(tx, actor.companyId, movementId, ['failed', 'on_hold'], { state: 'cancelled', resolvedAt: new Date() });
        const movement = await loadMovementForUpdate(tx, actor.companyId, movementId);
        await recordEvent(tx, actor, actor.companyId, 'payout.cancelled', 'movement', movement.id, { reference: movement.reference, recipient: movement.recipientName, reason: reason?.slice(0, 300), amount: formatMinor(movement.amountMinor, movement.currency) });
        if (movement.runId && movement.run) {
            if (['awaiting_approval', 'approved'].includes(movement.run.status)) {
                // A run that has not been sent and has nothing left to pay is cancelled rather than left empty.
                const remaining = await tx.movement.count({ where: { runId: movement.runId, state: { not: 'cancelled' } } });
                if (remaining === 0) {
                    const cancelled = await tx.payoutRun.updateMany({ where: { id: movement.runId, status: { in: ['awaiting_approval', 'approved'] } }, data: { status: 'cancelled', cancelledAt: new Date() } });
                    if (cancelled.count) await recordEvent(tx, actor, actor.companyId, 'payout_run.cancelled', 'payout_run', movement.runId, { reference: movement.run.reference, name: movement.run.name, reason: 'Every payout in the run was cancelled' });
                }
            } else {
                await settleRunStatus(tx, movement.runId);
                await reopenReconciliation(tx, actor, movement.runId, 'An outstanding payout was cancelled');
            }
        }
    });
}

/** An approver confirms new payout details for a held payout (or a failed one whose details were changed). */
export async function releaseHold(actor: Actor, movementId: string, comment?: string) {
    if (!APPROVER_ROLES.includes(actor.role)) throw new ApiError(403, 'INSUFFICIENT_PERMISSION', 'Only owners, admins and approvers can approve changed payout details.');
    return prisma.$transaction(async (tx) => {
        const before = await loadMovementForUpdate(tx, actor.companyId, movementId);
        const failedAfterChange = before.state === 'failed' && before.recipient?.detailsUpdatedAt && before.failedAt && before.recipient.detailsUpdatedAt > before.failedAt;
        if (before.state !== 'on_hold' && !failedAfterChange) throw new ApiError(409, 'NOT_ON_HOLD', 'This payout is not waiting for approval of changed details.');
        if (before.recipient?.status === 'archived') throw new ApiError(409, 'RECIPIENT_ARCHIVED', 'This recipient is archived. Restore them or cancel the payout.');
        const details = parseDetails(before.recipient?.payoutDetails ?? null);
        const method = before.recipient?.payoutMethod ?? before.payoutMethod;
        const runStatus = before.run?.status;
        const runSent = runStatus && ['processing', 'completed', 'completed_with_failures'].includes(runStatus);
        if (runSent) {
            await claimMovement(tx, actor.companyId, movementId, [before.state], { state: 'queued', holdReason: null, resolvedAt: new Date(), ...(before.state === 'failed' ? { attempt: { increment: 1 } } : {}) });
            await sendToProvider(tx, await loadMovementForUpdate(tx, actor.companyId, movementId));
            await reopenReconciliation(tx, actor, before.runId, 'Changed payout details were approved and the payout was resent');
        } else {
            // Before the run is approved the payout rejoins the approval; after approval it is ready to send.
            const target = runStatus === 'awaiting_approval' ? 'awaiting_approval' : 'approved';
            assertMovementTransition(before.state, target);
            await claimMovement(tx, actor.companyId, movementId, [before.state], { state: target, holdReason: null, exceptionType: null, resolvedAt: new Date(), destination: maskDestination(method, details), payoutMethod: method });
        }
        await recordEvent(tx, actor, actor.companyId, 'payout.hold_released', 'movement', before.id, { reference: before.reference, recipient: before.recipientName, destination: maskDestination(method, details), comment: comment?.slice(0, 500), resent: Boolean(runSent) });
    });
}

/**
 * Places affected payouts on hold after a recipient changes payout details.
 * Called inside the recipient update transaction.
 */
export async function holdForChangedDetails(tx: Tx, actor: Actor, recipientId: string) {
    const affected = await tx.movement.findMany({ where: { companyId: actor.companyId, recipientId, state: { in: ['awaiting_approval', 'approved'] } }, include: { run: true } });
    for (const movement of affected) {
        assertMovementTransition(movement.state, 'on_hold');
        const held = await tx.movement.updateMany({ where: { id: movement.id, state: movement.state }, data: { state: 'on_hold', exceptionType: 'details_changed', holdReason: 'Recipient changed payout details after this payout was submitted. Re-approval required before it can be sent.' } });
        if (held.count) await recordEvent(tx, actor, actor.companyId, 'payout.held', 'movement', movement.id, { reference: movement.reference, recipient: movement.recipientName, run: movement.run?.reference, reason: 'Payout details changed after submission' });
    }
    return affected.length;
}

let processing = false;

/** Applies provider outcomes for payouts whose settlement time has passed. */
export async function processSandboxSettlements(limit = 50): Promise<number> {
    if (processing) return 0;
    processing = true;
    let settled = 0;
    try {
        const due = await prisma.movement.findMany({ where: { state: 'processing', providerReadyAt: { lte: new Date() } }, include: { recipient: true }, take: limit, orderBy: { providerReadyAt: 'asc' } });
        for (const movement of due) {
            try {
                await prisma.$transaction(async (tx) => {
                    // Settle against the details that were actually sent, not whatever the recipient has now.
                    const sentDetails = parseDetails(movement.providerPayload) ?? parseDetails(movement.recipient?.payoutDetails ?? null);
                    const outcome = providerFor(movement.payoutMethod).settle({ movementId: movement.id, reference: movement.reference, payoutMethod: movement.payoutMethod, destinationAmountMinor: movement.amountMinor, currency: movement.currency, details: sentDetails as Record<string, unknown> | null });
                    assertMovementTransition('processing', outcome.status === 'delivered' ? 'delivered' : 'failed');
                    const claimed = await tx.movement.updateMany({
                        where: { id: movement.id, state: 'processing' },
                        data: outcome.status === 'delivered'
                            ? { state: 'delivered', deliveredAt: new Date(), deliveredAmountMinor: outcome.deliveredAmountMinor, ...(movement.failedAt ? { resolvedAt: new Date() } : {}) }
                            : { state: 'failed', failedAt: new Date(), exceptionType: outcome.exceptionType, failureReason: outcome.reason },
                    });
                    if (claimed.count !== 1) return;
                    const cost = movement.sourceAmountMinor ?? 0;
                    const funding = await getFunding(tx, movement.companyId, movement.sourceCurrency);
                    const release = Math.min(cost, funding.reservedMinor);
                    await tx.fundingAccount.update({
                        where: { id: funding.id },
                        data: outcome.status === 'delivered' ? { reservedMinor: { decrement: release } } : { reservedMinor: { decrement: release }, availableMinor: { increment: release } },
                    });
                    await recordEvent(tx, null, movement.companyId, outcome.status === 'delivered' ? 'payout.delivered' : 'payout.failed', 'movement', movement.id, {
                        reference: movement.reference, recipient: movement.recipientName, amount: formatMinor(movement.amountMinor, movement.currency), providerReference: movement.providerReference,
                        ...(outcome.status === 'failed' ? { reason: outcome.reason, fundsReleased: formatMinor(release, movement.sourceCurrency) } : {}),
                    });
                    if (movement.runId) await settleRunStatus(tx, movement.runId);
                });
                settled++;
            } catch (error) {
                // One payout that cannot be settled must not stall the others; it is retried on the next tick.
                console.error('sandbox_settlement_failed', { movementId: movement.id, error });
            }
        }
        return settled;
    } finally {
        processing = false;
    }
}
