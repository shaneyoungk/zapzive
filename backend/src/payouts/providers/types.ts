// Provider adapter contract. Zapzive controls preparation, approval, state and
// reconciliation; a provider (sandbox today, licensed rails later) executes.

export interface QuoteRequest {
    sourceCurrency: string;
    destinationCurrency: string;
    destinationAmountMinor: number;
    payoutMethod: string;
    country: string | null;
}

export interface Quote {
    provider: string;
    rail: string;
    fxRate: string; // destination units per 1 source unit
    principalMinor: number; // source units needed for the destination amount
    feeMinor: number; // source units
    totalMinor: number; // principal + fee
    quotedAt: Date;
    expiresAt: Date;
    estimatedDelivery: string;
    sandbox: boolean;
}

export interface SubmitRequest {
    movementId: string;
    reference: string;
    payoutMethod: string;
    destinationAmountMinor: number;
    currency: string;
    details: Record<string, unknown> | null;
}

export interface SubmitResult {
    providerReference: string;
    /** When the provider is expected to report a final outcome. */
    expectedSettlementAt: Date;
}

export type SettlementOutcome =
    | { status: 'delivered'; deliveredAmountMinor: number }
    | { status: 'failed'; exceptionType: string; reason: string };

export interface PayoutProvider {
    id: string;
    name: string;
    sandbox: boolean;
    capabilities(): { methods: string[]; currencies: string[] };
    quote(request: QuoteRequest): Quote;
    submit(request: SubmitRequest): SubmitResult;
    /** Outcome reported by the provider once settlement time has passed. */
    settle(request: SubmitRequest): SettlementOutcome;
}
