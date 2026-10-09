import { decodeFunctionResult, encodeFunctionData, erc20Abi, formatUnits, getAddress, isAddress, parseUnits, toHex, zeroAddress, type Address, type Hash, type Hex } from "viem";
import type { CreateCryptoPayment, CryptoBalances, CryptoNetwork, CryptoPayment, PreparedCryptoPayment } from "./api-client";

export interface InjectedProvider {
    request(args: { method: string; params?: readonly unknown[] | Record<string, unknown> }): Promise<unknown>;
    on?(event: string, listener: (...args: unknown[]) => void): void;
    removeListener?(event: string, listener: (...args: unknown[]) => void): void;
}

export interface DiscoveredWallet {
    id: string;
    name: string;
    provider: InjectedProvider;
}

export interface WalletConnection {
    wallet: DiscoveredWallet;
    address: Address;
    chainId: number;
}

// Keep discovery alive for the page lifetime, including late extension injection.
// Wallet metadata is untrusted: display names as text and never inject wallet SVGs.
const discovered = new Map<InjectedProvider, DiscoveredWallet>();
const discoveryListeners = new Set<(wallets: DiscoveredWallet[]) => void>();
let discoveryStarted = false;

function isProvider(value: unknown): value is InjectedProvider {
    return Boolean(value && typeof value === "object" && "request" in value && typeof value.request === "function");
}

function publishWallets() {
    const wallets = Array.from(discovered.values());
    discoveryListeners.forEach((listener) => listener(wallets));
}

function discoverLegacyWallets() {
    const ethereum = (window as Window & { ethereum?: InjectedProvider & { providers?: unknown[]; isRainbow?: boolean; isMetaMask?: boolean; isCoinbaseWallet?: boolean; isBraveWallet?: boolean } }).ethereum;
    const providers = ethereum?.providers?.length ? ethereum.providers : [ethereum];
    for (const provider of providers) {
        if (!isProvider(provider) || discovered.has(provider)) continue;
        const metadata = provider as InjectedProvider & { isRainbow?: boolean; isMetaMask?: boolean; isCoinbaseWallet?: boolean; isBraveWallet?: boolean };
        discovered.set(provider, {
            id: `injected-${discovered.size}`,
            name: metadata.isMetaMask ? "MetaMask" : metadata.isRainbow ? "Rainbow" : metadata.isCoinbaseWallet ? "Coinbase Wallet" : metadata.isBraveWallet ? "Brave Wallet" : "Browser wallet",
            provider,
        });
    }
    publishWallets();
}

export function subscribeWalletDiscovery(listener: (wallets: DiscoveredWallet[]) => void) {
    discoveryListeners.add(listener);
    if (!discoveryStarted) {
        discoveryStarted = true;
        window.addEventListener("eip6963:announceProvider", (event: Event) => {
            const detail = (event as CustomEvent).detail;
            if (!isProvider(detail?.provider) || typeof detail?.info?.uuid !== "string" || typeof detail?.info?.name !== "string") return;
            discovered.set(detail.provider, {
                id: detail.info.uuid,
                name: detail.info.name.slice(0, 80),
                provider: detail.provider,
            });
            publishWallets();
        });
        window.addEventListener("ethereum#initialized", discoverLegacyWallets);
    }
    rediscoverWallets();
    return () => { discoveryListeners.delete(listener); };
}

export function rediscoverWallets() {
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    discoverLegacyWallets();
}

export function parseChainId(value: unknown): number {
    if (typeof value !== "string" || !/^0x[0-9a-f]+$/i.test(value)) throw new Error("The wallet returned an invalid network.");
    const chainId = Number(BigInt(value));
    if (!Number.isSafeInteger(chainId) || chainId <= 0) throw new Error("The wallet returned an invalid network.");
    return chainId;
}

export function firstAccount(value: unknown): Address | null {
    if (!Array.isArray(value) || typeof value[0] !== "string" || !isAddress(value[0])) return null;
    return getAddress(value[0]);
}

export async function connectInjectedWallet(wallet: DiscoveredWallet): Promise<WalletConnection> {
    const address = firstAccount(await wallet.provider.request({ method: "eth_requestAccounts" }));
    if (!address) throw new Error("No account was shared. Unlock your wallet and connect an account.");
    const chainId = parseChainId(await wallet.provider.request({ method: "eth_chainId" }));
    return { wallet, address, chainId };
}

