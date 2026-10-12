// Typed client for the payout-operations API (/api/payouts, /api/recipients, /api/team).

import apiClient from "@/lib/api-client";

export interface Money { currency: string; amountMinor: number }
export interface Issue { code: string; severity: "error" | "warning" | "info"; message: string }

export interface Movement {
    id: string; reference: string; runId: string | null; recipientId: string | null; recipientName: string; externalReference: string | null;
    amountMinor: number; currency: string; payoutMethod: string; payoutMethodLabel: string; destination: string | null; country: string | null;
    sourceCurrency: string; sourceAmountMinor: number | null; feeMinor: number | null; fxRate: string | null; quotedAt: string | null; quoteExpiresAt: string | null;
    provider: string | null; rail: string | null; providerReference: string | null; state: string; issues: Issue[]; acknowledgedIssues: string[];
    requiresApproval: boolean; exceptionType: string | null; failureReason: string | null; holdReason: string | null; attempt: number;
    deliveredAmountMinor: number | null; submittedAt: string | null; deliveredAt: string | null; failedAt: string | null; resolvedAt: string | null;
    isSample: boolean; createdAt: string; updatedAt: string;
    run?: { id?: string; reference: string; name: string; status?: string } | null;
}

export interface Reconciliation {
    requested: number; delivered: number; processing: number; failed: number; onHold: number; cancelled: number;
    expected: Money[]; deliveredTotals: Money[]; outstandingTotals: Money[]; fundingCurrency: string; fundingCostMinor: number; feesMinor: number;
    reconciledAt: string | null; canReconcile: boolean;
}

export interface RunSummary {
    id: string; reference: string; name: string; purpose: string | null; status: string; scheduledFor: string | null; fundingCurrency: string;
    requiredApprovals: number; policySummary: string | null; createdByName: string; createdById: string; submittedById: string | null;
    submittedAt: string | null; approvedAt: string | null; executedAt: string | null; completedAt: string | null; reconciledAt: string | null; cancelledAt: string | null;
    createdAt: string; updatedAt: string; isSample: boolean; payoutCount: number; recipientCount: number; totals: Money[];
    fundingRequiredMinor: number; feesMinor: number; methods: string[];
    validation: { total: number; ready: number; needsCorrection: number; needsReview: number };
    reconciliation: Reconciliation;
}

export interface Approval { id: string; actorId: string; actorName: string; decision: "approved" | "rejected"; comment: string | null; selfApproval: boolean; beforeStatus: string; afterStatus: string; createdAt: string }
export interface ActivityEvent { id: string; action: string; entityType: string; entityId: string | null; actorId: string | null; actorName: string | null; requestId: string | null; metadata: Record<string, unknown>; createdAt: string }

export interface RunDetail extends RunSummary {
    movements: Movement[]; approvals: Approval[]; approvalsReceived: number; events: ActivityEvent[];
    viewer: { hasApproved: boolean; isSubmitter: boolean; selfApprovalAllowed: boolean };
    approverCapacity: number;
    funding: { currency: string; availableMinor: number; reservedMinor: number; isSandbox: boolean };
}

export interface Recipient {
    id: string; name: string; email: string; phone: string | null; type: string; title: string | null; country: string | null; countryName: string | null;
    status: string; verification: "verified" | "pending" | "failed" | "unverified"; payoutMethod: string | null; payoutMethodLabel: string | null;
    payoutCurrency: string | null; destination: string | null; detailsUpdatedAt: string | null; isSample: boolean; createdAt: string;
    lastPayout?: { amountMinor: number; currency: string; deliveredAt: string } | null; pendingCount?: number; failedCount?: number; heldCount?: number; nextAction?: string | null;
}
export interface RecipientDetail extends Recipient {
    verifiedAt: string | null; totalsPaid: Money[]; pending: Movement[]; exceptions: Movement[]; history: Movement[]; detailChanges: ActivityEvent[]; events: ActivityEvent[];
}

export interface Funding { currency: string; availableMinor: number; reservedMinor: number; requiredForUpcomingMinor: number; shortfallMinor: number; upcomingRuns: Array<{ id: string; reference: string; name: string; scheduledFor: string | null }>; isSandbox: boolean }

