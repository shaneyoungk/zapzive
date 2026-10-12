// One formatting vocabulary for the dashboard, so the same value never reads
// differently on two pages (e.g. "10/12/2026" on one and "Oct 12" on another).

import { formatDistanceToNowStrict } from "date-fns";

const toDate = (value: string | number | Date | null | undefined) => {
    if (value === null || value === undefined || value === "") return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

/** $1,234.50. `compact` gives $1.2M for large figures; `whole` drops cents. */
export function formatMoney(value: number | string | null | undefined, options: { currency?: string; compact?: boolean; whole?: boolean } = {}) {
    const amount = Number(value ?? 0);
    if (!Number.isFinite(amount)) return "—";
    const currency = options.currency && /^[A-Z]{3}$/.test(options.currency) && !["USDC", "USDT"].includes(options.currency) ? options.currency : "USD";
    const compact = options.compact && Math.abs(amount) >= 100_000;
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        notation: compact ? "compact" : "standard",
        minimumFractionDigits: compact || options.whole ? 0 : 2,
        maximumFractionDigits: compact ? 1 : options.whole ? 0 : 2,
    }).format(amount);
}

/** 1,234,567 — plain grouped numbers (local currency amounts, counts). */
export function formatNumber(value: number | string | null | undefined, maximumFractionDigits = 2) {
    const amount = Number(value ?? 0);
    return Number.isFinite(amount) ? new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(amount) : "—";
}

/** "Oct 12, 2026" */
export function formatDate(value: string | number | Date | null | undefined) {
    const date = toDate(value);
    return date ? date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
}

/** "Oct 12, 2026, 3:24 PM" */
export function formatDateTime(value: string | number | Date | null | undefined) {
    const date = toDate(value);
    return date ? date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
}

/** "3 hours ago" */
export function formatRelative(value: string | number | Date | null | undefined) {
    const date = toDate(value);
    return date ? `${formatDistanceToNowStrict(date)} ago` : "—";
}

/** A short, human-scannable reference for a long id: "#AC4875". Keep the full id in a title attribute. */
export function shortId(id: string | null | undefined) {
    return id ? `#${id.replace(/-/g, "").slice(0, 6).toUpperCase()}` : "—";
}

/** "0x71C7…f9a1" */
export function shortAddress(address: string | null | undefined) {
    if (!address) return "—";
    return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

/** "1 contract" / "3 contracts" */
export function plural(count: number, singular: string, pluralForm = `${singular}s`) {
    return `${formatNumber(count, 0)} ${count === 1 ? singular : pluralForm}`;
}
