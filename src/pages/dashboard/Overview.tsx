import { useMemo, useState, type HTMLAttributes, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatDistanceToNowStrict } from "date-fns";
import {
    AlertTriangle, ArrowDownLeft, ArrowRight, ArrowUpRight, CheckCircle2, ChevronDown, Coins, FileText,
    Fuel, Globe2, Landmark, Loader2, Plus, RefreshCw, Repeat, Send, ShieldAlert, ShieldCheck, Users, Wallet,
    type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AssetIcon, { CurrencyFlag, NetworkIcon } from "@/components/dashboard/AssetIcon";
import StatusBadge, { toStatusType } from "@/components/dashboard/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardStats, useTransactions } from "@/hooks/use-dashboard";
import { useCryptoRails, useCryptoReadiness } from "@/hooks/useCryptoRails";
import { usePayrollBatches } from "@/hooks/use-payroll";
import { useContracts } from "@/hooks/use-escrow";
import { useComplianceItems } from "@/hooks/use-compliance";
import { useRemittances } from "@/hooks/use-remittance";
import { NETWORKS, STABLECOINS, TOKEN_NAMES, formatTokenAmount, networkKeyFor } from "@/lib/brand-assets";
import type { CryptoPayment, CryptoRailReadiness, OnchainHolding } from "@/lib/api-client";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types for workspace records. The API returns plain JSON, so only the fields
// this page reads are declared.

interface WorkspaceTransaction { id: string; description: string; amount: number; currency: string; status: string; timestamp: string; type: string; isIncoming?: boolean }
interface PayrollBatch { id: string; name: string; workerCount: number; totalAmount: number; status: string; scheduledDate?: string | null }
interface EscrowContract { id: string; title: string; contractor: string; totalAmount: number; lockedAmount: number; releasedAmount: number; status: string }
interface ComplianceItem { id: string; type: string; entity: string; status: string; riskLevel: string }
interface RemittanceRecord { id: string; recipientCountry: string; localCurrency: string; amount: number; status: string; recipient?: { name?: string } }

const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

// ---------------------------------------------------------------------------
// Formatting

const usd = (value: number, compact = false) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: compact && Math.abs(value) >= 100_000 ? "compact" : "standard", maximumFractionDigits: compact && Math.abs(value) >= 100_000 ? 1 : 2 }).format(value);

const ago = (value?: string) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : `${formatDistanceToNowStrict(date)} ago`;
};

const shortAddress = (value: string) => `${value.slice(0, 6)}…${value.slice(-4)}`;

/** Exact sum of token balances as an 18-decimal fixed-point bigint. */
function sumUnits(items: OnchainHolding[]) {
    return items.reduce((total, item) => {
        try { return total + BigInt(item.amountUnits) * BigInt(10) ** BigInt(Math.max(0, 18 - item.decimals)); }
        catch { return total; }
    }, BigInt(0));
}