export interface AttentionItem { kind: string; title: string; detail: string; since: string | null; href: string; action: string }
export interface HomeData {
    attention: AttentionItem[]; nextRun: RunSummary | null; moneyInMotion: RunSummary[]; funding: Funding; recentActivity: ActivityEvent[];
    onboarding: { isNew: boolean; steps: Array<{ key: string; label: string; done: boolean; href: string }> }; team: { members: number }; viewerId: string;
}

export interface ExceptionItem extends Movement { title: string; whatHappened: string | null; moneyMoved: string; nextStep: string; requiresReapproval: boolean; whoCanAct: string; actions: string[] }

export interface Policy { currency: string; singleApprovalAboveMinor: number; dualApprovalAboveMinor: number; newRecipientRequiresApproval: boolean; changedDetailsRequiresApproval: boolean; allowSelfApproval: boolean; configured: boolean; updatedAt: string | null }

export interface PayoutConfig {
    methods: Array<{ id: string; label: string; description: string }>;
    corridors: Array<{ country: string; name: string; currencies: Array<{ currency: string; methods: string[] }> }>;
    currencies: Array<{ code: string; exponent: number }>;
    sandboxRatesPerUsd: Record<string, string>;
    sandboxOutcomes: Array<{ trigger: string; outcome: string }>;
    provider: { id: string; name: string; live: boolean };
}

export interface ReportsData {
    hasData: boolean;
    metrics: {
        runsSubmitted: number; runsCompleted: number; payoutsSubmitted: number; deliveredCount: number; deliveredTotals: Money[]; deliveredUsdMinor: number;
        failureRate: number | null; openFailures?: number; exceptionRate: number | null; averageApprovalMs: number | null; averageResolutionMs: number | null; unreconciledTotals: Money[]; providerFeesUsdMinor: number;
    };
    byMethod: Array<{ key: string; count: number; deliveredCount: number; failedCount: number; usdMinor: number }>;
    byCorridor: Array<{ key: string; count: number; deliveredCount: number; failedCount: number; usdMinor: number }>;
    deliveredByWeek: Array<{ week: string; usdMinor: number }>;
    rows: Array<Movement & { runReference: string | null }>;
}

export interface TeamMember { id: string; name: string; email: string; role: string; status: string; lastLogin: string | null; createdAt: string }

const http = () => apiClient.http;
const get = async <T,>(url: string, params?: Record<string, unknown>) => (await http().get<T>(url, { params })).data;
const post = async <T,>(url: string, body?: unknown) => (await http().post<T>(url, body ?? {})).data;

