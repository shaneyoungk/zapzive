// Supported corridors, payout methods and payout-detail rules. This is the
// single place that decides what Zapzive can route in the sandbox.

export type PayoutMethod = 'mpesa' | 'mobile_money' | 'bank' | 'usdc_wallet';

export const PAYOUT_METHODS: Record<PayoutMethod, { label: string; description: string }> = {
    mpesa: { label: 'M-Pesa', description: 'Safaricom M-Pesa mobile wallet (Kenya)' },
    mobile_money: { label: 'Mobile money', description: 'MTN, Airtel and other mobile wallets' },
    bank: { label: 'Bank account', description: 'Local bank transfer' },
    usdc_wallet: { label: 'USDC wallet', description: 'USDC to a wallet address the recipient controls' },
};

export const COUNTRIES: Record<string, { name: string; currency: string; dialCode: string }> = {
    KE: { name: 'Kenya', currency: 'KES', dialCode: '254' },
    UG: { name: 'Uganda', currency: 'UGX', dialCode: '256' },
    TZ: { name: 'Tanzania', currency: 'TZS', dialCode: '255' },
    RW: { name: 'Rwanda', currency: 'RWF', dialCode: '250' },
    NG: { name: 'Nigeria', currency: 'NGN', dialCode: '234' },
    GH: { name: 'Ghana', currency: 'GHS', dialCode: '233' },
    ZA: { name: 'South Africa', currency: 'ZAR', dialCode: '27' },
    US: { name: 'United States', currency: 'USD', dialCode: '1' },
    GB: { name: 'United Kingdom', currency: 'GBP', dialCode: '44' },
};

/** country -> currency -> supported methods. USDC wallets are available in every country. */
const CORRIDORS: Record<string, Record<string, PayoutMethod[]>> = {
    KE: { KES: ['mpesa', 'bank'], USD: ['bank'] },
    UG: { UGX: ['mobile_money', 'bank'] },
    TZ: { TZS: ['mobile_money', 'bank'] },
    RW: { RWF: ['mobile_money'] },
    NG: { NGN: ['bank'] },
    GH: { GHS: ['mobile_money', 'bank'] },
    ZA: { ZAR: ['bank'] },
    US: { USD: ['bank'] },
    GB: { GBP: ['bank'] },
};

/** Sandbox FX: units per 1 USD. Static and clearly labelled as sandbox quotes in the product. */
export const SANDBOX_RATES_PER_USD: Record<string, string> = {
    USD: '1', USDC: '1', KES: '129.2', UGX: '3720', TZS: '2685', RWF: '1385', NGN: '1585', GHS: '15.6', ZAR: '18.4', EUR: '0.92', GBP: '0.79',
};

export const MPESA_LIMIT_MINOR = 25_000_000; // KES 250,000 per transaction

export function countryCode(value: string | null | undefined): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    const upper = trimmed.toUpperCase();
    if (COUNTRIES[upper]) return upper;
    const found = Object.entries(COUNTRIES).find(([, item]) => item.name.toLowerCase() === trimmed.toLowerCase());
    return found ? found[0] : null;
}

export function corridorFor(country: string | null, currency: string, method: string): { ok: true } | { ok: false; reason: string } {
    if (!(method in PAYOUT_METHODS)) return { ok: false, reason: `"${method}" is not a supported payout method.` };
    if (method === 'usdc_wallet') return currency === 'USDC' ? { ok: true } : { ok: false, reason: 'USDC wallet payouts must be in USDC.' };
    if (!country) return { ok: false, reason: 'Recipient country is missing.' };
    const byCurrency = CORRIDORS[country];
    if (!byCurrency) return { ok: false, reason: `Payouts to ${COUNTRIES[country]?.name ?? country} are not supported yet.` };
    const methods = byCurrency[currency];
    if (!methods) return { ok: false, reason: `${currency} is not supported for ${COUNTRIES[country].name}. Supported: ${Object.keys(byCurrency).join(', ')}.` };
    if (!methods.includes(method as PayoutMethod)) return { ok: false, reason: `${PAYOUT_METHODS[method as PayoutMethod].label} is not available for ${currency} in ${COUNTRIES[country].name}.` };
    return { ok: true };
}

export function corridorCatalog() {
    return Object.entries(CORRIDORS).map(([code, byCurrency]) => ({
        country: code,
        name: COUNTRIES[code].name,
        currencies: Object.entries(byCurrency).map(([currency, methods]) => ({ currency, methods })),
    }));
}