export async function signWalletChallenge(connection: WalletConnection, message: string, expiresAt: string) {
    if (!message || !Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.now()) throw new Error("Wallet verification expired. Request a new verification.");
    await assertWalletMatches(connection.wallet.provider, { sender: connection.address, chainId: connection.chainId });
    // `personal_sign` is the standard EIP-191 message flow implemented by
    // MetaMask. Calling the provider directly makes the ownership prompt
    // explicit and avoids accidentally treating a connection as a proof.
    const signature = await connection.wallet.provider.request({
        method: "personal_sign",
        params: [toHex(message), connection.address],
    });
    if (typeof signature !== "string" || !/^0x[0-9a-f]{130}$/i.test(signature)) {
        throw new Error("Your wallet did not return a valid ownership signature.");
    }
    return signature;
}

function validatedWalletAddParams(network: Pick<CryptoNetwork, "chainId" | "walletAddParams">) {
    const params = network.walletAddParams;
    if (!params || parseChainId(params.chainId) !== network.chainId || !params.chainName || !Number.isInteger(params.nativeCurrency?.decimals) || params.nativeCurrency.decimals < 0 || params.nativeCurrency.decimals > 255) return null;
    const rpcUrls = params.rpcUrls.filter((url) => {
        try { return new URL(url).protocol === "https:"; } catch { return false; }
    });
    if (!rpcUrls.length) return null;
    const blockExplorerUrls = (params.blockExplorerUrls || []).filter((url) => {
        try { return new URL(url).protocol === "https:"; } catch { return false; }
    });
    return { ...params, rpcUrls, ...(blockExplorerUrls.length ? { blockExplorerUrls } : {}) };
}

export async function switchWalletNetwork(provider: InjectedProvider, network: Pick<CryptoNetwork, "chainId" | "walletAddParams">): Promise<number> {
    const chainId = network.chainId;
    if (!Number.isSafeInteger(chainId) || chainId <= 0) throw new Error("Invalid payment network.");
    try {
        await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: `0x${chainId.toString(16)}` }] });
    } catch (error) {
        if (walletErrorCode(error) !== 4902) throw error;
        const params = validatedWalletAddParams(network);
        if (!params) throw new Error("This network cannot be safely added to your wallet. Add it from the wallet's official network directory, then try again.");
        await provider.request({ method: "wallet_addEthereumChain", params: [params] });
        await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: `0x${chainId.toString(16)}` }] });
    }
    const actualChain = parseChainId(await provider.request({ method: "eth_chainId" }));
    if (actualChain !== chainId) throw new Error("The wallet is still on a different network. Switch networks in your wallet.");
    return actualChain;
}

export function watchWallet(connection: WalletConnection, onChange: (connection: WalletConnection | null) => void) {
    const { provider } = connection.wallet;
    let current = connection;
    const accountsChanged = (value: unknown) => {
        const address = firstAccount(value);
        if (!address) return onChange(null);
        current = { ...current, address };
        onChange(current);
    };
    const chainChanged = (value: unknown) => {
        try {
            current = { ...current, chainId: parseChainId(value) };
            onChange(current);
        } catch { onChange(null); }
    };
    const disconnect = () => onChange(null);
    provider.on?.("accountsChanged", accountsChanged);
    provider.on?.("chainChanged", chainChanged);
    provider.on?.("disconnect", disconnect);
    return () => {
        provider.removeListener?.("accountsChanged", accountsChanged);
        provider.removeListener?.("chainChanged", chainChanged);
        provider.removeListener?.("disconnect", disconnect);
    };
}

export function exactTokenAmount(amount: string, decimals: number): bigint {
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) throw new Error("Invalid token precision.");
    if (!/^(0|[1-9]\d*)(\.\d+)?$/.test(amount) || (amount.split(".")[1]?.length ?? 0) > decimals) {
        throw new Error(`Enter a positive amount with at most ${decimals} decimal places. Scientific notation is not supported.`);
    }
    const units = parseUnits(amount, decimals);
    if (units <= 0n || units >= 2n ** 256n) throw new Error("Enter an amount within the token's supported range.");
    return units;
}

export function isTransactionHash(value: unknown): value is Hash {
    return typeof value === "string" && /^0x[0-9a-f]{64}$/i.test(value) && !/^0x0+$/i.test(value);
}

export interface ReviewedTransfer {
    chainId: number;
    sender: string;
    recipient: string;
    tokenAddress: string;
    amountUnits: string;
}

export async function assertWalletMatches(provider: InjectedProvider, transfer: Pick<ReviewedTransfer, "sender" | "chainId">) {
    const [accounts, chain] = await Promise.all([
        provider.request({ method: "eth_accounts" }),
        provider.request({ method: "eth_chainId" }),
    ]);
    const account = firstAccount(accounts);
    if (!account || account.toLowerCase() !== transfer.sender.toLowerCase()) throw new Error("Your wallet account changed. Reconnect the sender account before signing.");
    if (parseChainId(chain) !== transfer.chainId) throw new Error("Your wallet network changed. Switch to the payment network before signing.");
}

