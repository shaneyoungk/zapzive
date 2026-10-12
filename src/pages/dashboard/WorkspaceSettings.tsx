import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { FlaskConical, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import PageIntro from "@/components/dashboard/PageIntro";
import { ConfirmAction, ErrorNotice, LoadingRows, Panel } from "@/components/ops";
import LegacySettings from "@/pages/dashboard/Settings";
import { useAuth } from "@/contexts/AuthContext";
import { usePayoutAction, usePolicy, useSampleStatus } from "@/hooks/use-payouts";
import { payoutsApi } from "@/lib/payouts-api";
import { minorToDecimal } from "@/lib/payout-format";
import { formatDateTime } from "@/lib/format";

const TABS = [["organization", "Organization"], ["approvals", "Approval policy"], ["sandbox", "Sandbox"]] as const;

function PolicyEditor() {
    const { user } = useAuth();
    const policy = usePolicy();
    const [form, setForm] = useState({ single: "", dual: "", newRecipient: true, changedDetails: true, selfApproval: true });
    const save = usePayoutAction(() => payoutsApi.updatePolicy({ currency: policy.data?.currency ?? "KES", singleApprovalAbove: form.single.replace(/,/g, ""), dualApprovalAbove: form.dual.replace(/,/g, ""), newRecipientRequiresApproval: form.newRecipient, changedDetailsRequiresApproval: form.changedDetails, allowSelfApproval: form.selfApproval }), { success: "Approval policy saved" });
    useEffect(() => {
        if (!policy.data) return;
        setForm({ single: minorToDecimal(policy.data.singleApprovalAboveMinor, policy.data.currency).replace(/\.00$/, ""), dual: minorToDecimal(policy.data.dualApprovalAboveMinor, policy.data.currency).replace(/\.00$/, ""), newRecipient: policy.data.newRecipientRequiresApproval, changedDetails: policy.data.changedDetailsRequiresApproval, selfApproval: policy.data.allowSelfApproval });
    }, [policy.data]);
    const canEdit = ["owner", "admin"].includes(user?.role ?? "");
    if (policy.isPending) return <div className="premium-card"><LoadingRows /></div>;
    if (policy.isError || !policy.data) return <div className="premium-card"><ErrorNotice error={policy.error} /></div>;
    const currency = policy.data.currency;
    const submit = (event: FormEvent) => { event.preventDefault(); save.mutate(undefined); };
    return (
        <Panel title="Approval policy" subtitle={policy.data.configured ? `Last changed ${formatDateTime(policy.data.updatedAt)}` : "Using recommended defaults"} id="policy-title">
            <form onSubmit={submit}>
                <div className="space-y-6 p-5">
                    <div>
                        <p className="text-[13px] font-semibold text-[#1b1c19]">Amount tiers ({currency})</p>
                        <p className="mt-0.5 text-xs text-[#8a897f]">Run totals in other currencies are converted to {currency} at sandbox reference rates.</p>
                        <div className="mt-3 grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5"><Label htmlFor="p-single">One approver above</Label><Input id="p-single" className="h-11 tabular-nums" inputMode="decimal" value={form.single} onChange={(event) => setForm({ ...form, single: event.target.value })} disabled={!canEdit} /></div>
                            <div className="space-y-1.5"><Label htmlFor="p-dual">Two approvers above</Label><Input id="p-dual" className="h-11 tabular-nums" inputMode="decimal" value={form.dual} onChange={(event) => setForm({ ...form, dual: event.target.value })} disabled={!canEdit} /></div>
                        </div>
                        <p className="mt-2 text-xs text-[#74736b]">Below {currency} {Number(form.single || 0).toLocaleString()} an operator can submit without secondary approval.</p>
                    </div>
                    <div className="space-y-3">
                        {([["newRecipient", "New recipients require approval", "The first payout to any recipient needs at least one approver."], ["changedDetails", "Changed payout details require approval", "Payouts to recipients whose details changed since their last payout need approval. Submitted payouts go on hold."], ["selfApproval", "Allow self-approval", "Lets the submitter approve their own run. Useful in a one-person sandbox; turn it off once you have a second approver."]] as const).map(([key, label, hint]) => (
                            <div key={key} className="flex items-start justify-between gap-4 rounded-xl border border-[#ece9e1] p-4">
                                <div><Label htmlFor={`p-${key}`} className="text-[13px] font-semibold text-[#1b1c19]">{label}</Label><p className="mt-0.5 text-xs leading-5 text-[#74736b]">{hint}</p></div>
                                <Switch id={`p-${key}`} checked={form[key]} onCheckedChange={(checked) => setForm({ ...form, [key]: checked })} disabled={!canEdit} />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-[#ece9e1] p-5">
                    <p className="text-xs text-[#8a897f]">{canEdit ? "Changes apply to runs submitted after saving and are recorded in Activity." : "Only owners and admins can change the policy."}</p>
                    {canEdit && <Button type="submit" disabled={save.isPending}>{save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save policy</Button>}
                </div>
            </form>
        </Panel>
    );
}

function SandboxSettings() {
    const { user, company } = useAuth();
    const sample = useSampleStatus();
    const load = usePayoutAction(() => payoutsApi.loadSample(), { success: "Sample scenario loaded" });
    const remove = usePayoutAction(() => payoutsApi.removeSample(), { success: "Sample data removed" });
    const canManage = ["owner", "admin"].includes(user?.role ?? "");
    return (
        <Panel title="Sandbox sample data" id="sample-title">
            <div className="space-y-4 p-5 text-[13px] leading-6 text-[#55544d]">
                <p>The sample scenario adds 12 recipients, two finished payout runs and one run awaiting approval, all labelled “Sample”. Removing it deletes those records; audit entries are kept.</p>
                {!company?.isTestMode ? <p className="text-[#8a897f]">Sample data is only available in a sandbox workspace.</p> : !canManage ? <p className="text-[#8a897f]">Only owners and admins can manage sample data.</p> : sample.data?.loaded ? (
                    <ConfirmAction trigger={<Button variant="outline" className="text-[#9a2f2f]"><Trash2 className="h-4 w-4" /> Remove sample data</Button>} title="Remove the sample scenario?" destructive consequence="Sample recipients, runs and payouts are deleted. Your own records are not affected." confirmLabel="Remove sample data" pending={remove.isPending} onConfirm={() => remove.mutateAsync(undefined)} />
                ) : <Button onClick={() => load.mutate(undefined)} disabled={load.isPending}>{load.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />} Load sample scenario</Button>}
            </div>
        </Panel>
    );
}

export default function WorkspaceSettings() {
    const [params, setParams] = useSearchParams();
    const tab = (TABS.find(([value]) => value === params.get("tab"))?.[0] ?? "organization") as (typeof TABS)[number][0];
    return (
        <div className="space-y-6">
            <PageIntro title="Settings" description="Organization profile, environment, approval policy and sandbox data." />
            <div className="flex gap-6 overflow-x-auto border-b border-[#e3e0d7] text-[14px]" role="tablist" aria-label="Settings sections">
                {TABS.map(([value, label]) => <button key={value} role="tab" aria-selected={tab === value} onClick={() => setParams(value === "organization" ? {} : { tab: value })} className={tab === value ? "-mb-px border-b-2 border-primary pb-2.5 font-semibold text-[#1b1c19]" : "-mb-px border-b-2 border-transparent pb-2.5 text-[#74736b] hover:text-[#1b1c19]"}>{label}</button>)}
            </div>
            {tab === "organization" && <LegacySettings section="organization" />}
            {tab === "approvals" && <PolicyEditor />}
            {tab === "sandbox" && <SandboxSettings />}
        </div>
    );
}