function formatFixed18(value: bigint, fraction = 2) {
    const base = BigInt(10) ** BigInt(18);
    const whole = (value / base).toString();
    const decimals = (value % base).toString().padStart(18, "0").slice(0, fraction);
    return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${decimals}`;
}

const ratio = (part: bigint, whole: bigint) => (whole === BigInt(0) ? 0 : Number((part * BigInt(10000)) / whole) / 100);

/** Conservative thresholds below which a wallet may not cover a token transfer fee. */
const LOW_GAS: Record<string, number> = { ETH: 0.002, POL: 1, MATIC: 1 };
const isLowGas = (item: OnchainHolding) => item.kind === "native" && Number(item.amount) < (LOW_GAS[item.symbol.toUpperCase()] ?? 0);

// ---------------------------------------------------------------------------
// Building blocks

function Card({ children, className, ...rest }: { children: ReactNode; className?: string } & HTMLAttributes<HTMLElement>) {
    return <section className={cn("premium-card min-w-0 overflow-hidden", className)} {...rest}>{children}</section>;
}

function CardHeader({ eyebrow, title, id, action }: { eyebrow?: string; title: string; id?: string; action?: ReactNode }) {
    return (
        <div className="card-header flex items-center justify-between gap-3">
            <div className="min-w-0">
                {eyebrow && <p className="dashboard-eyebrow">{eyebrow}</p>}
                <h2 id={id} className="truncate font-semibold text-[#1b1c19]">{title}</h2>
            </div>
            {action}
        </div>
    );
}

function Skeleton({ className }: { className?: string }) {
    return <div className={cn("dash-skeleton", className)} aria-hidden="true" />;
}

const TYPE_META: Record<string, { label: string; icon: LucideIcon; href: string }> = {
    payroll: { label: "Payroll", icon: Users, href: "/dashboard/payroll" },
    remittance: { label: "Remittance", icon: Send, href: "/dashboard/remittance" },
    escrow: { label: "Escrow", icon: ShieldCheck, href: "/dashboard/escrow" },
    deposit: { label: "Deposit", icon: ArrowDownLeft, href: "/dashboard/treasury" },
    withdrawal: { label: "Withdrawal", icon: ArrowUpRight, href: "/dashboard/treasury" },
    swap: { label: "Swap", icon: Repeat, href: "/dashboard/treasury" },
};

// ---------------------------------------------------------------------------
// Liquidity position: live RPC balances, grouped the way a treasurer reads them.

function PositionCard({ holdings, loading, error, syncedAt, mode, onRefresh, refreshing }: {
    holdings: OnchainHolding[]; loading: boolean; error: boolean; syncedAt?: string; mode: "testnet" | "live"; onRefresh: () => void; refreshing: boolean;
}) {
    const navigate = useNavigate();
    const stable = holdings.filter((item) => STABLECOINS[item.symbol.toUpperCase()] === "USD");
    const gas = holdings.filter((item) => item.kind === "native");
    const total = sumUnits(stable);

    const byNetwork = useMemo(() => {
        const groups = new Map<string, { key: string; label: string; color: string; chainId: number; value: bigint }>();
        for (const item of stable) {
            const key = networkKeyFor(item.chainId) ?? item.network;
            const meta = networkKeyFor(item.chainId) ? NETWORKS[networkKeyFor(item.chainId)!] : null;
            const existing = groups.get(key) ?? { key, label: meta?.name ?? item.network, color: meta?.color ?? "#087f5b", chainId: item.chainId, value: BigInt(0) };
            existing.value += sumUnits([item]);
            groups.set(key, existing);
        }
        return [...groups.values()].sort((a, b) => (b.value > a.value ? 1 : -1));
    }, [stable]);

    const tokens = useMemo(() => [...new Set(stable.map((item) => item.symbol.toUpperCase()))], [stable]);

    return (
        <Card aria-labelledby="position-title" className="flex flex-col">
            <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <p id="position-title" className="text-[13px] font-semibold text-[#55544d]">Stablecoin liquidity</p>
                        <span className="dash-chip bg-[#f1efe9] text-[#6c6b63]">{mode === "testnet" ? "Testnet" : "Live"} · on-chain</span>
                    </div>
                    {loading ? <Skeleton className="mt-4 h-11 w-64" /> : holdings.length === 0 ? (
                        <p className="dash-hero-value mt-3 text-[#c4c2b9]">—</p>
                    ) : (
                        <p className="dash-hero-value mt-3">
                            <span className="mr-1 text-[0.55em] font-semibold text-[#9a998f] align-[0.45em]">$</span>{formatFixed18(total).split(".")[0]}
                            <span className="text-[#9a998f]">.{formatFixed18(total).split(".")[1]}</span>
                        </p>
                    )}
                    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#74736b]">
                        {holdings.length === 0 && !loading ? <span>No verified wallet yet. Balances appear once one is connected.</span> : <>
                        {tokens.length > 0 && <span className="flex -space-x-1.5">{tokens.map((symbol) => <AssetIcon key={symbol} symbol={symbol} size="xs" className="rounded-full ring-2 ring-[#fffefa]" />)}</span>}
                        <span>{tokens.length ? tokens.join(" · ") : "USD stablecoins"} at 1:1 face value across {byNetwork.length || 0} network{byNetwork.length === 1 ? "" : "s"}</span></>}
                    </p>
                </div>
                <div className="flex shrink-0 gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/treasury")}><Wallet className="h-3.5 w-3.5" /> Treasury</Button>
                    <Button size="sm" onClick={() => navigate("/dashboard/crypto")}><Send className="h-3.5 w-3.5" /> Pay out</Button>
                </div>
            </div>

            {loading ? (
                <div className="space-y-3 px-5 pb-6 sm:px-6"><Skeleton className="h-2.5 w-full" /><Skeleton className="h-4 w-2/3" /><Skeleton className="h-4 w-1/2" /></div>
            ) : error ? (
                <div className="mx-5 mb-6 flex items-start gap-3 rounded-xl bg-[#fbecea] p-4 text-sm text-[#9a2f2f] sm:mx-6">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div><p className="font-semibold">Balances could not be read</p><p className="mt-1 text-xs leading-5">The network RPC did not respond. Nothing is shown rather than a stale figure.</p><button onClick={onRefresh} className="mt-2 text-xs font-semibold underline underline-offset-4">Try again</button></div>
                </div>
            ) : holdings.length === 0 ? (
                <div className="mx-5 mb-6 rounded-xl border border-dashed border-[#d6d3c9] bg-[#faf8f3] p-5 sm:mx-6">
                    <p className="text-sm font-semibold text-[#1b1c19]">Connect a treasury wallet to see live balances</p>
                    <ol className="mt-3 grid gap-2 text-xs text-[#6c6b63] sm:grid-cols-3">
                        {["Connect a browser wallet", "Sign a one-time ownership proof", "Balances sync from the network"].map((step, index) => (
                            <li key={step} className="flex items-center gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e7f3ed] text-[10px] font-bold text-[#0b6b4f]">{index + 1}</span>{step}</li>
                        ))}
                    </ol>
                    <Button className="mt-4" size="sm" onClick={() => navigate("/dashboard/crypto")}><Plus className="h-3.5 w-3.5" /> Connect wallet</Button>
                </div>
            ) : (
                <>
                    {byNetwork.length > 0 && (
                        <div className="px-5 sm:px-6">
                            <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-[#efede6]" role="img" aria-label="Allocation by network">
                                {byNetwork.map((group) => <span key={group.key} style={{ width: `${Math.max(ratio(group.value, total), 1.5)}%`, background: group.color }} className="h-full first:rounded-l-full last:rounded-r-full" />)}
                            </div>
                            <ul className="mt-4 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
                                {byNetwork.map((group) => (
                                    <li key={group.key} className="flex items-center justify-between gap-3 text-[13px]">
                                        <span className="flex min-w-0 items-center gap-2"><NetworkIcon network={group.chainId} size="xs" /><span className="truncate font-medium text-[#3c3c37]">{group.label}</span></span>
                                        <span className="shrink-0 font-mono text-xs tabular-nums text-[#55544d]">{formatFixed18(group.value)} <span className="text-[#9a998f]">{ratio(group.value, total).toFixed(0)}%</span></span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="mt-5 border-t border-[#ece9e1]">
                        <table className="text-sm">
                            <thead><tr><th className="px-5 text-left sm:px-6">Asset</th><th className="hidden px-3 text-left md:table-cell">Wallet</th><th className="px-5 text-right sm:px-6">Balance</th></tr></thead>
                            <tbody className="divide-y divide-[#ece9e1]">
                                {holdings.slice(0, 6).map((item) => (
                                    <tr key={item.id}>
                                        <td className="px-5 py-3 sm:px-6">
                                            <div className="flex items-center gap-3">
                                                <AssetIcon symbol={item.symbol} src={item.icon} network={item.chainId} size="sm" />
                                                <div className="min-w-0"><p className="truncate font-semibold text-[#1b1c19]">{TOKEN_NAMES[item.symbol.toUpperCase()] ?? item.name}</p><p className="truncate text-xs text-[#8a897f]">{item.symbol} · {item.network}</p></div>
                                            </div>
                                        </td>
                                        <td className="hidden px-3 py-3 md:table-cell">
                                            {item.explorerUrl ? <a href={`${item.explorerUrl}/address/${item.walletAddress}`} target="_blank" rel="noreferrer" className="font-mono text-xs text-[#55544d] underline-offset-4 hover:text-[#0b6b4f] hover:underline">{shortAddress(item.walletAddress)}</a> : <span className="font-mono text-xs text-[#55544d]">{shortAddress(item.walletAddress)}</span>}
                                        </td>
                                        <td className="px-5 py-3 text-right sm:px-6">
                                            <p className="font-mono text-[13px] font-semibold tabular-nums text-[#1b1c19]">{formatTokenAmount(item.amount)} <span className="text-[#8a897f]">{item.symbol}</span></p>
                                            {isLowGas(item) && <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#8a5a0b]"><Fuel className="h-3 w-3" /> Low for fees</p>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-[#ece9e1] bg-[#faf8f3] px-5 py-3 text-xs text-[#74736b] sm:px-6">
                <span className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#11a879]" />
                    {syncedAt ? `Read from RPC ${ago(syncedAt)}` : "Waiting for first sync"}
                    {gas.length > 0 && <span className="hidden sm:inline">· {gas.length} gas balance{gas.length === 1 ? "" : "s"} tracked</span>}
                </span>
                <span className="flex items-center gap-3">
                    {holdings.length > 6 && <Link to="/dashboard/treasury" className="font-semibold text-[#0b6b4f] hover:underline">View all {holdings.length}</Link>}
                    <button onClick={onRefresh} disabled={refreshing} className="inline-flex items-center gap-1.5 font-semibold text-[#55544d] hover:text-[#1b1c19] disabled:opacity-50"><RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} /> Refresh</button>
                </span>
            </div>
        </Card>
    );
}

// ---------------------------------------------------------------------------
// Attention queue: everything that is blocked on a person, in severity order.

interface AttentionItem { id: string; severity: 0 | 1 | 2; icon: LucideIcon; title: string; detail: string; href: string; cta: string }

function AttentionCard({ items, loading }: { items: AttentionItem[]; loading: boolean }) {
    const tone = ["bg-[#fbecea] text-[#b2392f]", "bg-[#fdf4e3] text-[#9a6510]", "bg-[#eaf1fb] text-[#1f5fa8]"];
    return (
        <Card aria-labelledby="attention-title" className="flex flex-col">
            <CardHeader id="attention-title" title="Needs attention" action={!loading && items.length > 0 && <span className="dash-chip bg-[#1b1c19] text-[#ffffff]">{items.length}</span>} />
            {loading ? (
                <div className="space-y-4 p-5">{[0, 1, 2].map((key) => <div key={key} className="flex gap-3"><Skeleton className="h-9 w-9 rounded-xl" /><div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-3/4" /><Skeleton className="h-3 w-1/2" /></div></div>)}</div>
            ) : items.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e7f3ed] text-[#0b6b4f]"><CheckCircle2 className="h-6 w-6" /></span>
                    <p className="mt-3 text-sm font-semibold text-[#1b1c19]">You're all caught up</p>
                    <p className="mt-1 max-w-[240px] text-xs leading-5 text-[#74736b]">Approvals, disputes, compliance flags and network issues will appear here.</p>
                </div>
            ) : (
                <ul className="divide-y divide-[#ece9e1]">
                    {items.slice(0, 6).map((item) => (
                        <li key={item.id}>
                            <Link to={item.href} className="dash-row-link group">
                                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", tone[item.severity])}><item.icon className="h-4 w-4" /></span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[13px] font-semibold text-[#1b1c19]">{item.title}</span>
                                    <span className="mt-0.5 block truncate text-xs text-[#74736b]">{item.detail}</span>
                                </span>
                                <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[#0b6b4f] opacity-80 group-hover:opacity-100">{item.cta}<ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" /></span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
            {items.length > 6 && <p className="mt-auto border-t border-[#ece9e1] px-5 py-3 text-xs text-[#74736b]">+{items.length - 6} more across workflows</p>}
        </Card>
    );
}

// ---------------------------------------------------------------------------
// Product workflows: each card is a live summary and a direct way in.

function WorkflowCard({ icon: Icon, title, metric, detail, href, action, actionHref, accent }: {
    icon: LucideIcon; title: string; metric: string; detail: string; href: string; action: string; actionHref: string; accent: string;
}) {
    const navigate = useNavigate();
    return (
        <div className="premium-card group relative flex min-w-0 flex-col p-5 transition-colors hover:border-[#c9d9cf]">
            <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${accent}14`, color: accent }}><Icon className="h-[18px] w-[18px]" strokeWidth={1.9} /></span>
                <Link to={href} className="rounded-lg p-1.5 text-[#9a998f] transition-colors hover:bg-[#f1efe9] hover:text-[#1b1c19]" aria-label={`Open ${title}`}><ArrowUpRight className="h-4 w-4" /></Link>
            </div>
            <p className="mt-4 text-[13px] font-semibold text-[#55544d]">{title}</p>
            <p className="dash-kpi-value mt-1.5">{metric}</p>
            <p className="mt-1.5 min-h-[32px] text-xs leading-4 text-[#8a897f]">{detail}</p>
            <button onClick={() => navigate(actionHref)} className="mt-4 inline-flex items-center gap-1.5 self-start text-[13px] font-semibold text-[#0b6b4f] hover:text-[#075a42]">
                <Plus className="h-3.5 w-3.5" /> {action}
            </button>
        </div>
    );
}

// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Crypto rails: one tile per settlement network, with the evidence a treasurer
// needs before trusting it: live block height, RPC agreement, and real usage.

type Rail = CryptoRailReadiness;

function rpcAgreement(rail: Rail): { label: string; tone: "good" | "warn" | "muted" } {
    if (!rail.primaryBlock) return { label: "No RPC response", tone: "muted" };
    if (!rail.secondaryBlock) return { label: "Single RPC provider", tone: "muted" };
    const drift = Math.abs(Number(BigInt(rail.primaryBlock) - BigInt(rail.secondaryBlock)));
    return drift <= 3 ? { label: "2 RPC providers in agreement", tone: "good" } : { label: `RPC providers ${drift.toLocaleString()} blocks apart`, tone: "warn" };
}

function RailTile({ rail, settled, volume, symbol }: { rail: Rail; settled: number; volume: string | null; symbol: string }) {
    const key = networkKeyFor(rail.chainId);
    const agreement = rpcAgreement(rail);
    const devnet = key === "devnet";
    return (
        <div className={cn("flex min-w-0 flex-col bg-[#fffefa] p-5", !rail.ready && "bg-[#faf8f3]")}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <NetworkIcon network={rail.chainId} size="md" className={cn(!rail.ready && "opacity-60 grayscale")} />
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#1b1c19]">{rail.name}</p>
                        <p className="font-mono text-[11px] text-[#9a998f]">{devnet ? "Development" : rail.testnet ? "Testnet" : "Mainnet"} · chain {rail.chainId}</p>
                    </div>
                </div>
                {rail.ready ? (
                    <span className="dash-chip shrink-0 bg-[#e7f3ed] text-[#0b6b4f]"><span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#11a879] opacity-60" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#11a879]" /></span>Online</span>
                ) : (
                    <span className="dash-chip shrink-0 bg-[#f1efe9] text-[#6c6b63]"><span className="h-1.5 w-1.5 rounded-full bg-[#a3a29a]" />Offline</span>
                )}
            </div>

            {rail.ready ? (
                <>
                    <div className="mt-5">
                        <p className="text-[11px] font-semibold text-[#9a998f]">Latest block</p>
                        <p className="mt-1 font-mono text-[19px] font-semibold tabular-nums tracking-tight text-[#1b1c19]">#{Number(rail.primaryBlock ?? 0).toLocaleString()}</p>
                        <p className={cn("mt-1.5 flex items-center gap-1.5 text-xs", agreement.tone === "good" ? "text-[#0b6b4f]" : agreement.tone === "warn" ? "text-[#8a5a0b]" : "text-[#8a897f]")}>
                            {agreement.tone === "warn" ? <AlertTriangle className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}{agreement.label}
                        </p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                        {rail.assets.map((asset) => (
                            <span key={asset} className="inline-flex items-center gap-1.5 rounded-full bg-[#f1efe9] py-0.5 pl-0.5 pr-2 text-[11.5px] font-semibold text-[#3c3c37]"><AssetIcon symbol={asset} size="xs" />{asset}</span>
                        ))}
                    </div>
                </>
            ) : (
                <p className="mt-5 rounded-lg bg-[#f1efe9] px-3 py-2.5 text-xs leading-5 text-[#6c6b63]">{rail.reason ?? "This network is not configured for this workspace."}</p>
            )}

            <div className="mt-auto pt-4">
                <div className="flex items-center justify-between gap-2 border-t border-[#ece9e1] pt-3 text-xs">
                    <span className="truncate text-[#8a897f]">{settled ? <><span className="font-semibold text-[#3c3c37]">{settled}</span> settled{volume ? <> · <span className="font-mono text-[#3c3c37]">{volume}</span> {symbol}</> : null}</> : "No payouts yet"}</span>
                    {rail.ready && <Link to="/dashboard/crypto" className="inline-flex shrink-0 items-center gap-1 font-semibold text-[#0b6b4f] hover:underline">Pay out <ArrowRight className="h-3 w-3" /></Link>}
                </div>
            </div>
        </div>
    );
}

