import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { isAddress } from "viem";
import { AlertCircle, ArrowRight, Check, CheckCircle2, ChevronDown, Coins, Copy, ExternalLink, FileCheck2, Loader2, Plus, RefreshCw, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AssetIcon from "@/components/dashboard/AssetIcon";
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
import { cn } from "@/lib/utils";

const statusLabels: Record<CryptoPayment["status"], string> = {
    awaiting_signature: "Awaiting signature", submitted: "Submitted", confirming: "Confirming",
    settled: "Settled", failed: "Failed", reorged: "Requires review",
};
const shortAddress = (value: string) => `${value.slice(0, 6)}…${value.slice(-4)}`;
const formatTime = (value: string) => new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

function NetworkAssetMark({ network, symbol = "USDC", className }: { network: CryptoNetwork; symbol?: string; className?: string }) {
    const short = network.kind === "sandbox" ? "SBX" : network.chainId === 1 || network.chainId === 11155111 ? "ETH" : network.chainId === 137 || network.chainId === 80002 ? "POLY" : network.chainId === 8453 || network.chainId === 84532 ? "BASE" : network.chainId === 42161 || network.chainId === 421614 ? "ARB" : network.chainId === 10 || network.chainId === 11155420 ? "OP" : "EVM";
    const tone = short === "ETH" ? "border-[#c9c2ee] bg-[#edeafe] text-[#4f46a5]" : short === "POLY" ? "border-[#d7c8ff] bg-[#f2edff] text-[#7047d7]" : short === "BASE" ? "border-[#bfcbff] bg-[#e9efff] text-[#2457d6]" : short === "ARB" ? "border-[#b9d9eb] bg-[#e7f2f8] text-[#2777a8]" : short === "OP" ? "border-[#f5c3c3] bg-[#fff0ef] text-[#d03737]" : "border-[#cdd8c8] bg-[#e8eee4] text-[#087f5b]";
    return <span className={cn("relative inline-flex shrink-0", className)} aria-label={`${symbol} on ${network.name}`} title={`${symbol} on ${network.name}`}>
        <AssetIcon symbol={symbol} size="sm" className="h-9 w-9 rounded-lg bg-white" />
        <span className={cn("absolute -bottom-1 -right-2 rounded border px-1 py-0.5 font-mono text-[8px] font-bold leading-none", tone)}>{short}</span>
    </span>;
}

function PaymentStatus({ status }: { status: CryptoPayment["status"] }) {
    return <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium", status === "failed" ? "border-[#ebcccc] bg-[#fff0ee] text-[#a53232]" : status === "reorged" ? "border-[#ead6a7] bg-[#fff8e8] text-[#7e5a13]" : status === "settled" ? "border-[#b9d9cc] bg-[#e8eee4] text-[#087f5b]" : "border-[#d9d6cd] bg-[#f5f3ee] text-[#575750]")}>
        {status === "settled" ? <Check className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}{statusLabels[status] ?? status}
    </span>;
}

function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) {
    return <div role={error ? "alert" : "status"} className={cn("flex items-start gap-3 rounded-xl border p-4 text-sm leading-6", error ? "border-[#ebcccc] bg-[#fff0ee] text-[#a53232]" : "border-[#b9d9cc] bg-[#e8eee4] text-[#245843]")}>
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
    const isSandbox = network?.kind === "sandbox";
    const sandboxWallet = rails.wallets.data?.find((item) => item.chainId === 31337);
    const activeAddress = wallet.connection?.address ?? (isSandbox ? sandboxWallet?.address : undefined);
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
    const canCreate = Boolean(canPay && network?.enabled && modeMatches(network) && linkedWallet && (isSandbox || wallet.connection?.chainId === network.chainId) && !rails.networks.isError && !rails.wallets.isError);
    const balances = useCryptoBalances(companyId, network, wallet.connection, activeAddress ?? null, selectedAsset?.symbol ?? null, Boolean(activeAddress && network?.enabled && (isSandbox || wallet.connection?.chainId === network.chainId)));

    const createReadiness = !canPay ? "Your role cannot create payments." : !rails.networks.data ? "Loading payment networks…" : !network ? "Select a supported network." : !network.enabled ? (network.reason || "This network is unavailable.") : isSandbox ? (!linkedWallet ? "Preparing your simulated sandbox account…" : "Sandbox ready — this payment will settle against the shared simulated ledger.") : !wallet.connection ? "Connect a wallet to continue." : wallet.connection.chainId !== network.chainId ? `Switch your wallet to ${network.name}.` : !linkedWallet ? "Verify wallet ownership to enable payment creation." : "Ready — creating an intent will not move funds.";
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
        try { await work(); } catch (failure) { setError(cryptoErrorMessage(failure)); }
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
            if (!canCreate || !linkedWallet || !network || (!isSandbox && !wallet.connection) || !selectedAsset) throw new Error(createReadiness);
            const to = destination.trim();
            if (!isAddress(to) || /^0x0{40}$/i.test(to)) throw new Error("Enter a valid, nonzero Ethereum destination address.");
            if (selectedAsset.kind === "erc20" && to.toLowerCase() === selectedAsset.tokenAddress.toLowerCase()) throw new Error(`Enter the recipient's wallet address, not the ${selectedAsset.symbol} contract address.`);
            const units = exactTokenAmount(amount.trim(), selectedAsset.decimals);
            const maximum = selectedAsset.kind === "erc20" ? 1_000_000_000_000n : 100n * (10n ** BigInt(selectedAsset.decimals));
            if (units > maximum) throw new Error(`Payments cannot exceed ${selectedAsset.kind === "erc20" ? "1,000,000 " + selectedAsset.symbol : "100 " + selectedAsset.symbol}.`);
            if (!isSandbox && wallet.connection) await assertWalletMatches(wallet.connection.wallet.provider, { sender: linkedWallet.address, chainId: network.chainId });
            const payload = { walletId: linkedWallet.id, to, amount: amount.trim(), asset: selectedAsset.symbol, ...(reference.trim() ? { reference: reference.trim() } : {}) };
            const created = await apiClient.createCryptoPayment(payload, paymentIntentKey(companyId, payload));
            rails.updatePayment(created);
            selectPayment(created.id);
            setNotice(created.status === "settled" ? "Sandbox payment settled. The shared treasury balance and payment history are up to date." : "Payment intent created. Review its details before opening your wallet to sign.");
        });
    }

    const sandboxFaucetAmount = selectedAsset?.symbol === "BTC" ? "0.25" : selectedAsset?.symbol === "ETH" ? "10" : selectedAsset?.symbol === "SOL" ? "50" : selectedAsset?.symbol === "MATIC" ? "1000" : "10000";
    async function addSandboxFunds() {
        if (!isSandbox || !selectedAsset) throw new Error("Select the Zapzive Sandbox before adding test funds.");
        await apiClient.deposit({ asset: selectedAsset.symbol, amount: sandboxFaucetAmount });
        await rails.refresh();
        await balances.refetch();
        setNotice(`${sandboxFaucetAmount} ${selectedAsset.symbol} test funds added to the shared sandbox ledger.`);
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
            : "Transaction hash saved. Settlement is now verified on the network; no additional signature is needed.";
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

    const pending = Boolean(busy);
    return <div className="space-y-6 pb-8">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
                <p className="dashboard-eyebrow">Wallet payments</p>
                <h1 className="mt-2 text-3xl tracking-[-0.05em] sm:text-[38px]">Crypto payments, from your wallet.</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#66665f]">Choose a supported asset and network, review the exact transfer, then approve it in your wallet. Follow every payment through settlement.</p>
            </div>
            <Button variant="outline" disabled={pending} onClick={() => void run("new", async () => { resetPaymentIntentKey(companyId); selectPayment(null); setAmount(""); setDestination(""); setReference(""); setNotice("Ready for a new payment intent."); })}><Plus /> New payment</Button>
        </section>

        {rails.networks.data && <div className="flex flex-col justify-between gap-3 rounded-xl border border-[#b9d9cc] bg-[#e8eee4] px-4 py-3 text-sm sm:flex-row sm:items-center">
<div className="flex items-start gap-2.5"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#087f5b]" /><p><span className="font-semibold">{isSandbox ? "Zapzive Sandbox" : rails.networks.data.mode === "testnet" ? "Testnet payments" : "Live payments"}</span><span className="text-[#575750]"> · {isSandbox ? "Simulated balances complete deterministically and sync with your shared sandbox ledger." : rails.networks.data.mode === "testnet" ? "Transfers use test tokens on the selected test network." : "Signing transfers real assets and uses native tokens for network fees."}</span></p></div>
            <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-[#087f5b]">You hold the keys</span>
        </div>}
        {error && <Notice error>{error}</Notice>}
        {notice && <Notice>{notice}</Notice>}
        {!canPay && <Notice>You can view payment history and refresh settlement status. Creating payments, verifying wallets, and recording hashes requires the owner, admin, treasury, or approver role.</Notice>}
        {recovery.storageError && <Notice error>Payment recovery storage needs attention: {recovery.storageError} <button className="underline" disabled={pending} onClick={recovery.reload}>Check storage again</button></Notice>}

        {unsaved.length > 0 && <section className="premium-card overflow-hidden" aria-labelledby="recovery-title">
            <div className="card-header"><p className="dashboard-eyebrow">Continue safely</p><h2 id="recovery-title" className="mt-1 text-lg">{unsaved.length} payment{unsaved.length === 1 ? " needs" : "s need"} recovery</h2></div>
            <div className="divide-y divide-[#e1dfd7]">
                {unsaved.map((record) => <div key={record.payment.id} className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
                    <div className="min-w-0 space-y-2"><p className="text-sm font-semibold">{record.payment.amount} {record.payment.symbol} <span className="font-normal text-[#66665f]">to {shortAddress(record.payment.toAddress)}</span></p>
                        <p className="text-xs leading-5 text-[#66665f]">{record.txHash ? "A transaction hash was returned. Retry saving it to finish tracking this payment." : "A wallet request was started. Check wallet activity and recover its hash before creating another transfer."}</p>
                        <p className="break-all font-mono text-[10px] text-[#66665f]">Intent {record.payment.id} · Network {record.payment.chainId}</p>
                        {record.txHash && <><CopyValue value={record.txHash} label="transaction hash" /><div><ExplorerLink payment={record.payment} hash={record.txHash} network={networks.find((item) => item.chainId === record.payment.chainId)} /></div></>}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2"><Button variant="outline" size="sm" disabled={pending} onClick={() => selectPayment(record.payment.id)}>Open payment</Button>{record.txHash && <Button size="sm" disabled={pending || !canPay} onClick={() => void run(`save:${record.payment.id}`, () => saveHash(record))}>{busy === `save:${record.payment.id}` ? <Loader2 className="animate-spin" /> : <RefreshCw />} Retry saving hash</Button>}</div>
                </div>)}
            </div>
        </section>}

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
            <section className="premium-card overflow-hidden" aria-labelledby="new-payment-title">
                <div className="card-header flex items-center justify-between"><div><p className="dashboard-eyebrow">01 / Payment details</p><h2 id="new-payment-title" className="mt-1 text-lg">Create a payment intent</h2></div><span className="dashboard-icon h-10 w-10"><Coins className="h-5 w-5" /></span></div>
                <form className="space-y-5 p-5 sm:p-6" onSubmit={createPayment}>
                    <div className="space-y-2"><Label htmlFor="crypto-asset">Asset</Label><div className="flex items-center gap-3 rounded-xl border border-[#b9d9cc] bg-[#e8eee4] p-3">{selectedAsset && <AssetIcon symbol={selectedAsset.symbol} size="sm" className="h-9 w-9 rounded-lg bg-white" />}<div className="min-w-0 flex-1"><p className="text-sm font-semibold">{selectedAsset?.symbol || "Select an asset"}</p><p className="text-xs text-[#66665f]">{selectedAsset?.kind === "sandbox" ? "Simulated sandbox asset" : selectedAsset?.kind === "native" ? "Native network asset" : "Verified token rail"} · {selectedAsset?.decimals ?? "—"} decimal places</p></div><span className="rounded-full border border-[#b9d9cc] bg-white px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#087f5b]">{selectedAsset?.enabled ? "Enabled" : "Unavailable"}</span></div><div className="relative"><select id="crypto-asset" className="h-10 w-full appearance-none pr-10" value={selectedAsset?.symbol || ""} disabled={pending || !availableAssets.length} onChange={(event) => { setAssetSymbol(event.target.value); setReviewed(null); setAcknowledged(false); }} aria-label="Payment asset">{availableAssets.map((item) => <option key={item.symbol} value={item.symbol} disabled={!item.enabled}>{item.symbol} · {item.kind === "sandbox" ? "sandbox asset" : item.kind === "native" ? "native asset" : "token rail"}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-[#66665f]" /></div><p className="text-xs leading-5 text-[#66665f]">The selected asset is checked again by the server before signing. {isSandbox ? "No wallet signature or network fee is required in the sandbox." : selectedAsset?.kind === "native" ? `Network fees are paid in ${selectedAsset.symbol}.` : `Network fees are paid separately in ${network?.nativeSymbol || "the native token"}.`}</p></div>
                    <div className="space-y-2"><Label htmlFor="crypto-network">Network</Label>
                        {rails.networks.isPending ? <p role="status" className="text-sm text-[#66665f]">Loading available networks…</p> : rails.networks.isError ? <Notice error>Could not load payment networks. <button type="button" className="underline" onClick={() => void rails.networks.refetch()}>Try again</button></Notice> : networks.length ? <div className="relative"><select id="crypto-network" className="h-11 w-full appearance-none pl-3 pr-10 text-sm" value={network?.chainId ?? ""} disabled={pending} onChange={(event) => { setNetworkId(Number(event.target.value)); setReviewed(null); setAcknowledged(false); }}>
                            {networks.map((item) => <option key={item.chainId} value={item.chainId}>{item.name} · {item.testnet ? "Testnet" : "Live"}{item.enabled ? "" : " · Unavailable"}</option>)}
                        </select><ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-[#66665f]" /></div> : <Notice>No payment networks are configured. Your workspace administrator needs to enable a USDC network.</Notice>}
                        {network && !network.enabled && <Notice>This network is unavailable. {network.reason || "Your administrator needs to finish its payment rail configuration."}</Notice>}
                        {network?.enabled && !modeMatches(network) && <Notice error>This network does not match the service's current signing mode. Refresh networks or contact your administrator.</Notice>}
                    </div>
                    <div className="space-y-2"><Label htmlFor="crypto-to">Destination address</Label><Input id="crypto-to" placeholder="0x…" value={destination} onChange={(event) => setDestination(event.target.value)} required autoComplete="off" spellCheck={false} maxLength={42} disabled={pending} className="h-11 font-mono text-sm" /><p className="text-xs leading-5 text-[#66665f]">Use a wallet address that accepts {selectedAsset?.symbol || "the selected asset"} on {network?.name ?? "the selected network"}.</p></div>
                    {network && <div className="flex items-center gap-3 rounded-xl border border-[#e1dfd7] bg-[#f5f3ee] p-3">
                        <NetworkAssetMark network={network} symbol={selectedAsset?.symbol} />
                        <div className="min-w-0"><p className="truncate text-sm font-semibold">{selectedAsset?.symbol || "Asset"} on {network.name}</p><p className="mt-0.5 text-xs text-[#66665f]">{isSandbox ? "Simulated settlement" : network.testnet ? "Test funds only" : "Live settlement"} · {isSandbox ? "No network fee" : `Network fees in ${network.nativeSymbol}`}</p></div>
                    </div>}
                    <div className="space-y-2"><Label htmlFor="crypto-amount">Amount in {selectedAsset?.symbol || "asset"}</Label><div className="relative"><Input id="crypto-amount" placeholder="0.00" inputMode="decimal" autoComplete="off" value={amount} onChange={(event) => setAmount(event.target.value)} required maxLength={80} disabled={pending} className="h-12 pr-20 text-lg tabular-nums" /><span className="absolute right-4 top-3.5 font-mono text-xs text-[#66665f]">{selectedAsset?.symbol || "—"}</span></div><p className="text-xs leading-5 text-[#66665f]">Up to {selectedAsset?.decimals ?? 6} decimal places. Maximum {selectedAsset?.kind === "native" ? `100 ${selectedAsset.symbol}` : `1,000,000 ${selectedAsset?.symbol || "tokens"}`}. {isSandbox ? "No network fee is charged." : `Network fees are paid separately in ${network?.nativeSymbol || "the network's native token"}.`}</p></div>
                    <div className="space-y-2"><Label htmlFor="crypto-reference">Reference <span className="font-normal text-[#66665f]">(optional)</span></Label><Input id="crypto-reference" placeholder="Invoice or payment note" value={reference} onChange={(event) => setReference(event.target.value)} maxLength={140} disabled={pending} /></div>
                    <div className="border-t border-[#e1dfd7] pt-5"><Button type="submit" className="w-full" disabled={pending || !selectedAsset?.enabled || Boolean(recovery.storageError)}>{busy === "create" ? <Loader2 className="animate-spin" /> : <ArrowRight />} Create payment intent</Button><p className={cn("mt-3 text-center text-xs leading-5", canCreate ? "text-[#66665f]" : "text-[#a53232]")}>{createReadiness}</p></div>
                </form>
            </section>

            <aside className="space-y-4">
                <section className="premium-card overflow-hidden" aria-labelledby="wallet-title">
                    <div className="card-header flex items-center justify-between"><div><p className="dashboard-eyebrow">Your signing account</p><h2 id="wallet-title" className="mt-1 text-lg">Connected wallet</h2></div><span className="dashboard-icon h-10 w-10"><Wallet className="h-5 w-5" /></span></div>
                    <div className="space-y-4 p-5 sm:p-6">
                        {wallet.connection ? <>
                            <div className="flex items-center justify-between gap-3"><p className="font-semibold">{wallet.connection.wallet.name}</p><button type="button" disabled={pending} onClick={() => { wallet.disconnect(); setReviewed(null); }} className="text-xs text-[#66665f] underline underline-offset-4 disabled:opacity-50">Disconnect</button></div>
                            <CopyValue value={wallet.connection.address} label="wallet address" />
                            <div className="flex items-center gap-3 rounded-xl border border-[#e1dfd7] bg-[#f5f3ee] p-4 text-sm">{connectedNetwork && <NetworkAssetMark network={connectedNetwork} />}<div><p className="text-xs text-[#66665f]">Wallet network</p><p className="mt-1 font-semibold">{connectedNetwork?.name || `Chain ${wallet.connection.chainId}`}</p></div></div>
                            <div className="rounded-xl border border-[#d9d6cd] bg-white p-4" aria-live="polite">
                                <div className="flex items-center justify-between gap-3"><div><p className="dashboard-eyebrow">Available balance</p><p className="mt-1 text-xs text-[#66665f]">{network?.name || "Selected network"}</p></div><button type="button" aria-label="Refresh wallet balances" title="Refresh wallet balances" className="rounded-lg p-2 text-[#087f5b] hover:bg-[#e8eee4] disabled:opacity-50" disabled={pending || balances.isFetching} onClick={() => void balances.refetch()}><RefreshCw className={cn("h-4 w-4", balances.isFetching && "animate-spin")} /></button></div>
                                {wallet.connection.chainId !== network?.chainId ? <p className="mt-3 text-xs leading-5 text-[#a53232]">Switch to {network?.name || "the selected network"} to load balances.</p> : balances.isPending ? <p className="mt-3 flex items-center gap-2 text-xs text-[#66665f]"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading balances from the network…</p> : balances.isError ? <p className="mt-3 text-xs leading-5 text-[#a53232]">Balances could not be loaded. {cryptoErrorMessage(balances.error)}</p> : balances.data && <div className="mt-3 grid gap-2 sm:grid-cols-2"><div className="flex items-center gap-2.5 rounded-lg bg-[#f5f3ee] p-2.5"><AssetIcon symbol={balances.data.asset.symbol} size="sm" className="h-8 w-8 rounded-lg" /><div className="min-w-0"><p className="font-mono text-sm font-semibold tabular-nums">{balances.data.asset.amount}</p><p className="text-[10px] uppercase tracking-wider text-[#66665f]">{balances.data.asset.symbol} available</p></div></div><div className="flex items-center gap-2.5 rounded-lg bg-[#f5f3ee] p-2.5"><AssetIcon symbol={balances.data.feeAsset.symbol} size="sm" className="h-8 w-8 rounded-lg" /><div className="min-w-0"><p className="font-mono text-sm font-semibold tabular-nums">{balances.data.feeAsset.amount}</p><p className="text-[10px] uppercase tracking-wider text-[#66665f]">{balances.data.feeAsset.symbol} for fees</p></div></div></div>}
                            </div>
                            {network && wallet.connection.chainId !== network.chainId ? <Button className="w-full" variant="outline" disabled={pending || !network.enabled} onClick={() => void run("switch", switchAndVerify)}>{busy === "switch" && <Loader2 className="animate-spin" />} Switch & verify on {network.name}</Button> : linkedWallet ? <div className="flex items-center gap-2 text-sm text-[#087f5b]"><CheckCircle2 className="h-4 w-4" /> Ownership verified for this network</div> : <><Button className="w-full" disabled={pending || !canPay || !network?.enabled || !modeMatches(network) || rails.wallets.isPending || rails.wallets.isError} onClick={() => void run("verify", verifyWallet)}>{busy === "verify" ? <Loader2 className="animate-spin" /> : <ShieldCheck />} Verify wallet ownership</Button><p className="text-xs leading-5 text-[#66665f]">MetaMask or your browser wallet will open one ownership-signature prompt. It proves control of this address only; it cannot move funds or approve tokens.</p></>}
                        </> : <>
                            <p className="text-sm leading-6 text-[#66665f]">Connect MetaMask or another compatible EVM wallet. Your wallet keeps the private keys; a one-time signature proves ownership before any payment intent can be created.</p>
                            {wallet.wallets.length ? <div className="space-y-2">{wallet.wallets.map((item) => <Button key={item.id} className="w-full justify-between" variant="outline" disabled={pending || !canPay} onClick={() => void run(`connect:${item.id}`, () => connectAndVerify(item))}><span className="truncate">Connect & verify {item.name}</span>{busy === `connect:${item.id}` ? <Loader2 className="animate-spin" /> : <ShieldCheck />}</Button>)}</div> : <Notice>No browser wallet detected. Install or unlock your wallet extension, allow access to this site, then scan again.</Notice>}
                            <button type="button" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#087f5b]" disabled={pending} onClick={rediscoverWallets}><RefreshCw className="h-3 w-3" /> Scan for wallets</button>
                        </>}
                        {rails.wallets.isError && <Notice error>Could not load verified wallets. <button type="button" className="underline" onClick={() => void rails.wallets.refetch()}>Try again</button></Notice>}
                    </div>
                </section>
                <div className="rounded-2xl border border-[#d9d6cd] bg-[#eeece5] p-5">
                    <p className="text-sm font-semibold">Every payment is yours to approve.</p>
                    <ol className="mt-4 space-y-3 text-xs leading-5 text-[#575750]">
                        <li className="flex gap-3"><span className="font-mono text-[#087f5b]">01</span> Create an intent with the recipient, network, and amount.</li>
                        <li className="flex gap-3"><span className="font-mono text-[#087f5b]">02</span> Review the transfer. Your wallet shows the final network fee.</li>
                        <li className="flex gap-3"><span className="font-mono text-[#087f5b]">03</span> Sign once, then track confirmations until settlement.</li>
                    </ol>
                    <p className="mt-4 border-t border-[#d9d6cd] pt-4 text-xs leading-5 text-[#66665f]">Standard externally owned accounts are supported. Smart contract wallets are not supported yet.</p>
                </div>
            </aside>
        </div>

        {selectedId && <section ref={reviewRef} className="premium-card scroll-mt-24 overflow-hidden" aria-labelledby="review-title">
            <div className="card-header flex flex-wrap items-center justify-between gap-3"><div><p className="dashboard-eyebrow">02 / Review & sign</p><h2 id="review-title" className="mt-1 text-lg">Payment review</h2></div>{payment && <PaymentStatus status={payment.status} />}</div>
            <div className="space-y-5 p-5 sm:p-6">
                {detail.isPending && <p role="status" className="flex items-center gap-2 text-sm text-[#66665f]"><Loader2 className="h-4 w-4 animate-spin" /> Loading payment…</p>}
                {detail.isError && <Notice error>Could not refresh this payment. {cryptoErrorMessage(detail.error)} <button type="button" className="underline" disabled={pending} onClick={() => void detail.refetch()}>Retry status</button></Notice>}
                {payment && <>
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="text-3xl font-semibold tracking-[-0.05em] tabular-nums">{payment.amount} <span className="text-xl text-[#66665f]">{payment.symbol}</span></p><p className="mt-2 text-sm text-[#66665f]">{paymentNetwork?.name ?? `Chain ${payment.chainId}`} · Chain ID {payment.chainId}{paymentNetwork && ` · ${paymentNetwork.testnet ? "Testnet" : "Live network"}`}</p></div><Button size="sm" variant="outline" disabled={pending} onClick={() => void run(`reconcile:${payment.id}`, () => reconcile(payment))}><RefreshCw className={busy === `reconcile:${payment.id}` ? "animate-spin" : ""} /> Refresh status</Button></div>
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
                    {payment.errorCode === "TX_NOT_VISIBLE" && <Notice>The transaction hash is saved, but the network provider has not indexed it yet. Keep this page or your wallet activity available; do not sign or send again.</Notice>}
                    {payment.errorCode && payment.errorCode !== "TX_NOT_VISIBLE" && <Notice error>Network verification: {payment.errorCode}. Refresh the status and inspect the transaction before taking further action.</Notice>}
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
                        <summary className="cursor-pointer text-sm font-semibold text-[#575750]">{payment.txHash ? "Record an existing replacement transaction" : "Already sent? Recover a transaction hash"}</summary>
                        <form className="mt-4 space-y-3" onSubmit={(event) => void recoverHash(event)}>
                            <p className="text-xs leading-5 text-[#66665f]">Copy a transaction hash from your wallet activity on {paymentNetwork?.name ?? `chain ${payment.chainId}`}. Recording a hash never sends a transfer and remains available after intent expiry. A replacement is accepted only after the current hash is visible and must match the original sender, nonce, destination, and amount.</p>
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
            <div className="card-header flex flex-wrap items-center justify-between gap-3"><div><p className="dashboard-eyebrow">03 / Settlement activity</p><h2 id="history-title" className="mt-1 text-lg">Payment history</h2></div><Button size="sm" variant="outline" disabled={pending || rails.history.isFetching} onClick={() => void run("refresh", rails.refresh)}><RefreshCw className={rails.history.isFetching ? "animate-spin" : ""} /> Refresh</Button></div>
            {rails.history.isPending ? <p role="status" className="p-8 text-center text-sm text-[#66665f]">Loading payment history…</p> : rails.history.isError ? <div className="p-5"><Notice error>Could not load payment history. {cryptoErrorMessage(rails.history.error)} <button type="button" className="underline" onClick={() => void rails.history.refetch()}>Try again</button></Notice></div> : !history.length ? <div className="flex flex-col items-center px-5 py-12 text-center"><span className="dashboard-icon mb-4 h-12 w-12"><Coins className="h-6 w-6" /></span><p className="font-semibold">Your first payment starts here.</p><p className="mt-2 max-w-sm text-sm leading-6 text-[#66665f]">Create an intent above. Your payment details, transaction hash, and settlement status will appear here.</p></div> : <>
                <div className="overflow-x-auto"><table className="min-w-[780px] text-left text-sm"><thead><tr><th scope="col" className="px-5">Payment / destination</th><th scope="col" className="px-5">Network</th><th scope="col" className="px-5">Amount</th><th scope="col" className="px-5">Status</th><th scope="col" className="px-5">Created</th><th scope="col" className="px-5 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#e1dfd7]">
                    {history.map((item) => {
                        const itemNetwork = networks.find((entry) => entry.chainId === item.chainId);
                        return <tr key={item.id} className={selectedId === item.id ? "bg-[#e8eee4]/60" : ""}>
                            <td className="max-w-[240px] px-5 py-4"><button type="button" disabled={pending} onClick={() => selectPayment(item.id)} className="max-w-full text-left hover:text-[#087f5b]"><span className="block truncate font-semibold">{item.reference || shortAddress(item.toAddress)}</span><span className="mt-1 block font-mono text-[10px] text-[#66665f]" title={item.toAddress}>{shortAddress(item.toAddress)}</span></button></td>
                            <td className="px-5 py-4 text-xs"><div className="flex items-center gap-2">{itemNetwork && <NetworkAssetMark network={itemNetwork} className="scale-75 origin-left" />}<span>{itemNetwork?.name ?? `Chain ${item.chainId}`}<span className="mt-1 block text-[10px] text-[#66665f]">{itemNetwork ? (itemNetwork.testnet ? "Testnet" : "Live") : `ID ${item.chainId}`}</span></span></div></td>
                            <td className="whitespace-nowrap px-5 py-4 font-mono text-xs">{item.amount} {item.symbol}</td><td className="whitespace-nowrap px-5 py-4"><PaymentStatus status={item.status} /></td><td className="px-5 py-4 text-xs">{formatTime(item.createdAt)}</td>
                            <td className="px-5 py-4 text-right"><div className="flex flex-col items-end gap-2"><button type="button" disabled={pending} className="text-xs font-semibold text-[#087f5b] hover:underline" onClick={() => selectPayment(item.id)}>Open payment</button><ExplorerLink payment={item} network={itemNetwork} /></div></td>
                        </tr>;
                    })}
                </tbody></table></div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e1dfd7] px-5 py-4"><p className="text-xs text-[#66665f]">{history.length} payment{history.length === 1 ? "" : "s"} loaded · Status updates while you track a payment</p>{rails.history.hasNextPage && <Button size="sm" variant="outline" disabled={rails.history.isFetching || pending} onClick={() => void rails.history.fetchNextPage()}>{rails.history.isFetchingNextPage && <Loader2 className="animate-spin" />} Load more</Button>}</div>
            </>}
        </section>
    </div>;
}
