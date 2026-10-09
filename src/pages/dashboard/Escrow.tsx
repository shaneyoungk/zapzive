import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    ShieldCheck,
    Plus,
    Search,
    Filter,
    Clock,
    DollarSign,
    Users,
    AlertTriangle,
    CheckCircle2,
    Lock,
    Unlock,
    FileText,
    Calendar,
    TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import MetricCard from "@/components/dashboard/MetricCard";
import InfoTooltip from "@/components/dashboard/InfoTooltip";
import StatusBadge from "@/components/dashboard/StatusBadge";
import DetailPanel from "@/components/dashboard/DetailPanel";
import { motion } from "framer-motion";
import { useContracts, useReleaseFunds } from "@/hooks/use-escrow";
import { NewContractWizard } from "@/components/dashboard/modals/NewContractWizard";

interface Milestone {
    id: string;
    title: string;
    description: string;
    amount: number;
    status: "pending" | "in-progress" | "completed" | "disputed";
    dueDate: string;
    completedDate?: string;
}

interface Contract {
    id: string;
    title: string;
    client: string;
    contractor: string;
    totalAmount: number;
    lockedAmount: number;
    releasedAmount: number;
    status: "draft" | "active" | "completed" | "disputed" | "cancelled";
    startDate: string;
    endDate: string;
    milestones: Milestone[];
    chain: string;
    contractAddress?: string;
    _count?: { bids: number };
}

// Mocks removed

