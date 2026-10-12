import { Link } from "react-router-dom";
import { Check, CheckSquare, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageIntro from "@/components/dashboard/PageIntro";
import { ConfirmAction, EmptyState, ErrorNotice, LoadingRows, Panel, SampleTag, StateBadge, ToneBadge } from "@/components/ops";
import { useAuth } from "@/contexts/AuthContext";
import { useApprovals, usePayoutAction } from "@/hooks/use-payouts";
import { payoutsApi } from "@/lib/payouts-api";
import { METHOD_LABELS, money, moneyList } from "@/lib/payout-format";
import { formatRelative } from "@/lib/format";

const APPROVERS = ["owner", "admin", "approver"];

export default function Approvals() {
    const { user } = useAuth();
    const approvals = useApprovals();
    const approve = usePayoutAction(({ id, comment }: { id: string; comment: string }) => payoutsApi.approve(id, comment || undefined), { success: "Approval recorded" });
    const reject = usePayoutAction(({ id, comment }: { id: string; comment: string }) => payoutsApi.reject(id, comment), { success: "Run rejected and returned to the operator" });
    const release = usePayoutAction(({ id, comment }: { id: string; comment: string }) => payoutsApi.release(id, comment || undefined), { success: "New payout details approved" });
    const isApprover = APPROVERS.includes(user?.role ?? "");
    const data = approvals.data;

    return (
        <div className="space-y-6">
            <PageIntro title="Approvals" description="Payout runs and payout-detail changes waiting for an authorised decision." meta={data ? <span>Policy: one approver above {money(data.policy.singleApprovalAboveMinor, data.policy.currency)}, two above {money(data.policy.dualApprovalAboveMinor, data.policy.currency)} · <Link to="/dashboard/settings?tab=approvals" className="font-semibold text-primary hover:underline">Edit policy</Link></span> : undefined} />
            {!isApprover && <p className="rounded-xl border border-[#e7e4dc] bg-white p-4 text-[13px] text-[#55544d]">You can view the queue. Only owners, admins and approvers can make decisions.</p>}

            {approvals.isPending ? <div className="premium-card"><LoadingRows /></div> : approvals.isError || !data ? <div className="premium-card"><ErrorNotice error={approvals.error} onRetry={() => void approvals.refetch()} /></div> : (
                <>
                    <Panel title="Payout runs" subtitle={`${data.runs.length} waiting`} id="runs-queue">
                        {data.runs.length === 0 ? <EmptyState icon={CheckSquare} title="No runs waiting for approval">Submitted payout runs that need approval under your policy appear here.</EmptyState> : (
                            <ul className="divide-y divide-[#ece9e1]">
                                {data.runs.map((run) => (
                                    <li key={run.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Link to={`/dashboard/payouts/runs/${run.id}`} className="text-[15px] font-semibold text-[#1b1c19] hover:text-primary">{run.name}</Link>
                                                <span className="font-mono text-xs text-[#8a897f]">{run.reference}</span>
                                                {run.isSample && <SampleTag />}
                                                <ToneBadge tone="waiting">{run.approvalsReceived} of {run.requiredApprovals} approvals</ToneBadge>
                                            </div>
                                            <p className="mt-1 text-[14px] font-semibold tabular-nums text-[#1b1c19]">{moneyList(run.totals)} <span className="font-normal text-[#74736b]">· {run.payoutCount} payouts · {run.methods.map((method) => METHOD_LABELS[method] ?? method).join(", ")}</span></p>
                                            <p className="mt-1 text-[13px] leading-6 text-[#55544d]">{run.policySummary}</p>
                                            <p className="mt-1 text-xs text-[#8a897f]">Requested by {run.createdByName} · waiting {formatRelative(run.submittedAt).replace(" ago", "")}{run.validation.needsReview === 0 && run.reconciliation.requested ? " · warnings reviewed by operator" : ""}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2 lg:justify-end">
                                            <Button asChild variant="outline" size="sm"><Link to={`/dashboard/payouts/runs/${run.id}`}>Review payouts</Link></Button>
                                            {isApprover && <>
                                                <ConfirmAction trigger={<Button size="sm" variant="outline" className="text-[#9a2f2f]"><XCircle className="h-3.5 w-3.5" /> Reject</Button>} title={`Reject ${run.name}?`} destructive consequence="The run returns to the operator for editing. No money moves." confirmLabel="Reject run" comment={{ label: "Reason", required: true }} pending={reject.isPending} onConfirm={(comment) => reject.mutateAsync({ id: run.id, comment })} />
                                                <ConfirmAction trigger={<Button size="sm" disabled={!run.viewerCanApprove}><Check className="h-3.5 w-3.5" /> Approve</Button>} disabled={!run.viewerCanApprove} title={`Approve ${run.name}?`} lines={[{ label: "Payouts", value: run.payoutCount }, { label: "Total", value: moneyList(run.totals) }, { label: "Funding required", value: money(run.fundingRequiredMinor, run.fundingCurrency) }]} consequence="This approval allows the run to proceed to execution." confirmLabel="Approve run" comment={{ label: "Comment" }} pending={approve.isPending} onConfirm={(comment) => approve.mutateAsync({ id: run.id, comment })} />
                                            </>}
                                            {run.viewerBlockedReason && <p className="w-full text-xs text-[#8a897f] lg:text-right">{run.viewerBlockedReason}</p>}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>

                    <Panel title="Changed payout details" subtitle="Payouts held because a recipient changed details after submission" id="held-queue">
                        {data.heldPayouts.length === 0 ? <p className="p-5 text-[13px] text-[#74736b]">No payouts are on hold.</p> : (
                            <ul className="divide-y divide-[#ece9e1]">
                                {data.heldPayouts.map((item) => (
                                    <li key={item.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                                        <div className="min-w-0">
                                            <p className="text-[14px] font-semibold text-[#1b1c19]">{item.recipientName} · {money(item.amountMinor, item.currency)} <StateBadge kind="movement" state={item.state} className="ml-1" /></p>
                                            <p className="mt-1 text-[13px] text-[#55544d]"><span className="text-[#8a897f] line-through">{item.destination}</span> → <span className="font-medium text-[#1b1c19]">{item.newDestination}</span></p>
                                            <p className="mt-0.5 text-xs text-[#8a897f]">{item.run?.reference} · {item.run?.name} · changed {formatRelative(item.updatedAt)}</p>
                                        </div>
                                        <div className="flex gap-2 lg:justify-end">
                                            <Button asChild variant="outline" size="sm"><Link to={`/dashboard/recipients/${item.recipientId}`}>View recipient</Link></Button>
                                            {isApprover && <ConfirmAction trigger={<Button size="sm"><Check className="h-3.5 w-3.5" /> Approve new details</Button>} title={`Approve new details for ${item.recipientName}?`} lines={[{ label: "New destination", value: item.newDestination ?? "—" }, { label: "Amount", value: money(item.amountMinor, item.currency) }]} consequence="Confirm the change with the recipient through a channel you trust before approving. Detail changes shortly before payday are a common fraud pattern." confirmLabel="Approve details" comment={{ label: "How did you confirm the change?", required: true }} pending={release.isPending} onConfirm={(comment) => release.mutateAsync({ id: item.id, comment })} />}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>
                </>
            )}
        </div>
    );
}
