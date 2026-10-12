import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Download, Plus } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageIntro from "@/components/dashboard/PageIntro";
import { EmptyState, ErrorNotice, LoadingRows, Panel, StatStrip, StatTile, downloadBlob } from "@/components/ops";
import { usePayoutConfig, useReports } from "@/hooks/use-payouts";
import { payoutsApi } from "@/lib/payouts-api";
import { COUNTRY_NAMES, METHOD_LABELS, MOVEMENT_STATES, duration, money, moneyList, percent } from "@/lib/payout-format";

const PERIODS = [["30", "Last 30 days"], ["90", "Last 90 days"], ["365", "Last 12 months"], ["all", "All time"]] as const;

function FilterSelect({ id, label, value, onChange, options }: { id: string; label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
    return (
        <div className="min-w-[150px] flex-1 space-y-1">
            <label htmlFor={id} className="text-xs font-medium text-[#74736b]">{label}</label>
            <Select value={value} onValueChange={(next) => next && onChange(next)}>
                <SelectTrigger id={id} className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>{options.map(([optionValue, optionLabel]) => <SelectItem key={optionValue} value={optionValue}>{optionLabel}</SelectItem>)}</SelectContent>
            </Select>
        </div>
    );
}

export default function Reports() {
    const config = usePayoutConfig();
    const [period, setPeriod] = useState("90");
    const [country, setCountry] = useState("any");
    const [currency, setCurrency] = useState("any");
    const [method, setMethod] = useState("any");
    const [status, setStatus] = useState("any");
    const params = useMemo(() => ({
        from: period === "all" ? undefined : new Date(Date.now() - Number(period) * 86400000).toISOString(),
        country: country === "any" ? undefined : country,
        currency: currency === "any" ? undefined : currency,
        method: method === "any" ? undefined : method,
        status: status === "any" ? undefined : status,
    }), [period, country, currency, method, status]);
    const report = useReports(params);
    const data = report.data;
    const m = data?.metrics;

    const exportCsv = async () => downloadBlob(await payoutsApi.reportsExport(params), "zapzive-payouts-report.csv");

    return (
        <div className="space-y-6">
            <PageIntro
                title="Reports"
                description="Payout outcomes, failures, approval speed and costs. Figures are computed from your payout records."
                actions={<Button variant="outline" onClick={() => void exportCsv()} disabled={!data?.hasData}><Download className="h-4 w-4" /> Export filtered CSV</Button>}
            />

            <section className="premium-card flex flex-wrap gap-3 p-4" aria-label="Report filters">
                <FilterSelect id="f-period" label="Period" value={period} onChange={setPeriod} options={PERIODS.map(([v, l]) => [v, l])} />
                <FilterSelect id="f-country" label="Country" value={country} onChange={setCountry} options={[["any", "All countries"], ...(config.data?.corridors ?? []).map((item) => [item.country, item.name] as [string, string])]} />
                <FilterSelect id="f-currency" label="Currency" value={currency} onChange={setCurrency} options={[["any", "All currencies"], ...["KES", "UGX", "TZS", "RWF", "NGN", "GHS", "ZAR", "USD", "USDC", "GBP"].map((code) => [code, code] as [string, string])]} />
                <FilterSelect id="f-method" label="Payout method" value={method} onChange={setMethod} options={[["any", "All methods"], ...Object.entries(METHOD_LABELS)]} />
                <FilterSelect id="f-status" label="Status" value={status} onChange={setStatus} options={[["any", "All statuses"], ...["delivered", "failed", "processing", "on_hold", "cancelled"].map((value) => [value, MOVEMENT_STATES[value].label] as [string, string])]} />
            </section>

            {report.isPending ? <div className="premium-card"><LoadingRows /></div> : report.isError || !data || !m ? <div className="premium-card"><ErrorNotice error={report.error} onRetry={() => void report.refetch()} /></div> : !data.hasData ? (
                <div className="premium-card"><EmptyState icon={BarChart3} title="No payout history for these filters" action={<Button asChild><Link to="/dashboard/payouts/new"><Plus className="h-4 w-4" /> Create payout run</Link></Button>}>Create and send a payout run to start building operational reports, or widen the filters.</EmptyState></div>
            ) : (
                <>
                    <StatStrip>
                        <StatTile label="Delivered" value={money(m.deliveredUsdMinor, "USD", { compact: true })} hint={`${m.deliveredCount} payouts · USD equivalent at sandbox rates`} />
                        <StatTile label="Failure rate" value={percent(m.failureRate)} hint={`Failed at least once · ${m.openFailures ?? 0} still open`} tone={m.failureRate && m.failureRate > 0.05 ? "negative" : undefined} />
                        <StatTile label="Average approval time" value={duration(m.averageApprovalMs)} hint={`Resolution time ${duration(m.averageResolutionMs)}`} />
                        <StatTile label="Unreconciled" value={m.unreconciledTotals.length ? moneyList(m.unreconciledTotals.slice(0, 1), { compact: true }) : "None"} hint={m.unreconciledTotals.length > 1 ? `+ ${m.unreconciledTotals.length - 1} more currencies` : `Provider fees ${money(m.providerFeesUsdMinor, "USD")}`} tone={m.unreconciledTotals.length ? "waiting" : undefined} />
                    </StatStrip>

                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                        <Panel title="Delivered per week" subtitle="USD equivalent at sandbox rates" id="weekly-title">
                            {data.deliveredByWeek.length < 2 ? <p className="p-5 text-[13px] text-[#74736b]">Deliveries in {data.deliveredByWeek.length} week so far. A trend appears after two or more weeks of payouts.</p> : (
                                <div className="h-64 p-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data.deliveredByWeek.map((item) => ({ week: new Date(item.week).toLocaleDateString("en-GB", { day: "numeric", month: "short" }), usd: item.usdMinor / 100 }))} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                                            <CartesianGrid vertical={false} stroke="#ece9e1" />
                                            <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={11} />
                                            <YAxis tickLine={false} axisLine={false} fontSize={11} width={56} tickFormatter={(value: number) => `$${value >= 1000 ? `${Math.round(value / 1000)}k` : value}`} />
                                            <Tooltip cursor={{ fill: "#f5f3ee" }} formatter={(value: number) => [`USD ${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, "Delivered"]} />
                                            <Bar dataKey="usd" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} maxBarSize={36} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </Panel>
                        <Panel title="Outcomes" id="outcomes-title">
                            <dl className="divide-y divide-[#ece9e1] text-[13px]">
                                {([["Payout runs submitted", m.runsSubmitted], ["Runs completed", m.runsCompleted], ["Payouts submitted", m.payoutsSubmitted], ["Payouts delivered", m.deliveredCount]] as const).map(([label, value]) => <div key={label} className="flex justify-between px-5 py-3"><dt className="text-[#74736b]">{label}</dt><dd className="font-semibold tabular-nums text-[#1b1c19]">{value}</dd></div>)}
                                <div className="flex justify-between gap-3 px-5 py-3"><dt className="text-[#74736b]">Delivered by currency</dt><dd className="text-right font-semibold tabular-nums text-[#1b1c19]">{moneyList(m.deliveredTotals, { compact: true })}</dd></div>
                            </dl>
                        </Panel>
                    </div>

                    <div className="grid gap-5 lg:grid-cols-2">
                        {([["By payout method", data.byMethod, (key: string) => METHOD_LABELS[key] ?? key], ["By corridor", data.byCorridor, (key: string) => { const [c, cur] = key.split(":"); return `${COUNTRY_NAMES[c] ?? c} · ${cur}`; }]] as const).map(([title, rows, label]) => (
                            <Panel key={title} title={title} id={`${title}-title`}>
                                <div className="overflow-x-auto">
                                    <table className="text-sm">
                                        <thead><tr><th scope="col" className="px-5 text-left">{title === "By payout method" ? "Method" : "Corridor"}</th><th scope="col" className="px-3 text-right">Payouts</th><th scope="col" className="px-3 text-right">Failed</th><th scope="col" className="px-5 text-right">Delivered (USD)</th></tr></thead>
                                        <tbody className="divide-y divide-[#ece9e1]">{rows.map((row) => <tr key={row.key}><td className="px-5 py-2.5 text-[13px] text-[#1b1c19]">{label(row.key)}</td><td className="px-3 py-2.5 text-right tabular-nums">{row.count}</td><td className="px-3 py-2.5 text-right tabular-nums">{row.failedCount ? <span className="text-[#9a2f2f]">{row.failedCount}</span> : 0}</td><td className="px-5 py-2.5 text-right font-semibold tabular-nums text-[#1b1c19]">{money(row.usdMinor, "USD", { compact: true })}</td></tr>)}</tbody>
                                    </table>
                                </div>
                            </Panel>
                        ))}
                    </div>
                    <p className="text-xs text-[#8a897f]">Source: payout records in this workspace, filtered as shown. USD equivalents use sandbox reference rates and are for comparison only. The CSV export contains exactly the filtered payouts.</p>
                </>
            )}
        </div>
    );
}