export default function Escrow() {
    const navigate = useNavigate();
    const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    // Modal state
    const [isNewContractOpen, setIsNewContractOpen] = useState(false);

    const { data: allContracts = [], isLoading } = useContracts();
    const releaseFunds = useReleaseFunds();

    const filteredContracts = allContracts.filter((contract: Contract) => {
        const matchesSearch =
            contract.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            contract.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
            contract.contractor.toLowerCase().includes(searchQuery.toLowerCase()) ||
            contract.id.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === "all" || contract.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const totalLocked = allContracts.reduce((sum: number, c: Contract) => sum + c.lockedAmount, 0);
    const totalReleased = allContracts.reduce((sum: number, c: Contract) => sum + c.releasedAmount, 0);
    const activeContracts = allContracts.filter((c: Contract) => c.status === "active").length;
    const disputedContracts = allContracts.filter((c: Contract) => c.status === "disputed").length;

    return (
        <div className="p-4 lg:p-6 max-w-[1600px] mx-auto space-y-6 animate-fade-in">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div><p className="dashboard-eyebrow">Protected settlement</p><h1 className="mt-2 text-3xl">Escrow contracts</h1><p className="mt-2 text-sm text-[#77766e]">Milestones, evidence, approvals, and controlled releases.</p></div>
                <Button
                    onClick={() => setIsNewContractOpen(true)}
                >
                    <Plus className="h-4 w-4" />
                    New contract
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard title="Active contracts" value={activeContracts} icon={ShieldCheck} subtitle={`${allContracts.length} total`} />
                <MetricCard title="Locked funds" value={`$${(totalLocked || 0).toLocaleString()}`} icon={Lock} subtitle={`Across ${activeContracts} contracts`} />
                <MetricCard title="Released" value={`$${(totalReleased || 0).toLocaleString()}`} icon={Unlock} subtitle="This month" />
                <MetricCard title="Disputes" value={disputedContracts} icon={AlertTriangle} subtitle={disputedContracts ? "Needs attention" : "No open disputes"} />
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search contracts by title, client, contractor, or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-10 pl-10 pr-4 bg-[#111] border border-[#222] rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-700 transition-all"
                    />
                </div>

                <div className="flex items-center gap-2">
                    {[
                        { label: "All", value: "all" },
                        { label: "Active", value: "active" },
                        { label: "Disputed", value: "disputed" },
                        { label: "Completed", value: "completed" },
                    ].map((filter) => (
                        <button
                            key={filter.label}
                            onClick={() => setStatusFilter(filter.value)}
                            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200 border ${statusFilter === filter.value
                                ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                                : "bg-card text-muted-foreground hover:text-foreground border-border shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700"
                                }`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Contracts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {isLoading ? (
                    <div className="col-span-1 lg:col-span-2 p-12 text-center text-muted-foreground">
                        Loading contracts...
                    </div>
                ) : (
                    filteredContracts.map((contract) => (
                        <motion.div
                            key={contract.id}
                            whileHover={{ y: -2 }}
                            onClick={() => navigate(`/dashboard/escrow/${contract.id}`)}
                            className="premium-card p-5 cursor-pointer hover:border-primary/20 transition-all duration-200"
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-semibold text-foreground text-sm truncate">
                                            {contract.title}
                                        </h4>
                                        <StatusBadge status={contract.status} />
                                        {(contract._count?.bids || 0) > 0 && (
                                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-xs font-semibold border border-amber-500/20">
                                                {contract._count?.bids} {contract._count?.bids === 1 ? 'bid' : 'bids'}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">Contract {contract.id}</p>
                                </div>
                            </div>

                            {/* Parties */}
                            <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                                <div>
                                    <p className="text-muted-foreground mb-1">Client</p>
                                    <p className="text-foreground font-medium truncate">{contract.client}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground mb-1">Contractor</p>
                                    <p className="text-foreground font-medium truncate">{contract.contractor}</p>
                                </div>
                            </div>

                            {/* Progress */}
                            <div className="mb-4">
                                <div className="flex items-center justify-between text-xs mb-2">
                                    <span className="text-muted-foreground">Milestone Progress</span>
                                    <span className="text-foreground font-medium">
                                        {contract.milestones.filter((m) => m.status === "completed").length}/
                                        {contract.milestones.length}
                                    </span>
                                </div>
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                                        style={{
                                            width: `${(contract.milestones.filter((m) => m.status === "completed").length /
                                                contract.milestones.length) *
                                                100
                                                }%`,
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Amounts */}
                            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border">
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
                                        Total
                                    </p>
                                    <p className="text-sm font-semibold text-foreground tabular-nums">
                                        ${(contract.totalAmount || 0).toLocaleString()}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
                                        Locked
                                    </p>
                                    <p className="text-sm font-semibold text-amber-500 tabular-nums">
                                        ${(contract.lockedAmount || 0).toLocaleString()}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
                                        Released
                                    </p>
                                    <p className="text-sm font-semibold text-emerald-500 tabular-nums">
                                        ${(contract.releasedAmount || 0).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {filteredContracts.length === 0 && (
                <div className="premium-card p-12 text-center bg-card shadow-sm">
                    <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-20" />
                    <p className="text-muted-foreground font-medium">No contracts found</p>
                </div>
            )}

            {/* Contract Detail Panel */}
            <DetailPanel
                isOpen={!!selectedContract}
                onClose={() => setSelectedContract(null)}
                title="Contract Details"
                width="xl"
            >
                {selectedContract && (
                    <div className="space-y-6">
                        {/* Contract Header */}
                        <div>
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="text-xl font-semibold text-foreground mb-1">
                                        {selectedContract.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">Contract {selectedContract.id}</p>
                                </div>
                                <StatusBadge status={selectedContract.status} />
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="premium-card p-3">
                                    <p className="text-xs text-muted-foreground mb-1">Total Value</p>
                                    <p className="text-lg font-semibold text-foreground tabular-nums">
                                        ${(selectedContract.totalAmount || 0).toLocaleString()}
                                    </p>
                                </div>
                                <div className="premium-card p-3">
                                    <p className="text-xs text-muted-foreground mb-1">Locked</p>
                                    <p className="text-lg font-semibold text-amber-500 tabular-nums">
                                        ${(selectedContract.lockedAmount || 0).toLocaleString()}
                                    </p>
                                </div>
                                <div className="premium-card p-3">
                                    <p className="text-xs text-muted-foreground mb-1">Released</p>
                                    <p className="text-lg font-semibold text-emerald-500 tabular-nums">
                                        ${(selectedContract.releasedAmount || 0).toLocaleString()}
                                    </p>
                                </div>
                                <div className="premium-card p-3">
                                    <p className="text-xs text-muted-foreground mb-1">Chain</p>
                                    <p className="text-sm font-semibold text-foreground">{selectedContract.chain}</p>
                                </div>
                            </div>
                        </div>

                        {/* Parties */}
                        <div className="premium-card p-4">
                            <h4 className="text-sm font-semibold text-foreground mb-3">Contract Parties</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-muted-foreground mb-2">Client</p>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                                            {selectedContract.client.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-foreground">
                                                {selectedContract.client}
                                            </p>
                                            <p className="text-xs text-muted-foreground">Payer</p>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground mb-2">Contractor</p>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                                            {selectedContract.contractor.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-foreground">
                                                {selectedContract.contractor}
                                            </p>
                                            <p className="text-xs text-muted-foreground">Payee</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Timeline */}
                        <div className="premium-card p-4">
                            <h4 className="text-sm font-semibold text-foreground mb-3">Timeline</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Start Date</p>
                                    <p className="text-foreground font-medium">{selectedContract.startDate}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">End Date</p>
                                    <p className="text-foreground font-medium">{selectedContract.endDate}</p>
                                </div>
                            </div>
                        </div>

                        {/* Milestones */}
                        <div className="premium-card p-4">
                            <h4 className="text-sm font-semibold text-foreground mb-4">Milestones</h4>
                            <div className="space-y-4">
                                {selectedContract.milestones.map((milestone, index) => (
                                    <div
                                        key={milestone.id}
                                        className="relative pl-8 pb-4 last:pb-0"
                                    >
                                        {/* Timeline connector */}
                                        {index < selectedContract.milestones.length - 1 && (
                                            <div className="absolute left-3 top-6 bottom-0 w-px bg-border" />
                                        )}

                                        {/* Status icon */}
                                        <div className="absolute left-0 top-0">
                                            {milestone.status === "completed" ? (
                                                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                </div>
                                            ) : milestone.status === "in-progress" ? (
                                                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                                                    <Clock className="w-4 h-4 text-blue-500 animate-pulse" />
                                                </div>
                                            ) : milestone.status === "disputed" ? (
                                                <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                                                    <AlertTriangle className="w-4 h-4 text-red-500" />
                                                </div>
                                            ) : (
                                                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                                                    <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Milestone content */}
                                        <div className="bg-muted/30 rounded-lg p-3 hover:bg-muted/50 transition-colors">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1">
                                                    <h5 className="text-sm font-semibold text-foreground mb-1">
                                                        {milestone.title}
                                                    </h5>
                                                    <p className="text-xs text-muted-foreground">{milestone.description}</p>
                                                </div>
                                                <StatusBadge status={milestone.status === "in-progress" ? "processing" : milestone.status} />
                                            </div>

                                            <div className="flex items-center justify-between text-xs mt-3">
                                                <div className="flex items-center gap-4">
                                                    <div>
                                                        <span className="text-muted-foreground">Amount: </span>
                                                        <span className="text-foreground font-semibold tabular-nums">
                                                            ${(milestone.amount || 0).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">Due: </span>
                                                        <span className="text-foreground">{milestone.dueDate}</span>
                                                    </div>
                                                </div>

                                                {milestone.status === "in-progress" && (
                                                    <Button onClick={() => releaseFunds.mutate({ contractId: selectedContract.id, data: { milestoneId: milestone.id, amount: milestone.amount } })} disabled={releaseFunds.isPending} size="sm" className="h-7 px-3 rounded-lg text-xs shadow-sm">
                                                        <Unlock className="w-3 h-3 mr-1" />
                                                        Release
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* On-chain Info */}
                        {selectedContract.contractAddress && (
                            <div className="premium-card p-4">
                                <h4 className="text-sm font-semibold text-foreground mb-3">On-Chain Details</h4>
                                <div className="space-y-2 text-sm">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Contract Address</p>
                                        <p className="text-foreground font-mono text-xs break-all">
                                            {selectedContract.contractAddress}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Network</p>
                                        <p className="text-foreground">{selectedContract.chain}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3">
                            <Button onClick={() => selectedContract.contractAddress && window.open(`https://etherscan.io/address/${selectedContract.contractAddress}`, '_blank', 'noopener,noreferrer')} variant="secondary" className="flex-1 h-10 rounded-lg border border-border">
                                View on Explorer
                            </Button>
                            {selectedContract.status === "disputed" && (
                                <Button className="flex-1 h-10 rounded-lg shadow-sm">
                                    Resolve Dispute
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </DetailPanel>
            {/* Modals */}
            <NewContractWizard
                isOpen={isNewContractOpen}
                onClose={() => setIsNewContractOpen(false)}
            />
        </div>
    );
}
