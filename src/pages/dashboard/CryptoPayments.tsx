import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { isAddress } from "viem";
import { AlertCircle, ArrowRight, Check, CheckCircle2, Coins, Copy, ExternalLink, FileCheck2, Fuel, Loader2, Lock, Plus, RefreshCw, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AssetIcon, { NetworkIcon } from "@/components/dashboard/AssetIcon";
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useCryptoBalances, useCryptoPayment, useCryptoRails, useInjectedCryptoWallet, usePaymentRecovery } from "@/hooks/useCryptoRails";
import apiClient, { type CryptoNetwork, type CryptoPayment } from "@/lib/api-client";
import {
    assertWalletMatches, clearRejectedAttempt, cryptoErrorMessage, exactTokenAmount,
    isTransactionHash, paymentIntentKey, persistPaymentRecovery, readPaymentRecovery,
    rediscoverWallets, resetPaymentIntentKey, safeExplorerUrl, sendReviewedTransfer,
    signWalletChallenge, switchWalletNetwork, validatePreparedPayment, walletErrorCode,
    withPaymentLock, type DiscoveredWallet, type PaymentRecovery, type WalletConnection,
} from "@/lib/crypto-wallet";
import { TOKEN_NAMES, formatTokenAmount } from "@/lib/brand-assets";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const statusLabels: Record<CryptoPayment["status"], string> = {
    awaiting_signature: "Awaiting signature", submitted: "Submitted", confirming: "Confirming",
    settled: "Settled", failed: "Failed", reorged: "Requires review",
};
const shortAddress = (value: string) => `${value.slice(0, 6)}…${value.slice(-4)}`;
const formatTime = (value: string) => new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });


const networkMarkId = (network: CryptoNetwork) => (network.devnet ? 31337 : network.chainId);
const networkTag = (network: CryptoNetwork) => (network.devnet ? "Devnet" : network.testnet ? "Testnet" : "Live");

const STEPS = ["Connect wallet", "Payment details", "Review & sign", "Track settlement"] as const;

