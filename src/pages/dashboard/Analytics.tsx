import { useState } from "react";
import {
    BarChart3,
    TrendingUp,
    Download,
    Calendar,
    Filter,
    DollarSign,
    Users,
    Globe,
    ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import MetricCard from "@/components/dashboard/MetricCard";
import InfoTooltip from "@/components/dashboard/InfoTooltip";
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useAnalyticsOverview, useRevenueAnalytics, useTransactionAnalytics } from "@/hooks/use-analytics";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";

// Mocks removed

export default function Analytics() {
    const [timeRange, setTimeRange] = useState("6m");
    const { data: overview, isLoading: overviewLoading } = useAnalyticsOverview();
    const { data: revenueData = [], isLoading: revenueLoading } = useRevenueAnalytics();
    const { data: transactionVolumeData = [], isLoading: transactionLoading } = useTransactionAnalytics({ period: timeRange });

    const exportReport = async () => {
        try {
            const report = await apiClient.exportAnalytics({ format: 'csv', type: 'transactions' });
            const blob = new Blob([typeof report === 'string' ? report : JSON.stringify(report)], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = 'analytics-transactions.csv';
            anchor.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error('Unable to export analytics report');
        }
    };

    return (
        <div className="p-4 lg:p-6 max-w-[1600px] mx-auto space-y-6 animate-fade-in">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div><p className="dashboard-eyebrow">Performance</p><h1 className="mt-2 text-3xl">Operational analytics</h1><p className="mt-2 text-sm text-[#77766e]">Volume, transaction quality, and product activity in one view.</p></div>
                <div className="flex items-center gap-2">
                <Button variant="outline">
                    <Calendar className="h-4 w-4" />
                    Last 6 months
                </Button>
                <Button onClick={exportReport}>
                    <Download className="h-4 w-4" />
                    Export report
                </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard title="Total volume" value={overviewLoading ? "…" : `$${(overview?.totalVolume || 0).toLocaleString()}`} icon={DollarSign} subtitle="Recorded transactions" />
                <MetricCard title="Transactions" value={overviewLoading ? "…" : (overview?.totalTransactions || 0).toLocaleString()} icon={BarChart3} subtitle="All activity" />
                <MetricCard title="Average value" value={overviewLoading ? "…" : `$${(overview?.avgTransactionValue || 0).toFixed(2)}`} icon={TrendingUp} subtitle="Per transaction" />
                <MetricCard title="Active users" value={overviewLoading ? "…" : (overview?.activeUsers || 0).toLocaleString()} icon={Users} subtitle="Verified workers" />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <div className="premium-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-semibold text-foreground text-[15px] mb-1">Revenue vs Expenses</h3>
                            <p className="text-xs text-muted-foreground">Last 6 months</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-xs text-muted-foreground">Revenue</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-red-500" />
                                <span className="text-xs text-muted-foreground">Expenses</span>
                            </div>
                        </div>
                    </div>
                    {revenueLoading ? (
                        <div className="h-[250px] flex items-center justify-center text-muted-foreground">Loading revenue data...</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={revenueData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border dark:text-border/50" />
                                <XAxis dataKey="month" stroke="currentColor" className="text-muted-foreground" style={{ fontSize: 10, fontWeight: 600 }} />
                                <YAxis stroke="currentColor" className="text-muted-foreground" style={{ fontSize: 10, fontWeight: 600 }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "hsl(var(--card))",
                                        border: "1px solid hsl(var(--border))",
                                        borderRadius: "12px",
                                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                                    }}
                                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold" }}
                                />
                                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Transaction Volume */}
                <div className="premium-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-semibold text-foreground text-[15px] mb-1">Transaction Volume</h3>
                            <p className="text-xs text-muted-foreground">Monthly trend</p>
                        </div>
                    </div>
                    {transactionLoading ? (
                        <div className="h-[250px] flex items-center justify-center text-muted-foreground">Loading transaction data...</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={transactionVolumeData}>
                                <defs>
                                    <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#11a879" stopOpacity={0.24} />
                                        <stop offset="95%" stopColor="#11a879" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border dark:text-white/5" />
                                <XAxis dataKey="month" stroke="currentColor" className="text-muted-foreground" style={{ fontSize: 10, fontWeight: 600 }} />
                                <YAxis stroke="currentColor" className="text-muted-foreground" style={{ fontSize: 10, fontWeight: 600 }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "hsl(var(--card))",
                                        border: "1px solid hsl(var(--border))",
                                        borderRadius: "12px",
                                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                                    }}
                                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold" }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="volume"
                                    stroke="#087f5b"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#volumeGradient)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="premium-card p-5">
                    <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-[#11a879]" />
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                    </div>
                    <h4 className="text-sm font-semibold text-foreground mb-1">Payroll Volume</h4>
                    <p className="text-2xl font-semibold text-foreground tabular-nums mb-1">
                        {overviewLoading ? "..." : `$${(overview?.payrollVolume || 0).toLocaleString()}`}
                    </p>
                    <p className="text-xs text-muted-foreground">Across {overview?.payrollCount || 0} batches</p>
                </div>

                <div className="premium-card p-5">
                    <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-[#11a879]" />
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                    </div>
                    <h4 className="text-sm font-semibold text-foreground mb-1">Escrow Locked</h4>
                    <p className="text-2xl font-semibold text-foreground tabular-nums mb-1">
                        {overviewLoading ? "..." : `$${(overview?.escrowLocked || 0).toLocaleString()}`}
                    </p>
                    <p className="text-xs text-muted-foreground">{overview?.activeContracts || 0} active contracts</p>
                </div>

                <div className="premium-card p-5">
                    <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                            <Globe className="w-5 h-5 text-[#11a879]" />
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                    </div>
                    <h4 className="text-sm font-semibold text-foreground mb-1">Remittances</h4>
                    <p className="text-2xl font-semibold text-foreground tabular-nums mb-1">
                        {overviewLoading ? "..." : `$${(overview?.remittanceVolume || 0).toLocaleString()}`}
                    </p>
                    <p className="text-xs text-muted-foreground">{overview?.remittanceCount || 0} transactions</p>
                </div>
            </div>
        </div>
    );
}
