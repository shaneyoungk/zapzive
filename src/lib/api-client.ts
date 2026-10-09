import axios, { AxiosInstance, AxiosError } from 'axios';

const configuredApiUrl = import.meta.env.VITE_API_URL as string | undefined;
const isLocalBrowser = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
// A stale deployment URL in a developer's .env must not silently route a
// localhost session away from the local API. This is especially important for
// wallet challenges: the signature prompt must be created by the same backend
// that owns the active local session.
const API_BASE_URL = isLocalBrowser ? 'http://localhost:3001' : (configuredApiUrl || 'http://localhost:3001');
export const AUTH_STORAGE_KEY = 'zapzive_auth_token';

export interface CryptoAsset {
    symbol: string;
    kind: 'erc20' | 'native' | 'sandbox';
    tokenAddress: string;
    decimals: number;
    enabled: boolean;
    reason: string | null;
}

export interface CryptoNetwork {
    chainId: number;
    name: string;
    kind: 'onchain' | 'sandbox';
    testnet: boolean;
    tokenAddress: string;
    symbol: string;
    decimals: number;
    explorerUrl: string;
    nativeSymbol: string;
    assets: CryptoAsset[];
    enabled: boolean;
    reason: string | null;
    walletAddParams: {
        chainId: string;
        chainName: string;
        nativeCurrency: { name: string; symbol: string; decimals: number };
        rpcUrls: string[];
        blockExplorerUrls?: string[];
    } | null;
}

export interface CryptoWallet {
    id: string;
    chainId: number;
    address: string;
    createdAt: string;
}

export interface CryptoPayment {
    id: string;
    chainId: number;
    tokenAddress: string;
    symbol: string;
    decimals: number;
    fromAddress: string;
    toAddress: string;
    amount: string;
    amountUnits: string;
    reference: string | null;
    status: 'awaiting_signature' | 'submitted' | 'confirming' | 'settled' | 'failed' | 'reorged';
    txHash: string | null;
    nonce: number | null;
    blockNumber: string | null;
    confirmations: number;
    errorCode: string | null;
    createdAt: string;
    updatedAt: string;
    expiresAt: string;
    explorerUrl: string | null;
}

export interface CreateCryptoPayment {
    walletId: string;
    to: string;
    amount: string;
    asset?: string;
    reference?: string;
}

export interface PreparedCryptoPayment {
    payment: CryptoPayment;
    transaction: { from: string; to: string; data: string; value: string; chainId: string };
}

export interface CryptoBalances {
    chainId: number;
    address: string;
    simulated: boolean;
    asset: { symbol: string; kind: 'erc20' | 'native' | 'sandbox'; decimals: number; amount: string; amountUnits: string };
    feeAsset: { symbol: string; decimals: number; amount: string; amountUnits: string };
    asOf: string;
}

function createRequestKey(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return 'req_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2);
}

