import { Link } from "react-router-dom";
import { Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageIntro from "@/components/dashboard/PageIntro";
import { EmptyState, ErrorNotice, LoadingRows, Panel, SampleTag, StateBadge, ToneBadge } from "@/components/ops";
import { useReconciliation } from "@/hooks/use-payouts";
import { money, moneyList } from "@/lib/payout-format";
import { formatDate } from "@/lib/format";

export default function Reconciliation() {
    const runs = useReconciliation();
    const list = runs.data ?? [];
    const open = list.filter((run) => !run.reconciledAt);
    const done = list.filter((run) => run.reconciledAt);

    const table = (items: typeof list) => (
        <>
            <div className="hidden overflow-x-auto md:block">
                <table className="text-sm">
                    <caption className="sr-only">Reconciliation by payout run</caption>
                    <thead><tr>
                        <th scope="col" className="px-5 text-left">Payout run</th>
                        <th scope="col" className="px-3 text-right">Delivered</th>
                        <th scope="col" className="px-3 text-right">Expected</th>
                        <th scope="col" className="px-3 text-right">Delivered amount</th>
                        <th scope="col" className="px-3 text-right">Outstanding</th>
                        <th scope="col" className="px-3 text-right">Fees</th>
                        <th scope="col" className="px-5 text-left">Status</th>
                    </tr></thead>
                    <tbody className="divide-y divide-[#ece9e1]">
                        {items.map((run) => {
                            const r = run.reconciliation;
                            return (
                                <tr key={run.id}>
                                    <td className="px-5 py-3.5"><Link to={`/dashboard/payouts/runs/${run.id}`} className="font-semibold text-[#1b1c19] hover:text-primary">{run.name}</Link><p className="flex items-center gap-1.5 text-xs text-[#8a897f]"><span className="font-mono">{run.reference}</span>{run.completedAt ? ` · finished ${formatDate(run.completedAt)}` : ""}{run.isSample && <SampleTag />}</p></td>
                                    <td className="px-3 py-3.5 text-right tabular-nums">{r.delivered} / {r.requested}{r.failed ? <p className="text-xs text-[#9a2f2f]">{r.failed} failed</p> : null}</td>
                                    <td className="px-3 py-3.5 text-right text-[13px] tabular-nums text-[#3c3c37]">{moneyList(r.expected, { compact: true })}</td>
                                    <td className="px-3 py-3.5 text-right text-[13px] font-semibold tabular-nums text-[#1b1c19]">{moneyList(r.deliveredTotals, { compact: true })}</td>
                                    <td className="px-3 py-3.5 text-right text-[13px] tabular-nums">{r.outstandingTotals.length ? <span className="text-[#9a2f2f]">{moneyList(r.outstandingTotals, { compact: true })}</span> : <span className="text-[#9a998f]">None</span>}</td>
                                    <td className="px-3 py-3.5 text-right text-[13px] tabular-nums text-[#3c3c37]">{money(r.feesMinor, r.fundingCurrency)}</td>
                                    <td className="px-5 py-3.5">{run.reconciledAt ? <ToneBadge tone="positive">Reconciled {formatDate(run.reconciledAt)}</ToneBadge> : run.status === "processing" ? <StateBadge kind="run" state="processing" /> : <Button asChild size="sm" variant="outline"><Link to={`/dashboard/payouts/runs/${run.id}`}>Reconcile</Link></Button>}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <ul className="divide-y divide-[#ece9e1] md:hidden">
                {items.map((run) => (
                    <li key={run.id}><Link to={`/dashboard/payouts/runs/${run.id}`} className="block px-4 py-3.5">
                        <div className="flex items-start justify-between gap-2"><p className="font-semibold text-[#1b1c19]">{run.name}</p>{run.reconciledAt ? <ToneBadge tone="positive">Reconciled</ToneBadge> : <StateBadge kind="run" state={run.status} />}</div>
                        <p className="mt-1 text-[13px] text-[#55544d]">{run.reconciliation.delivered}/{run.reconciliation.requested} delivered · {moneyList(run.reconciliation.deliveredTotals, { compact: true })}</p>
                        {run.reconciliation.outstandingTotals.length > 0 && <p className="text-xs text-[#9a2f2f]">Outstanding {moneyList(run.reconciliation.outstandingTotals, { compact: true })}</p>}
                    </Link></li>
                ))}
            </ul>
        </>
    );

    return (
        <div className="space-y-6">
            <PageIntro title="Reconciliation" description="Expected versus delivered for every sent payout run, with provider references and accounting exports." />
            {runs.isPending ? <div className="premium-card"><LoadingRows /></div> : runs.isError ? <div className="premium-card"><ErrorNotice error={runs.error} onRetry={() => void runs.refetch()} /></div> : list.length === 0 ? (
                <div className="premium-card"><EmptyState icon={Scale} title="Nothing to reconcile yet" action={<Button asChild><Link to="/dashboard/payouts/new">Create payout run</Link></Button>}>Once a payout run is sent, its delivered and outstanding amounts are tracked here until you mark it reconciled.</EmptyState></div>
            ) : (
                <>
                    <Panel title="To reconcile" subtitle={`${open.length} run${open.length === 1 ? "" : "s"}`} id="recon-open">{open.length ? table(open) : <p className="p-5 text-[13px] text-[#74736b]">Every sent run is reconciled.</p>}</Panel>
                    {done.length > 0 && <Panel title="Reconciled" subtitle={`${done.length} run${done.length === 1 ? "" : "s"}`} id="recon-done">{table(done)}</Panel>}
                    <p className="text-xs text-[#8a897f]">Exports (ledger, accounting journal and run receipt) are on each payout run. Accounting integrations such as QuickBooks and Xero are planned, not yet available.</p>
                </>
            )}
        </div>
    );
}
