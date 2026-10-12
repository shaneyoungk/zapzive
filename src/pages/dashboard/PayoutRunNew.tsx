import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PageIntro from "@/components/dashboard/PageIntro";
import { Panel } from "@/components/ops";
import { useFunding, usePayoutAction } from "@/hooks/use-payouts";
import { payoutsApi } from "@/lib/payouts-api";
import { money } from "@/lib/payout-format";

const STEPS = ["Run details", "Add payouts", "Validate", "Review & submit"];

export function PrepStepper({ current }: { current: number }) {
    return (
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Preparation steps">
            {STEPS.map((label, index) => (
                <li key={label} aria-current={index === current ? "step" : undefined} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-[13px] ${index === current ? "border-primary bg-white font-semibold text-[#1b1c19] ring-1 ring-primary" : index < current ? "border-[#d6e9df] bg-[#edf6f1] text-[#0b6b4f]" : "border-[#e7e4dc] bg-white text-[#74736b]"}`}>
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${index < current ? "bg-primary text-[#ffffff]" : index === current ? "bg-primary text-[#ffffff]" : "bg-[#f1efe9] text-[#9a998f]"}`}>{index < current ? "✓" : index + 1}</span>
                    {label}
                </li>
            ))}
        </ol>
    );
}

function defaultName() {
    return `${new Date().toLocaleDateString("en-GB", { month: "long" })} contractors`;
}

function nextFriday() {
    const date = new Date();
    date.setDate(date.getDate() + ((5 - date.getDay() + 7) % 7 || 7));
    return date.toISOString().slice(0, 10);
}

export default function PayoutRunNew() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const funding = useFunding();
    const [name, setName] = useState(defaultName());
    const [purpose, setPurpose] = useState("");
    const [date, setDate] = useState(nextFriday());
    const create = usePayoutAction((body: { name: string; purpose?: string; scheduledFor: string | null }) => payoutsApi.createRun(body), { success: (run) => `Draft ${run.reference} created` });

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        const run = await create.mutateAsync({ name: name.trim(), purpose: purpose.trim() || undefined, scheduledFor: date ? new Date(`${date}T09:00:00`).toISOString() : null });
        navigate(`/dashboard/payouts/runs/${run.id}?add=${params.get("mode") === "import" ? "import" : "recipients"}`, { replace: true });
    };

    return (
        <div className="space-y-6">
            <PageIntro back={{ to: "/dashboard/payouts", label: "Payouts" }} title="New payout run" description="A run groups the payouts you approve and send together, such as this month's contractors." />
            <PrepStepper current={0} />
            <form onSubmit={submit} className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
                <Panel title="Run details" id="run-details-title">
                    <div className="grid gap-5 p-5 sm:grid-cols-2">
                        <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="run-name">Run name</Label><Input id="run-name" className="h-11" value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} /></div>
                        <div className="space-y-1.5"><Label htmlFor="run-purpose">Payment period or purpose <span className="font-normal text-[#8a897f]">(optional)</span></Label><Input id="run-purpose" className="h-11" placeholder="e.g. October 2026 contractor invoices" value={purpose} onChange={(event) => setPurpose(event.target.value)} maxLength={200} /></div>
                        <div className="space-y-1.5"><Label htmlFor="run-date">Target processing date</Label><Input id="run-date" className="h-11" type="date" min={new Date().toISOString().slice(0, 10)} max={new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10)} value={date} onChange={(event) => setDate(event.target.value)} /></div>
                    </div>
                    <div className="flex justify-end gap-2 border-t border-[#ece9e1] p-5">
                        <Button type="button" variant="outline" onClick={() => navigate("/dashboard/payouts")}>Cancel</Button>
                        <Button type="submit" disabled={create.isPending || !name.trim()}>{create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Continue to payouts <ArrowRight className="h-4 w-4" /></Button>
                    </div>
                </Panel>
                <Panel title="Funding source" id="funding-source-title">
                    <div className="space-y-2 p-5 text-[13px] leading-6 text-[#55544d]">
                        <p className="font-semibold text-[#1b1c19]">{funding.data?.isSandbox ? "Sandbox balance (USD)" : "Funding account (USD)"}</p>
                        <p>Available: <span className="font-semibold tabular-nums text-[#1b1c19]">{funding.data ? money(funding.data.availableMinor, funding.data.currency) : "…"}</span></p>
                        <p className="text-xs text-[#8a897f]">Recipients are paid in their own currency. The run is funded in USD; each payout is quoted when you validate and re-quoted if the quote expires before sending.</p>
                    </div>
                </Panel>
            </form>
        </div>
    );
}