function Stepper({ current }: { current: number }) {
    return <ol className="grid grid-cols-2 gap-2.5 lg:grid-cols-4" aria-label="Payment progress">
        {STEPS.map((label, index) => {
            const done = index < current;
            const active = index === current;
            return <li key={label} aria-current={active ? "step" : undefined} className={cn("flex items-center gap-3 rounded-xl border bg-[#ffffff] px-3.5 py-3", active ? "border-primary ring-1 ring-primary" : "border-[#e7e4dc]")}>
                <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold", done ? "bg-[#edf6f1] text-primary" : active ? "bg-primary text-[#ffffff]" : "bg-[#f3f1ec] text-[#9a998f]")}>{done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : index + 1}</span>
                <span className="min-w-0"><span className={cn("block text-[10.5px] font-semibold uppercase tracking-[0.06em]", active ? "text-primary" : "text-[#9a998f]")}>{done ? "Done" : active ? "Current step" : `Step ${index + 1}`}</span><span className={cn("block truncate text-[13px] font-semibold", active || done ? "text-[#1b1c19]" : "text-[#74736b]")}>{label}</span></span>
            </li>;
        })}
    </ol>;
}

function StepHeading({ step, title, hint, icon }: { step: number; title: string; hint: string; icon: ReactNode }) {
    return <div className="card-header flex items-center justify-between gap-3">
        <div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-primary">Step {step}</p><h2 className="mt-0.5 text-[15px] font-semibold text-[#1b1c19]">{title}</h2><p className="mt-0.5 text-xs text-[#8a897f]">{hint}</p></div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf6f1] text-primary">{icon}</span>
    </div>;
}

/** One token's live balance in the connected wallet. Each row reads its own asset so every token is shown. */
function BalanceRow({ companyId, network, connection, address, asset, selected, enabled }: {
    companyId: string; network: CryptoNetwork; connection: WalletConnection | null; address: string | null;
    asset: { symbol: string; kind: "erc20" | "native"; enabled: boolean }; selected: boolean; enabled: boolean;
}) {
    const balance = useCryptoBalances(companyId, network, connection, address, asset.symbol, enabled && asset.enabled);
    const amount = balance.data?.asset.amount;
    return <li className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors", selected ? "bg-[#edf6f1] ring-1 ring-inset ring-[#d6e9df]" : "hover:bg-[#f7f6f2]")}>
        <AssetIcon symbol={asset.symbol} network={networkMarkId(network)} size="sm" />
        <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[#1b1c19]">{asset.symbol}{selected && <span className="rounded-full bg-[#ffffff] px-1.5 text-[10px] font-bold text-primary">Sending</span>}{asset.kind === "native" && <span className="inline-flex items-center gap-0.5 rounded-full bg-[#f1efe9] px-1.5 text-[10px] font-semibold text-[#6c6b63]"><Fuel className="h-2.5 w-2.5" />Fees</span>}</span>
            <span className="block truncate text-[11px] text-[#8a897f]">{TOKEN_NAMES[asset.symbol.toUpperCase()] ?? asset.symbol}</span>
        </span>
        <span className="shrink-0 text-right font-mono text-[13px] font-semibold tabular-nums text-[#1b1c19]">
            {!asset.enabled ? <span className="font-sans text-[11px] font-medium text-[#9a998f]">Unavailable</span> : !enabled ? "—" : balance.isPending ? <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-[#9a998f]" /> : balance.isError ? <span className="font-sans text-[11px] font-medium text-[#a53232]">Unreadable</span> : formatTokenAmount(amount ?? "0", 6)}
        </span>
    </li>;
}

function PaymentStatus({ status }: { status: CryptoPayment["status"] }) {
    return <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium", status === "failed" ? "border-[#ebcccc] bg-[#fff0ee] text-[#a53232]" : status === "reorged" ? "border-[#ead6a7] bg-[#fff8e8] text-[#7e5a13]" : status === "settled" ? "border-[#b9d9cc] bg-[#e8eee4] text-[#087f5b]" : "border-[#d9d6cd] bg-[#f5f3ee] text-[#575750]")}>
        {status === "settled" ? <Check className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}{statusLabels[status] ?? status}
    </span>;
}

function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) {
    return <div role={error ? "alert" : "status"} className={cn("flex items-start gap-3 rounded-xl border p-4 text-sm leading-6", error ? "border-[#ebcccc] bg-[#fff0ee] text-[#a53232]" : "border-[#d6e9df] bg-[#edf6f1] text-[#245843]")}>
        <AlertCircle className="mt-1 h-4 w-4 shrink-0" /><div className="min-w-0 break-words">{children}</div>
    </div>;
}

function CopyValue({ value, label }: { value: string; label: string }) {
    const [copied, setCopied] = useState(false);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        if (!copied) return;
        const timer = window.setTimeout(() => setCopied(false), 2000);
        return () => window.clearTimeout(timer);
    }, [copied]);
    return <span className="inline-flex max-w-full items-start gap-2">
        <span className="min-w-0 break-all font-mono text-xs select-all">{value}</span>
        <button type="button" aria-label={`Copy ${label}`} title={`Copy ${label}`} className="shrink-0 rounded p-0.5 text-[#087f5b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#087f5b]" onClick={async () => {
            try { await navigator.clipboard.writeText(value); setCopied(true); setFailed(false); } catch { setFailed(true); }
        }}>{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}</button>
        {failed && <span role="status" className="text-xs">Select and copy the text.</span>}
    </span>;
}

function ExplorerLink({ payment, hash, network }: { payment: CryptoPayment; hash?: string | null; network?: CryptoNetwork }) {
    const url = safeExplorerUrl(network?.explorerUrl || payment.explorerUrl, hash || payment.txHash || "");
    return url ? <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-[#087f5b] underline-offset-4 hover:underline">View on explorer <ExternalLink className="h-3 w-3" /></a> : null;
}

export default function CryptoPayments() {
    const { company, user } = useAuth();
    const canPay = ["owner", "admin", "treasury", "approver"].includes(user?.role?.toLowerCase() ?? "");
    return company ? <CryptoPaymentsWorkspace key={company.id} companyId={company.id} canPay={canPay} /> : null;
}

function CryptoPaymentsWorkspace({ companyId, canPay }: { companyId: string; canPay: boolean }) {
    const rails = useCryptoRails(companyId);
    const queryClient = useQueryClient();
    const wallet = useInjectedCryptoWallet();
    const recovery = usePaymentRecovery(companyId);
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedId = searchParams.get("payment");
    const detail = useCryptoPayment(companyId, selectedId);
    const [networkId, setNetworkId] = useState<number | null>(null);
    const [assetSymbol, setAssetSymbol] = useState("USDC");
    const [destination, setDestination] = useState("");
    const [amount, setAmount] = useState("");
    const [reference, setReference] = useState("");
    const [busy, setBusy] = useState<string | null>(null);
    const busyRef = useRef(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [reviewed, setReviewed] = useState<CryptoPayment | null>(null);
    const [acknowledged, setAcknowledged] = useState(false);
    const [manualHash, setManualHash] = useState("");
    const [emergencyRecord, setEmergencyRecord] = useState<PaymentRecovery | null>(null);
    const [now, setNow] = useState(Date.now());
    const reviewRef = useRef<HTMLElement | null>(null);
    const networks = useMemo(() => rails.networks.data?.networks ?? [], [rails.networks.data?.networks]);
    const network = networks.find((item) => item.chainId === networkId) ?? networks.find((item) => item.enabled) ?? networks[0];
    const availableAssets = network?.assets?.length ? network.assets : network ? [
        { symbol: "USDC", kind: "erc20" as const, tokenAddress: network.tokenAddress, decimals: network.decimals, enabled: network.enabled, reason: network.reason },
        { symbol: network.nativeSymbol, kind: "native" as const, tokenAddress: "0x0000000000000000000000000000000000000000", decimals: 18, enabled: network.enabled, reason: network.reason },
    ] : [];
    const selectedAsset = availableAssets.find((item) => item.symbol.toUpperCase() === assetSymbol.toUpperCase()) ?? availableAssets[0];
    const activeAddress = wallet.connection?.address;
    const connectedNetwork = networks.find((item) => item.chainId === wallet.connection?.chainId);
    const payment = detail.data;
    const paymentNetwork = networks.find((item) => item.chainId === payment?.chainId);
    const linkedWallet = rails.wallets.data?.find((item) => item.chainId === network?.chainId && item.address.toLowerCase() === activeAddress?.toLowerCase());
    const history = [...new Map((rails.history.data?.pages.flatMap((page) => page.items) ?? []).map((item) => [item.id, item])).values()];
    const records = [...new Map([...recovery.records, ...(emergencyRecord ? [emergencyRecord] : [])].sort((a, b) => a.updatedAt - b.updatedAt).map((item) => [item.payment.id, item])).values()];
    const unsaved = records.filter((item) => item.phase !== "saved");
    const activeRecovery = records.find((item) => item.payment.id === selectedId);
    const expired = payment ? !Number.isFinite(Date.parse(payment.expiresAt)) || Date.parse(payment.expiresAt) <= now : false;
    const onPaymentNetwork = Boolean(wallet.connection && wallet.connection.chainId === payment?.chainId);
    const isPaymentSender = Boolean(wallet.connection && wallet.connection.address.toLowerCase() === payment?.fromAddress.toLowerCase());
    const modeMatches = (item?: CryptoNetwork) => Boolean(item && rails.networks.data?.signing === "external-wallet" && item.testnet === (rails.networks.data.mode === "testnet"));
    const canCreate = Boolean(canPay && network?.enabled && modeMatches(network) && linkedWallet && wallet.connection?.chainId === network.chainId && !rails.networks.isError && !rails.wallets.isError);
    const balances = useCryptoBalances(companyId, network, wallet.connection, activeAddress ?? null, selectedAsset?.symbol ?? null, Boolean(activeAddress && network?.enabled && wallet.connection?.chainId === network.chainId));

    const createReadiness = !canPay ? "Your role cannot create payments." : !rails.networks.data ? "Loading payment networks…" : !network ? "Select a supported network." : !network.enabled ? (network.reason || "This network is unavailable.") : !wallet.connection ? "Connect a wallet to continue." : wallet.connection.chainId !== network.chainId ? `Switch your wallet to ${network.name}.` : !linkedWallet ? "Verify wallet ownership to enable payment creation." : "Ready — creating an intent will not move funds.";
    const reviewReadiness = !payment ? "Select a payment intent to review." : detail.isPending ? "Loading the payment intent…" : detail.isError ? "Refresh the payment before reviewing it." : !paymentNetwork?.enabled ? "The payment network is unavailable." : !onPaymentNetwork ? `Switch your wallet to ${paymentNetwork?.name || "the payment network"}.` : !isPaymentSender ? "Connect the wallet account that created this payment." : activeRecovery ? "This payment has a recovery record. Save or reconcile it before signing again." : "The server will re-check balance and network fees before preparing the wallet transaction.";

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);
    useEffect(() => {
        if (networkId === null && networks.length) {
            const firstEnabled = networks.find((item) => item.enabled) ?? networks[0];
            if (firstEnabled) setNetworkId(firstEnabled.chainId);
        }
    }, [networkId, networks]);
    useEffect(() => {
        setReviewed(null);
        setAcknowledged(false);
        setManualHash("");
    }, [selectedId, wallet.connection?.address, wallet.connection?.chainId, wallet.connection?.wallet.id]);
    useEffect(() => {
        const preventClose = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
        if (busy !== "sign") return;
        window.addEventListener("beforeunload", preventClose);
        return () => window.removeEventListener("beforeunload", preventClose);
    }, [busy]);

    async function run(action: string, work: () => Promise<void>) {
        if (busyRef.current) return;
        busyRef.current = true;
        setBusy(action);
        setError(null);
        setNotice(null);
        try { await work(); } catch (failure) {
            const message = cryptoErrorMessage(failure);
            setError(message);
            toast.error("Payment action could not be completed", { description: message });
        }
        finally { busyRef.current = false; setBusy(null); }
    }

    function selectPayment(id: string | null) {
        setReviewed(null);
        setAcknowledged(false);
        setError(null);
        setManualHash("");
        setSearchParams((previous) => {
            const next = new URLSearchParams(previous);
            if (id) next.set("payment", id); else next.delete("payment");
            return next;
        });
        if (id) window.setTimeout(() => reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }

    async function changeNetwork(targetNetwork: CryptoNetwork) {
        if (!wallet.connection) throw new Error("Connect your wallet first.");
        const connection = wallet.connection;
        const actual = await switchWalletNetwork(connection.wallet.provider, targetNetwork);
        // accountsChanged may have fired while the wallet switch was open.
        wallet.setConnection((current) => current?.wallet.provider === connection.wallet.provider ? { ...current, chainId: actual } : current);
        setReviewed(null);
        setAcknowledged(false);
    }

    async function verifyWallet(connectionOverride?: WalletConnection) {
        if (!canPay) throw new Error("An owner, admin, treasury member, or approver must verify the wallet.");
        const connection = connectionOverride ?? wallet.connection;
        if (!connection || !network?.enabled || !modeMatches(network)) throw new Error("Select an enabled network and connect your wallet.");
        if (connection.chainId !== network.chainId) throw new Error("Switch your wallet to the selected network first.");
        const challenge = await apiClient.createCryptoWalletChallenge({ chainId: network.chainId, address: connection.address });
        const signature = await signWalletChallenge(connection, challenge.message, challenge.expiresAt);
        await assertWalletMatches(connection.wallet.provider, { sender: connection.address, chainId: network.chainId });
        if (Date.parse(challenge.expiresAt) <= Date.now()) throw new Error("The verification expired while your wallet was open. Verify again.");
        const verified = await apiClient.verifyCryptoWallet({ challengeId: challenge.id, signature });
        if (verified.address.toLowerCase() !== connection.address.toLowerCase() || verified.chainId !== network.chainId) throw new Error("Wallet verification returned a different account or network.");
        await rails.wallets.refetch();
        setNotice("Wallet ownership verified. You can now create a payment intent.");
    }

    async function connectAndVerify(item: DiscoveredWallet) {
        const connection = await wallet.connect(item);
        if (!network?.enabled || !modeMatches(network)) {
            setNotice("Wallet connected. Select an enabled payment network to verify ownership.");
            return;
        }
        let activeConnection = connection;
        if (activeConnection.chainId !== network.chainId) {
            const actual = await switchWalletNetwork(activeConnection.wallet.provider, network);
            activeConnection = { ...activeConnection, chainId: actual };
            wallet.setConnection((current) => current?.wallet.provider === activeConnection.wallet.provider ? activeConnection : current);
        }
        await verifyWallet(activeConnection);
    }

    async function switchAndVerify() {
        if (!wallet.connection || !network?.enabled || !modeMatches(network)) throw new Error("Select an enabled payment network first.");
        const connection = wallet.connection;
        const actual = await switchWalletNetwork(connection.wallet.provider, network);
        const activeConnection = { ...connection, chainId: actual };
        wallet.setConnection((current) => current?.wallet.provider === connection.wallet.provider ? activeConnection : current);
        await verifyWallet(activeConnection);
    }

    function createPayment(event: FormEvent) {
        event.preventDefault();
        void run("create", async () => {
            if (!canCreate || !linkedWallet || !network || !wallet.connection || !selectedAsset) throw new Error(createReadiness);
            const to = destination.trim();
            if (!isAddress(to) || /^0x0{40}$/i.test(to)) throw new Error("Enter a valid, nonzero Ethereum destination address.");
            if (selectedAsset.kind === "erc20" && to.toLowerCase() === selectedAsset.tokenAddress.toLowerCase()) throw new Error(`Enter the recipient's wallet address, not the ${selectedAsset.symbol} contract address.`);
            const units = exactTokenAmount(amount.trim(), selectedAsset.decimals);
            const maximum = selectedAsset.kind === "erc20" ? 1_000_000_000_000n : 100n * (10n ** BigInt(selectedAsset.decimals));
            if (units > maximum) throw new Error(`Payments cannot exceed ${selectedAsset.kind === "erc20" ? "1,000,000 " + selectedAsset.symbol : "100 " + selectedAsset.symbol}.`);
            await assertWalletMatches(wallet.connection.wallet.provider, { sender: linkedWallet.address, chainId: network.chainId });
            const payload = { walletId: linkedWallet.id, to, amount: amount.trim(), asset: selectedAsset.symbol, ...(reference.trim() ? { reference: reference.trim() } : {}) };
            const created = await apiClient.createCryptoPayment(payload, paymentIntentKey(companyId, payload));
            // The key only deduplicates retries of this submission. Once the server
            // has answered, the next intent with the same details is a new request.
            resetPaymentIntentKey(companyId);
            rails.updatePayment(created);
            selectPayment(created.id);
            setNotice("Payment intent created. Review the transfer details before opening your wallet to sign.");
        });
    }

    async function reviewPayment() {
        if (!canPay) throw new Error("Your role does not have permission to prepare payments.");
        if (!payment || !paymentNetwork || !modeMatches(paymentNetwork)) throw new Error("The payment network is not available in the current mode.");
        if (!wallet.connection) throw new Error("Connect the sender wallet before reviewing this payment.");
        if (!isPaymentSender) throw new Error("Switch to the sender account shown in this payment before reviewing it.");
        if (!onPaymentNetwork) throw new Error(`Switch your wallet to ${paymentNetwork.name} before reviewing this payment.`);
        if (readPaymentRecovery(companyId, payment.id)) throw new Error("A wallet attempt already exists for this payment. Use recovery or refresh its status.");
        const prepared = await apiClient.prepareCryptoPayment(payment.id);
        validatePreparedPayment(payment, prepared, paymentNetwork);
        rails.updatePayment(prepared.payment);
        setReviewed(prepared.payment);
        setAcknowledged(false);
    }

    async function saveHash(record: PaymentRecovery) {
        if (!canPay) throw new Error("Your role does not have permission to submit payment hashes. Ask an owner, admin, treasury member, or approver.");
        if (!record.txHash) throw new Error("Enter the transaction hash from your wallet activity.");
        let storageWarning: string | null = null;
        // Keep the hash visible even if quota/privacy changes make storage fail.
        setEmergencyRecord(record);
        try { persistPaymentRecovery(record); } catch (failure) { storageWarning = cryptoErrorMessage(failure); }
        const saved = await apiClient.submitCryptoPayment(record.payment.id, record.txHash, record.submitKey);
        if (saved.id !== record.payment.id || saved.txHash?.toLowerCase() !== record.txHash.toLowerCase()) throw new Error("The server did not acknowledge this transaction hash. Keep it and retry saving.");
        const completed: PaymentRecovery = { ...record, payment: saved, phase: "saved", updatedAt: Date.now() };
        setEmergencyRecord(completed);
        try { persistPaymentRecovery(completed); } catch (failure) { storageWarning = cryptoErrorMessage(failure); }
        rails.updatePayment(saved);
        const savedMessage = saved.errorCode === "TX_NOT_VISIBLE"
            ? "Transaction hash saved. It is waiting to appear at the network provider; do not sign or send again."
            : "Transaction hash saved and matched to this payment on the network. It settles once the network finalizes the block; no additional signature is needed.";
        setNotice(storageWarning ? `The server saved your hash. ${storageWarning}` : savedMessage);
    }

    async function signPayment() {
        if (!canPay) throw new Error("Your role does not have permission to sign payments.");
        if (!reviewed || !acknowledged || !wallet.connection || !paymentNetwork || !modeMatches(paymentNetwork)) throw new Error("Review and confirm the payment details before signing.");
        const connection = wallet.connection;
        await withPaymentLock(companyId, reviewed.id, async () => {
            if (readPaymentRecovery(companyId, reviewed.id)) throw new Error("This payment already has a wallet attempt. Recover its transaction hash instead of signing again.");
            const prepared = await apiClient.prepareCryptoPayment(reviewed.id);
            const transfer = validatePreparedPayment(reviewed, prepared, paymentNetwork);
            await assertWalletMatches(connection.wallet.provider, transfer);
            let record: PaymentRecovery = { companyId, payment: prepared.payment, phase: "wallet_pending", txHash: null, submitKey: crypto.randomUUID(), updatedAt: Date.now() };
            persistPaymentRecovery(record);
            setEmergencyRecord(record);
            let hash;
            try {
                hash = await sendReviewedTransfer(connection.wallet.provider, transfer);
            } catch (failure) {
                if (walletErrorCode(failure) === 4001) {
                    clearRejectedAttempt(companyId, reviewed.id);
                    setEmergencyRecord(null);
                }
                setReviewed(null);
                setAcknowledged(false);
                throw failure;
            }
            record = { ...record, txHash: hash, phase: "broadcast", updatedAt: Date.now() };
            // Persist the returned hash synchronously, before any HTTP request.
            setEmergencyRecord(record);
            try { persistPaymentRecovery(record); } catch (failure) { setError(cryptoErrorMessage(failure)); }
            setReviewed(null);
            setAcknowledged(false);
            await saveHash(record);
        });
    }

    async function recoverHash(event: FormEvent) {
        event.preventDefault();
        if (!payment) return;
        await run("recover", async () => {
            const txHash = manualHash.trim();
            if (!isTransactionHash(txHash)) throw new Error("Enter a 0x-prefixed transaction hash with 64 hexadecimal characters.");
            await withPaymentLock(companyId, payment.id, async () => {
                const existing = readPaymentRecovery(companyId, payment.id);
                const previousHashes = [...new Set([...(existing?.previousHashes ?? []), ...(existing?.txHash ? [existing.txHash] : []), ...(isTransactionHash(payment.txHash) ? [payment.txHash] : [])])].filter((hash) => hash.toLowerCase() !== txHash.toLowerCase());
                const record: PaymentRecovery = { companyId, payment, phase: "broadcast", txHash, previousHashes, submitKey: existing?.txHash?.toLowerCase() === txHash.toLowerCase() ? existing.submitKey : crypto.randomUUID(), updatedAt: Date.now() };
                await saveHash(record);
            });
        });
    }

    async function reconcile(item: CryptoPayment) {
        const refreshed = await apiClient.reconcileCryptoPayment(item.id);
        rails.updatePayment(refreshed);
        const record = readPaymentRecovery(companyId, item.id);
        if (record && refreshed.txHash && (!record.txHash || record.txHash.toLowerCase() === refreshed.txHash.toLowerCase()) && isTransactionHash(refreshed.txHash)) {
            const saved: PaymentRecovery = { ...record, payment: refreshed, txHash: refreshed.txHash, phase: "saved", updatedAt: Date.now() };
            setEmergencyRecord(saved);
            persistPaymentRecovery(saved);
        }
        setNotice(`Payment status: ${statusLabels[refreshed.status]}.`);
    }

    // A wallet request that failed without returning a hash (any error other than
    // an explicit rejection) would otherwise block its intent and keep the
    // recovery banner forever. Clearing is offered only once the intent can no
    // longer be signed, and only while the server holds no transaction for it.
    async function dismissAttempt(record: PaymentRecovery) {
        const current = await apiClient.getCryptoPayment(record.payment.id);
        if (isTransactionHash(current.txHash)) {
            const saved: PaymentRecovery = { ...record, payment: current, txHash: current.txHash, phase: "saved", updatedAt: Date.now() };
            setEmergencyRecord(saved);
            persistPaymentRecovery(saved);
            rails.updatePayment(current);
            setNotice("This payment already has a recorded transaction, so it is tracked from that hash.");
            return;
        }
        clearRejectedAttempt(companyId, record.payment.id);
        setEmergencyRecord((previous) => previous?.payment.id === record.payment.id ? null : previous);
        setNotice("Recovery record cleared. If a transaction later appears in your wallet activity, record its hash on the payment.");
    }

    const pending = Boolean(busy);
    const walletReady = Boolean(wallet.connection && linkedWallet && wallet.connection.chainId === network?.chainId);
    const currentStep = payment?.status === "settled" ? 4 : payment?.txHash ? 3 : selectedId ? 2 : walletReady ? 1 : 0;
    const balancesEnabled = Boolean(activeAddress && network?.enabled && wallet.connection?.chainId === network?.chainId);
    const selectedBalance = balancesEnabled && balances.data ? balances.data.asset.amount : null;
    return <div className="space-y-6 pb-8">
        <section className="rounded-[20px] border border-[#d6e9df] bg-[#edf6f1] p-5 sm:p-6" aria-labelledby="crypto-hero-title">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
                <div className="flex max-w-2xl items-start gap-4">
                    <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#d6e9df] bg-[#ffffff] text-primary sm:flex"><Coins className="h-5 w-5" /></span>
                    <div>
                        <h2 id="crypto-hero-title" className="text-[24px] font-bold leading-[1.15] tracking-[-0.035em] text-[#1b1c19] sm:text-[28px]">Send a crypto payment</h2>
                        <p className="mt-1.5 text-sm leading-6 text-[#55544d]">Pay anyone with stablecoins straight from your own wallet. Follow the four steps below: you review every detail, approve it in your wallet, and Zapzive never holds your keys.</p>
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-[#55544d]">
                            {rails.networks.data && <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#9a998f]" />{rails.networks.data.mode === "testnet" ? "Testnet · test tokens only" : "Live network"}</span>}
                            <span className="inline-flex items-center gap-1.5"><Lock className="h-3 w-3 text-primary" /> You hold the keys</span>
                        </div>
                    </div>
                </div>
                <Button disabled={pending} onClick={() => void run("new", async () => { resetPaymentIntentKey(companyId); selectPayment(null); setAmount(""); setDestination(""); setReference(""); setNotice("Ready for a new payment intent."); })} className="shrink-0"><Plus /> New payment</Button>
            </div>
            <div className="mt-5"><Stepper current={currentStep} /></div>
        </section>

        {error && <Notice error>{error}</Notice>}
        {notice && <Notice>{notice}</Notice>}
        {!canPay && <Notice>You can view payment history and refresh settlement status. Creating payments, verifying wallets, and recording hashes requires the owner, admin, treasury, or approver role.</Notice>}
        {recovery.storageError && <Notice error>Payment recovery storage needs attention: {recovery.storageError} <button className="underline" disabled={pending} onClick={recovery.reload}>Check storage again</button></Notice>}

        {unsaved.length > 0 && <section className="premium-card overflow-hidden" aria-labelledby="recovery-title">
            <div className="card-header"><p className="dashboard-eyebrow">Continue safely</p><h2 id="recovery-title" className="mt-1 text-lg">{unsaved.length} payment{unsaved.length === 1 ? " needs" : "s need"} recovery</h2></div>
            <div className="divide-y divide-[#e1dfd7]">
                {unsaved.map((record) => <div key={record.payment.id} className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
                    <div className="min-w-0 space-y-2"><p className="text-sm font-semibold">{record.payment.amount} {record.payment.symbol} <span className="font-normal text-[#66665f]">to {shortAddress(record.payment.toAddress)}</span></p>
                        <p className="text-xs leading-5 text-[#66665f]">{record.txHash ? "A transaction hash was returned. Retry saving it to finish tracking this payment." : Date.parse(record.payment.expiresAt) <= now ? "A wallet request was started but no hash was returned. If your wallet activity shows the transfer, open the payment and record its hash; if nothing was sent, clear this record." : "A wallet request was started. Check wallet activity and recover its hash before creating another transfer. If nothing was sent, this record can be cleared once the intent expires."}</p>
                        <p className="break-all font-mono text-[10px] text-[#66665f]">Intent {record.payment.id} · Network {record.payment.chainId}</p>
                        {record.txHash && <><CopyValue value={record.txHash} label="transaction hash" /><div><ExplorerLink payment={record.payment} hash={record.txHash} network={networks.find((item) => item.chainId === record.payment.chainId)} /></div></>}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2"><Button variant="outline" size="sm" disabled={pending} onClick={() => selectPayment(record.payment.id)}>Open payment</Button>{record.txHash && <Button size="sm" disabled={pending || !canPay} onClick={() => void run(`save:${record.payment.id}`, () => saveHash(record))}>{busy === `save:${record.payment.id}` ? <Loader2 className="animate-spin" /> : <RefreshCw />} Retry saving hash</Button>}{!record.txHash && Date.parse(record.payment.expiresAt) <= now && <Button variant="outline" size="sm" disabled={pending} onClick={() => void run(`dismiss:${record.payment.id}`, () => dismissAttempt(record))}>{busy === `dismiss:${record.payment.id}` && <Loader2 className="animate-spin" />} Nothing was sent, clear</Button>}</div>
                </div>)}
            </div>
        </section>}

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(320px,380px)_minmax(0,1fr)]">
            <aside className="space-y-4 xl:sticky xl:top-24">
                <section className="premium-card overflow-hidden" aria-labelledby="wallet-title">
                    <div id="wallet-title" className="sr-only">Connected wallet</div>
                    <StepHeading step={1} title={wallet.connection ? "Your wallet" : "Connect your wallet"} hint={walletReady ? "Connected and verified" : wallet.connection ? "Finish the check below" : "The account that pays"} icon={<Wallet className="h-5 w-5" />} />
                    <div className="space-y-4 p-5">
                        {wallet.connection ? <>
                            <div className="rounded-xl border border-[#ebe8e0] bg-[#faf9f6] p-3.5">
                                <div className="flex items-center justify-between gap-3"><p className="flex items-center gap-2 text-sm font-semibold"><span className="h-2 w-2 rounded-full bg-[#11a879]" />{wallet.connection.wallet.name}</p><button type="button" disabled={pending} onClick={() => { wallet.disconnect(); setReviewed(null); }} className="text-xs font-medium text-[#8a897f] underline-offset-4 hover:text-[#1b1c19] hover:underline disabled:opacity-50">Disconnect</button></div>
                                <div className="mt-2"><CopyValue value={wallet.connection.address} label="wallet address" /></div>
                                <div className="mt-3 flex items-center gap-2.5 border-t border-[#ebe8e0] pt-3">
                                    {connectedNetwork ? <NetworkIcon network={networkMarkId(connectedNetwork)} size="sm" className="h-7 w-7" /> : <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f1efe9] text-[10px] font-bold text-[#8a897f]">?</span>}
                                    <div className="min-w-0 flex-1"><p className="text-[11px] text-[#8a897f]">Wallet network</p><p className="truncate text-[13px] font-semibold">{connectedNetwork?.name || `Chain ${wallet.connection.chainId}`}</p></div>
                                    {connectedNetwork && <span className="rounded-full bg-[#f1efe9] px-2 py-0.5 text-[10.5px] font-semibold text-[#6c6b63]">{networkTag(connectedNetwork)}</span>}
                                </div>
                            </div>

                            {network && wallet.connection.chainId !== network.chainId ? <div className="space-y-3 rounded-xl border border-[#f0dcb0] bg-[#fdf6e7] p-3.5">
                                <p className="text-xs leading-5 text-[#7a4f0a]">Your wallet is on <span className="font-semibold">{connectedNetwork?.name || `chain ${wallet.connection.chainId}`}</span>, but this payment uses <span className="font-semibold">{network.name}</span>. Switch so balances can load and you can pay.</p>
                                <Button className="w-full" variant="outline" disabled={pending || !network.enabled} onClick={() => void run("switch", switchAndVerify)}>{busy === "switch" ? <Loader2 className="animate-spin" /> : <NetworkIcon network={networkMarkId(network)} size="xs" className="h-4 w-4" />} Switch & verify on {network.name}</Button>
                            </div> : linkedWallet ? <p className="flex items-center gap-2 rounded-xl bg-[#edf6f1] px-3.5 py-2.5 text-[13px] font-medium text-primary"><CheckCircle2 className="h-4 w-4" /> Ownership verified for this network</p> : <div className="space-y-2"><Button className="w-full" disabled={pending || !canPay || !network?.enabled || !modeMatches(network) || rails.wallets.isPending || rails.wallets.isError} onClick={() => void run("verify", verifyWallet)}>{busy === "verify" ? <Loader2 className="animate-spin" /> : <ShieldCheck />} Verify wallet ownership</Button><p className="text-xs leading-5 text-[#8a897f]">Your wallet will ask for one signature. It only proves you own this address; it cannot move funds or approve tokens.</p></div>}

                            {network && <div aria-live="polite">
                                <div className="mb-1.5 flex items-center justify-between gap-3 px-1">
                                    <p className="text-[12px] font-semibold text-[#55544d]">Balances on {network.name}</p>
                                    <button type="button" aria-label="Refresh wallet balances" title="Refresh wallet balances" className="rounded-lg p-1.5 text-[#8a897f] hover:bg-[#f1efe9] hover:text-[#0b6b4f] disabled:opacity-50" disabled={pending || !balancesEnabled} onClick={() => void queryClient.invalidateQueries({ queryKey: ["crypto", companyId, "balances"] })}><RefreshCw className={cn("h-3.5 w-3.5", balances.isFetching && "animate-spin")} /></button>
                                </div>
                                {!balancesEnabled && <p className="mb-2 px-1 text-[11px] text-[#9a998f]">Balances appear once your wallet is on {network.name}.</p>}
                                <ul className="space-y-1">
                                    {availableAssets.map((asset) => <BalanceRow key={`${network.chainId}-${asset.symbol}`} companyId={companyId} network={network} connection={wallet.connection} address={activeAddress ?? null} asset={asset} selected={asset.symbol === selectedAsset?.symbol} enabled={balancesEnabled} />)}
                                </ul>
                            </div>}
                        </> : <>
                            <p className="text-sm leading-6 text-[#55544d]">Connect MetaMask or another browser wallet. It stays in control of your funds; you will sign once to prove the address is yours.</p>
                            {wallet.wallets.length ? <div className="space-y-2">{wallet.wallets.map((item) => <Button key={item.id} className="h-11 w-full justify-between" disabled={pending || !canPay} onClick={() => void run(`connect:${item.id}`, () => connectAndVerify(item))}><span className="truncate">Connect & verify {item.name}</span>{busy === `connect:${item.id}` ? <Loader2 className="animate-spin" /> : <ArrowRight />}</Button>)}</div> : <Notice>No browser wallet detected. Install or unlock your wallet extension, allow access to this site, then scan again.</Notice>}
                            <button type="button" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#087f5b]" disabled={pending} onClick={rediscoverWallets}><RefreshCw className="h-3 w-3" /> Scan for wallets</button>
                        </>}
                        {rails.wallets.isError && <Notice error>Could not load verified wallets. <button type="button" className="underline" onClick={() => void rails.wallets.refetch()}>Try again</button></Notice>}
                        <p className="border-t border-[#ebe8e0] pt-3 text-[11px] leading-5 text-[#9a998f]">Standard wallet accounts are supported. Smart contract wallets are not supported yet.</p>
                    </div>
                </section>
            </aside>

            <section className="premium-card overflow-hidden" aria-labelledby="new-payment-title">
                <div id="new-payment-title" className="sr-only">Create a payment intent</div>
                <StepHeading step={2} title="Payment details" hint="Who to pay, how much, and on which network" icon={<Coins className="h-5 w-5" />} />
                <form className="space-y-6 p-5 sm:p-6" onSubmit={createPayment}>
                    {/* Inside a form, Radix Select reports "" while its options are still registering. Both selects ignore it so the asset or network cannot change on its own. */}
                    <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2"><Label htmlFor="crypto-network">Network</Label>
                        {rails.networks.isPending ? <p role="status" className="text-sm text-[#66665f]">Loading available networks…</p> : rails.networks.isError ? <Notice error>Could not load payment networks. <button type="button" className="underline" onClick={() => void rails.networks.refetch()}>Try again</button></Notice> : networks.length ? <Select value={network ? String(network.chainId) : ""} disabled={pending} onValueChange={(value) => { if (!value) return; setNetworkId(Number(value)); setReviewed(null); setAcknowledged(false); }}>
                            <SelectTrigger id="crypto-network" aria-label="Payment network" className="h-14"><SelectValue placeholder="Select a network" /></SelectTrigger>
                            <SelectContent>
                                <SelectLabel>Choose a network</SelectLabel>
                                {networks.map((item) => <SelectItem key={item.chainId} value={String(item.chainId)} className="py-2.5">
                                    <NetworkIcon network={networkMarkId(item)} size="sm" />
                                    <span className="flex min-w-0 flex-col text-left leading-tight"><span className="flex items-center gap-1.5 font-semibold text-[#1b1c19]">{item.name}<span className={cn("rounded-full px-1.5 text-[10px] font-semibold leading-4", item.devnet || item.testnet ? "bg-[#f1efe9] text-[#6c6b63]" : "bg-[#edf6f1] text-primary")}>{networkTag(item)}</span></span><span className={cn("truncate text-xs font-normal", item.enabled ? "text-[#8a897f]" : "text-[#a53232]")}>{item.enabled ? `Fees paid in ${item.nativeSymbol}` : "Unavailable"}</span></span>
                                </SelectItem>)}
                            </SelectContent>
                        </Select> : <Notice>No payment networks are configured. Your workspace administrator needs to enable a USDC network.</Notice>}
                    </div>
                    <div className="space-y-2"><Label htmlFor="crypto-asset">Asset</Label><Select value={selectedAsset?.symbol || ""} disabled={pending || !availableAssets.length} onValueChange={(value) => { if (!value) return; setAssetSymbol(value); setReviewed(null); setAcknowledged(false); }}>
                        <SelectTrigger id="crypto-asset" aria-label="Payment asset" className="h-14"><SelectValue placeholder="Select an asset" /></SelectTrigger>
                        <SelectContent>
                            <SelectLabel>{network ? `Assets on ${network.name}` : "Assets"}</SelectLabel>
                            {availableAssets.map((item) => <SelectItem key={item.symbol} value={item.symbol} disabled={!item.enabled} className="py-2.5">
                                <AssetIcon symbol={item.symbol} network={network ? networkMarkId(network) : undefined} size="sm" />
                                <span className="flex min-w-0 flex-col text-left leading-tight"><span className="font-semibold text-[#1b1c19]">{item.symbol} <span className="font-normal text-[#8a897f]">{TOKEN_NAMES[item.symbol.toUpperCase()] ?? ""}</span></span><span className="truncate text-xs font-normal text-[#8a897f]">{item.kind === "native" ? "Native coin · pays network fees" : "Token"}{item.enabled ? "" : " · unavailable"}</span></span>
                            </SelectItem>)}
                        </SelectContent>
                    </Select></div>
                    </div>
                    {network && !network.enabled && <Notice>This network is unavailable. {network.reason || "Your administrator needs to finish its payment rail configuration."}</Notice>}
                    {network?.enabled && !modeMatches(network) && <Notice error>This network does not match the service's current signing mode. Refresh networks or contact your administrator.</Notice>}
                    <p className="-mt-3 text-xs leading-5 text-[#8a897f]">The asset is checked again by the server before signing. {selectedAsset?.kind === "native" ? "Network fees are paid in " + selectedAsset.symbol + "." : "Network fees are paid separately in " + (network?.nativeSymbol || "the network native token") + "."}</p>

                    <div className="space-y-2"><Label htmlFor="crypto-to">Recipient wallet address</Label><Input id="crypto-to" placeholder="0x…" value={destination} onChange={(event) => setDestination(event.target.value)} required autoComplete="off" spellCheck={false} maxLength={42} disabled={pending} className="h-12 font-mono text-sm" /><p className={cn("text-xs leading-5", destination && !isAddress(destination.trim()) ? "text-[#a53232]" : "text-[#8a897f]")}>{destination && !isAddress(destination.trim()) ? "This doesn't look like a complete wallet address yet (0x followed by 40 characters)." : `Use a wallet address that accepts ${selectedAsset?.symbol || "the selected asset"} on ${network?.name ?? "the selected network"}.`}</p></div>

                    <div className="space-y-2">
                        <div className="flex items-baseline justify-between gap-3"><Label htmlFor="crypto-amount">Amount in {selectedAsset?.symbol || "asset"}</Label>{selectedBalance !== null && <span className="text-xs text-[#8a897f]">Available: <span className="font-mono font-semibold text-[#3c3c37]">{formatTokenAmount(selectedBalance, 6)}</span> {selectedAsset?.symbol}</span>}</div>
                        <div className="relative"><Input id="crypto-amount" placeholder="0.00" inputMode="decimal" autoComplete="off" value={amount} onChange={(event) => setAmount(event.target.value)} required maxLength={80} disabled={pending} className="h-14 pl-4 pr-28 text-xl font-semibold tabular-nums" /><span className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5 rounded-full bg-[#f1efe9] py-1 pl-1 pr-2.5 text-xs font-semibold text-[#3c3c37]">{selectedAsset && <AssetIcon symbol={selectedAsset.symbol} size="xs" />}{selectedAsset?.symbol || "—"}</span></div>
                        <p className="text-xs leading-5 text-[#8a897f]">Up to {selectedAsset?.decimals ?? 6} decimal places. Maximum {selectedAsset?.kind === "native" ? "100 " + selectedAsset.symbol : "1,000,000 " + (selectedAsset?.symbol || "tokens")}. Network fees are paid separately in {network?.nativeSymbol || "the network native token"}.</p>
                    </div>
                    <div className="space-y-2"><Label htmlFor="crypto-reference">Reference <span className="font-normal text-[#8a897f]">(optional)</span></Label><Input id="crypto-reference" placeholder="Invoice number or a note for your records" value={reference} onChange={(event) => setReference(event.target.value)} maxLength={140} disabled={pending} className="h-12" /></div>

                    <div className="rounded-xl border border-[#ebe8e0] bg-[#faf9f6] p-4">
                        {network && <div className="mb-4 flex items-center gap-3">
                            <AssetIcon symbol={selectedAsset?.symbol || "USDC"} network={networkMarkId(network)} size="md" />
                            <p className="min-w-0 text-sm leading-6 text-[#55544d]">You are preparing to send <span className="font-semibold text-[#1b1c19]">{amount || "0"} {selectedAsset?.symbol || ""}</span> on <span className="font-semibold text-[#1b1c19]">{network.name}</span>{destination && isAddress(destination.trim()) ? <> to <span className="font-mono text-[13px] text-[#1b1c19]">{shortAddress(destination.trim())}</span></> : null}. Nothing moves until you sign in your wallet.</p>
                        </div>}
                        <Button type="submit" className="h-12 w-full text-[15px]" disabled={pending || !selectedAsset?.enabled || Boolean(recovery.storageError)}>{busy === "create" ? <Loader2 className="animate-spin" /> : <ArrowRight />} Create payment intent</Button>
                        <p className={cn("mt-3 text-center text-xs leading-5", canCreate ? "text-[#8a897f]" : "text-[#a53232]")}>{createReadiness}</p>
                    </div>
                </form>
            </section>
        </div>

        {selectedId && <section ref={reviewRef} className="premium-card scroll-mt-24 overflow-hidden" aria-labelledby="review-title">
            <div className="card-header flex flex-wrap items-center justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#0b6b4f]">Step {payment?.txHash ? 4 : 3}</p><h2 id="review-title" className="mt-0.5 text-[15px] font-semibold">{payment?.txHash ? "Track settlement" : "Review & sign"}</h2></div>{payment && <PaymentStatus status={payment.status} />}</div>
            <div className="space-y-5 p-5 sm:p-6">
                {detail.isPending && <p role="status" className="flex items-center gap-2 text-sm text-[#66665f]"><Loader2 className="h-4 w-4 animate-spin" /> Loading payment…</p>}
                {detail.isError && <Notice error>Could not refresh this payment. {cryptoErrorMessage(detail.error)} <button type="button" className="underline" disabled={pending} onClick={() => void detail.refetch()}>Retry status</button></Notice>}
                {payment && <>
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div className="flex items-center gap-4">{paymentNetwork && <AssetIcon symbol={payment.symbol} network={networkMarkId(paymentNetwork)} size="lg" />}<div><p className="text-3xl font-semibold tracking-[-0.05em] tabular-nums">{payment.amount} <span className="text-xl text-[#66665f]">{payment.symbol}</span></p><p className="mt-2 text-sm text-[#66665f]">{paymentNetwork?.name ?? `Chain ${payment.chainId}`} · Chain ID {payment.chainId}{paymentNetwork && ` · ${paymentNetwork.testnet ? "Testnet" : "Live network"}`}</p></div></div><Button size="sm" variant="outline" disabled={pending} onClick={() => void run(`reconcile:${payment.id}`, () => reconcile(payment))}><RefreshCw className={busy === `reconcile:${payment.id}` ? "animate-spin" : ""} /> Refresh status</Button></div>
                    <dl className="grid gap-5 rounded-xl border border-[#e1dfd7] bg-[#f5f3ee] p-4 sm:grid-cols-2 sm:p-5">
                        <div className="sm:col-span-2"><dt className="mb-2 text-xs text-[#66665f]">Full destination address</dt><dd><CopyValue value={payment.toAddress} label="destination address" /></dd></div>
                        <div><dt className="mb-2 text-xs text-[#66665f]">From</dt><dd><CopyValue value={payment.fromAddress} label="sender address" /></dd></div>
                        <div><dt className="mb-2 text-xs text-[#66665f]">{/^0x0{40}$/i.test(payment.tokenAddress) ? "Transfer type" : `${payment.symbol} contract`}</dt><dd>{/^0x0{40}$/i.test(payment.tokenAddress) ? <span className="text-sm font-medium">Native network transfer</span> : <CopyValue value={payment.tokenAddress} label={`${payment.symbol} token contract`} />}</dd></div>
                        <div><dt className="mb-1 text-xs text-[#66665f]">Payment intent</dt><dd className="break-all font-mono text-xs">{payment.id}</dd></div>
                        <div><dt className="mb-1 text-xs text-[#66665f]">Reference</dt><dd className="break-words text-sm">{payment.reference || "No reference"}</dd></div>
                        <div><dt className="mb-1 text-xs text-[#66665f]">Created</dt><dd className="text-xs">{formatTime(payment.createdAt)}</dd></div>
                        <div><dt className="mb-1 text-xs text-[#66665f]">{payment.status === "awaiting_signature" ? "Sign before" : "Last updated"}</dt><dd className="text-xs">{formatTime(payment.status === "awaiting_signature" ? payment.expiresAt : payment.updatedAt)}</dd></div>
                    </dl>
                    {payment.txHash && <div className="space-y-3"><p className="text-xs text-[#66665f]">Transaction hash</p><CopyValue value={payment.txHash} label="transaction hash" /><div className="flex flex-wrap items-center gap-4"><ExplorerLink payment={payment} network={paymentNetwork} /><p className="text-xs text-[#66665f]">{payment.confirmations} confirmation{payment.confirmations === 1 ? "" : "s"}{payment.blockNumber ? ` · Block ${payment.blockNumber}` : " · Awaiting inclusion"}</p></div></div>}
                    {payment.errorCode === "TX_NOT_VISIBLE" && <Notice>The transaction hash is saved, but the network provider has not indexed it yet. Keep this page or your wallet activity available; do not sign or send again. If this hash never appears, record the correct hash from your wallet activity below; it is accepted only when the network shows a transaction that exactly matches this payment.</Notice>}
                    {["submitted", "confirming"].includes(payment.status) && payment.txHash && !payment.errorCode && <Notice>Settlement waits until the network finalizes the block. {paymentNetwork?.devnet ? "On the local devnet this takes a few seconds." : "On Ethereum and its L2 networks this usually takes about 15 to 20 minutes; Polygon is faster."} This page keeps checking while it is open.</Notice>}
                    {payment.errorCode && !["TX_NOT_VISIBLE", "RECEIPT_UNAVAILABLE"].includes(payment.errorCode) && <Notice error>Network verification: {payment.errorCode}. Refresh the status and inspect the transaction before taking further action.</Notice>}
                    {payment.status === "reorged" && <Notice error>The transaction's block changed during a chain reorganization. It needs operator review before it can be treated as settled. Do not resend this payment.</Notice>}
                    {payment.status === "settled" && <div className="flex items-center gap-2 text-sm text-[#087f5b]"><CheckCircle2 className="h-5 w-5" /> Payment settled on the network.</div>}
                    {payment.status === "failed" && <Notice error>This payment failed verification or execution. Inspect the transaction and network fees before creating another intent.</Notice>}

                    {payment.status === "awaiting_signature" && !payment.txHash && !activeRecovery && <>
                        {expired ? <Notice>This intent has expired. Check wallet activity before creating a new payment intent.</Notice> : <>
                            {!wallet.connection ? <Notice>Connect the sender wallet to review and sign this payment.</Notice> : !isPaymentSender ? <Notice>Switch to the sender account shown above in your wallet before continuing.</Notice> : !onPaymentNetwork && paymentNetwork ? <Button variant="outline" disabled={pending || !paymentNetwork.enabled} onClick={() => void run("switch-payment", () => changeNetwork(paymentNetwork))}>Switch wallet to {paymentNetwork.name}</Button> : null}
                            {error && <Notice error>{error}</Notice>}
                            {!reviewed ? <div className="space-y-3"><Button disabled={pending || detail.isError || Boolean(recovery.storageError)} onClick={() => void run("review", reviewPayment)}>{busy === "review" ? <Loader2 className="animate-spin" /> : <FileCheck2 />} Review payment</Button><p className={cn("text-xs leading-5", reviewReadiness.startsWith("The server") ? "text-[#66665f]" : "text-[#a53232]")}>{reviewReadiness}</p></div> : <div className="space-y-4 rounded-xl border border-[#b9d9cc] bg-[#e8eee4] p-4 sm:p-5">
                                <p className="flex items-center gap-2 text-sm font-semibold text-[#087f5b]"><ShieldCheck className="h-4 w-4" /> Transfer details and available funds checked</p>
                                <p className="text-sm leading-6 text-[#575750]">Your wallet will show the final network fee in {paymentNetwork?.nativeSymbol || "native tokens"}. Approving sends exactly {payment.amount} {payment.symbol} to the destination above. Transfers cannot be reversed.</p>
                                <label className="flex cursor-pointer items-start gap-3 text-sm leading-6"><input type="checkbox" checked={acknowledged} disabled={pending} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#087f5b]" />I checked the full destination, amount, and network and want to send this payment.</label>
                                <Button disabled={pending || !canPay || !acknowledged || !isPaymentSender || !onPaymentNetwork || !paymentNetwork?.enabled || !modeMatches(paymentNetwork) || expired || detail.isError || Boolean(recovery.storageError)} onClick={() => void run("sign", signPayment)}>{busy === "sign" ? <Loader2 className="animate-spin" /> : <Wallet />} Sign and send {payment.amount} {payment.symbol}</Button>
                            </div>}
                        </>}
                    </>}

                    {activeRecovery && !payment.txHash && <Notice>{activeRecovery.txHash ? "This payment already has a transaction hash. Use Retry saving hash above; this will not request another wallet signature." : "A wallet request may still be pending or may have been broadcast. Check your wallet activity and paste its transaction hash below. Signing again is blocked for this intent."}</Notice>}
                    {["awaiting_signature", "submitted", "confirming"].includes(payment.status) && <details className="rounded-xl border border-[#d9d6cd] p-4" open={Boolean(activeRecovery && activeRecovery.phase !== "saved")}>
                        <summary className="cursor-pointer text-sm font-semibold text-[#575750]">{!payment.txHash ? "Already sent? Recover a transaction hash" : payment.errorCode === "TX_NOT_VISIBLE" ? "Record the correct transaction hash" : "Record an existing replacement transaction"}</summary>
                        <form className="mt-4 space-y-3" onSubmit={(event) => void recoverHash(event)}>
                            <p className="text-xs leading-5 text-[#66665f]">Copy a transaction hash from your wallet activity on {paymentNetwork?.name ?? `chain ${payment.chainId}`}. Recording a hash never sends a transfer and remains available after intent expiry. A different hash is accepted only when the network already shows it and it matches this payment's sender, destination, and amount{payment.nonce !== null ? ", and the original transaction's nonce" : ""}.</p>
                            {activeRecovery?.previousHashes?.length ? <div className="space-y-2"><p className="text-xs text-[#66665f]">Previously recorded hashes</p>{activeRecovery.previousHashes.map((hash) => <div key={hash}><CopyValue value={hash} label="previous transaction hash" /></div>)}</div> : null}
                            <Label htmlFor="crypto-recovery-hash">Transaction hash</Label>
                            <Input id="crypto-recovery-hash" value={manualHash} onChange={(event) => setManualHash(event.target.value)} placeholder="0x… (66 characters)" autoComplete="off" spellCheck={false} maxLength={66} className="font-mono text-xs" disabled={pending || !canPay} required />
                            <Button type="submit" variant="outline" disabled={pending || !canPay || !isTransactionHash(manualHash.trim())}>{busy === "recover" && <Loader2 className="animate-spin" />} Save transaction hash</Button>
                        </form>
                    </details>}
                </>}
            </div>
        </section>}

        <section className="premium-card overflow-hidden" aria-labelledby="history-title">
            <div className="card-header flex flex-wrap items-center justify-between gap-3"><div><h2 id="history-title" className="text-[15px] font-semibold">Payment history</h2><p className="mt-0.5 text-xs text-[#8a897f]">Every payment you have created, with its live status</p></div><Button size="sm" variant="outline" disabled={pending || rails.history.isFetching} onClick={() => void run("refresh", rails.refresh)}><RefreshCw className={rails.history.isFetching ? "animate-spin" : ""} /> Refresh</Button></div>
            {rails.history.isPending ? <p role="status" className="p-8 text-center text-sm text-[#66665f]">Loading payment history…</p> : rails.history.isError ? <div className="p-5"><Notice error>Could not load payment history. {cryptoErrorMessage(rails.history.error)} <button type="button" className="underline" onClick={() => void rails.history.refetch()}>Try again</button></Notice></div> : !history.length ? <div className="flex flex-col items-center px-5 py-12 text-center"><span className="dashboard-icon mb-4 h-12 w-12"><Coins className="h-6 w-6" /></span><p className="font-semibold">Your first payment starts here.</p><p className="mt-2 max-w-sm text-sm leading-6 text-[#66665f]">Create an intent above. Your payment details, transaction hash, and settlement status will appear here.</p></div> : <>
                <div className="overflow-x-auto"><table className="min-w-[780px] text-left text-sm"><thead><tr><th scope="col" className="px-5">Payment / destination</th><th scope="col" className="px-5">Network</th><th scope="col" className="px-5">Amount</th><th scope="col" className="px-5">Status</th><th scope="col" className="px-5">Created</th><th scope="col" className="px-5 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#e1dfd7]">
                    {history.map((item) => {
                        const itemNetwork = networks.find((entry) => entry.chainId === item.chainId);
                        return <tr key={item.id} className={selectedId === item.id ? "bg-[#e8eee4]/60" : ""}>
                            <td className="max-w-[240px] px-5 py-4"><button type="button" disabled={pending} onClick={() => selectPayment(item.id)} className="max-w-full text-left hover:text-[#087f5b]"><span className="block truncate font-semibold">{item.reference || shortAddress(item.toAddress)}</span><span className="mt-1 block font-mono text-[10px] text-[#66665f]" title={item.toAddress}>{shortAddress(item.toAddress)}</span></button></td>
                            <td className="px-5 py-4 text-xs"><div className="flex items-center gap-2.5">{itemNetwork && <NetworkIcon network={networkMarkId(itemNetwork)} size="sm" className="h-7 w-7" />}<span>{itemNetwork?.name ?? `Chain ${item.chainId}`}<span className="mt-1 block text-[10px] text-[#66665f]">{itemNetwork ? (itemNetwork.testnet ? "Testnet" : "Live") : `ID ${item.chainId}`}</span></span></div></td>
                            <td className="whitespace-nowrap px-5 py-4"><span className="inline-flex items-center gap-2 font-mono text-xs font-semibold"><AssetIcon symbol={item.symbol} size="xs" />{item.amount} {item.symbol}</span></td><td className="whitespace-nowrap px-5 py-4"><PaymentStatus status={item.status} /></td><td className="px-5 py-4 text-xs">{formatTime(item.createdAt)}</td>
                            <td className="px-5 py-4 text-right"><div className="flex flex-col items-end gap-2"><button type="button" disabled={pending} className="text-xs font-semibold text-[#087f5b] hover:underline" onClick={() => selectPayment(item.id)}>Open payment</button><ExplorerLink payment={item} network={itemNetwork} /></div></td>
                        </tr>;
                    })}
                </tbody></table></div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e1dfd7] px-5 py-4"><p className="text-xs text-[#66665f]">{history.length} payment{history.length === 1 ? "" : "s"} loaded · Status updates while you track a payment</p>{rails.history.hasNextPage && <Button size="sm" variant="outline" disabled={rails.history.isFetching || pending} onClick={() => void rails.history.fetchNextPage()}>{rails.history.isFetchingNextPage && <Loader2 className="animate-spin" />} Load more</Button>}</div>
            </>}
        </section>
    </div>;
}
