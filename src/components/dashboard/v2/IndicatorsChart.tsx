import { useState } from "react";
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip, CartesianGrid } from 'recharts';
import { cn } from "@/lib/utils";
import { Activity, BarChart2, CandlestickChart } from "lucide-react";

const dailyData = [
    { name: 'Jan', value: 2400 }, { name: 'Feb', value: 1398 }, { name: 'Mar', value: 9800 },
    { name: 'Apr', value: 3908 }, { name: 'May', value: 4800 }, { name: 'Jun', value: 3800 },
    { name: 'Jul', value: 4300 },
];

const monthlyData = [
    { name: 'W1', value: 400 }, { name: 'W2', value: 300 }, { name: 'W3', value: 500 },
    { name: 'W4', value: 450 }, { name: 'W5', value: 600 },
];

const yearlyData = [
    { name: '2020', value: 10000 }, { name: '2021', value: 25000 }, { name: '2022', value: 18000 },
    { name: '2023', value: 35000 }, { name: '2024', value: 47590 },
];

export function IndicatorsChart() {
    const [activeTab, setActiveTab] = useState<'Daily' | 'Monthly' | 'Yearly'>('Daily');

    const data = activeTab === 'Daily' ? dailyData : activeTab === 'Monthly' ? monthlyData : yearlyData;

    return (
        <div className="premium-card p-6 relative overflow-hidden h-full flex flex-col">
            <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                    <p className="dashboard-eyebrow">Performance</p>
                    <h3 className="mt-2 text-xl font-semibold text-[#20211e]">Balance trend</h3>
                    <p className="mt-1 text-xs text-[#77766e]">Up 5.7% from last month</p>
                </div>
                <div className="dashboard-icon h-10 w-10">
                    <Activity className="h-4 w-4" />
                </div>
            </div>

            <div className="flex justify-between items-center mb-4 relative z-10">
                <div className="flex rounded-full border border-[#d9d6cd] bg-[#f5f3ee] p-1">
                    {(['Daily', 'Monthly', 'Yearly'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "rounded-full px-3 py-1 text-xs font-medium transition-all",
                                activeTab === tab ? "bg-[#20211e] text-[#f5f3ee]" : "text-[#77766e] hover:text-[#20211e]"
                            )}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="flex gap-2 text-[#77766e]">
                    <BarChart2 className="h-4 w-4 cursor-pointer hover:text-[#087f5b]" />
                    <CandlestickChart className="h-4 w-4 cursor-pointer hover:text-[#087f5b]" />
                </div>
            </div>

            <div className="flex-1 w-full min-h-0 relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="#dedbd2" />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#77766e', fontSize: 10 }}
                            dy={10}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#fffdf8', border: '1px solid #d9d6cd', borderRadius: '12px', color: '#20211e' }}
                            itemStyle={{ color: '#087f5b' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#10b981"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorValue)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

        </div>
    );
}
