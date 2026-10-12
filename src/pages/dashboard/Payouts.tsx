import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FileUp, Plus, Search, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageIntro from "@/components/dashboard/PageIntro";
import { EmptyState, ErrorNotice, LoadingRows, MethodTag, SampleTag, StateBadge, StatStrip, StatTile } from "@/components/ops";
import { useMovements, useRuns } from "@/hooks/use-payouts";
import { money, moneyList } from "@/lib/payout-format";
import { formatDate, formatRelative } from "@/lib/format";
import type { RunSummary } from "@/lib/payouts-api";

const RUN_FILTERS = [["all", "All"], ["open", "In preparation"], ["awaiting_approval", "Awaiting approval"], ["active", "In progress"], ["done", "Finished"]] as const;
const MOVEMENT_FILTERS = [["", "All"], ["processing", "Processing"], ["delivered", "Delivered"], ["failed,on_hold", "Needs attention"]] as const;

function matchesRunFilter(run: RunSummary, filter: string) {
    if (filter === "all") return run.status !== "cancelled";
    if (filter === "open") return ["draft", "needs_correction", "ready", "rejected"].includes(run.status);
    if (filter === "active") return ["approved", "processing"].includes(run.status);
    if (filter === "done") return ["completed", "completed_with_failures", "cancelled"].includes(run.status);
    return run.status === filter;
}