export interface PayoutDetails {
    phone?: string;
    bankName?: string;
    accountNumber?: string;
    bankCode?: string;
    walletAddress?: string;
    network?: string;
}

const USDC_NETWORKS = ['base', 'ethereum', 'polygon', 'arbitrum', 'optimism'];

export function normalizePhone(value: string, country: string | null): string {
    const digits = value.replace(/[^\d+]/g, '');
    if (digits.startsWith('+')) return digits;
    const dial = country ? COUNTRIES[country]?.dialCode : undefined;
    if (dial && digits.startsWith('0')) return `+${dial}${digits.slice(1)}`;
    if (dial && digits.startsWith(dial)) return `+${digits}`;
    return digits;
}

/** Returns a list of human-readable problems with the payout details (empty when valid). */
export function detailProblems(method: string, details: PayoutDetails | null, country: string | null): string[] {
    if (!details) return ['Payout details are missing.'];
    const problems: string[] = [];
    if (method === 'mpesa') {
        const phone = normalizePhone(details.phone ?? '', 'KE');
        if (!/^\+254(7|1)\d{8}$/.test(phone)) problems.push('M-Pesa number must be a Kenyan mobile number such as +254 712 345 678.');
    } else if (method === 'mobile_money') {
        const phone = normalizePhone(details.phone ?? '', country);
        const dial = country ? COUNTRIES[country]?.dialCode : undefined;
        if (!/^\+\d{9,15}$/.test(phone)) problems.push('Mobile money number must be in international format.');
        else if (dial && !phone.startsWith(`+${dial}`)) problems.push(`Mobile money number must be a ${COUNTRIES[country!].name} number (+${dial}).`);
    } else if (method === 'bank') {
        if (!details.bankName?.trim()) problems.push('Bank name is missing.');
        if (!/^\d{6,18}$/.test((details.accountNumber ?? '').replace(/\s/g, ''))) problems.push('Account number must be 6–18 digits.');
        if (details.bankCode && !/^[A-Za-z0-9]{2,11}$/.test(details.bankCode)) problems.push('Bank or SWIFT code format is invalid.');
    } else if (method === 'usdc_wallet') {
        if (!/^0x[a-fA-F0-9]{40}$/.test(details.walletAddress ?? '')) problems.push('Wallet address must be a 0x address with 40 hexadecimal characters.');
        if (!USDC_NETWORKS.includes((details.network ?? '').toLowerCase())) problems.push(`USDC network must be one of: ${USDC_NETWORKS.join(', ')}.`);
    } else {
        problems.push('Unsupported payout method.');
    }
    return problems;
}

export function cleanDetails(method: string, details: PayoutDetails, country: string | null): PayoutDetails {
    if (method === 'mpesa') return { phone: normalizePhone(details.phone ?? '', 'KE') };
    if (method === 'mobile_money') return { phone: normalizePhone(details.phone ?? '', country) };
    if (method === 'bank') return { bankName: details.bankName?.trim(), accountNumber: (details.accountNumber ?? '').replace(/\s/g, ''), ...(details.bankCode ? { bankCode: details.bankCode.trim().toUpperCase() } : {}) };
    if (method === 'usdc_wallet') return { walletAddress: details.walletAddress?.trim(), network: (details.network ?? 'base').toLowerCase() };
    return {};
}

/** A display-safe snapshot that never exposes full account numbers. */
export function maskDestination(method: string | null, details: PayoutDetails | null): string | null {
    if (!method || !details) return null;
    const tail = (value = '', keep = 3) => value.slice(-keep);
    if (method === 'mpesa' || method === 'mobile_money') {
        const phone = details.phone ?? '';
        return `${PAYOUT_METHODS[method].label} · ${phone.slice(0, 5)} ••• ••• ${tail(phone)}`;
    }
    if (method === 'bank') return `${details.bankName ?? 'Bank'} · ••••${tail(details.accountNumber, 4)}`;
    if (method === 'usdc_wallet') {
        const address = details.walletAddress ?? '';
        return `USDC on ${details.network ?? 'base'} · ${address.slice(0, 6)}…${address.slice(-4)}`;
    }
    return null;
}

export function parseDetails(value: string | null | undefined): PayoutDetails | null {
    if (!value) return null;
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' ? parsed as PayoutDetails : null;
    } catch {
        return null;
    }
}
