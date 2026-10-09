import React, { useState } from "react";
import {
    Send,
    Plus,
    Search,
    Filter,
    Clock,
    CheckCircle2,
    AlertCircle,
    Wallet,
    Building2,
    Smartphone,
    MapPin,
    TrendingUp,
    ArrowRight,
    DollarSign,
    Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import MetricCard from "@/components/dashboard/MetricCard";
import InfoTooltip from "@/components/dashboard/InfoTooltip";
import StatusBadge from "@/components/dashboard/StatusBadge";
import DetailPanel from "@/components/dashboard/DetailPanel";
import { motion } from "framer-motion";
import { useRemittances } from "@/hooks/use-remittance";
import { SendMoneyWizard } from "@/components/dashboard/modals/SendMoneyWizard";

interface Remittance {
    id: string;
    sender: string;
    recipient: string | { name: string };
    recipientCountry: string;
    amount: number;
    currency: string;
    localAmount: number;
    localCurrency: string;
    fxRate: number;
    fee: number;
    deliveryMethod: "wallet" | "bank" | "mobile-money" | "cash-agent";
    status: "pending" | "processing" | "completed" | "failed";
    createdDate: string;
    completedDate?: string;
    txHash?: string;
    chain?: string;
    agentLocation?: string;
    pickupCode?: string;
}

// Mocks removed

const deliveryMethodIcons = {
    wallet: Wallet,
    bank: Building2,
    "mobile-money": Smartphone,
    "cash-agent": MapPin,
};

const deliveryMethodLabels = {
    wallet: "Crypto Wallet",
    bank: "Bank Transfer",
    "mobile-money": "Mobile Money",
    "cash-agent": "Cash Pickup",
};

export default function Remittance() {
    const [selectedRemittance, setSelectedRemittance] = useState<Remittance | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    // Modal state
    const [isSendMoneyOpen, setIsSendMoneyOpen] = useState(false);

    const { data: allRemittances = [], isLoading } = useRemittances();

    const filteredRemittances = allRemittances.filter((rem: Remittance) => {
        const recipientName = typeof rem.recipient === 'object' ? rem.recipient.name : rem.recipient;
        const matchesSearch =
            rem.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            rem.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
            recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            rem.recipientCountry.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === "all" || rem.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const totalSent = allRemittances.reduce((sum: number, r: Remittance) => sum + r.amount, 0);
    const totalFees = allRemittances.reduce((sum: number, r: Remittance) => sum + r.fee, 0);
    const completedCount = allRemittances.filter((r: Remittance) => r.status === "completed").length;
    const pendingCount = allRemittances.filter(
        (r: Remittance) => r.status === "pending" || r.status === "processing"
    ).length;

    const getRecipientName = (rem: Remittance) => typeof rem.recipient === 'object' ? rem.recipient.name : rem.recipient;

    return (
        <div className="p-4 lg:p-6 max-w-[1600px] mx-auto space-y-6 animate-fade-in">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div><p className="dashboard-eyebrow">Cross-border payouts</p><h1 className="mt-2 text-3xl">Remittance</h1><p className="mt-2 text-sm text-[#77766e]">Track recipient delivery, local currency value, and fees.</p></div>
                <Button
                    onClick={() => setIsSendMoneyOpen(true)}
                >
                    <Plus className="h-4 w-4" />
                    Send money
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard title="Total sent" value={`$${(totalSent || 0).toLocaleString()}`} icon={Send} subtitle={`${allRemittances.length} transactions`} />
                <MetricCard title="In progress" value={pendingCount} icon={Clock} subtitle="Awaiting delivery" />
                <MetricCard title="Completed" value={completedCount} icon={CheckCircle2} subtitle="This month" />
                <MetricCard title="Total fees" value={`$${totalFees.toFixed(2)}`} icon={DollarSign} subtitle={totalSent ? `${((totalFees / totalSent) * 100).toFixed(2)}% average` : "No fees recorded"} />
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search by ID, sender, recipient, or country..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-10 pl-10 pr-4 bg-[#111] border border-[#222] rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-700 transition-all"
                    />
                </div>

                <div className="flex items-center gap-2">
                    {[
                        { label: "All", value: "all" },
                        { label: "Pending", value: "pending" },
                        { label: "Processing", value: "processing" },
                        { label: "Completed", value: "completed" },
                    ].map((filter) => (
                        <button
                            key={filter.value}
                            onClick={() => setStatusFilter(filter.value)}
                            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${statusFilter === filter.value
                                ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                                : "bg-white/[0.04] text-zinc-500 hover:text-zinc-300 border border-transparent hover:border-white/[0.08]"
                                }`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Remittances List */}
            <div className="premium-card overflow-hidden">
                <div className="card-header">
                    <h3 className="font-semibold text-foreground text-[15px]">Recent Transactions</h3>
                </div>

                {isLoading ? (
                    <div className="p-8 text-center text-muted-foreground">Loading transactions...</div>
                ) : (
                    <div className="divide-y divide-white/[0.06]">
                        {filteredRemittances.map((remittance) => {
                            const DeliveryIcon = deliveryMethodIcons[remittance.deliveryMethod];

                            return (
                                <motion.div
                                    key={remittance.id}
                                    whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.02)" }}
                                    onClick={() => setSelectedRemittance(remittance)}
                                    className="p-5 cursor-pointer transition-colors"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-start gap-4 flex-1">
                                            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                                <DeliveryIcon className="w-5 h-5 text-amber-500" />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-semibold text-foreground text-sm">
                                                        {remittance.sender} → {getRecipientName(remittance)}
                                                    </h4>
                                                    <StatusBadge status={remittance.status} />
                                                </div>
                                                <p className="text-xs text-muted-foreground mb-2">
                                                    {remittance.id} • {remittance.createdDate}
                                                </p>
                                                <div className="flex items-center gap-4 text-xs">
                                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                                        <MapPin className="w-3.5 h-3.5" />
                                                        <span>{remittance.recipientCountry}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                                        <DeliveryIcon className="w-3.5 h-3.5" />
                                                        <span>{deliveryMethodLabels[remittance.deliveryMethod]}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <p className="text-lg font-semibold text-foreground tabular-nums mb-0.5">
                                                ${(remittance.amount || 0).toLocaleString()}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                ${(remittance.localAmount || 0).toLocaleString()} {remittance.localCurrency}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">Fee: ${remittance.fee}</p>
                                        </div>
                                    </div>

                                    {/* Progress indicator for processing */}
                                    {remittance.status === "processing" && (
                                        <div className="mt-3 pt-3 border-t border-white/[0.06]">
                                            <div className="flex items-center justify-between text-xs mb-2">
                                                <span className="text-zinc-500">Processing</span>
                                                <span className="text-white">75%</span>
                                            </div>
                                            <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full w-3/4 animate-pulse" />
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {filteredRemittances.length === 0 && (
                <div className="premium-card p-12 text-center">
                    <Send className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-500">No remittances found</p>
                </div>
            )}

            {/* Remittance Detail Panel */}
            <DetailPanel
                isOpen={!!selectedRemittance}
                onClose={() => setSelectedRemittance(null)}
                title="Remittance Details"
                width="lg"
            >
                {selectedRemittance && (
                    <div className="space-y-6">
                        {/* Status Header */}
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
                                {selectedRemittance.status === "completed" ? (
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                ) : selectedRemittance.status === "failed" ? (
                                    <AlertCircle className="w-8 h-8 text-red-500" />
                                ) : (
                                    <Clock className="w-8 h-8 text-amber-500 animate-pulse" />
                                )}
                            </div>
                            <StatusBadge status={selectedRemittance.status} />
                            <p className="text-sm text-zinc-500 mt-2">{selectedRemittance.id}</p>
                        </div>

                        {/* Amount Summary */}
                        <div className="premium-card p-5 text-center">
                            <p className="text-xs text-zinc-600 mb-2">Sending</p>
                            <h3 className="text-3xl font-semibold text-white tabular-nums mb-1">
                                ${(selectedRemittance.amount || 0).toLocaleString()}
                            </h3>
                            <div className="flex items-center justify-center gap-2 text-sm text-zinc-400 mb-3">
                                <span>{selectedRemittance.currency}</span>
                                <ArrowRight className="w-4 h-4" />
                                <span>
                                    ${(selectedRemittance.localAmount || 0).toLocaleString()}{" "}
                                    {selectedRemittance.localCurrency}
                                </span>
                            </div>
                            <div className="flex items-center justify-center gap-2 text-xs text-zinc-600">
                                <Globe className="w-3.5 h-3.5" />
                                <span>
                                    Rate: 1 {selectedRemittance.currency} = {selectedRemittance.fxRate}{" "}
                                    {selectedRemittance.localCurrency}
                                </span>
                            </div>
                        </div>

                        {/* Parties */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="premium-card p-4">
                                <p className="text-xs text-zinc-600 mb-3">Sender</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                                        {selectedRemittance.sender.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">
                                            {selectedRemittance.sender}
                                        </p>
                                        <p className="text-xs text-zinc-500">Sender</p>
                                    </div>
                                </div>
                            </div>

                            <div className="premium-card p-4">
                                <p className="text-xs text-zinc-600 mb-3">Recipient</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                                        {(typeof selectedRemittance.recipient === 'object' ? selectedRemittance.recipient.name : selectedRemittance.recipient).charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">
                                            {typeof selectedRemittance.recipient === 'object' ? selectedRemittance.recipient.name : selectedRemittance.recipient}
                                        </p>
                                        <p className="text-xs text-zinc-500">{selectedRemittance.recipientCountry}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Delivery Method */}
                        <div className="premium-card p-4">
                            <h4 className="text-sm font-semibold text-white mb-3">Delivery Method</h4>
                            <div className="flex items-center gap-3">
                                {React.createElement(deliveryMethodIcons[selectedRemittance.deliveryMethod], {
                                    className: "w-5 h-5 text-amber-500",
                                })}
                                <div>
                                    <p className="text-sm font-medium text-white">
                                        {deliveryMethodLabels[selectedRemittance.deliveryMethod]}
                                    </p>
                                    {selectedRemittance.agentLocation && (
                                        <p className="text-xs text-zinc-500">{selectedRemittance.agentLocation}</p>
                                    )}
                                    {selectedRemittance.pickupCode && (
                                        <p className="text-xs text-emerald-500 font-mono mt-1">
                                            Pickup Code: {selectedRemittance.pickupCode}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Fee Breakdown */}
                        <div className="premium-card p-4">
                            <h4 className="text-sm font-semibold text-white mb-3">Fee Breakdown</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-zinc-500">Transfer Amount</span>
                                    <span className="text-white font-medium tabular-nums">
                                        ${(selectedRemittance.amount || 0).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-zinc-500">Service Fee</span>
                                    <span className="text-white font-medium tabular-nums">
                                        ${selectedRemittance.fee.toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                                    <span className="text-white font-semibold">Total</span>
                                    <span className="text-white font-semibold tabular-nums">
                                        ${(selectedRemittance.amount + selectedRemittance.fee).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Timeline */}
                        <div className="premium-card p-4">
                            <h4 className="text-sm font-semibold text-white mb-4">Transaction Timeline</h4>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-white">Initiated</p>
                                        <p className="text-xs text-zinc-500">{selectedRemittance.createdDate}</p>
                                    </div>
                                </div>

                                {selectedRemittance.txHash && (
                                    <div className="flex items-start gap-3">
                                        <div
                                            className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${selectedRemittance.status === "completed"
                                                ? "bg-emerald-500/20"
                                                : "bg-blue-500/20"
                                                }`}
                                        >
                                            {selectedRemittance.status === "completed" ? (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                            ) : (
                                                <Clock className="w-4 h-4 text-blue-500 animate-pulse" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-white">On-chain Confirmation</p>
                                            <p className="text-xs text-zinc-500 font-mono break-all">
                                                {selectedRemittance.txHash}
                                            </p>
                                            {selectedRemittance.chain && (
                                                <p className="text-xs text-zinc-600 mt-1">
                                                    Network: {selectedRemittance.chain}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {selectedRemittance.completedDate && (
                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-white">Delivered</p>
                                            <p className="text-xs text-zinc-500">{selectedRemittance.completedDate}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            {selectedRemittance.txHash && (
                                <Button onClick={() => window.open(`https://etherscan.io/tx/${selectedRemittance.txHash}`, '_blank', 'noopener,noreferrer')} className="btn-secondary flex-1 h-10 rounded-lg">
                                    View on Explorer
                                </Button>
                            )}
                            <Button onClick={() => {
                                const receipt = JSON.stringify(selectedRemittance, null, 2);
                                const url = URL.createObjectURL(new Blob([receipt], { type: 'application/json' }));
                                const anchor = document.createElement('a');
                                anchor.href = url;
                                anchor.download = `remittance-${selectedRemittance.id}.json`;
                                anchor.click();
                                URL.revokeObjectURL(url);
                            }} className="btn-secondary flex-1 h-10 rounded-lg">
                                Download Receipt
                            </Button>
                        </div>
                    </div>
                )}
            </DetailPanel>
            {/* Modals */}
            <SendMoneyWizard
                isOpen={isSendMoneyOpen}
                onClose={() => setIsSendMoneyOpen(false)}
            />
        </div>
    );
}
