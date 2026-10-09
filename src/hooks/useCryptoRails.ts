import { useCallback, useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient, { type CryptoNetwork, type CryptoPayment } from "@/lib/api-client";
import {
    connectInjectedWallet, cryptoErrorMessage, listPaymentRecoveries, RECOVERY_EVENT,
    subscribeWalletDiscovery, watchWallet,
    readWalletBalances, type DiscoveredWallet, type PaymentRecovery, type WalletConnection,
} from "@/lib/crypto-wallet";

export function useCryptoRails(companyId: string) {
    const queryClient = useQueryClient();
    const networks = useQuery({
        queryKey: ["crypto", companyId, "networks"],
        queryFn: () => apiClient.getCryptoNetworks(),
        staleTime: 30_000,
        retry: 1,
    });
    const wallets = useQuery({
        queryKey: ["crypto", companyId, "wallets"],
        queryFn: () => apiClient.getCryptoWallets(),
        retry: 1,
    });
    const history = useInfiniteQuery({
        queryKey: ["crypto", companyId, "payments"],
        queryFn: ({ pageParam }) => apiClient.getCryptoPayments({ limit: 25, ...(pageParam ? { cursor: pageParam } : {}) }),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (page) => page.nextCursor || undefined,
        // Keep a live view only while there is work on-chain. A settled history
        // should not continually consume the user's session or the RPC budget.
        refetchInterval: (query) => query.state.data?.pages
            .flatMap((page) => page.items)
            .some((payment) => ["submitted", "confirming"].includes(payment.status)) ? 15_000 : false,
        retry: 1,
    });
    const refresh = useCallback(async () => {
        await queryClient.invalidateQueries({ queryKey: ["crypto", companyId] });
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ["treasury"] }),
            queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
            queryClient.invalidateQueries({ queryKey: ["analytics"] }),
        ]);
    }, [queryClient, companyId]);
    const updatePayment = useCallback((payment: CryptoPayment) => {
        queryClient.setQueryData(["crypto", companyId, "payment", payment.id], payment);
        void queryClient.invalidateQueries({ queryKey: ["crypto", companyId, "payments"] });
        void Promise.all([
            queryClient.invalidateQueries({ queryKey: ["treasury"] }),
            queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
            queryClient.invalidateQueries({ queryKey: ["analytics"] }),
        ]);
    }, [queryClient, companyId]);

    return { networks, wallets, history, refresh, updatePayment };
}

export function useCryptoPayment(companyId: string, paymentId: string | null) {
    return useQuery({
        queryKey: ["crypto", companyId, "payment", paymentId],
        queryFn: async () => {
            const payment = await apiClient.getCryptoPayment(paymentId!);
            if (payment.txHash && ["submitted", "confirming"].includes(payment.status)) {
                return apiClient.reconcileCryptoPayment(payment.id);
            }
            return payment;
        },
        enabled: Boolean(paymentId),
        refetchInterval: (query) => query.state.data && ["submitted", "confirming"].includes(query.state.data.status) ? 15_000 : false,
        // A polling failure should be visible; none of these calls ask the wallet to send.
        retry: false,
    });
}

export function useCryptoBalances(companyId: string, network: CryptoNetwork | undefined, connection: WalletConnection | null, address: string | null, asset: string | null, enabled = true) {
    return useQuery({
        queryKey: ["crypto", companyId, "balances", network?.chainId, address, asset],
        queryFn: async () => {
            if (!connection) return apiClient.getCryptoBalances({ chainId: network!.chainId, address: address!, asset: asset! });
            try { return await readWalletBalances(connection.wallet.provider, network!, asset!); }
            catch (walletError) {
                // Some wallets disable eth_call while locked. The authenticated
                // server read keeps the balance panel useful without weakening
                // the server-side prepare and settlement checks.
                try { return await apiClient.getCryptoBalances({ chainId: network!.chainId, address: address!, asset: asset! }); }
                catch { throw walletError; }
            }
        },
        enabled: enabled && Boolean(network?.chainId && address && asset),
        staleTime: 10_000,
        refetchInterval: 15_000,
        retry: 1,
    });
}

export function useInjectedCryptoWallet() {
    const [wallets, setWallets] = useState<DiscoveredWallet[]>([]);
    const [connection, setConnection] = useState<WalletConnection | null>(null);
    const generation = useRef(0);
    useEffect(() => subscribeWalletDiscovery(setWallets), []);
    useEffect(() => {
        if (!connection) return;
        return watchWallet(connection, setConnection);
    }, [connection]);
    useEffect(() => () => { generation.current++; }, []);

    const connect = async (wallet: DiscoveredWallet) => {
        const attempt = ++generation.current;
        setConnection(null);
        const next = await connectInjectedWallet(wallet);
        if (attempt !== generation.current) throw new Error("The wallet connection changed before verification could start. Connect again.");
        setConnection(next);
        return next;
    };
    const disconnect = () => { generation.current++; setConnection(null); };
    return { wallets, connection, setConnection, connect, disconnect };
}

export function usePaymentRecovery(companyId: string) {
    const [records, setRecords] = useState<PaymentRecovery[]>([]);
    const [storageError, setStorageError] = useState<string | null>(null);
    const reload = useCallback(() => {
        try {
            setRecords(listPaymentRecoveries(companyId));
            setStorageError(null);
        } catch (error) { setStorageError(cryptoErrorMessage(error)); }
    }, [companyId]);
    useEffect(() => {
        reload();
        window.addEventListener("storage", reload);
        window.addEventListener(RECOVERY_EVENT, reload);
        return () => {
            window.removeEventListener("storage", reload);
            window.removeEventListener(RECOVERY_EVENT, reload);
        };
    }, [reload]);
    return { records, storageError, reload };
}