function RailsSection({ rails, loading, error, mode, checkedAt, refreshing, onRefresh, payments }: {
    rails: Rail[]; loading: boolean; error: boolean; mode: "testnet" | "live"; checkedAt: number; refreshing: boolean; onRefresh: () => void; payments: CryptoPayment[];
}) {
    const usage = useMemo(() => {
        const map = new Map<number, { settled: number; units: bigint; decimals: number; symbol: string }>();
        for (const payment of payments) {
            if (payment.status !== "settled") continue;
            const entry = map.get(payment.chainId) ?? { settled: 0, units: BigInt(0), decimals: payment.decimals, symbol: payment.symbol };
            entry.settled += 1;
            if (payment.symbol === entry.symbol) { try { entry.units += BigInt(payment.amountUnits); } catch { /* malformed amount */ } }
            map.set(payment.chainId, entry);
        }
        return map;
    }, [payments]);
    const ordered = [...rails].sort((a, b) => Number(b.ready) - Number(a.ready));
    const ready = rails.filter((rail) => rail.ready).length;
    const formatUnits = (units: bigint, decimals: number) => {
        const base = BigInt(10) ** BigInt(decimals);
        return formatTokenAmount(`${units / base}.${(units % base).toString().padStart(decimals, "0")}`, 2);
    };

    return (
        <Card aria-labelledby="rails-title">
            <div className="card-header flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                    <span className="hidden h-10 w-10 items-center justify-center rounded-xl bg-[#e7f3ed] text-[#0b6b4f] sm:flex"><Coins className="h-5 w-5" /></span>
                    <div>
                        <h2 id="rails-title" className="font-semibold text-[#1b1c19]">Crypto rails</h2>
                        <p className="mt-0.5 text-xs text-[#8a897f]">Stablecoin settlement networks available to this {mode === "testnet" ? "test" : "live"} workspace</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {!loading && !error && rails.length > 0 && (
                        <span className={cn("dash-chip", ready === rails.length ? "bg-[#e7f3ed] text-[#0b6b4f]" : ready ? "bg-[#fdf4e3] text-[#8a5a0b]" : "bg-[#fbecea] text-[#9a2f2f]")}>
                            <span className="flex -space-x-1.5">{ordered.slice(0, 5).map((rail) => <NetworkIcon key={rail.key} network={rail.chainId} size="xs" className="h-4 w-4 ring-2 ring-white/80" />)}</span>
                            {ready} of {rails.length} operational
                        </span>
                    )}
                    {checkedAt > 0 && <span className="text-xs text-[#9a998f]">Checked {ago(new Date(checkedAt).toISOString())}</span>}
                    <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing} aria-label="Re-check rails"><RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} /></Button>
                    <Button size="sm" asChild><Link to="/dashboard/crypto"><Send className="h-3.5 w-3.5" /> New payout</Link></Button>
                </div>
            </div>

            {loading ? (
                <div className="grid gap-px bg-[#ece9e1] sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((key) => <div key={key} className="space-y-3 bg-[#fffefa] p-5"><div className="flex gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-1/2" /><Skeleton className="h-3 w-1/3" /></div></div><Skeleton className="h-6 w-2/3" /><Skeleton className="h-5 w-1/2" /></div>)}</div>
            ) : error || rails.length === 0 ? (
                <div className="flex items-start gap-3 p-5 text-sm text-[#55544d]"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#8a5a0b]" /><p>Rail status is unavailable right now. Each payment is still checked against its network before you sign. <button onClick={onRefresh} className="font-semibold text-[#0b6b4f] underline-offset-4 hover:underline">Try again</button></p></div>
            ) : (
                <div className={cn("grid gap-px bg-[#ece9e1] sm:grid-cols-2", ordered.length >= 5 ? "xl:grid-cols-3 2xl:grid-cols-5" : ordered.length === 4 ? "xl:grid-cols-4" : "xl:grid-cols-3")}>
                    {ordered.map((rail) => {
                        const stats = usage.get(rail.chainId);
                        return <RailTile key={rail.key} rail={rail} settled={stats?.settled ?? 0} volume={stats && stats.units > BigInt(0) ? formatUnits(stats.units, stats.decimals) : null} symbol={stats?.symbol ?? "USDC"} />;
                    })}
                    {ordered.length % 2 === 1 && <div className="hidden bg-[#fffefa] sm:block xl:hidden" aria-hidden="true" />}
                </div>
            )}
        </Card>
    );
}