export async function readWalletBalances(provider: InjectedProvider, network: CryptoNetwork, symbol: string): Promise<CryptoBalances> {
    const account = firstAccount(await provider.request({ method: "eth_accounts" }));
    if (!account) throw new Error("Connect the wallet before reading balances.");
    const chainId = parseChainId(await provider.request({ method: "eth_chainId" }));
    if (chainId !== network.chainId) throw new Error(`Switch your wallet to ${network.name} to read balances.`);
    const assets = network.assets?.length ? network.assets : [
        { symbol: "USDC", kind: "erc20" as const, tokenAddress: network.tokenAddress, decimals: network.decimals, enabled: network.enabled, reason: network.reason },
        { symbol: network.nativeSymbol, kind: "native" as const, tokenAddress: zeroAddress, decimals: 18, enabled: network.enabled, reason: network.reason },
    ];
    const asset = assets.find((item) => item.symbol.toUpperCase() === symbol.toUpperCase());
    if (!asset) throw new Error(`${symbol} is not enabled on ${network.name}.`);
    const nativeRaw = BigInt(String(await provider.request({ method: "eth_getBalance", params: [account, "latest"] })));
    let assetRaw = nativeRaw;
    if (asset.kind === "erc20") {
        const data = encodeFunctionData({ abi: erc20Abi, functionName: "balanceOf", args: [account] });
        const result = await provider.request({ method: "eth_call", params: [{ to: getAddress(asset.tokenAddress), data }, "latest"] });
        if (typeof result !== "string" || !/^0x[0-9a-f]+$/i.test(result)) throw new Error(`The wallet did not return a valid ${asset.symbol} balance.`);
        assetRaw = decodeFunctionResult({ abi: erc20Abi, functionName: "balanceOf", data: result as Hex });
    }
    return {
        chainId: network.chainId,
        address: account,
        simulated: false,
        asset: { symbol: asset.symbol, kind: asset.kind, decimals: asset.decimals, amount: formatUnits(assetRaw, asset.decimals), amountUnits: assetRaw.toString() },
        feeAsset: { symbol: network.nativeSymbol, decimals: 18, amount: formatUnits(nativeRaw, 18), amountUnits: nativeRaw.toString() },
        asOf: new Date().toISOString(),
    };
}

/** Exactly one wallet send; callers must persist an attempt before invoking it. */
export async function sendReviewedTransfer(provider: InjectedProvider, transfer: ReviewedTransfer): Promise<Hash> {
    if (![transfer.sender, transfer.recipient, transfer.tokenAddress].every((address) => isAddress(address))) throw new Error("The payment contains an invalid address.");
    if (!/^[1-9]\d*$/.test(transfer.amountUnits) || BigInt(transfer.amountUnits) >= 2n ** 256n) throw new Error("The payment contains an invalid token amount.");
    await assertWalletMatches(provider, transfer);
    const native = transfer.tokenAddress.toLowerCase() === zeroAddress;
    const hash = await provider.request({
        method: "eth_sendTransaction",
        params: [{
            from: getAddress(transfer.sender),
            to: getAddress(native ? transfer.recipient : transfer.tokenAddress),
            chainId: `0x${transfer.chainId.toString(16)}`,
            value: native ? `0x${BigInt(transfer.amountUnits).toString(16)}` : "0x0",
            data: native ? "0x" : encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [getAddress(transfer.recipient), BigInt(transfer.amountUnits)] }),
        }],
    });
    if (!isTransactionHash(hash)) throw new Error("Your wallet did not return a transaction hash. Check wallet activity before taking any further action.");
    return hash;
}

export function walletErrorCode(error: unknown): number | undefined {
    if (!error || typeof error !== "object") return undefined;
    if ("code" in error && (typeof error.code === "number" || typeof error.code === "string")) return Number(error.code);
    return "cause" in error ? walletErrorCode(error.cause) : undefined;
}

export function cryptoErrorMessage(error: unknown): string {
    const code = walletErrorCode(error);
    if (code === 4001) return "Request declined in your wallet. No automatic retry will occur.";
    if (code === -32002) return "A request is already open in your wallet. Open the extension to finish it.";
    if (code === 4902) return "Add this network in your wallet's network settings, then try switching again.";
    if (code === 4900 || code === 4901) return "The wallet disconnected. Reconnect it and check the selected network.";
    if (error && typeof error === "object" && "response" in error) {
        const response = error.response as { data?: { error?: unknown; message?: unknown } };
        const message = response?.data?.error ?? response?.data?.message;
        if (typeof message === "string") return message.slice(0, 500);
    }
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message.slice(0, 500);
    return error instanceof Error ? error.message.slice(0, 500) : "Something went wrong. Please try again.";
}

