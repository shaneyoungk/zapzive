import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Archive, History, Loader2, Pencil, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageIntro from "@/components/dashboard/PageIntro";
import { CurrencyFlag } from "@/components/dashboard/AssetIcon";
import { ConfirmAction, EmptyState, ErrorNotice, LoadingRows, MethodTag, Panel, SampleTag, StateBadge, Timeline } from "@/components/ops";
import RecipientForm from "@/components/ops/RecipientForm";
import { usePageHeader } from "@/contexts/PageHeaderContext";
import { usePayoutAction, useRecipient } from "@/hooks/use-payouts";
import { payoutsApi } from "@/lib/payouts-api";
import { money, moneyList } from "@/lib/payout-format";
import { formatDate, formatDateTime, formatRelative } from "@/lib/format";

export default function RecipientDetail() {
    const { id } = useParams();
    const recipient = useRecipient(id);
    const { setTitle } = usePageHeader();
    const [editing, setEditing] = useState(false);
    const data = recipient.data;
    useEffect(() => { setTitle(data?.name ?? null); return () => setTitle(null); }, [data?.name, setTitle]);

    const verify = usePayoutAction(() => payoutsApi.verifyRecipient(id!), { success: (result) => result.problems.length ? `Check failed: ${result.problems[0]}` : "Payout details checked" });
    const archive = usePayoutAction(() => payoutsApi.archiveRecipient(id!), { success: "Recipient archived" });
    const restore = usePayoutAction(() => payoutsApi.restoreRecipient(id!), { success: "Recipient restored" });

    if (recipient.isPending) return <div className="premium-card"><LoadingRows rows={6} /></div>;
    if (recipient.isError || !data) return <div className="premium-card"><ErrorNotice error={recipient.error} onRetry={() => void recipient.refetch()} /></div>;

    return (
        <div className="space-y-6">
            <PageIntro
                back={{ to: "/dashboard/recipients", label: "Recipients" }}
                title={data.name}
                description={[data.title, data.type[0].toUpperCase() + data.type.slice(1), data.email].filter(Boolean).join(" · ")}
                meta={<>
                    {data.status === "archived" ? <StateBadge kind="run" state="cancelled" /> : null}
                    <StateBadge kind="verification" state={data.verification} />
                    {data.country && <span className="inline-flex items-center gap-1.5"><CurrencyFlag code={data.country.toLowerCase()} size="xs" />{data.countryName}</span>}
                    {data.isSample && <SampleTag />}
                </>}
                actions={<>
                    <Button variant="outline" onClick={() => verify.mutate(undefined)} disabled={verify.isPending || !data.payoutMethod}>{verify.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Check details</Button>
                    {data.status === "archived"
                        ? <Button variant="outline" onClick={() => restore.mutate(undefined)} disabled={restore.isPending}><RotateCcw className="h-4 w-4" /> Restore</Button>
                        : <ConfirmAction trigger={<Button variant="outline"><Archive className="h-4 w-4" /> Archive</Button>} title={`Archive ${data.name}?`} consequence="Archived recipients cannot be added to new payout runs. Their history is kept. You can restore them later." confirmLabel="Archive recipient" pending={archive.isPending} onConfirm={() => archive.mutateAsync(undefined)} />}
                    <Button onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Edit</Button>
                </>}
            />

            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="min-w-0 space-y-5">
                    {data.exceptions.length > 0 && (
                        <Panel title="Needs attention" id="r-exceptions">
                            <ul className="divide-y divide-[#ece9e1]">
                                {data.exceptions.map((item) => (
                                    <li key={item.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="min-w-0">
                                            <p className="text-[14px] font-semibold text-[#1b1c19]">{money(item.amountMinor, item.currency)} · {item.run?.name}</p>
                                            <p className="mt-0.5 text-[13px] text-[#74736b]">{item.state === "on_hold" ? item.holdReason : item.failureReason}</p>
                                        </div>
                                        <div className="flex items-center gap-3"><StateBadge kind="movement" state={item.state} /><Button asChild size="sm" variant="outline"><Link to="/dashboard/exceptions">Resolve</Link></Button></div>
                                    </li>
                                ))}
                            </ul>
                        </Panel>
                    )}

                    <Panel title="Payout history" subtitle="Every payout to this recipient" id="r-history">
                        {data.history.length === 0 ? <EmptyState icon={History} title="No payouts yet">Add this recipient to a payout run to pay them.</EmptyState> : (
                            <div className="overflow-x-auto">
                                <table className="min-w-[560px] text-sm">
                                    <thead><tr><th scope="col" className="px-5 text-left">Run</th><th scope="col" className="px-3 text-left">Reference</th><th scope="col" className="px-3 text-left">State</th><th scope="col" className="px-3 text-left">Date</th><th scope="col" className="px-5 text-right">Amount</th></tr></thead>
                                    <tbody className="divide-y divide-[#ece9e1]">
                                        {data.history.map((item) => (
                                            <tr key={item.id}>
                                                <td className="px-5 py-3"><Link to={`/dashboard/payouts/movements/${item.id}`} className="font-semibold text-[#1b1c19] hover:text-primary">{item.run?.name ?? "Single payout"}</Link><p className="text-xs text-[#8a897f]">{item.run?.reference}</p></td>
                                                <td className="px-3 py-3 font-mono text-xs text-[#55544d]">{item.externalReference ?? item.reference}</td>
                                                <td className="px-3 py-3"><StateBadge kind="movement" state={item.state} /></td>
                                                <td className="px-3 py-3 text-xs text-[#74736b]">{formatDate(item.deliveredAt ?? item.failedAt ?? item.submittedAt ?? item.createdAt)}</td>
                                                <td className="px-5 py-3 text-right font-semibold tabular-nums text-[#1b1c19]">{money(item.amountMinor, item.currency)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Panel>

                    <Panel title="Audit history" id="r-audit"><Timeline events={data.events} empty="No changes recorded." /></Panel>
                </div>

                <div className="min-w-0 space-y-5">
                    <Panel title="Payout method" id="r-method">
                        <div className="space-y-4 p-5">
                            <MethodTag method={data.payoutMethod} label={data.payoutMethodLabel ? `${data.payoutMethodLabel} · ${data.payoutCurrency}` : null} destination={data.destination} />
                            <dl className="space-y-2 text-[13px]">
                                <div className="flex justify-between gap-3"><dt className="text-[#74736b]">Details last changed</dt><dd className="text-right text-[#1b1c19]" title={formatDateTime(data.detailsUpdatedAt)}>{data.detailsUpdatedAt ? formatRelative(data.detailsUpdatedAt) : "—"}</dd></div>
                                <div className="flex justify-between gap-3"><dt className="text-[#74736b]">Details check</dt><dd className="text-right text-[#1b1c19]">{data.verifiedAt ? `Passed ${formatDate(data.verifiedAt)}` : data.verification === "failed" ? "Failed" : "Not run"}</dd></div>
                            </dl>
                            <p className="text-xs leading-5 text-[#8a897f]">The details check confirms the format and route are supported in the sandbox. It is not KYC or identity verification.</p>
                        </div>
                    </Panel>
                    <Panel title="Totals" id="r-totals">
                        <dl className="divide-y divide-[#ece9e1] text-[13px]">
                            <div className="flex justify-between gap-3 px-5 py-3"><dt className="text-[#74736b]">Total delivered</dt><dd className="text-right font-semibold tabular-nums text-[#1b1c19]">{moneyList(data.totalsPaid)}</dd></div>
                            <div className="flex justify-between gap-3 px-5 py-3"><dt className="text-[#74736b]">Pending payouts</dt><dd className="font-semibold text-[#1b1c19]">{data.pending.length}</dd></div>
                            <div className="flex justify-between gap-3 px-5 py-3"><dt className="text-[#74736b]">Open exceptions</dt><dd className="font-semibold text-[#1b1c19]">{data.exceptions.length}</dd></div>
                        </dl>
                    </Panel>
                    <Panel title="Payout-detail changes" id="r-changes">
                        {data.detailChanges.length === 0 ? <p className="p-5 text-[13px] text-[#74736b]">No changes since this recipient was added.</p> : (
                            <ul className="divide-y divide-[#ece9e1]">
                                {data.detailChanges.map((event) => (
                                    <li key={event.id} className="px-5 py-3 text-[13px]">
                                        <p className="text-[#1b1c19]"><span className="text-[#8a897f] line-through">{String(event.metadata.before ?? "—")}</span> → <span className="font-medium">{String(event.metadata.after ?? "—")}</span></p>
                                        <p className="mt-0.5 text-xs text-[#8a897f]">{event.actorName} · {formatDateTime(event.createdAt)}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>
                </div>
            </div>

            <RecipientForm open={editing} onOpenChange={setEditing} recipient={data} />
        </div>
    );
}