class ApiClient {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: `${API_BASE_URL}/api`,
            withCredentials: true,
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 30000,
        });

        // Request interceptor
        this.client.interceptors.request.use(
            (config) => {
                // Add auth token if available
                const token = sessionStorage.getItem(AUTH_STORAGE_KEY);
                if (token && token !== 'cookie') {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                const method = (config.method || 'get').toLowerCase();
                if (method !== 'get' && method !== 'head' && method !== 'options' && !config.url?.startsWith('/auth/')) {
                    config.headers['Idempotency-Key'] = config.headers['Idempotency-Key'] || createRequestKey();
                }
                if (method !== 'get' && method !== 'head' && method !== 'options') {
                    config.headers['X-Requested-With'] = 'XMLHttpRequest';
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Response interceptor
        this.client.interceptors.response.use(
            (response) => response,
            (error: AxiosError) => {
                const errorCode = (error.response?.data as { code?: string } | undefined)?.code;
                if (error.response?.status === 401 && errorCode === 'SESSION_INVALID') {
                    // Only an explicitly invalid or expired session should sign the
                    // user out. A failed page request must not erase their session.
                    sessionStorage.removeItem(AUTH_STORAGE_KEY);
                    sessionStorage.removeItem('user');
                    sessionStorage.removeItem('company');
                    window.location.href = '/login';
                }
                return Promise.reject(error);
            }
        );
    }

    // Authentication
    async signup(payload: { email: string; name: string; password: string; companyName: string; country: string }) {
        const { data } = await this.client.post('/auth/signup', payload);
        return data;
    }

    async login(payload: { email: string; password: string }) {
        const { data } = await this.client.post('/auth/login', payload);
        return data;
    }

    async getSession() {
        const { data } = await this.client.get('/auth/session');
        return data;
    }

    async verifyEmail(email: string) {
        const { data } = await this.client.post('/auth/verify-email', { email });
        return data;
    }

    async completeOnboarding(payload: { companyId: string; phone: string; address: string; businessType: string; monthlyVolume: string }) {
        const { data } = await this.client.post('/auth/complete-onboarding', payload);
        return data;
    }

    async logout() {
        const { data } = await this.client.post('/auth/logout');
        return data;
    }

    // Dashboard
    async getDashboardStats() {
        const { data } = await this.client.get('/dashboard/stats');
        return data;
    }

    async getBalance() {
        const { data } = await this.client.get('/dashboard/balance');
        return data;
    }

    async getTransactions(params?: { limit?: number; type?: string; status?: string }) {
        const { data } = await this.client.get('/dashboard/transactions', { params });
        return data;
    }

    async getActivity(params?: { limit?: number }) {
        const { data } = await this.client.get('/dashboard/activity', { params });
        return data;
    }

    // Remittance
    async getRemittances(params?: { status?: string; search?: string }) {
        const { data } = await this.client.get('/remittance', { params });
        return data;
    }

    async createRemittance(remittanceData: any) {
        const { data } = await this.client.post('/remittance', remittanceData);
        return data;
    }

    async getRemittanceQuote(payload: { amount: number; currency?: string; localCurrency: string }) {
        const { data } = await this.client.post('/remittance/quote', payload);
        return data;
    }

    async getRemittance(id: string) {
        const { data } = await this.client.get(`/remittance/${id}`);
        return data;
    }

    async cancelRemittance(id: string) {
        const { data } = await this.client.post(`/remittance/${id}/cancel`);
        return data;
    }

    async getRecipients() {
        const { data } = await this.client.get('/remittance/recipients/list');
        return data;
    }

    async addRecipient(recipientData: any) {
        const { data } = await this.client.post('/remittance/recipients/add', recipientData);
        return data;
    }

    // Payroll
    async getPayrollBatches(params?: { status?: string }) {
        const { data } = await this.client.get('/payroll/batches', { params });
        return data;
    }

    async getPayrollBatch(id: string) {
        const { data } = await this.client.get(`/payroll/batches/${id}`);
        return data;
    }

    async createPayrollBatch(batchData: any) {
        const { data } = await this.client.post('/payroll/batches', batchData);
        return data;
    }

    async updatePayrollBatch(id: string, batchData: any) {
        const { data } = await this.client.put(`/payroll/batches/${id}`, batchData);
        return data;
    }

    async approveBatch(id: string) {
        const { data } = await this.client.post(`/payroll/batches/${id}/approve`);
        return data;
    }

    async executeBatch(id: string) {
        const { data } = await this.client.post(`/payroll/batches/${id}/execute`);
        return data;
    }

    async getWorkers(params?: { search?: string; kycStatus?: string }) {
        const { data } = await this.client.get('/payroll/workers', { params });
        return data;
    }

    async addWorker(workerData: any) {
        const { data } = await this.client.post('/payroll/workers', workerData);
        return data;
    }

    async updateWorker(id: string, workerData: any) {
        const { data } = await this.client.put(`/payroll/workers/${id}`, workerData);
        return data;
    }

    async deleteWorker(id: string) {
        const { data } = await this.client.delete(`/payroll/workers/${id}`);
        return data;
    }

    // Treasury
    async getAssets() {
        const { data } = await this.client.get('/treasury/assets');
        return data;
    }

    async getPortfolio() {
        const { data } = await this.client.get('/treasury/portfolio');
        return data;
    }

    async executeSwap(swapData: any) {
        const { data } = await this.client.post('/treasury/swap', swapData);
        return data;
    }

    async deposit(depositData: any) {
        const { data } = await this.client.post('/treasury/deposit', depositData);
        return data;
    }

    async withdraw(withdrawData: any) {
        const { data } = await this.client.post('/treasury/withdraw', withdrawData);
        return data;
    }

    // Escrow
    async getContracts(params?: { status?: string }) {
        const { data } = await this.client.get('/escrow/contracts', { params });
        return data;
    }

    async createContract(contractData: any) {
        const { data } = await this.client.post('/escrow/contracts', contractData);
        return data;
    }

    async getContract(id: string) {
        const { data } = await this.client.get(`/escrow/contracts/${id}`);
        return data;
    }

    async releaseFunds(contractId: string, releaseData: any) {
        const { data } = await this.client.post(`/escrow/contracts/${contractId}/release`, releaseData);
        return data;
    }

    async acceptContractBid(contractId: string, bidId: string) {
        const { data } = await this.client.put(`/escrow/contracts/${contractId}/bids/${bidId}/accept`);
        return data;
    }

    async rejectContractBid(contractId: string, bidId: string) {
        const { data } = await this.client.put(`/escrow/contracts/${contractId}/bids/${bidId}/reject`);
        return data;
    }

    async updateContractMilestone(contractId: string, milestoneId: string, payload: { status?: string; title?: string; description?: string; amount?: number; dueDate?: string }) {
        const { data } = await this.client.put(`/escrow/contracts/${contractId}/milestones/${milestoneId}`, payload);
        return data;
    }

    async raiseDispute(contractId: string, disputeData: any) {
        const { data } = await this.client.post(`/escrow/contracts/${contractId}/dispute`, disputeData);
        return data;
    }

    // Analytics
    async getAnalyticsOverview() {
        const { data } = await this.client.get('/analytics/overview');
        return data;
    }

    async getTransactionAnalytics(params?: { period?: string }) {
        const { data } = await this.client.get('/analytics/transactions', { params });
        return data;
    }

    async getRevenueAnalytics() {
        const { data } = await this.client.get('/analytics/revenue');
        return data;
    }

    async getGeographyAnalytics() {
        const { data } = await this.client.get('/analytics/geography');
        return data;
    }

    async exportAnalytics(params?: { format?: string; type?: string }) {
        const { data } = await this.client.get('/analytics/export', { params });
        return data;
    }

    // Compliance
    async getComplianceItems(params?: { type?: string; status?: string; riskLevel?: string }) {
        const { data } = await this.client.get('/compliance/items', { params });
        return data;
    }

    async submitKYC(kycData: any) {
        const { data } = await this.client.post('/compliance/kyc', kycData);
        return data;
    }

    async runAML(amlData: any) {
        const { data } = await this.client.post('/compliance/aml', amlData);
        return data;
    }

    async getComplianceReports(params?: { startDate?: string; endDate?: string }) {
        const { data } = await this.client.get('/compliance/reports', { params });
        return data;
    }

    // Agents
    async getAgents(params?: { status?: string; search?: string }) {
        const { data } = await this.client.get('/agents', { params });
        return data;
    }

    async registerAgent(agentData: any) {
        const { data } = await this.client.post('/agents', agentData);
        return data;
    }

    async getAgent(id: string) {
        const { data } = await this.client.get(`/agents/${id}`);
        return data;
    }

    async activateAgent(id: string) {
        const { data } = await this.client.post(`/agents/${id}/activate`);
        return data;
    }

    async deactivateAgent(id: string) {
        const { data } = await this.client.post(`/agents/${id}/deactivate`);
        return data;
    }

    // Settings
    async getProfile() {
        const { data } = await this.client.get('/settings/profile');
        return data;
    }

    async updateProfile(profileData: any) {
        const { data } = await this.client.put('/settings/profile', profileData);
        return data;
    }

    async getApiKeys() {
        const { data } = await this.client.get('/settings/api-keys');
        return data;
    }

    async generateApiKey(keyData: any) {
        const { data } = await this.client.post('/settings/api-keys', keyData);
        return data;
    }

    async revokeApiKey(id: string) {
        const { data } = await this.client.delete(`/settings/api-keys/${id}`);
        return data;
    }

    async getWebhooks() {
        const { data } = await this.client.get('/settings/webhooks');
        return data;
    }

    async createWebhook(webhookData: any) {
        const { data } = await this.client.post('/settings/webhooks', webhookData);
        return data;
    }

    async updateWebhook(id: string, webhookData: any) {
        const { data } = await this.client.put(`/settings/webhooks/${id}`, webhookData);
        return data;
    }

    async deleteWebhook(id: string) {
        const { data } = await this.client.delete(`/settings/webhooks/${id}`);
        return data;
    }

    async getUsageMetrics() {
        const { data } = await this.client.get('/settings/metrics');
        return data;
    }

    // Crypto rails: signing stays in the user's injected wallet.
    async getCryptoNetworks() {
        const { data } = await this.client.get<{ networks: CryptoNetwork[]; mode: 'testnet' | 'live'; signing: 'external-wallet' }>('/crypto/networks');
        return data;
    }

    async getCryptoWallets() {
        const { data } = await this.client.get<CryptoWallet[]>('/crypto/wallets');
        return data;
    }

    async createCryptoWalletChallenge(payload: { chainId: number; address: string }) {
        const { data } = await this.client.post<{ id: string; message: string; expiresAt: string }>('/crypto/wallets/challenge', payload);
        return data;
    }

    async verifyCryptoWallet(payload: { challengeId: string; signature: string }) {
        const { data } = await this.client.post<CryptoWallet>('/crypto/wallets/verify', payload);
        return data;
    }

    async getCryptoBalances(params: { chainId: number; address: string; asset?: string }) {
        const { data } = await this.client.get<CryptoBalances>('/crypto/balances', { params });
        return data;
    }

    async createCryptoPayment(payload: CreateCryptoPayment, idempotencyKey: string) {
        const { data } = await this.client.post<CryptoPayment>('/crypto/payments', payload, { headers: { 'Idempotency-Key': idempotencyKey } });
        return data;
    }

    async getCryptoPayments(params?: { limit?: number; cursor?: string }) {
        const { data } = await this.client.get<{ items: CryptoPayment[]; nextCursor: string | null }>('/crypto/payments', { params });
        return data;
    }

    async getCryptoPayment(id: string) {
        const { data } = await this.client.get<CryptoPayment>(`/crypto/payments/${encodeURIComponent(id)}`);
        return data;
    }

    async prepareCryptoPayment(id: string) {
        const { data } = await this.client.post<PreparedCryptoPayment>(`/crypto/payments/${encodeURIComponent(id)}/prepare`);
        return data;
    }

    async submitCryptoPayment(id: string, txHash: string, idempotencyKey: string) {
        const { data } = await this.client.post<CryptoPayment>(`/crypto/payments/${encodeURIComponent(id)}/submit`, { txHash }, { headers: { 'Idempotency-Key': idempotencyKey } });
        return data;
    }

    async reconcileCryptoPayment(id: string) {
        const { data } = await this.client.post<CryptoPayment>(`/crypto/payments/${encodeURIComponent(id)}/reconcile`);
        return data;
    }
}


export const apiClient = new ApiClient();
export default apiClient;