export function safeExplorerUrl(baseUrl: string | null | undefined, hash: string): string | undefined {
    if (!baseUrl || !isTransactionHash(hash)) return undefined;
    try {
        const url = new URL(baseUrl);
        if (url.protocol !== "https:" || url.username || url.password) return undefined;
        url.pathname = `${url.pathname.replace(/\/tx\/[^/]+\/?$/, "").replace(/\/$/, "")}/tx/${hash}`;
        url.search = "";
        url.hash = "";
        return url.href;
    } catch { return undefined; }
}

export function validatePreparedPayment(reviewed: CryptoPayment, prepared: PreparedCryptoPayment, network: CryptoNetwork): ReviewedTransfer {
    const { payment, transaction } = prepared;
    const unchanged = (["id", "chainId", "tokenAddress", "symbol", "decimals", "fromAddress", "toAddress", "amount", "amountUnits", "expiresAt"] as const)
        .every((key) => payment[key] === reviewed[key]);
    if (!unchanged) throw new Error("Payment details changed. Reload the payment and review it again.");
    if (payment.status !== "awaiting_signature" || payment.txHash) throw new Error("This payment is no longer awaiting a signature. Refresh its status.");
    if (!Number.isFinite(Date.parse(payment.expiresAt)) || Date.parse(payment.expiresAt) <= Date.now()) throw new Error("This payment intent has expired. Create a new intent after checking wallet activity.");
    const assets = network.assets?.length ? network.assets : [
        { symbol: "USDC", kind: "erc20" as const, tokenAddress: network.tokenAddress, decimals: network.decimals, enabled: network.enabled, reason: network.reason },
        { symbol: network.nativeSymbol, kind: "native" as const, tokenAddress: zeroAddress, decimals: 18, enabled: network.enabled, reason: network.reason },
    ];
    const expectedAsset = assets.find((asset) => asset.symbol.toUpperCase() === payment.symbol.toUpperCase());
    if (!network.enabled || !expectedAsset || !expectedAsset.enabled || payment.chainId !== network.chainId || payment.tokenAddress.toLowerCase() !== expectedAsset.tokenAddress.toLowerCase() || payment.decimals !== expectedAsset.decimals || payment.symbol.toUpperCase() !== expectedAsset.symbol.toUpperCase()) {
        throw new Error(`The payment does not match an enabled ${payment.symbol || "asset"} rail on this network.`);
    }
    if (![payment.fromAddress, payment.toAddress, payment.tokenAddress].every((address) => isAddress(address))) throw new Error("The payment contains an invalid address.");
    if (/^0x0{40}$/i.test(payment.toAddress)) throw new Error("The destination cannot be the zero address.");
    if (exactTokenAmount(payment.amount, payment.decimals).toString() !== payment.amountUnits) throw new Error("Payment amount and token units do not match.");
    const native = expectedAsset.kind === "native";
    let transactionValue: bigint;
    try { transactionValue = BigInt(transaction.value); } catch { throw new Error("The prepared transaction has an invalid value. Signing was stopped."); }
    if (transaction.from.toLowerCase() !== payment.fromAddress.toLowerCase() || parseChainId(transaction.chainId) !== payment.chainId) throw new Error("The prepared transaction does not match the reviewed sender or network. Signing was stopped.");
    if (native) {
        if (transaction.to.toLowerCase() !== payment.toAddress.toLowerCase() || transaction.data.toLowerCase() !== "0x" || transactionValue !== BigInt(payment.amountUnits)) throw new Error(`The prepared transaction does not match the reviewed ${payment.symbol} transfer. Signing was stopped.`);
    } else {
        const expectedData = encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [getAddress(payment.toAddress), BigInt(payment.amountUnits)] });
        if (transaction.to.toLowerCase() !== payment.tokenAddress.toLowerCase() || transaction.data.toLowerCase() !== expectedData.toLowerCase() || transactionValue !== 0n) throw new Error("The prepared transaction does not match the reviewed token transfer. Signing was stopped.");
    }
    return { chainId: payment.chainId, sender: payment.fromAddress, recipient: payment.toAddress, tokenAddress: payment.tokenAddress, amountUnits: payment.amountUnits };
}

