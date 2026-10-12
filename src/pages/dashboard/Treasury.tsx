import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Check, Copy, Download, ExternalLink, Fuel, Plus, RefreshCw, Send, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import AssetIcon, { NetworkIcon } from "@/components/dashboard/AssetIcon";
import { useAssets, usePortfolio } from "@/hooks/use-treasury";
import { NETWORKS, PUBLIC_NETWORKS, STABLECOINS, TOKEN_NAMES, formatTokenAmount, networkKeyFor } from "@/lib/brand-assets";
import { cn } from "@/lib/utils";

interface TreasuryAsset {
    id: string;
    symbol: string;
    name: string;
    balance: string;
    amountUnits: string;
    decimals: number;
    usdValue: null;
    change24h: null;
    chain: string;
    chainId: number;
    walletAddress: string;
    color: string;
    icon: string;
    source: "rpc";
    valuation: "not_configured";
    asOf: string;
    explorerUrl?: string | null;
}

interface TreasuryPortfolio {
    items?: TreasuryAsset[];
    networkErrors?: Array<{ chainId: number; network: string; message: string }>;
    syncedAt?: string;
}

const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;
const LOW_GAS: Record<string, number> = { ETH: 0.002, POL: 1, MATIC: 1 };
const isNative = (asset: TreasuryAsset) => !STABLECOINS[asset.symbol.toUpperCase()] && asset.symbol.toUpperCase() in LOW_GAS;
const isLowGas = (asset: TreasuryAsset) => isNative(asset) && Number(asset.balance) < LOW_GAS[asset.symbol.toUpperCase()];

/** Exact stablecoin total at face value, using integer units rather than floats. */
function faceValue(assets: TreasuryAsset[]) {
    const scale = BigInt(10) ** BigInt(18);
    const total = assets.reduce((sum, asset) => {
        try { return sum + BigInt(asset.amountUnits) * BigInt(10) ** BigInt(Math.max(0, 18 - asset.decimals)); } catch { return sum; }
    }, BigInt(0));
    const whole = (total / scale).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const cents = (total % scale).toString().padStart(18, "0").slice(0, 2);
    return { whole, cents };
}

function CopyAddress({ address }: { address: string }) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(address);
            setCopied(true);
            toast.success("Wallet address copied");
            setTimeout(() => setCopied(false), 1500);
        } catch { toast.error("Could not copy. Select the address manually."); }
    };
    return (
        <button onClick={copy} className="group inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 font-mono text-xs text-[#55544d] hover:bg-[#f1efe9] hover:text-[#1b1c19]" aria-label={`Copy wallet address ${address}`}>
            {shortAddress(address)}
            {copied ? <Check className="h-3 w-3 text-[#0b6b4f]" /> : <Copy className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />}
        </button>
    );
}

