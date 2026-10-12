// The Sandbox provider simulates an execution partner. Its quotes, fees,
// references and outcomes are deterministic so testers can reproduce
// failures, and every artefact it produces is labelled as sandbox.

import crypto from 'crypto';
import { SANDBOX_RATES_PER_USD, PAYOUT_METHODS } from '../catalog';
import { convertMinor, crossRate, percentOf } from '../money';
import type { PayoutProvider, Quote, QuoteRequest, SettlementOutcome, SubmitRequest, SubmitResult } from './types';

const QUOTE_TTL_MS = 15 * 60_000;

/** Fee schedule in source minor units: percentage in basis points with a minimum. */
const FEES: Record<string, { bps: number; minimumMinor: number; rail: string; delivery: string }> = {
    mpesa: { bps: 50, minimumMinor: 30, rail: 'sandbox-mpesa', delivery: 'Within minutes' },
    mobile_money: { bps: 100, minimumMinor: 40, rail: 'sandbox-mobile-money', delivery: 'Within minutes' },
    bank: { bps: 80, minimumMinor: 150, rail: 'sandbox-bank-transfer', delivery: 'Same or next business day' },
    usdc_wallet: { bps: 0, minimumMinor: 50, rail: 'sandbox-usdc', delivery: 'Within minutes' },
};

/** Documented, reproducible sandbox outcomes (shown on the Integrations page). */
export const SANDBOX_OUTCOME_RULES = [
    { trigger: 'Phone number ending in 0000', outcome: 'Fails: beneficiary account unavailable' },
    { trigger: 'Bank account number ending in 0000', outcome: 'Fails: beneficiary bank rejected the account' },
    { trigger: 'Wallet address ending in dead', outcome: 'Fails: destination wallet rejected the transfer' },
    { trigger: 'Anything else', outcome: 'Delivered after 4–20 seconds' },
];

function hashNumber(value: string): number {
    return crypto.createHash('sha256').update(value).digest().readUInt32BE(0);
}

export const sandboxProvider: PayoutProvider = {
    id: 'sandbox',
    name: 'Zapzive sandbox provider',
    sandbox: true,

    capabilities() {
        return { methods: Object.keys(PAYOUT_METHODS), currencies: Object.keys(SANDBOX_RATES_PER_USD) };
    },

    quote(request: QuoteRequest): Quote {
        const fee = FEES[request.payoutMethod] ?? FEES.bank;
        const principalMinor = convertMinor(request.destinationAmountMinor, request.destinationCurrency, request.sourceCurrency, SANDBOX_RATES_PER_USD, true);
        const feeMinor = Math.max(fee.minimumMinor, percentOf(principalMinor, fee.bps));
        const quotedAt = new Date();
        return {
            provider: this.id,
            rail: fee.rail,
            fxRate: crossRate(request.sourceCurrency, request.destinationCurrency, SANDBOX_RATES_PER_USD),
            principalMinor,
            feeMinor,
            totalMinor: principalMinor + feeMinor,
            quotedAt,
            expiresAt: new Date(quotedAt.getTime() + QUOTE_TTL_MS),
            estimatedDelivery: fee.delivery,
            sandbox: true,
        };
    },

    submit(request: SubmitRequest): SubmitResult {
        const delaySeconds = 4 + (hashNumber(request.reference + request.movementId) % 17);
        return {
            providerReference: `SBX-${crypto.randomBytes(5).toString('hex').toUpperCase()}`,
            expectedSettlementAt: new Date(Date.now() + delaySeconds * 1000),
        };
    },

    settle(request: SubmitRequest): SettlementOutcome {
        const details = request.details ?? {};
        const phone = typeof details.phone === 'string' ? details.phone : '';
        const account = typeof details.accountNumber === 'string' ? details.accountNumber : '';
        const wallet = typeof details.walletAddress === 'string' ? details.walletAddress.toLowerCase() : '';
        if (phone.endsWith('0000')) return { status: 'failed', exceptionType: 'recipient_unavailable', reason: 'Beneficiary account unavailable. The mobile wallet could not receive funds.' };
        if (account.endsWith('0000')) return { status: 'failed', exceptionType: 'invalid_account', reason: 'Beneficiary bank rejected the account. Check the account number with the recipient.' };
        if (wallet.endsWith('dead')) return { status: 'failed', exceptionType: 'provider_failure', reason: 'Destination wallet rejected the transfer.' };
        return { status: 'delivered', deliveredAmountMinor: request.destinationAmountMinor };
    },
};

export function providerFor(_method: string): PayoutProvider {
    // Single provider today. Routing across licensed providers plugs in here.
    return sandboxProvider;
}
