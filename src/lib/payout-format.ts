// Display vocabulary for payout operations: money, states, methods, countries.
// One place defines every state's label, tone and meaning so pages never invent their own.

const EXPONENT: Record<string, number> = { USD: 2, USDC: 2, KES: 2, UGX: 0, TZS: 2, RWF: 0, NGN: 2, GHS: 2, ZAR: 2, EUR: 2, GBP: 2 };

export function minorToDecimal(minor: number, currency: string): string {
    const exponent = EXPONENT[currency] ?? 2;
    return (minor / 10 ** exponent).toFixed(exponent);
}

/** "KES 48,200.00" — currency code first, as finance teams read statements. */
export function money(minor: number | null | undefined, currency: string, options: { compact?: boolean; noCode?: boolean } = {}): string {
    if (minor === null || minor === undefined) return "—";
    const exponent = EXPONENT[currency] ?? 2;
    const value = minor / 10 ** exponent;
    const compact = options.compact && Math.abs(value) >= 100_000;
    const text = new Intl.NumberFormat("en-US", {
        notation: compact ? "compact" : "standard",
        minimumFractionDigits: compact ? 0 : exponent,
        maximumFractionDigits: compact ? 2 : exponent,
    }).format(value);
    return options.noCode ? text : `${currency} ${text}`;
}

export function moneyList(items: Array<{ currency: string; amountMinor: number }>, options: { compact?: boolean } = {}): string {
    if (!items.length) return "—";
    return items.map((item) => money(item.amountMinor, item.currency, options)).join(" + ");
}

export type Tone = "positive" | "progress" | "waiting" | "negative" | "neutral" | "attention";

export const RUN_STATES: Record<string, { label: string; tone: Tone; meaning: string }> = {
    draft: { label: "Draft", tone: "neutral", meaning: "Being prepared. Add payouts to validate them." },
    needs_correction: { label: "Needs correction", tone: "negative", meaning: "Some payouts have problems that block submission." },
    ready: { label: "Ready to submit", tone: "attention", meaning: "Validated. Submit to route it through approval." },
    awaiting_approval: { label: "Awaiting approval", tone: "waiting", meaning: "Waiting for the approvals your policy requires." },
    approved: { label: "Approved", tone: "attention", meaning: "Approved and ready to send to the provider." },
    processing: { label: "Processing", tone: "progress", meaning: "Payouts are with the provider." },
    completed: { label: "Completed", tone: "positive", meaning: "Every payout has a final outcome." },
    completed_with_failures: { label: "Completed with exceptions", tone: "negative", meaning: "Finished, but some payouts failed or are on hold." },
    rejected: { label: "Rejected", tone: "negative", meaning: "An approver sent it back. Edit and resubmit." },
    cancelled: { label: "Cancelled", tone: "neutral", meaning: "Cancelled before any money moved." },
};

export const MOVEMENT_STATES: Record<string, { label: string; tone: Tone; meaning: string }> = {
    draft: { label: "Draft", tone: "neutral", meaning: "Not validated yet." },
    needs_correction: { label: "Needs correction", tone: "negative", meaning: "Fix the problems before submitting." },
    ready: { label: "Ready", tone: "attention", meaning: "Validated and quoted." },
    awaiting_approval: { label: "Awaiting approval", tone: "waiting", meaning: "Waiting for run approval." },
    approved: { label: "Approved", tone: "attention", meaning: "Approved, not yet sent." },
    queued: { label: "Queued", tone: "progress", meaning: "Queued for the provider." },
    processing: { label: "Processing", tone: "progress", meaning: "With the provider." },
    delivered: { label: "Delivered", tone: "positive", meaning: "The provider confirmed delivery." },
    failed: { label: "Failed", tone: "negative", meaning: "The provider could not deliver. No funds reached the recipient." },
    on_hold: { label: "On hold", tone: "waiting", meaning: "Blocked until an approver confirms changed details." },
    cancelled: { label: "Cancelled", tone: "neutral", meaning: "Will not be sent." },
    reversed: { label: "Reversed", tone: "negative", meaning: "Returned by the provider after delivery." },
    expired: { label: "Expired", tone: "neutral", meaning: "Quote or instruction expired." },
};

export const TONE_CLASSES: Record<Tone, { chip: string; dot: string }> = {
    positive: { chip: "bg-[#e7f3ed] text-[#0b6b4f] ring-[#bfe0d0]", dot: "bg-[#11a879]" },
    progress: { chip: "bg-[#eaf1fb] text-[#1f5fa8] ring-[#c8d9f0]", dot: "bg-[#3b82d6]" },
    waiting: { chip: "bg-[#fdf4e3] text-[#8a5a0b] ring-[#f0dcb0]", dot: "bg-[#d99a1e]" },
    attention: { chip: "bg-[#edf6f1] text-[#0b6b4f] ring-[#d6e9df]", dot: "bg-[#5aa985]" },
    negative: { chip: "bg-[#fbecea] text-[#9a2f2f] ring-[#efc9c4]", dot: "bg-[#cf4b3f]" },
    neutral: { chip: "bg-[#f1efe9] text-[#5f5e57] ring-[#dedbd2]", dot: "bg-[#a3a29a]" },
};

