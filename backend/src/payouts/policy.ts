// Approval policy: decides how many approvals a payout run needs and explains why.

import { SANDBOX_RATES_PER_USD } from './catalog';
import { convertMinor, formatMinor } from './money';

export interface PolicyRules {
    currency: string;
    singleApprovalAboveMinor: number;
    dualApprovalAboveMinor: number;
    newRecipientRequiresApproval: boolean;
    changedDetailsRequiresApproval: boolean;
    allowSelfApproval: boolean;
}

export const DEFAULT_POLICY: PolicyRules = {
    currency: 'KES',
    singleApprovalAboveMinor: 10_000_000, // KES 100,000
    dualApprovalAboveMinor: 1_000_000_000, // KES 10,000,000
    newRecipientRequiresApproval: true,
    changedDetailsRequiresApproval: true,
    allowSelfApproval: true,
};

export interface PolicyLine {
    amountMinor: number;
    currency: string;
    isNewRecipient: boolean;
    detailsChanged: boolean;
}

export interface PolicyDecision {
    requiredApprovals: number;
    totalInPolicyCurrencyMinor: number;
    reasons: string[];
    summary: string;
}

export function evaluatePolicy(rules: PolicyRules, lines: PolicyLine[]): PolicyDecision {
    const total = lines.reduce((sum, line) => sum + convertMinor(line.amountMinor, line.currency, rules.currency, SANDBOX_RATES_PER_USD), 0);
    const reasons: string[] = [];
    let required = 0;
    const totalLabel = formatMinor(total, rules.currency);

    if (total > rules.dualApprovalAboveMinor) {
        required = 2;
        reasons.push(`Total value of ${totalLabel} exceeds ${formatMinor(rules.dualApprovalAboveMinor, rules.currency)}, so two approvers are required.`);
    } else if (total > rules.singleApprovalAboveMinor) {
        required = 1;
        reasons.push(`Total value of ${totalLabel} exceeds ${formatMinor(rules.singleApprovalAboveMinor, rules.currency)}, so one approver is required.`);
    }
    const newCount = lines.filter((line) => line.isNewRecipient).length;
    if (rules.newRecipientRequiresApproval && newCount) {
        required = Math.max(required, 1);
        reasons.push(`${newCount} recipient${newCount === 1 ? ' is' : 's are'} being paid for the first time.`);
    }
    const changedCount = lines.filter((line) => line.detailsChanged).length;
    if (rules.changedDetailsRequiresApproval && changedCount) {
        required = Math.max(required, 1);
        reasons.push(`${changedCount} recipient${changedCount === 1 ? ' has' : 's have'} changed payout details since their last payout.`);
    }

    const summary = required === 0
        ? `No approval required: the total of ${totalLabel} is within the ${formatMinor(rules.singleApprovalAboveMinor, rules.currency)} operator limit.`
        : `This run requires ${required === 1 ? 'one approver' : 'two approvers'}. ${reasons.join(' ')}`;
    return { requiredApprovals: required, totalInPolicyCurrencyMinor: total, reasons, summary };
}
