import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, Copy, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageIntro from "@/components/dashboard/PageIntro";
import { ConfirmAction, ErrorNotice, LoadingRows, MethodTag, Panel, SampleTag, StateBadge, Timeline } from "@/components/ops";
import { useAuth } from "@/contexts/AuthContext";
import { usePageHeader } from "@/contexts/PageHeaderContext";
import { useMovement, usePayoutAction } from "@/hooks/use-payouts";
import { payoutsApi } from "@/lib/payouts-api";
import { MOVEMENT_STATES, money } from "@/lib/payout-format";
import { formatDateTime } from "@/lib/format";

function CopyRef({ value }: { value: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ } }} className="inline-flex items-center gap-1.5 rounded-md font-mono text-[12.5px] text-[#3c3c37] hover:text-primary" aria-label={`Copy ${value}`}>
            {value}{copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3 opacity-60" />}
        </button>
    );
}

const LIFECYCLE = ["ready", "awaiting_approval", "approved", "processing", "delivered"];

export default function MovementDetail() {
    const { id } = useParams();
    const { user } = useAuth();
    const { setTitle } = usePageHeader();
    const movement = useMovement(id);
    const data = movement.data;
    useEffect(() => { setTitle(data ? `${data.reference} · ${data.recipientName}` : null); return () => setTitle(null); }, [data, setTitle]);
    const retry = usePayoutAction(() => payoutsApi.retry(id!), { success: "Payout resubmitted" });
    const cancel = usePayoutAction((reason: string) => payoutsApi.cancelMovement(id!, reason || undefined), { success: "Payout cancelled" });
    const release = usePayoutAction((comment: string) => payoutsApi.release(id!, comment || undefined), { success: "New details approved" });

    if (movement.isPending) return <div className="premium-card"><LoadingRows rows={6} /></div>;
    if (movement.isError || !data) return <div className="premium-card"><ErrorNotice error={movement.error} onRetry={() => void movement.refetch()} /></div>;

    const role = user?.role ?? "";
    const canApprove = ["owner", "admin", "approver"].includes(role);
    const canOperate = ["owner", "admin", "operator", "treasury", "approver"].includes(role);
    const reachedIndex = data.state === "delivered" ? 4 : data.state === "processing" || data.state === "queued" ? 3 : LIFECYCLE.indexOf(data.state);

    return (
        <div className="space-y-6">
            <PageIntro
                back={data.run ? { to: `/dashboard/payouts/runs/${data.run.id}`, label: data.run.name } : { to: "/dashboard/payouts?tab=payouts", label: "Payouts" }}
                title={`${money(data.amountMinor, data.currency)} to ${data.recipientName}`}
                description={MOVEMENT_STATES[data.state]?.meaning}
                meta={<><StateBadge kind="movement" state={data.state} /><span className="font-mono">{data.reference}</span>{data.attempt > 1 && <span>Attempt {data.attempt}</span>}{data.isSample && <SampleTag />}</>}
                actions={<>
                    {data.state === "failed" && canOperate && <ConfirmAction trigger={<Button><RotateCcw className="h-4 w-4" /> Retry</Button>} title="Retry this payout?" lines={[{ label: "Amount", value: money(data.amountMinor, data.currency) }, { label: "Destination", value: data.destination ?? "—" }]} consequence="A fresh sandbox quote is taken, funding is reserved again, and the payout is resubmitted to the provider." confirmLabel="Retry payout" pending={retry.isPending} onConfirm={() => retry.mutateAsync(undefined)} />}
                    {data.state === "on_hold" && canApprove && <ConfirmAction trigger={<Button><Check className="h-4 w-4" /> Approve new details</Button>} title="Approve the new payout details?" lines={[{ label: "New destination", value: data.recipient?.destination ?? "—" }, { label: "Amount", value: money(data.amountMinor, data.currency) }]} consequence="The payout will be sent to the new details. Your approval is recorded in the audit trail." confirmLabel="Approve details" comment={{ label: "How did you confirm the change?" }} pending={release.isPending} onConfirm={(comment) => release.mutateAsync(comment)} />}
                    {["failed", "on_hold"].includes(data.state) && canOperate && <ConfirmAction trigger={<Button variant="outline" className="text-[#9a2f2f]"><XCircle className="h-4 w-4" /> Cancel payout</Button>} title="Cancel this payout?" destructive consequence="It will not be sent. No money has left your funding for it. The cancellation is recorded." confirmLabel="Cancel payout" comment={{ label: "Reason" }} pending={cancel.isPending} onConfirm={(reason) => cancel.mutateAsync(reason)} />}
                </>}
            />

            {(data.failureReason || data.holdReason) && (
                <div role="alert" className="rounded-2xl border border-[#efc9c4] bg-[#fbecea] p-4 text-[13px] leading-6 text-[#9a2f2f]">
                    <p className="font-semibold">{data.state === "on_hold" ? "On hold" : "Failed"}: {data.failureReason ?? data.holdReason}</p>
                    <p className="mt-1 text-[#7a3a32]">{data.state === "failed" ? "No money reached the recipient and the reserved funding was released." : "Nothing has been sent for this payout."}</p>
                </div>
            )}

            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="min-w-0 space-y-5">
                    <Panel title="Lifecycle" id="lifecycle-title">
                        <ol className="grid grid-cols-5 gap-1 p-5" aria-label="Payout lifecycle">
                            {LIFECYCLE.map((state, index) => {
                                const failedHere = index === 4 && ["failed", "cancelled"].includes(data.state);
                                const reached = index <= reachedIndex;
                                return (
                                    <li key={state} className="text-center">
                                        <span className={`mx-auto block h-1.5 rounded-full ${failedHere ? "bg-[#cf4b3f]" : reached ? "bg-primary" : "bg-[#e7e4dc]"}`} />
                                        <span className={`mt-2 block text-[11.5px] ${reached ? "font-semibold text-[#1b1c19]" : "text-[#9a998f]"}`}>{failedHere ? MOVEMENT_STATES[data.state].label : MOVEMENT_STATES[state].label}</span>
                                    </li>
                                );
                            })}
                        </ol>
                    </Panel>
                    <Panel title="Details" id="details-title">
                        <dl className="grid gap-x-6 gap-y-4 p-5 text-[13px] sm:grid-cols-2">
                            <div><dt className="text-[#8a897f]">Recipient</dt><dd className="mt-0.5">{data.recipientId ? <Link to={`/dashboard/recipients/${data.recipientId}`} className="font-semibold text-[#1b1c19] hover:text-primary">{data.recipientName}</Link> : data.recipientName}</dd></div>
                            <div><dt className="text-[#8a897f]">Payout method</dt><dd className="mt-1"><MethodTag method={data.payoutMethod} label={data.payoutMethodLabel} destination={data.destination} /></dd></div>
                            <div><dt className="text-[#8a897f]">Recipient receives</dt><dd className="mt-0.5 font-semibold tabular-nums text-[#1b1c19]">{money(data.amountMinor, data.currency)}</dd></div>
                            <div><dt className="text-[#8a897f]">Delivered amount</dt><dd className="mt-0.5 font-semibold tabular-nums text-[#1b1c19]">{data.deliveredAmountMinor !== null ? money(data.deliveredAmountMinor, data.currency) : "—"}</dd></div>
                            <div><dt className="text-[#8a897f]">Funding cost</dt><dd className="mt-0.5 tabular-nums text-[#1b1c19]">{money(data.sourceAmountMinor, data.sourceCurrency)} <span className="text-[#8a897f]">incl. {money(data.feeMinor, data.sourceCurrency)} fee</span></dd></div>
                            <div><dt className="text-[#8a897f]">Rate (sandbox)</dt><dd className="mt-0.5 tabular-nums text-[#1b1c19]">{data.fxRate ? `1 ${data.sourceCurrency} = ${data.fxRate} ${data.currency}` : "—"}</dd></div>
                            <div><dt className="text-[#8a897f]">Provider</dt><dd className="mt-0.5 text-[#1b1c19]">{data.provider === "sandbox" ? "Zapzive sandbox provider" : data.provider ?? "—"}{data.rail ? <span className="text-[#8a897f]"> · {data.rail}</span> : null}</dd></div>
                            <div><dt className="text-[#8a897f]">External reference</dt><dd className="mt-0.5 text-[#1b1c19]">{data.externalReference ?? "—"}</dd></div>
                            <div><dt className="text-[#8a897f]">Internal reference</dt><dd className="mt-0.5"><CopyRef value={data.reference} /></dd></div>
                            <div><dt className="text-[#8a897f]">Provider reference</dt><dd className="mt-0.5">{data.providerReference ? <CopyRef value={data.providerReference} /> : "—"}</dd></div>
                            <div><dt className="text-[#8a897f]">Submitted</dt><dd className="mt-0.5 text-[#1b1c19]">{formatDateTime(data.submittedAt)}</dd></div>
                            <div><dt className="text-[#8a897f]">{data.state === "failed" ? "Failed" : "Delivered"}</dt><dd className="mt-0.5 text-[#1b1c19]">{formatDateTime(data.deliveredAt ?? data.failedAt)}</dd></div>
                        </dl>
                    </Panel>
                    <Panel title="Audit events" id="audit-title"><Timeline events={data.events} /></Panel>
                </div>
                <div className="min-w-0 space-y-5">
                    <Panel title="Payout run" id="run-title">
                        {data.run ? (
                            <div className="space-y-2 p-5 text-[13px]">
                                <Link to={`/dashboard/payouts/runs/${data.run.id}`} className="font-semibold text-[#1b1c19] hover:text-primary">{data.run.name}</Link>
                                <p className="text-[#74736b]">{data.run.reference}</p>
                                <StateBadge kind="run" state={data.run.status} />
                                <p className="pt-2 text-[#74736b]">Reconciliation: <span className="font-medium text-[#1b1c19]">{data.run.reconciledAt ? `reconciled ${formatDateTime(data.run.reconciledAt)}` : "not yet reconciled"}</span></p>
                            </div>
                        ) : <p className="p-5 text-[13px] text-[#74736b]">Not part of a run.</p>}
                    </Panel>
                    <Panel title="Approvals" id="approvals-title">
                        {data.approvals.length === 0 ? <p className="p-5 text-[13px] text-[#74736b]">No approval was required.</p> : (
                            <ul className="divide-y divide-[#ece9e1]">{data.approvals.map((item) => <li key={item.id} className="px-5 py-3 text-[13px]"><span className="font-semibold text-[#1b1c19]">{item.actorName}</span> {item.decision}<p className="text-xs text-[#8a897f]">{formatDateTime(item.createdAt)}{item.selfApproval ? " · self-approval" : ""}</p></li>)}</ul>
                        )}
                    </Panel>
                </div>
            </div>
        </div>
    );
}