export const METHOD_LABELS: Record<string, string> = { mpesa: "M-Pesa", mobile_money: "Mobile money", bank: "Bank account", usdc_wallet: "USDC wallet", unassigned: "No payout method" };

export const COUNTRY_NAMES: Record<string, string> = { KE: "Kenya", UG: "Uganda", TZ: "Tanzania", RW: "Rwanda", NG: "Nigeria", GH: "Ghana", ZA: "South Africa", US: "United States", GB: "United Kingdom" };

export const VERIFICATION: Record<string, { label: string; tone: Tone }> = {
    verified: { label: "Details checked", tone: "positive" },
    pending: { label: "Check pending", tone: "waiting" },
    failed: { label: "Check failed", tone: "negative" },
    unverified: { label: "Not checked", tone: "neutral" },
};

export function duration(ms: number | null | undefined): string {
    if (ms === null || ms === undefined) return "—";
    const minutes = Math.round(ms / 60_000);
    if (minutes < 1) return "under 1 min";
    if (minutes < 60) return `${minutes} min`;
    const hours = minutes / 60;
    if (hours < 48) return `${hours.toFixed(hours < 10 ? 1 : 0)} h`;
    return `${Math.round(hours / 24)} days`;
}

export function percent(value: number | null | undefined): string {
    return value === null || value === undefined ? "—" : `${(value * 100).toFixed(value < 0.1 ? 1 : 0)}%`;
}

/** Plain-language sentence for an activity event. */
export function describeEvent(event: { action: string; metadata: Record<string, unknown> }): string {
    const m = event.metadata as Record<string, string | number | undefined>;
    const run = m.reference ? `${m.reference}${m.name ? ` · ${m.name}` : ""}` : "a payout run";
    switch (event.action) {
        case "payout_run.created": return `created payout run ${run}`;
        case "payout_run.updated": return `edited ${run}`;
        case "payout_run.items_added": return `added ${m.count} payout${m.count === 1 ? "" : "s"} to ${run}`;
        case "payout_run.imported": return `imported ${m.rows} rows into ${run} (${m.matched} matched, ${m.unknown} unknown)`;
        case "payout_run.submitted": return `submitted ${run} with ${m.payouts} payout${m.payouts === 1 ? "" : "s"}`;
        case "payout_run.approval_recorded": return `approved ${run} (${m.approvals})${m.selfApproval ? " · self-approval" : ""}`;
        case "payout_run.approved": return m.reason ? `${run} approved automatically: ${String(m.reason).toLowerCase()}` : `approved ${run}`;
        case "payout_run.rejected": return `rejected ${run}${m.comment ? `: “${m.comment}”` : ""}`;
        case "payout_run.sent": return `sent ${run} to the provider${m.reserved ? ` (reserved ${m.reserved})` : ""}`;
        case "payout_run.completed": return `${run} completed`;
        case "payout_run.completed_with_failures": return `${run} finished with exceptions`;
        case "payout_run.cancelled": return `cancelled ${run}`;
        case "payout_run.reconciled": return `reconciled ${run}`;
        case "payout_run.reconciliation_reopened": return `${run} reopened for reconciliation: ${String(m.reason ?? "").toLowerCase()}`;
        case "payout.delivered": return `${m.amount} delivered to ${m.recipient}`;
        case "payout.failed": return `payout to ${m.recipient} failed: ${m.reason}`;
        case "payout.retried": return `retried payout to ${m.recipient} (attempt ${m.attempt})`;
        case "payout.cancelled": return `cancelled payout to ${m.recipient}`;
        case "payout.held": return `put payout to ${m.recipient} on hold: ${m.reason}`;
        case "payout.hold_released": return `approved new payout details for ${m.recipient}`;
        case "payout.updated": return `edited payout ${m.reference}`;
        case "payout.removed": return `removed ${m.recipient} from ${m.run}`;
        case "payout.warnings_acknowledged": return `reviewed warnings on ${m.reference}`;
        case "recipient.created": return `added recipient ${m.name}`;
        case "recipient.updated": return `updated recipient ${m.name}`;
        case "recipient.payout_details_changed": {
            const self = String(m.actorName ?? "").startsWith(String(m.name));
            return `changed ${self ? "their" : `${m.name}'s`} payout details${m.after ? ` to ${m.after}` : ""}`;
        }
        case "recipient.verified": return `checked payout details for ${m.name}`;
        case "recipient.verification_failed": return `payout-detail check failed for ${m.name}`;
        case "recipient.archived": return `archived recipient ${m.name}`;
        case "recipient.restored": return `restored recipient ${m.name}`;
        case "approval_policy.updated": return "updated the approval policy";
        case "funding.sandbox_added": return `added ${m.amount} of sandbox funding`;
        case "sandbox.sample_loaded": return "loaded the sample payout scenario";
        case "sandbox.sample_removed": return "removed the sample payout scenario";
        case "team.role_changed": return `changed ${m.member}'s role from ${m.before} to ${m.after}`;
        default: return event.action.replace(/[._]/g, " ");
    }
}