export interface PaymentRecovery {
    companyId: string;
    payment: CryptoPayment;
    phase: "wallet_pending" | "broadcast" | "saved";
    txHash: Hash | null;
    previousHashes?: Hash[];
    submitKey: string;
    updatedAt: number;
}

const recoveryMemory = new Map<string, PaymentRecovery>();
export const RECOVERY_EVENT = "zapzive-crypto-recovery";
const recoveryPrefix = (companyId: string) => `zapzive:crypto:${encodeURIComponent(companyId)}:payment:`;
const recoveryKey = (companyId: string, paymentId: string) => `${recoveryPrefix(companyId)}${encodeURIComponent(paymentId)}`;

function parseRecovery(raw: string, companyId: string): PaymentRecovery {
    const record = JSON.parse(raw) as PaymentRecovery;
    if (record?.companyId !== companyId || !record.payment?.id || !["wallet_pending", "broadcast", "saved"].includes(record.phase) || typeof record.submitKey !== "string" || !Number.isFinite(record.updatedAt) || (record.txHash !== null && !isTransactionHash(record.txHash))) {
        throw new Error("A payment recovery record could not be read. Keep this browser's data and check wallet activity before sending.");
    }
    return record;
}

export function readPaymentRecovery(companyId: string, paymentId: string): PaymentRecovery | null {
    const key = recoveryKey(companyId, paymentId);
    const raw = localStorage.getItem(key);
    const persisted = raw ? parseRecovery(raw, companyId) : null;
    const memory = recoveryMemory.get(key);
    return memory && (!persisted || memory.updatedAt >= persisted.updatedAt) ? memory : persisted;
}

export function listPaymentRecoveries(companyId: string): PaymentRecovery[] {
    const records = new Map<string, PaymentRecovery>();
    const prefix = recoveryPrefix(companyId);
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(prefix)) continue;
        const raw = localStorage.getItem(key);
        if (raw) {
            const record = parseRecovery(raw, companyId);
            records.set(record.payment.id, record);
        }
    }
    recoveryMemory.forEach((record) => {
        if (record.companyId === companyId && (!records.has(record.payment.id) || records.get(record.payment.id)!.updatedAt <= record.updatedAt)) records.set(record.payment.id, record);
    });
    return [...records.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Persist before signing; a returned hash also remains in memory if storage fails. */
export function persistPaymentRecovery(record: PaymentRecovery) {
    const key = recoveryKey(record.companyId, record.payment.id);
    recoveryMemory.set(key, record);
    try {
        const raw = JSON.stringify(record);
        localStorage.setItem(key, raw);
        if (localStorage.getItem(key) !== raw) throw new Error("Storage verification failed.");
    } catch {
        throw new Error(record.txHash
            ? "The transaction hash could not be saved in this browser. Copy it now and retry saving before closing this page."
            : "Browser storage is unavailable. Enable site storage before signing so the payment can be recovered.");
    } finally { window.dispatchEvent(new Event(RECOVERY_EVENT)); }
}

// Only use after a definitive user rejection (4001), never an ambiguous send error.
export function clearRejectedAttempt(companyId: string, paymentId: string) {
    const key = recoveryKey(companyId, paymentId);
    localStorage.removeItem(key);
    recoveryMemory.delete(key);
    window.dispatchEvent(new Event(RECOVERY_EVENT));
}

export async function withPaymentLock<T>(companyId: string, paymentId: string, action: () => Promise<T>): Promise<T> {
    if (!navigator.locks) throw new Error("Use a browser with Web Locks support on HTTPS or localhost to safely sign payments.");
    return navigator.locks.request(recoveryKey(companyId, paymentId), { ifAvailable: true }, (lock) => {
        if (!lock) throw new Error("This payment is already being handled in another tab. Finish that request first.");
        return action();
    });
}

export function paymentIntentKey(companyId: string, payload: CreateCryptoPayment): string {
    const storageKey = `zapzive:crypto:${encodeURIComponent(companyId)}:intent`;
    const fingerprint = JSON.stringify(payload);
    const raw = localStorage.getItem(storageKey);
    if (raw) {
        const previous = JSON.parse(raw) as { fingerprint: string; key: string };
        if (previous.fingerprint === fingerprint && typeof previous.key === "string") return previous.key;
    }
    const key = crypto.randomUUID();
    const value = JSON.stringify({ fingerprint, key });
    localStorage.setItem(storageKey, value);
    if (localStorage.getItem(storageKey) !== value) throw new Error("Enable browser storage before creating a payment.");
    return key;
}

export function resetPaymentIntentKey(companyId: string) {
    localStorage.removeItem(`zapzive:crypto:${encodeURIComponent(companyId)}:intent`);
}
