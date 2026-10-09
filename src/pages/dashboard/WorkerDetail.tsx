import { useParams, useNavigate } from "react-router-dom";
import { useWorkers } from "@/hooks/use-payroll";
import { useTransactions } from "@/hooks/use-dashboard";
import { Button } from "@/components/ui/button";
import {
    ChevronLeft,
    Mail,
    Phone,
    Globe,
    Wallet,
    Building2,
    ShieldCheck,
    Clock,
    ArrowUpRight,
    Briefcase,
    History,
    CheckCircle2
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function WorkerDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: workers = [] } = useWorkers();
    const { data: transactions = [] } = useTransactions();

    const worker = workers.find((w: any) => w.id === id);
    const workerTransactions = transactions.filter((tx: any) => tx.description.includes(worker?.name || ""));

    if (!worker) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <p className="text-zinc-500">Worker not found</p>
                <Button onClick={() => navigate("/dashboard/payroll")}>Back to Payroll</Button>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate("/dashboard/payroll")}
                        className="text-zinc-500 hover:text-white"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Worker Profile</h1>
                        <p className="text-zinc-500 text-sm">Detailed information and history for {worker.name}</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="border-zinc-800">Edit Details</Button>
                    <Button onClick={() => navigate(`/dashboard/payroll?worker=${worker.id}`)} className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold">Pay Worker</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="premium-card p-8 flex flex-col items-center text-center">
                        <div className="relative mb-4">
                            <div
                                aria-hidden="true"
                                className="flex h-24 w-24 items-center justify-center rounded-3xl border border-[#cdd8c8] bg-[#e8eee4] text-2xl font-semibold tracking-wide text-[#087f5b]"
                            >
                                {worker.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}
                            </div>
                            <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#fffdf8] bg-[#12b886]">
                                <ShieldCheck className="h-3.5 w-3.5 text-white" />
                            </div>
                        </div>
                        <h2 className="text-xl font-bold text-white">{worker.name}</h2>
                        <p className="text-zinc-500 text-sm mb-4">{worker.role}</p>
                        <Badge className={cn(
                            "px-3 py-1 text-[10px] uppercase tracking-widest",
                            worker.kycStatus === 'verified' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-zinc-800 text-zinc-400 border-zinc-700"
                        )}>
                            KYC {worker.kycStatus}
                        </Badge>

                        <div className="w-full mt-8 pt-8 border-t border-zinc-800 space-y-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-zinc-500 flex items-center gap-2 italic"><Mail className="w-3.5 h-3.5" /> Email</span>
                                <span className="text-white font-medium">{worker.email}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-zinc-500 flex items-center gap-2 italic"><Phone className="w-3.5 h-3.5" /> Phone</span>
                                <span className="text-white font-medium">{worker.phone}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-zinc-500 flex items-center gap-2 italic"><Globe className="w-3.5 h-3.5" /> Country</span>
                                <span className="text-white font-medium">{worker.country}</span>
                            </div>
                        </div>
                    </div>

                    <div className="premium-card p-6 space-y-4">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2 italic">
                            <Wallet className="w-4 h-4 text-emerald-500" /> Payment Methods
                        </h3>
                        <div className="space-y-3">
                            {worker.wallet && (
                                <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800">
                                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Web3 Wallet</p>
                                    <p className="text-xs text-zinc-300 font-mono break-all">{worker.wallet}</p>
                                </div>
                            )}
                            {worker.bankAccount && (
                                <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800">
                                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1 italic">
                                        <Building2 className="w-3 h-3" /> Bank Account
                                    </p>
                                    <p className="text-xs text-zinc-300">{worker.bankAccount}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="premium-card p-6">
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 italic">Total Paid</p>
                            <p className="text-2xl font-bold text-white">$12,450.00</p>
                        </div>
                        <div className="premium-card p-6">
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 italic">Last Payment</p>
                            <p className="text-2xl font-bold text-white">$3,200.00</p>
                        </div>
                        <div className="premium-card p-6 text-emerald-500">
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 italic">Success Rate</p>
                            <p className="text-2xl font-bold">100%</p>
                        </div>
                    </div>

                    {/* Delivery Log */}
                    <div className="premium-card overflow-hidden">
                        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                            <h3 className="font-bold text-white flex items-center gap-2 italic">
                                <Briefcase className="w-4 h-4 text-emerald-500" /> Work Delivered
                            </h3>
                            <Button variant="ghost" size="sm" className="text-emerald-500 hover:text-emerald-400 h-8 text-xs italic">
                                View Artifacts
                            </Button>
                        </div>
                        <div className="p-6 space-y-4">
                            {[1, 2].map((i) => (
                                <div key={i} className="flex gap-4 p-4 bg-zinc-900/30 rounded-2xl border border-zinc-800">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                        <CheckCircle2 className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h4 className="text-sm font-bold text-white italic">Milestone: Frontend Implementation</h4>
                                                <p className="text-xs text-zinc-400 mt-1">Successfully delivered {i === 1 ? 'Dashboard core modules' : 'Authentication flow'}</p>
                                            </div>
                                            <span className="text-[10px] text-zinc-500 font-mono">OCT {20 + i}, 2023</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Transaction History */}
                    <div className="premium-card overflow-hidden">
                        <div className="p-6 border-b border-zinc-800">
                            <h3 className="font-bold text-white flex items-center gap-2 italic">
                                <History className="w-4 h-4 text-emerald-500" /> Payment History
                            </h3>
                        </div>
                        <div className="overflow-x-auto no-scrollbar">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-zinc-800">
                                        <th className="text-left py-4 px-6 text-[10px] font-bold text-zinc-500 uppercase tracking-widest italic">Tx Date</th>
                                        <th className="text-left py-4 px-6 text-[10px] font-bold text-zinc-500 uppercase tracking-widest italic">Description</th>
                                        <th className="text-right py-4 px-6 text-[10px] font-bold text-zinc-500 uppercase tracking-widest italic">Amount</th>
                                        <th className="text-right py-4 px-6 text-[10px] font-bold text-zinc-500 uppercase tracking-widest italic">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/50">
                                    {workerTransactions.length > 0 ? (
                                        workerTransactions.map((tx: any) => (
                                            <tr key={tx.id} className="group hover:bg-white/[0.02] transition-colors">
                                                <td className="py-4 px-6">
                                                    <span className="text-xs text-zinc-400">{new Date(tx.timestamp).toLocaleDateString()}</span>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-white font-medium">{tx.description}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6 text-right">
                                                    <span className="text-xs font-mono text-white font-bold">${tx.amount.toLocaleString()}</span>
                                                </td>
                                                <td className="py-4 px-6 text-right">
                                                    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">
                                                        {tx.status}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="py-12 text-center text-zinc-500 text-sm italic">
                                                <Clock className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                                No transactions found for this worker
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
