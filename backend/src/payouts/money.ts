// Money is stored and computed as integer minor units. Decimal strings are
// parsed exactly (no float arithmetic) and conversions use BigInt.

import { ApiError } from '../lib/security';

/** Minor-unit exponent per supported currency. USDC is handled at cent precision for operators. */
export const CURRENCY_EXPONENT: Record<string, number> = {
    USD: 2, USDC: 2, KES: 2, UGX: 0, TZS: 2, RWF: 0, NGN: 2, GHS: 2, ZAR: 2, EUR: 2, GBP: 2,
};

export function exponentFor(currency: string): number {
    const exponent = CURRENCY_EXPONENT[currency];
    if (exponent === undefined) throw new ApiError(422, 'UNSUPPORTED_CURRENCY', `${currency} is not a supported currency.`);
    return exponent;
}

export function isSupportedCurrency(value: unknown): value is string {
    return typeof value === 'string' && value in CURRENCY_EXPONENT;
}

/**
 * Normalises amounts as finance teams type them in spreadsheets:
 * "KES 150,000", "150 000", "1,000/=", "Ksh 2,500.50", "1.250,75" (European).
 * Returns a plain decimal string, or null for negatives and unreadable text.
 */
export function normalizeAmountText(value: unknown): string | null {
    if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? String(value) : null;
    if (typeof value !== 'string') return null;
    let text = value.trim().replace(/[\u00a0\u202f\s]/g, '').replace(/\/=$/, '');
    if (!text || /^\(.*\)$/.test(text) || text.startsWith('-')) return null;
    text = text.replace(/^(ksh|kshs|kes|ugx|tzs|rwf|ngn|ghs|zar|usd|usdc|eur|gbp)\.?/i, '').replace(/(ksh|kshs|kes|ugx|tzs|rwf|ngn|ghs|zar|usd|usdc|eur|gbp)$/i, '').replace(/^[$€£₦]/, '');
    // European grouping only when unambiguous: "1.250.000" or "1.250,75". A lone "1.250" is left as a
    // decimal so precision checks reject it rather than guessing a value 1,000 times too large or small.
    if (/^\d{1,3}(\.\d{3}){2,}(,\d+)?$/.test(text) || /^\d{1,3}(\.\d{3})+,\d+$/.test(text)) text = text.replace(/\./g, '').replace(',', '.');
    else if (/^\d+,\d{1,2}$/.test(text)) text = text.replace(',', '.');
    else text = text.replace(/,/g, '');
    return /^\d+(\.\d+)?$/.test(text) ? text : null;
}

/** Parses "48,200.50" into minor units. Throws on invalid input or excess precision. */
export function parseMinor(value: unknown, currency: string, field = 'amount'): number {
    const exponent = exponentFor(currency);
    const text = normalizeAmountText(value) ?? '';
    if (!/^\d+(\.\d+)?$/.test(text)) throw new ApiError(422, 'INVALID_AMOUNT', `${field} must be a positive number.`);
    const [whole, fraction = ''] = text.split('.');
    if (fraction.length > exponent) {
        throw new ApiError(422, 'INVALID_AMOUNT_PRECISION', exponent === 0 ? `${currency} amounts cannot have decimals.` : `${currency} amounts allow at most ${exponent} decimal places.`);
    }
    const minor = BigInt(whole + fraction.padEnd(exponent, '0'));
    if (minor <= 0n) throw new ApiError(422, 'INVALID_AMOUNT', `${field} must be greater than zero.`);
    if (minor > BigInt(Number.MAX_SAFE_INTEGER)) throw new ApiError(422, 'INVALID_AMOUNT', `${field} is too large.`);
    return Number(minor);
}

/** Like parseMinor but returns null instead of throwing (used by validation to report issues). */
export function tryParseMinor(value: unknown, currency: string): number | null {
    try { return parseMinor(value, currency); } catch { return null; }
}

export function formatMinor(minor: number, currency: string): string {
    const exponent = CURRENCY_EXPONENT[currency] ?? 2;
    const negative = minor < 0;
    const digits = BigInt(Math.abs(minor)).toString().padStart(exponent + 1, '0');
    const whole = exponent ? digits.slice(0, -exponent) : digits;
    const fraction = exponent ? digits.slice(-exponent) : '';
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${negative ? '-' : ''}${currency} ${grouped}${fraction ? '.' + fraction : ''}`;
}

const RATE_SCALE = 1_000_000n;

/** Decimal rate string -> integer scaled by 1e6. */
export function scaleRate(rate: string): bigint {
    if (!/^\d+(\.\d{1,6})?$/.test(rate)) throw new Error(`Invalid rate ${rate}`);
    const [whole, fraction = ''] = rate.split('.');
    return BigInt(whole + fraction.padEnd(6, '0'));
}

const pow10 = (n: number) => 10n ** BigInt(n);

/**
 * Converts `minor` units of `from` into `to`, given both rates expressed as
 * units per 1 USD. Rounds up when `roundUp` (used for funding costs) so the
 * operator is never under-funded, otherwise rounds half up.
 */
export function convertMinor(minor: number, from: string, to: string, ratesPerUsd: Record<string, string>, roundUp = false): number {
    if (from === to) return minor;
    const fromRate = scaleRate(ratesPerUsd[from]);
    const toRate = scaleRate(ratesPerUsd[to]);
    // amount_to = amount_from / fromRate * toRate, adjusted for exponents.
    const numerator = BigInt(minor) * toRate * pow10(exponentFor(to));
    const denominator = fromRate * pow10(exponentFor(from));
    const quotient = numerator / denominator;
    const remainder = numerator % denominator;
    if (remainder === 0n) return Number(quotient);
    if (roundUp) return Number(quotient + 1n);
    return Number(remainder * 2n >= denominator ? quotient + 1n : quotient);
}

/** Destination units per 1 source unit, as a 6-decimal string. */
export function crossRate(source: string, destination: string, ratesPerUsd: Record<string, string>): string {
    const value = (scaleRate(ratesPerUsd[destination]) * RATE_SCALE) / scaleRate(ratesPerUsd[source]);
    const whole = value / RATE_SCALE;
    const fraction = (value % RATE_SCALE).toString().padStart(6, '0').replace(/0+$/, '');
    return fraction ? `${whole}.${fraction}` : whole.toString();
}

/** Basis-point percentage of a minor amount, rounded up. */
export function percentOf(minor: number, basisPoints: number): number {
    return Number((BigInt(minor) * BigInt(basisPoints) + 9_999n) / 10_000n);
}