function RunsTable({ runs }: { runs: RunSummary[] }) {
    const navigate = useNavigate();
    return (
        <>
            <div className="hidden overflow-x-auto md:block">
                <table className="text-sm">
                    <caption className="sr-only">Payout runs</caption>
                    <thead><tr>
                        <th scope="col" className="px-5 text-left">Payout run</th>
                        <th scope="col" className="px-3 text-left">State</th>
                        <th scope="col" className="px-3 text-left">Scheduled</th>
                        <th scope="col" className="px-3 text-right">Payouts</th>
                        <th scope="col" className="px-3 text-right">Total</th>
                        <th scope="col" className="px-5 text-left">Progress</th>
                    </tr></thead>
                    <tbody className="divide-y divide-[#ece9e1]">
                        {runs.map((run) => {
                            const r = run.reconciliation;
                            return (
                                <tr key={run.id} className="cursor-pointer" onClick={() => navigate(`/dashboard/payouts/runs/${run.id}`)}>
                                    <td className="px-5 py-3.5">
                                        <Link to={`/dashboard/payouts/runs/${run.id}`} onClick={(event) => event.stopPropagation()} className="font-semibold text-[#1b1c19] hover:text-primary">{run.name}</Link>
                                        <p className="flex items-center gap-1.5 text-xs text-[#8a897f]"><span className="font-mono">{run.reference}</span> · {run.createdByName}{run.isSample && <SampleTag />}</p>
                                    </td>
                                    <td className="px-3 py-3.5"><StateBadge kind="run" state={run.status} />{run.status === "needs_correction" && <p className="mt-1 text-xs text-[#9a2f2f]">{run.validation.needsCorrection} to fix</p>}</td>
                                    <td className="px-3 py-3.5 text-[13px] text-[#55544d]">{run.scheduledFor ? formatDate(run.scheduledFor) : "—"}</td>
                                    <td className="px-3 py-3.5 text-right tabular-nums text-[#3c3c37]">{run.payoutCount}</td>
                                    <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-[#1b1c19]">{moneyList(run.totals, { compact: true })}</td>
                                    <td className="px-5 py-3.5 text-xs text-[#55544d]">
                                        {r.delivered + r.processing + r.failed > 0 ? <>{r.delivered}/{r.requested} delivered{r.failed ? <span className="text-[#9a2f2f]"> · {r.failed} failed</span> : null}{run.reconciledAt ? <span className="text-primary"> · reconciled</span> : null}</> : run.status === "awaiting_approval" ? `Waiting ${formatRelative(run.submittedAt).replace(" ago", "")}` : "—"}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <ul className="divide-y divide-[#ece9e1] md:hidden">
                {runs.map((run) => (
                    <li key={run.id}>
                        <Link to={`/dashboard/payouts/runs/${run.id}`} className="block px-4 py-3.5">
                            <div className="flex items-start justify-between gap-2">
                                <p className="font-semibold text-[#1b1c19]">{run.name}</p>
                                <StateBadge kind="run" state={run.status} />
                            </div>
                            <p className="mt-1 text-[13px] font-semibold tabular-nums text-[#1b1c19]">{moneyList(run.totals, { compact: true })}</p>
                            <p className="mt-0.5 text-xs text-[#74736b]">{run.reference} · {run.payoutCount} payouts{run.scheduledFor ? ` · ${formatDate(run.scheduledFor)}` : ""}</p>
                        </Link>
                    </li>
                ))}
            </ul>
        </>
    );
}

function MovementsList({ state, q }: { state: string; q: string }) {
    const movements = useMovements({ state: state || undefined, q: q || undefined, limit: 200 });
    if (movements.isPending) return <LoadingRows />;
    if (movements.isError) return <ErrorNotice error={movements.error} onRetry={() => void movements.refetch()} />;
    const rows = movements.data ?? [];
    if (!rows.length) return <EmptyState icon={Send} title="No payouts match">Individual payouts appear here once a run is submitted.</EmptyState>;
    return (
        <>
            <div className="hidden overflow-x-auto md:block">
                <table className="text-sm">
                    <caption className="sr-only">Individual payouts</caption>
                    <thead><tr>
                        <th scope="col" className="px-5 text-left">Recipient</th>
                        <th scope="col" className="px-3 text-left">Method</th>
                        <th scope="col" className="px-3 text-left">State</th>
                        <th scope="col" className="px-3 text-left">Run</th>
                        <th scope="col" className="px-3 text-left">Updated</th>
                        <th scope="col" className="px-5 text-right">Amount</th>
                    </tr></thead>
                    <tbody className="divide-y divide-[#ece9e1]">
                        {rows.map((item) => (
                            <tr key={item.id}>
                                <td className="px-5 py-3"><Link to={`/dashboard/payouts/movements/${item.id}`} className="font-semibold text-[#1b1c19] hover:text-primary">{item.recipientName}</Link><p className="font-mono text-[11px] text-[#8a897f]">{item.reference}</p></td>
                                <td className="px-3 py-3"><MethodTag method={item.payoutMethod} label={item.payoutMethodLabel} destination={item.destination} /></td>
                                <td className="px-3 py-3"><StateBadge kind="movement" state={item.state} /></td>
                                <td className="px-3 py-3 text-[13px] text-[#55544d]">{item.run?.reference ?? "—"}</td>
                                <td className="px-3 py-3 text-xs text-[#74736b]">{formatRelative(item.updatedAt)}</td>
                                <td className="px-5 py-3 text-right font-semibold tabular-nums text-[#1b1c19]">{money(item.amountMinor, item.currency)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <ul className="divide-y divide-[#ece9e1] md:hidden">
                {rows.map((item) => (
                    <li key={item.id}>
                        <Link to={`/dashboard/payouts/movements/${item.id}`} className="block px-4 py-3.5">
                            <div className="flex items-start justify-between gap-2"><p className="font-semibold text-[#1b1c19]">{item.recipientName}</p><StateBadge kind="movement" state={item.state} /></div>
                            <p className="mt-1 font-semibold tabular-nums text-[#1b1c19]">{money(item.amountMinor, item.currency)}</p>
                            <p className="mt-0.5 text-xs text-[#74736b]">{item.payoutMethodLabel} · {item.run?.reference ?? "—"}</p>
                        </Link>
                    </li>
                ))}
            </ul>
        </>
    );
}

export default function Payouts() {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const tab = params.get("tab") === "payouts" ? "payouts" : "runs";
    const [runFilter, setRunFilter] = useState<string>("all");
    const [movementFilter, setMovementFilter] = useState<string>("");
    const [query, setQuery] = useState("");
    const runs = useRuns();

    const list = useMemo(() => runs.data ?? [], [runs.data]);
    const filtered = useMemo(() => list.filter((run) => matchesRunFilter(run, runFilter)).filter((run) => !query.trim() || `${run.name} ${run.reference}`.toLowerCase().includes(query.trim().toLowerCase())), [list, runFilter, query]);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    const awaiting = list.filter((run) => run.status === "awaiting_approval");
    const inProgress = list.filter((run) => ["approved", "processing"].includes(run.status));
    const attentionCount = list.reduce((sum, run) => sum + run.reconciliation.failed + run.reconciliation.onHold, 0) + list.filter((run) => run.status === "needs_correction").length;
    const deliveredThisMonth = list.filter((run) => run.completedAt && new Date(run.completedAt).getTime() >= monthStart).flatMap((run) => run.reconciliation.deliveredTotals);
    const deliveredByCurrency = Object.values(deliveredThisMonth.reduce<Record<string, { currency: string; amountMinor: number }>>((acc, item) => { acc[item.currency] = { currency: item.currency, amountMinor: (acc[item.currency]?.amountMinor ?? 0) + item.amountMinor }; return acc; }, {}));

    return (
        <div className="space-y-6">
            <PageIntro
                title="Payouts"
                description="Prepare, approve, send, and reconcile recipient payments."
                actions={<>
                    <Button variant="outline" onClick={() => navigate("/dashboard/payouts/new?mode=import")}><FileUp className="h-4 w-4" /> Import CSV</Button>
                    <Button onClick={() => navigate("/dashboard/payouts/new")}><Plus className="h-4 w-4" /> Create payout run</Button>
                </>}
            />

            {list.length > 0 && (
                <StatStrip>
                    <StatTile label="Awaiting approval" value={awaiting.length} hint={awaiting.length ? moneyList(awaiting.flatMap((run) => run.totals), { compact: true }) : "Nothing waiting"} tone={awaiting.length ? "waiting" : undefined} />
                    <StatTile label="In progress" value={inProgress.length} hint="Approved or with the provider" />
                    <StatTile label="Needs attention" value={attentionCount} hint="Failed, on hold or to correct" tone={attentionCount ? "negative" : undefined} />
                    <StatTile label="Delivered this month" value={deliveredByCurrency.length ? moneyList(deliveredByCurrency.slice(0, 1), { compact: true }) : "—"} hint={deliveredByCurrency.length > 1 ? `+ ${deliveredByCurrency.length - 1} more currenc${deliveredByCurrency.length === 2 ? "y" : "ies"}` : "Completed runs this month"} />
                </StatStrip>
            )}

            <section className="premium-card overflow-hidden" aria-label="Payouts">
                <div className="card-header flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex gap-5 text-[14px]" role="tablist" aria-label="Payout views">
                            {([["runs", "Runs"], ["payouts", "Individual payouts"]] as const).map(([value, label]) => (
                                <button key={value} role="tab" aria-selected={tab === value} onClick={() => setParams(value === "runs" ? {} : { tab: value })} className={tab === value ? "border-b-2 border-primary pb-2 font-semibold text-[#1b1c19]" : "border-b-2 border-transparent pb-2 text-[#74736b] hover:text-[#1b1c19]"}>{label}</button>
                            ))}
                        </div>
                        <div className="relative w-full sm:w-64">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a998f]" aria-hidden="true" />
                            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tab === "runs" ? "Search runs" : "Recipient, MV- or SBX- reference"} aria-label="Search payouts" className="h-10 pl-9" />
                        </div>
                    </div>
                    <div className="dash-seg max-w-full overflow-x-auto" role="group" aria-label="Filter">
                        {(tab === "runs" ? RUN_FILTERS : MOVEMENT_FILTERS).map(([value, label]) => (
                            <button key={value} aria-pressed={(tab === "runs" ? runFilter : movementFilter) === value} onClick={() => (tab === "runs" ? setRunFilter(value) : setMovementFilter(value))}>{label}</button>
                        ))}
                    </div>
                </div>
                {tab === "payouts" ? <MovementsList state={movementFilter} q={query.trim()} /> : runs.isPending ? <LoadingRows /> : runs.isError ? <ErrorNotice error={runs.error} onRetry={() => void runs.refetch()} /> : filtered.length === 0 ? (
                    <EmptyState icon={Send} title={list.length ? "No runs match this filter" : "No payout runs yet"} action={!list.length ? <Button onClick={() => navigate("/dashboard/payouts/new")}><Plus className="h-4 w-4" /> Create payout run</Button> : undefined}>
                        {list.length ? "Choose another filter." : "Create a payout run to validate recipients, route it through approval, and track the result."}
                    </EmptyState>
                ) : <RunsTable runs={filtered} />}
            </section>
        </div>
    );
}
