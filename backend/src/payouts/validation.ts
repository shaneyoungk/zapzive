// Validation engine for payout lines. Pure functions: given the lines in a run
// and each recipient's history, return the issues for every line.

import { MPESA_LIMIT_MINOR, corridorFor, detailProblems, type PayoutDetails } from './catalog';
import { formatMinor } from './money';

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface Issue {
    code: string;
    severity: IssueSeverity;
    message: string;
}

export interface LineInput {
    id: string;
    recipientId: string | null;
    recipientName: string;
    recipientStatus: string | null; // active, archived
    verification: string | null; // verified, pending, failed
    amountMinor: number;
    currency: string;
    payoutMethod: string | null;
    details: PayoutDetails | null;
    country: string | null;
    externalReference: string | null;
    detailsUpdatedAt: Date | null;
    /** The imported name matches more than one recipient. */
    ambiguousName?: boolean;
    /** References of other open runs that already contain this recipient. */
    otherOpenRuns?: string[];
}

export interface RecipientHistory {
    deliveredAmountsMinor: number[]; // previous delivered amounts in the same currency
    paidReferences: Set<string>;
    lastDeliveredAt: Date | null;
    recentDeliveries?: Array<{ amountMinor: number; currency: string; deliveredAt: Date; externalReference: string | null }>;
}

const ANOMALY_MULTIPLIER = 3;

function median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

export function validateLines(lines: LineInput[], history: Map<string, RecipientHistory>): Map<string, Issue[]> {
    const result = new Map<string, Issue[]>();
    const recipientCounts = new Map<string, number>();
    const referenceCounts = new Map<string, number>();
    for (const line of lines) {
        if (line.recipientId) recipientCounts.set(line.recipientId, (recipientCounts.get(line.recipientId) ?? 0) + 1);
        if (line.externalReference) {
            const key = `${line.recipientId ?? line.recipientName}::${line.externalReference.toLowerCase()}`;
            referenceCounts.set(key, (referenceCounts.get(key) ?? 0) + 1);
        }
    }

    for (const line of lines) {
        const issues: Issue[] = [];
        const add = (code: string, severity: IssueSeverity, message: string) => issues.push({ code, severity, message });

        if (!line.recipientId) {
            if (line.ambiguousName) add('ambiguous_recipient', 'error', `"${line.recipientName}" matches more than one recipient. Edit the row to choose the right one, or import with email addresses.`);
            else add('unknown_recipient', 'error', `"${line.recipientName}" does not match a recipient in this workspace. Add the recipient or correct the name.`);
        } else {
            if (line.recipientStatus === 'archived') add('recipient_archived', 'error', 'This recipient is archived and cannot be paid.');
            if (line.verification === 'failed') add('recipient_ineligible', 'error', 'Recipient verification failed. Resolve verification before paying.');
        }

        if (!Number.isInteger(line.amountMinor) || line.amountMinor <= 0) add('invalid_amount', 'error', 'Amount is missing or invalid.');

        if (!line.recipientId) {
            // Method, country and history checks only make sense once the recipient is known.
            result.set(line.id, issues);
            continue;
        }

        if (!line.country && line.payoutMethod !== 'usdc_wallet') add('missing_country', 'error', 'Recipient country is missing.');

        if (!line.payoutMethod) {
            add('missing_payout_method', 'error', 'Recipient has no payout method. Add payout details to the recipient.');
        } else {
            const corridor = corridorFor(line.country, line.currency, line.payoutMethod);
            if (!corridor.ok) add('unsupported_route', 'error', corridor.reason);
            for (const problem of detailProblems(line.payoutMethod, line.details, line.country)) add('invalid_payout_details', 'error', problem);
            if (line.payoutMethod === 'mpesa' && line.currency === 'KES' && line.amountMinor > MPESA_LIMIT_MINOR) {
                add('method_limit', 'error', `M-Pesa payouts are limited to ${formatMinor(MPESA_LIMIT_MINOR, 'KES')} per transaction. Split the payout or pay by bank transfer.`);
            }
        }

        if (line.recipientId && (recipientCounts.get(line.recipientId) ?? 0) > 1) {
            add('duplicate_recipient', 'warning', 'This recipient appears more than once in this run.');
        }
        if (line.externalReference) {
            const key = `${line.recipientId ?? line.recipientName}::${line.externalReference.toLowerCase()}`;
            if ((referenceCounts.get(key) ?? 0) > 1) add('duplicate_reference', 'error', `Reference "${line.externalReference}" is used more than once for this recipient in this run.`);
        }

        if (line.otherOpenRuns?.length) {
            add('in_other_open_run', 'warning', `This recipient is also in ${line.otherOpenRuns.join(', ')}, which has not been sent yet. Confirm they should be paid in both runs.`);
        }

        const past = line.recipientId ? history.get(line.recipientId) : undefined;
        if (line.recipientId) {
            if (!past || past.lastDeliveredAt === null) {
                add('new_recipient', 'info', 'First payout to this recipient.');
            } else {
                if (line.externalReference && past.paidReferences.has(line.externalReference.toLowerCase())) {
                    add('already_paid_reference', 'warning', `Reference "${line.externalReference}" was already paid to this recipient. Confirm this is not a duplicate.`);
                }
                if (past.deliveredAmountsMinor.length >= 2 && line.amountMinor > 0) {
                    const typical = median(past.deliveredAmountsMinor);
                    if (line.amountMinor > typical * ANOMALY_MULTIPLIER) {
                        const ratio = (line.amountMinor / typical).toFixed(1);
                        add('amount_anomaly', 'warning', `${ratio}× this recipient's usual amount (${formatMinor(typical, line.currency)}). Confirm the amount.`);
                    }
                }
                const repeat = (past.recentDeliveries ?? []).find((item) => item.currency === line.currency && item.amountMinor === line.amountMinor && Date.now() - item.deliveredAt.getTime() < 14 * 86_400_000 && (item.externalReference ?? '').toLowerCase() !== (line.externalReference ?? '').toLowerCase());
                if (repeat && line.amountMinor > 0) {
                    add('recent_same_amount', 'warning', `The same amount (${formatMinor(line.amountMinor, line.currency)}) was delivered to this recipient on ${repeat.deliveredAt.toISOString().slice(0, 10)}. Confirm this is a new payment.`);
                }
                if (line.detailsUpdatedAt && line.detailsUpdatedAt > past.lastDeliveredAt) {
                    add('details_changed', 'warning', 'Payout details changed since this recipient was last paid. Approval is required.');
                }
            }
        }

        result.set(line.id, issues);
    }
    return result;
}

export function summarizeIssues(issueLists: Issue[][], acknowledged: Set<string>[] = []) {
    let ready = 0;
    let needsCorrection = 0;
    let needsReview = 0;
    issueLists.forEach((issues, index) => {
        const acked = acknowledged[index] ?? new Set<string>();
        if (issues.some((issue) => issue.severity === 'error')) needsCorrection++;
        else if (issues.some((issue) => issue.severity === 'warning' && !acked.has(issue.code))) needsReview++;
        else ready++;
    });
    return { total: issueLists.length, ready, needsCorrection, needsReview };
}
