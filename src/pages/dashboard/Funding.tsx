import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PageIntro from "@/components/dashboard/PageIntro";
import { ErrorNotice, LoadingRows, Panel, StatStrip, StatTile } from "@/components/ops";
import { useAuth } from "@/contexts/AuthContext";
import { useFunding, usePayoutAction } from "@/hooks/use-payouts";
import { payoutsApi } from "@/lib/payouts-api";
import { money } from "@/lib/payout-format";
import { formatDate } from "@/lib/format";

export default function Funding() {
    const { user } = useAuth();
    const funding = useFunding();
    const [amount, setAmount] = useState("10000");
    const add = usePayoutAction((value: string) => payoutsApi.addSandboxFunds(value), { success: "Sandbox funds added" });
    const data = funding.data;
    const canAdd = ["owner", "admin", "treasury"].includes(user?.role ?? "");

    return (
        <div className="space-y-6">
            <PageIntro title="Funding" description="The balance your payout runs draw from. Runs reserve funding when sent and release it if a payout fails." />
            {funding.isPending ? <div className="premium-card"><LoadingRows /></div> : funding.isError || !data ? <div className="premium-card"><ErrorNotice error={funding.error} onRetry={() => void funding.refetch()} /></div> : (
                <>
                    <StatStrip>
                        <StatTile label={data.isSandbox ? "Sandbox balance available" : "Available"} value={money(data.availableMinor, data.currency)} />
                        <StatTile label="Reserved" value={money(data.reservedMinor, data.currency)} hint="Payouts with the provider" />
                        <StatTile label="Required for upcoming runs" value={money(data.requiredForUpcomingMinor, data.currency)} hint={`${data.upcomingRuns.length} run${data.upcomingRuns.length === 1 ? "" : "s"} not yet sent`} />
                        <StatTile label="Shortfall" value={data.shortfallMinor ? money(data.shortfallMinor, data.currency) : "None"} tone={data.shortfallMinor ? "negative" : undefined} />
                    </StatStrip>
                    {data.shortfallMinor > 0 && <p role="alert" className="rounded-xl border border-[#efc9c4] bg-[#fbecea] p-4 text-[13px] text-[#9a2f2f]">You need {money(data.shortfallMinor, data.currency)} more before every upcoming run can be sent.</p>}
                    <div className="grid gap-5 lg:grid-cols-2">
                        <Panel title="Upcoming runs" id="upcoming-title">
                            {data.upcomingRuns.length === 0 ? <p className="p-5 text-[13px] text-[#74736b]">No runs are waiting to be sent.</p> : (
                                <ul className="divide-y divide-[#ece9e1]">{data.upcomingRuns.map((run) => <li key={run.id} className="flex justify-between gap-3 px-5 py-3 text-[13px]"><Link to={`/dashboard/payouts/runs/${run.id}`} className="font-semibold text-[#1b1c19] hover:text-primary">{run.name} <span className="font-mono text-xs font-normal text-[#8a897f]">{run.reference}</span></Link><span className="text-[#74736b]">{run.scheduledFor ? formatDate(run.scheduledFor) : "No date"}</span></li>)}</ul>
                            )}
                        </Panel>
                        {data.isSandbox ? (
                            <Panel title="Add sandbox funds" id="add-funds-title">
                                <form className="space-y-3 p-5" onSubmit={(event) => { event.preventDefault(); add.mutate(amount); }}>
                                    <p className="text-[13px] leading-6 text-[#55544d]">Sandbox funds are test balances for trying payout runs. They are not money and cannot be withdrawn.</p>
                                    <div className="space-y-1.5"><Label htmlFor="fund-amount">Amount (USD)</Label><Input id="fund-amount" className="h-11 tabular-nums" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></div>
                                    <Button type="submit" disabled={!canAdd || add.isPending || !amount}>{add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add sandbox funds</Button>
                                    {!canAdd && <p className="text-xs text-[#8a897f]">Only owners, admins and treasury members can add funds.</p>}
                                </form>
                            </Panel>
                        ) : (
                            <Panel title="Live funding" id="live-funding-title"><p className="p-5 text-[13px] leading-6 text-[#55544d]">Live funding is held by your connected execution provider. Zapzive does not hold customer funds.</p></Panel>
                        )}
                    </div>
                    <p className="text-xs text-[#8a897f]">Chain-level balances for the settlement lab are in <Link to="/dashboard/treasury" className="font-semibold text-primary hover:underline">Labs → Treasury</Link>.</p>
                </>
            )}
        </div>
    );
}