export default function Treasury() {
    const navigate = useNavigate();
    const { data: fetchedAssets = [], isLoading: assetsLoading, isFetching: assetsFetching, refetch: refetchAssets } = useAssets();
    const { data: fetchedPortfolio, isLoading: portfolioLoading, isFetching: portfolioFetching, refetch: refetchPortfolio } = usePortfolio();
    const portfolio = (fetchedPortfolio || {}) as TreasuryPortfolio;
    const assets = useMemo(() => (Array.isArray(fetchedAssets) ? fetchedAssets : portfolio.items || []) as TreasuryAsset[], [fetchedAssets, portfolio.items]);
    const networkErrors = portfolio.networkErrors || [];
    const loading = assetsLoading || portfolioLoading;
    const refreshing = assetsFetching || portfolioFetching;

    const [networkFilter, setNetworkFilter] = useState<number | "all">("all");

    const networks = useMemo(() => {
        const map = new Map<number, { chainId: number; name: string; count: number }>();
        for (const asset of assets) {
            const entry = map.get(asset.chainId) ?? { chainId: asset.chainId, name: asset.chain, count: 0 };
            entry.count += 1;
            map.set(asset.chainId, entry);
        }
        return [...map.values()];
    }, [assets]);
    const wallets = useMemo(() => new Set(assets.map((asset) => asset.walletAddress.toLowerCase())).size, [assets]);
    const stable = assets.filter((asset) => STABLECOINS[asset.symbol.toUpperCase()] === "USD");
    const total = faceValue(stable);
    const lowGas = assets.filter(isLowGas);
    const visible = networkFilter === "all" ? assets : assets.filter((asset) => asset.chainId === networkFilter);
    const sortedVisible = [...visible].sort((a, b) => Number(isNative(a)) - Number(isNative(b)) || a.chain.localeCompare(b.chain));

    const refresh = () => { void Promise.all([refetchAssets(), refetchPortfolio()]); };

    const exportPortfolio = () => {
        const rows = [["Symbol", "Name", "Balance", "Network", "Chain ID", "Wallet", "As of"], ...assets.map((asset) => [asset.symbol, asset.name, asset.balance, asset.chain, String(asset.chainId), asset.walletAddress, asset.asOf])];
        const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `onchain-holdings-${new Date().toISOString().slice(0, 10)}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                <div className="min-w-0">
                    <h2 className="dash-title">On-chain holdings</h2>
                    <p className="mt-1.5 max-w-2xl text-sm text-[#74736b]">Every balance is read live from the network for wallets you have verified. Nothing is estimated or cached as a ledger figure.</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                    <Button variant="outline" onClick={refresh} disabled={refreshing}><RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} /> Refresh</Button>
                    <Button variant="outline" onClick={exportPortfolio} disabled={!assets.length}><Download className="h-4 w-4" /> Export CSV</Button>
                    <Button onClick={() => navigate("/dashboard/crypto")}><Send className="h-4 w-4" /> Send payment</Button>
                </div>
            </section>

            <section className="premium-card grid divide-y divide-[#ece9e1] sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-4 xl:divide-x" aria-label="Portfolio summary">
                <div className="p-5 sm:p-6">
                    <p className="text-[13px] font-semibold text-[#55544d]">Stablecoins at face value</p>
                    {loading ? <div className="dash-skeleton mt-3 h-8 w-40" /> : stable.length === 0 ? <p className="dash-kpi-value mt-2.5 text-[#c4c2b9]">—</p> : <p className="dash-kpi-value mt-2.5">${total.whole}<span className="text-[#9a998f]">.{total.cents}</span></p>}
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-[#8a897f]">
                        {stable.length > 0 && <span className="flex -space-x-1">{[...new Set(stable.map((asset) => asset.symbol.toUpperCase()))].map((symbol) => <AssetIcon key={symbol} symbol={symbol} size="xs" className="rounded-full ring-2 ring-[#fffefa]" />)}</span>}
                        {stable.length ? "USD-pegged tokens, 1:1" : "No stablecoin balances"}
                    </p>
                </div>
                <div className="border-[#ece9e1] p-5 sm:border-l sm:p-6 xl:border-l-0">
                    <p className="text-[13px] font-semibold text-[#55544d]">Networks</p>
                    <p className="dash-kpi-value mt-2.5">{networks.length}</p>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-[#8a897f]">{networks.length > 0 && <span className="flex -space-x-1">{networks.map((item) => <NetworkIcon key={item.chainId} network={item.chainId} size="xs" className="ring-2 ring-[#fffefa]" />)}</span>}{networks.length ? "with readable balances" : "none connected"}</p>
                </div>
                <div className="p-5 sm:p-6">
                    <p className="text-[13px] font-semibold text-[#55544d]">Verified wallets</p>
                    <p className="dash-kpi-value mt-2.5">{wallets}</p>
                    <p className="mt-2 text-xs text-[#8a897f]">Ownership proven by signature</p>
                </div>
                <div className="border-[#ece9e1] p-5 sm:border-l sm:p-6 xl:border-l-0">
                    <p className="text-[13px] font-semibold text-[#55544d]">Gas health</p>
                    <p className={cn("dash-kpi-value mt-2.5", lowGas.length && "text-[#8a5a0b]")}>{lowGas.length ? `${lowGas.length} low` : assets.some(isNative) ? "Healthy" : "—"}</p>
                    <p className="mt-2 text-xs text-[#8a897f]">{lowGas.length ? `Top up ${lowGas.map((asset) => asset.chain).join(", ")}` : assets.some(isNative) ? "Enough native token for fees" : "Checked once a wallet is connected"}</p>
                </div>
            </section>

            {networkErrors.length > 0 && (
                <section className="flex items-start gap-3 rounded-2xl border border-[#f0dcb0] bg-[#fdf6e7] p-4 text-sm text-[#7a4f0a]" role="alert">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div><p className="font-semibold">Some networks could not be read</p><ul className="mt-1.5 space-y-1 text-xs">{networkErrors.map((error) => <li key={`${error.chainId}-${error.network}`} className="flex items-center gap-2"><NetworkIcon network={error.chainId} size="xs" />{error.network}: {error.message}</li>)}</ul></div>
                </section>
            )}

            <section className="premium-card overflow-hidden" aria-labelledby="holdings-title">
                <div className="card-header flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 id="holdings-title" className="font-semibold text-[#1b1c19]">Balances by wallet</h2>
                        <p className="mt-0.5 text-xs text-[#8a897f]">{portfolio.syncedAt ? `Synced ${new Date(portfolio.syncedAt).toLocaleTimeString()}` : "Waiting for RPC sync"}</p>
                    </div>
                    {networks.length > 1 && (
                        <div className="dash-seg max-w-full overflow-x-auto" role="group" aria-label="Filter by network">
                            <button aria-pressed={networkFilter === "all"} onClick={() => setNetworkFilter("all")}>All</button>
                            {networks.map((item) => (
                                <button key={item.chainId} aria-pressed={networkFilter === item.chainId} onClick={() => setNetworkFilter(item.chainId)} className="inline-flex items-center gap-1.5">
                                    <NetworkIcon network={item.chainId} size="xs" className="h-4 w-4" />{networkKeyFor(item.chainId) ? NETWORKS[networkKeyFor(item.chainId)!].name : item.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="space-y-4 p-5">{[0, 1, 2, 3].map((key) => <div key={key} className="flex items-center gap-3"><div className="dash-skeleton h-10 w-10 rounded-full" /><div className="dash-skeleton h-4 flex-1" /><div className="dash-skeleton h-4 w-24" /></div>)}</div>
                ) : assets.length === 0 ? (
                    <div className="px-6 py-14 text-center">
                        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e7f3ed] text-[#0b6b4f]"><Wallet className="h-5 w-5" /></span>
                        <p className="mt-3 text-sm font-semibold text-[#1b1c19]">Connect a wallet to see holdings</p>
                        <p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-[#74736b]">Verify an EVM wallet from Crypto payments. Balances then sync from Ethereum, Base, Arbitrum, Optimism and Polygon.</p>
                        <div className="mt-4 flex justify-center gap-1.5">{PUBLIC_NETWORKS.map((key) => <NetworkIcon key={key} network={NETWORKS[key].chainIds[0]} size="sm" />)}</div>
                        <Button className="mt-5" onClick={() => navigate("/dashboard/crypto")}><Plus className="h-4 w-4" /> Connect wallet</Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-[680px] text-sm">
                            <thead><tr><th className="px-5 text-left">Asset</th><th className="px-3 text-left">Network</th><th className="px-3 text-left">Wallet</th><th className="px-5 text-right">Balance</th><th className="w-12 px-3"><span className="sr-only">Explorer</span></th></tr></thead>
                            <tbody className="divide-y divide-[#ece9e1]">
                                {sortedVisible.map((asset) => (
                                    <tr key={asset.id}>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <AssetIcon symbol={asset.symbol} src={asset.icon} network={asset.chainId} size="md" />
                                                <div className="min-w-0"><p className="font-semibold text-[#1b1c19]">{TOKEN_NAMES[asset.symbol.toUpperCase()] ?? asset.name}</p><p className="text-xs text-[#8a897f]">{asset.symbol}{isNative(asset) ? " · gas token" : ""}</p></div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3.5"><span className="inline-flex items-center gap-2 text-[13px] text-[#3c3c37]"><NetworkIcon network={asset.chainId} size="xs" />{asset.chain}</span></td>
                                        <td className="px-3 py-3.5"><CopyAddress address={asset.walletAddress} /></td>
                                        <td className="px-5 py-3.5 text-right">
                                            <p className="font-mono text-[13px] font-semibold tabular-nums text-[#1b1c19]">{formatTokenAmount(asset.balance, 6)} <span className="text-[#8a897f]">{asset.symbol}</span></p>
                                            {isLowGas(asset) ? <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#8a5a0b]"><Fuel className="h-3 w-3" /> Low for fees</p> : <p className="mt-0.5 text-[11px] text-[#9a998f]">RPC balance</p>}
                                        </td>
                                        <td className="px-3 py-3.5 text-right">
                                            {asset.explorerUrl && <a href={`${asset.explorerUrl}/address/${asset.walletAddress}`} target="_blank" rel="noreferrer" className="inline-flex rounded-lg p-2 text-[#8a897f] hover:bg-[#f1efe9] hover:text-[#0b6b4f]" aria-label={`Open ${asset.chain} wallet in block explorer`}><ExternalLink className="h-4 w-4" /></a>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <section className="flex flex-col gap-4 rounded-2xl border border-[#cfe2d7] bg-[#eef6f1] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#0b6b4f]"><Wallet className="h-4 w-4" /></span>
                    <div><h2 className="text-sm font-semibold text-[#1b1c19]">Transfers are signed in your wallet</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-[#55544d]">Zapzive never holds your keys. Every payout is prepared by the server, reviewed by you, signed by the connected wallet, and recorded with its transaction hash.</p></div>
                </div>
                <Button variant="outline" className="shrink-0" onClick={() => navigate("/dashboard/crypto")}>Open crypto payments <Send className="h-4 w-4" /></Button>
            </section>
        </div>
    );
}
