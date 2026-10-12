import { Link } from "react-router-dom";
import { AlertTriangle, Check, Pencil, RotateCcw, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageIntro from "@/components/dashboard/PageIntro";
import { ConfirmAction, EmptyState, ErrorNotice, LoadingRows, MethodTag, Panel, SampleTag, StateBadge } from "@/components/ops";
import { useAuth } from "@/contexts/AuthContext";
import { useExceptions, usePayoutAction } from "@/hooks/use-payouts";
import { payoutsApi } from "@/lib/payouts-api";
import { money } from "@/lib/payout-format";
import { formatRelative } from "@/lib/format";

export default function Exceptions() {
    const { user } = useAuth();
    const exceptions = useExceptions();
    const retry = usePayoutAction((id: string) => payoutsApi.retry(id), { success: "Payout resubmitted" });
    const cancel = usePayoutAction(({ id, reason }: { id: string; reason: string }) => payoutsApi.cancelMovement(id, reason || undefined), { success: "Payout cancelled" });
    const release = usePayoutAction(({ id, comment }: { id: string; comment: string }) => payoutsApi.release(id, comment || undefined), { success: "New details approved; payout resent" });
    const role = user?.role ?? "";
    const canApprove = ["owner", "admin", "approver"].includes(role);
    const canOperate = ["owner", "admin", "operator", "treasury", "approver"].includes(role);
    const data = exceptions.data;

    return (
        <div className="space-y-6">
            <PageIntro title="Exceptions" description="Failed and held payouts, and runs that need correction. Each one explains what happened and what you can do." />
            {exceptions.isPending ? <div className="premium-card"><LoadingRows /></div> : exceptions.isError || !data ? <div className="premium-card"><ErrorNotice error={exceptions.error} onRetry={() => void exceptions.refetch()} /></div> : (
                <>
                    {data.payouts.length === 0 && data.runsNeedingCorrection.length === 0 ? (
                        <div className="premium-card"><EmptyState icon={ShieldCheck} title="No open exceptions">Failed payouts, payouts held for re-approval, and runs with validation problems will appear here.</EmptyState></div>
                    ) : null}

                    {data.payouts.length > 0 && (
                        <Panel title="Payouts" subtitle={`${data.payouts.length} need a decision`} id="payout-exceptions">
                            <ul className="divide-y divide-[#ece9e1]">
                                {data.payouts.map((item) => (
                                    <li key={item.id} className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)]">
                                        <div className="min-w-0 space-y-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Link to={`/dashboard/payouts/movements/${item.id}`} className="text-[15px] font-semibold text-[#1b1c19] hover:text-primary">{item.recipientName}</Link>
                                                <span className="text-[15px] font-semibold tabular-nums text-[#1b1c19]">{money(item.amountMinor, item.currency)}</span>
                                                <StateBadge kind="movement" state={item.state} />
                                                {item.isSample && <SampleTag />}
                                            </div>
                                            <dl className="grid gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2">
                                                <div><dt className="text-[#8a897f]">What happened</dt><dd className="mt-0.5 font-medium text-[#1b1c19]">{item.title}: {item.whatHappened}</dd></div>
                                                <div><dt className="text-[#8a897f]">Did money move?</dt><dd className="mt-0.5 text-[#3c3c37]">{item.moneyMoved}</dd></div>
                                                <div><dt className="text-[#8a897f]">What you can do</dt><dd className="mt-0.5 text-[#3c3c37]">{item.nextStep}</dd></div>
                                                <div><dt className="text-[#8a897f]">Who can act</dt><dd className="mt-0.5 text-[#3c3c37]">{item.whoCanAct}{item.requiresReapproval ? " · re-approval required" : ""}</dd></div>
                                            </dl>
                                            <div className="flex flex-wrap items-center gap-3 text-xs text-[#8a897f]">
                                                <MethodTag method={item.payoutMethod} label={item.payoutMethodLabel} destination={item.destination} />
                                                <span>{item.run?.reference} · {item.run?.name}</span>
                                                <span>{formatRelative(item.failedAt ?? item.updatedAt)}</span>
                                                {item.attempt > 1 && <span>Attempt {item.attempt}</span>}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap content-start gap-2 lg:justify-end">
                                            {item.actions.includes("approve_details") && canApprove && <ConfirmAction trigger={<Button size="sm"><Check className="h-3.5 w-3.5" /> Approve new details</Button>} title={`Approve new details for ${item.recipientName}?`} consequence="Confirm the change with the recipient through a channel you trust. The payout is then sent to the new details." confirmLabel="Approve and send" comment={{ label: "How did you confirm the change?", required: true }} pending={release.isPending} onConfirm={(comment) => release.mutateAsync({ id: item.id, comment })} />}
                                            {item.actions.includes("retry") && canOperate && <ConfirmAction trigger={<Button size="sm"><RotateCcw className="h-3.5 w-3.5" /> Retry</Button>} title="Retry this payout?" lines={[{ label: "Amount", value: money(item.amountMinor, item.currency) }, { label: "Destination", value: item.destination ?? "—" }]} consequence="Funding is reserved again and the payout is resubmitted to the same destination. If the details are wrong, edit the recipient instead." confirmLabel="Retry payout" pending={retry.isPending} onConfirm={() => retry.mutateAsync(item.id)} />}
                                            {item.actions.includes("edit_recipient") && item.recipientId && <Button asChild size="sm" variant="outline"><Link to={`/dashboard/recipients/${item.recipientId}`}><Pencil className="h-3.5 w-3.5" /> Change payout method</Link></Button>}
                                            {canOperate && <ConfirmAction trigger={<Button size="sm" variant="outline" className="text-[#9a2f2f]"><XCircle className="h-3.5 w-3.5" /> Cancel</Button>} title="Cancel this payout?" destructive consequence="It will not be sent. The cancellation is recorded and the run can then be reconciled." confirmLabel="Cancel payout" comment={{ label: "Reason" }} pending={cancel.isPending} onConfirm={(reason) => cancel.mutateAsync({ id: item.id, reason })} />}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </Panel>
                    )}

                    {data.runsNeedingCorrection.length > 0 && (
                        <Panel title="Runs that need correction" id="run-exceptions">
                            <ul className="divide-y divide-[#ece9e1]">
                                {data.runsNeedingCorrection.map((run) => (
                                    <li key={run.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-[14px] font-semibold text-[#1b1c19]">{run.name} <span className="font-mono text-xs font-normal text-[#8a897f]">{run.reference}</span></p>
                                            <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-[#9a2f2f]"><AlertTriangle className="h-3.5 w-3.5" /> {run.validation.needsCorrection} of {run.validation.total} payouts need correction before submission</p>
                                        </div>
                                        <Button asChild size="sm"><Link to={`/dashboard/payouts/runs/${run.id}`}>Fix payouts</Link></Button>
                                    </li>
                                ))}
                            </ul>
                        </Panel>
                    )}
                </>
            )}
        </div>
    );
}
