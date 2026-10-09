import { useNavigate } from "react-router-dom";
import {
    Activity, AlertTriangle, ArrowRight, ArrowRightLeft, ArrowUpRight,
    CheckCircle2, Clock3, FileText, Plus, Send, Shield, Users, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import LiquidityBar from "@/components/dashboard/LiquidityBar";
import StatusBadge, { StatusType } from "@/components/dashboard/StatusBadge";

const totalLiquidity = 12_450_200;

const liquidityBreakdown = [
    { label: "Operating account", value: 6_225_100, color: "text-[#087f5b]", bgColor: "bg-[#087f5b]" },
    { label: "Payroll liability", value: 3_112_550, color: "text-[#11a879]", bgColor: "bg-[#11a879]" },
    { label: "Escrow", value: 2_490_040, color: "text-[#76d4b5]", bgColor: "bg-[#76d4b5]" },
    { label: "Reserve", value: 622_510, color: "text-[#aaa9a1]", bgColor: "bg-[#aaa9a1]" },
];

const operations = [
    { id: "PAY-BATCH-2024-001", type: "Payroll", description: "Global engineering · Batch A", amount: 425_000, status: "processing" as StatusType, date: "Today, 10:00", action: "Track", icon: Users, route: "/dashboard/payroll" },
    { id: "CTR-8892-MS-2", type: "Escrow", description: "Development milestone 2", amount: 15_300, status: "pending" as StatusType, date: "Today, 09:45", action: "Approve", icon: Shield, route: "/dashboard/escrow" },
    { id: "RMT-TX-9921", type: "Remittance", description: "Vendor payout · EUR", amount: 12_200.5, status: "completed" as StatusType, date: "Yesterday", action: "Receipt", icon: Send, route: "/dashboard/remittance" },
    { id: "KYC-INC-442", type: "Compliance", description: "Worker verification alert", amount: 0, status: "flagged" as StatusType, date: "Yesterday", action: "Review", icon: AlertTriangle, route: "/dashboard/compliance" },
];

const cashFlow = [
    { label: "Inflow", value: "+$850.0k", note: "Funds received", icon: ArrowUpRight },
    { label: "Outflow", value: "$482.0k", note: "Funds settled", icon: ArrowRight },
    { label: "Net change", value: "+$368.0k", note: "Last 7 days", icon: Activity },
];

export default function Overview() {
    const navigate = useNavigate();

    return (
        <div className="space-y-6">
            <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                <div>
                    <p className="dashboard-eyebrow">Financial position</p>
                    <h1 className="mt-2 text-3xl sm:text-[38px]">Money in motion, clearly accounted for.</h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-[#77766e]">A concise view of available liquidity, live operations, approvals, and risk checks across your workspace.</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <Button variant="outline" onClick={() => navigate("/dashboard/analytics")}><FileText className="h-4 w-4" /> Reports</Button>
                    <Button onClick={() => navigate("/dashboard/treasury/transfer?type=deposit")}><Plus className="h-4 w-4" /> New transfer</Button>
                </div>
            </section>

            <section className="premium-card overflow-hidden" aria-labelledby="liquidity-title">
                <div className="grid gap-8 p-6 lg:grid-cols-[1fr_1.05fr] lg:p-8">
                    <div className="flex flex-col justify-between">
                        <div>
                            <div className="flex flex-wrap items-center gap-3">
                                <p id="liquidity-title" className="metric-label">Available liquidity</p>
                                <span className="inline-flex items-center gap-1 rounded-full border border-[#b9d9cc] bg-[#e8eee4] px-2.5 py-1 font-mono text-[9px] text-[#087f5b]"><ArrowUpRight className="h-3 w-3" /> 2.4% today</span>
                            </div>
                            <p className="mt-5 text-4xl font-semibold tracking-[-.065em] text-[#20211e] tabular-nums sm:text-5xl">${totalLiquidity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                            <p className="mt-3 text-sm text-[#77766e]">Across operating, payroll, escrow, and reserve accounts.</p>
                        </div>
                        <div className="mt-8 flex items-center gap-2">
                            <Button onClick={() => navigate("/dashboard/treasury")}><ArrowRightLeft className="h-4 w-4" /> Convert</Button>
                            <Button variant="outline" onClick={() => navigate("/dashboard/treasury/transfer?type=deposit")}><Wallet className="h-4 w-4" /> Deposit</Button>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-[#e1dfd7] bg-[#f5f3ee] p-5 sm:p-6">
                        <div className="mb-5 flex items-center justify-between"><p className="text-sm font-semibold text-[#20211e]">Capital allocation</p><p className="font-mono text-[9px] uppercase tracking-[.1em] text-[#77766e]">Live balance</p></div>
                        <LiquidityBar segments={liquidityBreakdown} total={totalLiquidity} />
                    </div>
                </div>
            </section>

            <section className="dashboard-stat-grid grid gap-4 sm:grid-cols-3" aria-label="Cash flow summary">
                {cashFlow.map(({ label, value, note, icon: Icon }) => (
                    <button key={label} onClick={() => navigate("/dashboard/analytics")} className="premium-card dashboard-stat group flex items-start justify-between p-5 text-left transition-colors hover:border-[#b9d9cc] sm:p-6">
                        <div><p className="metric-label">{label}</p><p className="mt-4 text-[28px] font-semibold leading-none tracking-[-.055em] tabular-nums text-[#20211e]">{value}</p><p className="mt-3 text-xs text-[#77766e]">{note}</p></div>
                        <span className="dashboard-icon h-10 w-10"><Icon className="h-[17px] w-[17px]" /></span>
                    </button>
                ))}
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="premium-card min-w-0 overflow-hidden">
                    <div className="card-header flex items-center justify-between gap-4"><div><p className="dashboard-eyebrow">Operations</p><h2 className="mt-1 text-lg">Recent activity</h2></div><span className="status-chip">4 live records</span></div>
                    <div className="overflow-x-auto">
                        <table className="min-w-[720px] text-left text-sm">
                            <thead><tr><th className="px-5 text-left">Operation</th><th className="px-5 text-left">Status</th><th className="px-5 text-left">Updated</th><th className="px-5 text-right">Amount</th><th className="w-24 px-5 text-right">Action</th></tr></thead>
                            <tbody className="divide-y divide-[#e1dfd7]">
                                {operations.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <tr key={item.id} onClick={() => navigate(item.route)} className="cursor-pointer">
                                            <td className="px-5 py-4"><div className="flex items-center gap-3"><span className="dashboard-icon h-9 w-9"><Icon className="h-4 w-4" /></span><div><p className="font-semibold text-[#20211e]">{item.description}</p><p className="mt-0.5 font-mono text-[9px] text-[#77766e]">{item.id}</p></div></div></td>
                                            <td className="px-5 py-4"><StatusBadge status={item.status} showPulse /></td>
                                            <td className="px-5 py-4 text-xs text-[#77766e]">{item.date}</td>
                                            <td className="px-5 py-4 text-right font-mono text-xs font-medium text-[#20211e]">{item.amount ? `$${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—"}</td>
                                            <td className="px-5 py-4 text-right"><span className="inline-flex items-center gap-1 text-xs font-semibold text-[#087f5b]">{item.action}<ArrowRight className="h-3 w-3" /></span></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="premium-card p-5 sm:p-6">
                        <div className="flex items-center justify-between"><div><p className="dashboard-eyebrow">Approvals</p><h2 className="mt-1 text-lg">Needs your signature</h2></div><span className="dashboard-icon h-10 w-10"><Clock3 className="h-4 w-4" /></span></div>
                        <div className="mt-5 rounded-xl border border-[#e1dfd7] bg-[#f5f3ee] p-4"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-[#20211e]">Payroll batch</p><span className="font-mono text-[9px] text-[#77766e]">BAT-002</span></div><p className="mt-2 text-xs leading-5 text-[#77766e]">Requested by Sarah M. · $150,000</p><Button className="mt-4 w-full" size="sm" onClick={() => navigate("/dashboard/payroll")}>Review and sign <ArrowRight className="h-3.5 w-3.5" /></Button></div>
                    </div>
                    <button onClick={() => navigate("/dashboard/compliance")} className="premium-card flex w-full items-center gap-4 p-5 text-left transition-colors hover:border-[#b9d9cc] sm:p-6">
                        <span className="dashboard-icon h-10 w-10"><CheckCircle2 className="h-4 w-4" /></span>
                        <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[#20211e]">Compliance queue</span><span className="mt-1 block text-xs text-[#77766e]">2 checks need review</span></span><ArrowRight className="h-4 w-4 text-[#087f5b]" />
                    </button>
                </div>
            </section>
        </div>
    );
}