const ACTIVITY_FILTERS = [
    { key: "all", label: "All" },
    { key: "payroll", label: "Payroll" },
    { key: "remittance", label: "Remittance" },
    { key: "escrow", label: "Escrow" },
    { key: "treasury", label: "Treasury" },
] as const;

export default function Overview() {
    const navigate = useNavigate();
    const { user, company } = useAuth();
    const companyId = company?.id || "";
    const mode: "testnet" | "live" = company?.isTestMode === false ? "live" : "testnet";

    const rails = useCryptoRails(companyId);
    const readiness = useCryptoReadiness(companyId, mode);
    const { data: stats } = useDashboardStats();
    const transactionsQuery = useTransactions({ limit: 40 });
    const batchesQuery = usePayrollBatches();
    const contractsQuery = useContracts();
    const complianceQuery = useComplianceItems();
    const remittancesQuery = useRemittances();

    const [filter, setFilter] = useState<(typeof ACTIVITY_FILTERS)[number]["key"]>("all");

    const holdings = useMemo(() => rails.portfolio.data?.items ?? [], [rails.portfolio.data]);
    const networkErrors = useMemo(() => rails.portfolio.data?.networkErrors ?? [], [rails.portfolio.data]);
    const transactions = asArray<WorkspaceTransaction>(transactionsQuery.data);
    const batches = asArray<PayrollBatch>(batchesQuery.data);
    const contracts = asArray<EscrowContract>(contractsQuery.data);
    const compliance = asArray<ComplianceItem>(complianceQuery.data);
    const remittances = asArray<RemittanceRecord>(remittancesQuery.data);
    const cryptoPayments = useMemo(() => rails.history.data?.pages.flatMap((page) => page.items) ?? [], [rails.history.data]);

    const pendingBatches = batches.filter((batch) => batch.status === "pending");
    const activeContracts = contracts.filter((contract) => contract.status === "active");
    const lockedInEscrow = activeContracts.reduce((sum, contract) => sum + Math.max(0, (contract.lockedAmount || 0) - (contract.releasedAmount || 0)), 0);
    const remittancesInFlight = remittances.filter((item) => ["pending", "processing"].includes(item.status));
    const paymentsConfirming = cryptoPayments.filter((payment) => ["submitted", "confirming"].includes(payment.status));
    const paymentsSettled = cryptoPayments.filter((payment) => payment.status === "settled");

    const attention = useMemo<AttentionItem[]>(() => {
        const list: AttentionItem[] = [];
        for (const error of networkErrors) list.push({ id: `rpc-${error.chainId}`, severity: 0, icon: Globe2, title: `${error.network} is unreachable`, detail: error.message, href: "/dashboard/treasury", cta: "Review" });
        for (const contract of contracts.filter((item) => item.status === "disputed")) list.push({ id: `dispute-${contract.id}`, severity: 0, icon: ShieldAlert, title: `Dispute on ${contract.title}`, detail: `${contract.contractor} · ${usd(contract.lockedAmount)} locked`, href: `/dashboard/escrow/${contract.id}`, cta: "Resolve" });
        for (const item of compliance.filter((entry) => entry.status === "flagged" || (entry.status === "pending" && entry.riskLevel === "high"))) list.push({ id: `kyc-${item.id}`, severity: item.status === "flagged" ? 0 : 1, icon: ShieldAlert, title: `${item.type.toUpperCase()} review · ${item.entity}`, detail: `${item.riskLevel} risk · ${item.status}`, href: "/dashboard/compliance", cta: "Review" });
        for (const batch of pendingBatches) list.push({ id: `batch-${batch.id}`, severity: 1, icon: Users, title: `Approve ${batch.name}`, detail: `${batch.workerCount} workers · ${usd(batch.totalAmount)}`, href: `/dashboard/payroll/batches/${batch.id}`, cta: "Approve" });
        for (const item of holdings.filter(isLowGas)) list.push({ id: `gas-${item.id}`, severity: 1, icon: Fuel, title: `Low gas on ${item.network}`, detail: `${formatTokenAmount(item.amount, 5)} ${item.symbol} may not cover transfer fees`, href: "/dashboard/treasury", cta: "Top up" });
        for (const item of remittances.filter((entry) => entry.status === "failed").slice(0, 3)) list.push({ id: `rmt-${item.id}`, severity: 1, icon: AlertTriangle, title: `Transfer to ${item.recipient?.name ?? item.recipientCountry} failed`, detail: `${usd(item.amount)} → ${item.localCurrency}`, href: "/dashboard/remittance", cta: "Retry" });
        if (paymentsConfirming.length) list.push({ id: "confirming", severity: 2, icon: Loader2, title: `${paymentsConfirming.length} payout${paymentsConfirming.length === 1 ? "" : "s"} confirming on-chain`, detail: "Tracked automatically until final", href: "/dashboard/crypto", cta: "Track" });
        return list.sort((a, b) => a.severity - b.severity);
    }, [networkErrors, contracts, compliance, pendingBatches, holdings, remittances, paymentsConfirming.length]);

    const attentionLoading = batchesQuery.isPending || contractsQuery.isPending || complianceQuery.isPending || rails.portfolio.isPending;

    const filtered = transactions.filter((item) => filter === "all" || (filter === "treasury" ? ["deposit", "withdrawal", "swap"].includes(item.type) : item.type === filter)).slice(0, 8);

    const corridors = useMemo(() => {
        const groups = new Map<string, { currency: string; country: string; count: number; total: number }>();
        for (const item of remittances) {
            const key = item.localCurrency || item.recipientCountry;
            const group = groups.get(key) ?? { currency: item.localCurrency, country: item.recipientCountry, count: 0, total: 0 };
            group.count += 1;
            group.total += item.amount || 0;
            groups.set(key, group);
        }
        return [...groups.values()].sort((a, b) => b.total - a.total).slice(0, 5);
    }, [remittances]);
    const corridorMax = Math.max(1, ...corridors.map((item) => item.total));

    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    const firstName = user?.name?.split(/\s+/)[0];
    const urgent = attention.filter((item) => item.severity < 2).length;

    return (
        <div className="space-y-6">
            {/* Greeting and primary actions */}
            <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div className="min-w-0">
                    <p className="text-xs font-medium text-[#8a897f]">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
                    <h2 className="dash-title mt-1">{greeting}{firstName ? `, ${firstName}` : ""}</h2>
                    <p className="mt-1.5 text-sm text-[#74736b]">
                        {attentionLoading ? "Checking your workspace…" : urgent > 0 ? <><span className="font-semibold text-[#1b1c19]">{urgent} item{urgent === 1 ? "" : "s"}</span> need{urgent === 1 ? "s" : ""} your attention before money can move.</> : "Everything is running. No approvals or issues are waiting on you."}
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <Button variant="outline" onClick={() => navigate("/dashboard/analytics")}><FileText className="h-4 w-4" /> Reports</Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button><Plus className="h-4 w-4" /> New payment <ChevronDown className="h-3.5 w-3.5 opacity-70" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-72 rounded-xl border-[#e3e0d7] bg-[#fffefa] p-1.5 shadow-xl">
                            <DropdownMenuLabel className="px-2 pb-1 text-[11px] font-semibold text-[#8a897f]">Move money</DropdownMenuLabel>
                            {([
                                [Coins, "Stablecoin payout", "Send USDC from a verified wallet", "/dashboard/crypto"],
                                [Users, "Payroll batch", "Pay many workers in one approval", "/dashboard/payroll?new=batch"],
                                [Globe2, "Cross-border transfer", "Deliver to bank or mobile money", "/dashboard/remittance/send"],
                                [ShieldCheck, "Escrow contract", "Lock funds against milestones", "/dashboard/escrow/new"],
                            ] as const).map(([Icon, label, hint, href]) => (
                                <DropdownMenuItem key={label} onSelect={() => navigate(href)} className="cursor-pointer gap-3 rounded-lg px-2 py-2">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e7f3ed] text-[#0b6b4f]"><Icon className="h-4 w-4" /></span>
                                    <span className="min-w-0"><span className="block text-[13px] font-semibold text-[#1b1c19]">{label}</span><span className="block text-xs text-[#8a897f]">{hint}</span></span>
                                </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => navigate("/dashboard/treasury/transfer")} className="cursor-pointer gap-3 rounded-lg px-2 py-2 text-[13px] font-medium text-[#55544d]"><Landmark className="h-4 w-4" /> Move funds between accounts</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </section>

            {/* Liquidity and action queue */}
            <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
                <PositionCard
                    holdings={holdings}
                    loading={rails.portfolio.isPending && Boolean(companyId)}
                    error={rails.portfolio.isError}
                    syncedAt={rails.portfolio.data?.syncedAt}
                    mode={mode}
                    refreshing={rails.portfolio.isFetching}
                    onRefresh={() => void rails.portfolio.refetch()}
                />
                <AttentionCard items={attention} loading={attentionLoading} />
            </section>

            {/* Workflows */}
            <section aria-label="Workflows" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <WorkflowCard icon={Users} accent="#0b6b4f" title="Payroll" metric={String(stats?.activeWorkers ?? 0)} detail={`active workers${pendingBatches.length ? ` · ${pendingBatches.length} batch${pendingBatches.length === 1 ? "" : "es"} awaiting approval` : ""}`} href="/dashboard/payroll" action="Run payroll" actionHref="/dashboard/payroll?new=batch" />
                <WorkflowCard icon={Globe2} accent="#1f5fa8" title="Remittance" metric={String(remittancesInFlight.length)} detail={`transfers in flight · ${stats?.activeAgents ?? 0} payout agent${stats?.activeAgents === 1 ? "" : "s"} active`} href="/dashboard/remittance" action="Send transfer" actionHref="/dashboard/remittance/send" />
                <WorkflowCard icon={ShieldCheck} accent="#8a5a0b" title="Escrow" metric={usd(lockedInEscrow, true)} detail={`locked across ${activeContracts.length} active contract${activeContracts.length === 1 ? "" : "s"}`} href="/dashboard/escrow" action="New contract" actionHref="/dashboard/escrow/new" />
                <WorkflowCard icon={Coins} accent="#2775ca" title="Stablecoin payouts" metric={String(paymentsSettled.length)} detail={`settled on-chain${paymentsConfirming.length ? ` · ${paymentsConfirming.length} confirming` : ""}`} href="/dashboard/crypto" action="New payout" actionHref="/dashboard/crypto" />
            </section>

            {/* Crypto rails */}
            <RailsSection
                rails={readiness.data?.rails ?? []}
                loading={readiness.isPending && Boolean(companyId)}
                error={readiness.isError}
                mode={mode}
                checkedAt={readiness.dataUpdatedAt}
                refreshing={readiness.isFetching}
                onRefresh={() => void readiness.refetch()}
                payments={cryptoPayments}
            />

            {/* Activity and corridors */}
            <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
                <Card aria-labelledby="activity-title" className="flex flex-col">
                    <div className="card-header flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 id="activity-title" className="font-semibold text-[#1b1c19]">Recent activity</h2>
                            <p className="mt-0.5 text-xs text-[#8a897f]">{stats?.monthlyVolume ? <>Outflow this month <span className="font-mono font-semibold text-[#3c3c37]">{usd(Number(stats.monthlyVolume))}</span></> : "Workspace ledger records"}</p>
                        </div>
                        <div className="dash-seg max-w-full overflow-x-auto" role="group" aria-label="Filter activity">
                            {ACTIVITY_FILTERS.map((item) => <button key={item.key} aria-pressed={filter === item.key} onClick={() => setFilter(item.key)}>{item.label}</button>)}
                        </div>
                    </div>
                    {transactionsQuery.isPending ? (
                        <div className="space-y-4 p-5">{[0, 1, 2, 3].map((key) => <div key={key} className="flex items-center gap-3"><Skeleton className="h-9 w-9 rounded-full" /><Skeleton className="h-4 flex-1" /><Skeleton className="h-4 w-20" /></div>)}</div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
                            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#f1efe9] text-[#8a897f]"><Repeat className="h-5 w-5" /></span>
                            <p className="text-sm font-semibold text-[#1b1c19]">No {filter === "all" ? "" : `${filter} `}activity yet</p>
                            <p className="mt-1 text-xs text-[#8a897f]">Payments, payroll runs and escrow releases will be listed here as they happen.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-[640px] text-sm">
                                <thead><tr><th className="px-5 text-left">Description</th><th className="px-3 text-left">Status</th><th className="px-3 text-left">Date</th><th className="px-5 text-right">Amount</th></tr></thead>
                                <tbody className="divide-y divide-[#ece9e1]">
                                    {filtered.map((item) => {
                                        const meta = TYPE_META[item.type] ?? { label: item.type, icon: Wallet, href: "/dashboard/treasury" };
                                        const incoming = item.isIncoming ?? item.type === "deposit";
                                        return (
                                            <tr key={item.id} onClick={() => navigate(meta.href)} className="cursor-pointer">
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", incoming ? "bg-[#e7f3ed] text-[#0b6b4f]" : "bg-[#f1efe9] text-[#55544d]")}><meta.icon className="h-4 w-4" /></span>
                                                        <div className="min-w-0"><p className="max-w-[320px] truncate font-semibold text-[#1b1c19]">{item.description}</p><p className="text-xs text-[#8a897f]">{meta.label}</p></div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3"><StatusBadge status={toStatusType(item.status)} /></td>
                                                <td className="whitespace-nowrap px-3 py-3 text-xs text-[#74736b]" title={new Date(item.timestamp).toLocaleString()}>{ago(item.timestamp)}</td>
                                                <td className="px-5 py-3 text-right">
                                                    <span className={cn("inline-flex items-center justify-end gap-2 font-mono text-[13px] font-semibold tabular-nums", incoming ? "text-[#0b6b4f]" : "text-[#1b1c19]")}>
                                                        {incoming ? "+" : "−"}{formatTokenAmount(Math.abs(item.amount || 0), 2)}
                                                        <AssetIcon symbol={item.currency || "USDC"} size="xs" />
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <div className="mt-auto border-t border-[#ece9e1] px-5 py-3"><Link to="/dashboard/analytics" className="inline-flex items-center gap-1 text-xs font-semibold text-[#0b6b4f] hover:underline">See full history <ArrowRight className="h-3 w-3" /></Link></div>
                </Card>

                <div className="flex min-w-0 flex-col gap-5">
                    <Card aria-labelledby="corridors-title">
                        <CardHeader id="corridors-title" title="Top corridors" action={<Link to="/dashboard/remittance" className="text-xs font-semibold text-[#0b6b4f] hover:underline">View all</Link>} />
                        {remittancesQuery.isPending ? (
                            <div className="space-y-3 p-5">{[0, 1, 2].map((key) => <Skeleton key={key} className="h-8 w-full" />)}</div>
                        ) : corridors.length === 0 ? (
                            <div className="p-5">
                                <p className="text-xs leading-5 text-[#74736b]">Send to bank accounts and mobile money in local currency. Your busiest destinations will be ranked here.</p>
                                <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/dashboard/remittance/send")}><Send className="h-3.5 w-3.5" /> Send first transfer</Button>
                            </div>
                        ) : (
                            <ul className="space-y-3.5 p-5">
                                {corridors.map((item) => (
                                    <li key={item.currency + item.country}>
                                        <div className="flex items-center gap-3">
                                            <CurrencyFlag code={item.currency || item.country} size="sm" />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-baseline justify-between gap-2">
                                                    <p className="truncate text-[13px] font-semibold text-[#1b1c19]">{item.country} <span className="font-normal text-[#8a897f]">· {item.currency}</span></p>
                                                    <p className="shrink-0 font-mono text-xs font-semibold tabular-nums text-[#3c3c37]">{usd(item.total, true)}</p>
                                                </div>
                                                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#efede6]"><div className="h-full rounded-full bg-[#11a879]" style={{ width: `${(item.total / corridorMax) * 100}%` }} /></div>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>
                </div>
            </section>
        </div>
    );
}