export const payoutsApi = {
    config: () => get<PayoutConfig>("/payouts/config"),
    home: () => get<HomeData>("/payouts/home"),
    activity: (params: { entityType?: string; cursor?: string; limit?: number } = {}) => get<{ items: ActivityEvent[]; nextCursor: string | null }>("/payouts/activity", params),
    reports: (params: Record<string, string | undefined>) => get<ReportsData>("/payouts/reports", params),
    reportsExportUrl: (params: Record<string, string | undefined>) => {
        const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value) as Array<[string, string]>).toString();
        return `${http().defaults.baseURL}/payouts/reports/export${query ? `?${query}` : ""}`;
    },
    runs: (status?: string) => get<RunSummary[]>("/payouts/runs", status ? { status } : undefined),
    run: (id: string) => get<RunDetail>(`/payouts/runs/${id}`),
    createRun: (body: { name: string; purpose?: string; scheduledFor?: string | null }) => post<RunSummary>("/payouts/runs", body),
    updateRun: (id: string, body: { name?: string; purpose?: string; scheduledFor?: string | null }) => http().patch(`/payouts/runs/${id}`, body).then((r) => r.data),
    addItems: (id: string, items: Array<{ recipientId: string; amount: string; currency?: string; externalReference?: string }>) => post(`/payouts/runs/${id}/items`, { items }),
    importItems: (id: string, rows: Array<{ name?: string; email?: string; amount?: string; currency?: string; reference?: string }>) => post<{ rows: number; matched: number; unknown: number; ambiguous?: number; invalidAmounts: number; skippedBlank?: number }>(`/payouts/runs/${id}/items/import`, { rows }),
    updateItem: (id: string, movementId: string, body: { amount?: string; currency?: string; externalReference?: string | null; recipientId?: string }) => http().patch(`/payouts/runs/${id}/items/${movementId}`, body).then((r) => r.data),
    removeItem: (id: string, movementId: string) => http().delete(`/payouts/runs/${id}/items/${movementId}`).then((r) => r.data),
    acknowledge: (id: string, movementId: string, codes: string[]) => post(`/payouts/runs/${id}/items/${movementId}/acknowledge`, { codes }),
    submit: (id: string) => post(`/payouts/runs/${id}/submit`),
    approve: (id: string, comment?: string) => post(`/payouts/runs/${id}/approve`, { comment }),
    reject: (id: string, comment: string) => post(`/payouts/runs/${id}/reject`, { comment }),
    execute: (id: string) => post(`/payouts/runs/${id}/execute`),
    cancel: (id: string, reason?: string) => post(`/payouts/runs/${id}/cancel`, { reason }),
    reconcile: (id: string, note?: string) => post(`/payouts/runs/${id}/reconcile`, { note }),
    runExport: async (id: string, format: "ledger" | "journal" | "receipt") => (await http().get<Blob>(`/payouts/runs/${id}/export`, { params: { format }, responseType: "blob" })).data,
    reportsExport: async (params: Record<string, string | undefined>) => (await http().get<Blob>("/payouts/reports/export", { params, responseType: "blob" })).data,
    movements: (params: { state?: string; runId?: string; recipientId?: string; q?: string; limit?: number } = {}) => get<Movement[]>("/payouts/movements", params),
    movement: (id: string) => get<Movement & { run: { id: string; reference: string; name: string; status: string; requiredApprovals: number; reconciledAt: string | null } | null; recipient: Recipient | null; approvals: Approval[]; events: ActivityEvent[] }>(`/payouts/movements/${id}`),
    retry: (id: string) => post(`/payouts/movements/${id}/retry`),
    cancelMovement: (id: string, reason?: string) => post(`/payouts/movements/${id}/cancel`, { reason }),
    release: (id: string, comment?: string) => post(`/payouts/movements/${id}/release`, { comment }),
    approvals: () => get<{ policy: Policy; runs: Array<RunSummary & { approvalsReceived: number; approvers: Array<{ name: string; at: string; selfApproval: boolean }>; viewerCanApprove: boolean; viewerBlockedReason: string | null }>; heldPayouts: Array<Movement & { newDestination: string | null }> }>("/payouts/approvals"),
    exceptions: () => get<{ payouts: ExceptionItem[]; runsNeedingCorrection: RunSummary[] }>("/payouts/exceptions"),
    reconciliation: () => get<RunSummary[]>("/payouts/reconciliation"),
    policy: () => get<Policy>("/payouts/policy"),
    updatePolicy: (body: { currency: string; singleApprovalAbove: string; dualApprovalAbove: string; newRecipientRequiresApproval: boolean; changedDetailsRequiresApproval: boolean; allowSelfApproval: boolean }) => http().put("/payouts/policy", body).then((r) => r.data),
    funding: () => get<Funding>("/payouts/funding"),
    addSandboxFunds: (amount: string) => post("/payouts/funding/sandbox", { amount }),
    sampleStatus: () => get<{ loaded: boolean }>("/payouts/sandbox/sample"),
    loadSample: () => post("/payouts/sandbox/sample"),
    removeSample: () => http().delete("/payouts/sandbox/sample").then((r) => r.data),

    recipients: (params: { q?: string; status?: string } = {}) => get<Recipient[]>("/recipients", params),
    recipient: (id: string) => get<RecipientDetail>(`/recipients/${id}`),
    createRecipient: (body: Record<string, unknown>) => post<Recipient>("/recipients", body),
    updateRecipient: (id: string, body: Record<string, unknown>) => http().put<{ recipient: Recipient; detailsChanged: boolean; paymentsHeld: number }>(`/recipients/${id}`, body).then((r) => r.data),
    archiveRecipient: (id: string) => post(`/recipients/${id}/archive`),
    restoreRecipient: (id: string) => post(`/recipients/${id}/restore`),
    verifyRecipient: (id: string) => post<{ recipient: Recipient; problems: string[] }>(`/recipients/${id}/verify`),

    team: () => get<{ members: TeamMember[]; roles: Record<string, string>; viewerId: string; invitations: { available: boolean; reason: string } }>("/team"),
    setRole: (id: string, role: string) => http().put(`/team/${id}/role`, { role }).then((r) => r.data),
};
