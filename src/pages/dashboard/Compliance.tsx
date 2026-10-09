import { useState } from "react";
import {
    ShieldCheck,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Clock,
    Users,
    FileText,
    Search,
    Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import MetricCard from "@/components/dashboard/MetricCard";
import InfoTooltip from "@/components/dashboard/InfoTooltip";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { motion } from "framer-motion";
import { useComplianceItems } from "@/hooks/use-compliance";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";

interface ComplianceItem {
    id: string;
    type: "kyc" | "aml" | "sanctions" | "transaction";
    entity: string;
    status: "approved" | "pending" | "flagged" | "rejected";
    riskLevel: "low" | "medium" | "high";
    date: string;
    details: string;
}

// Mocks removed

const typeLabels = {
    kyc: "KYC Verification",
    aml: "AML Check",
    sanctions: "Sanctions Screening",
    transaction: "Transaction Review",
};

const typeIcons = {
    kyc: Users,
    aml: AlertTriangle,
    sanctions: ShieldCheck,
    transaction: FileText,
};

export default function Compliance() {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    const { data: allItems = [], isLoading } = useComplianceItems();

    const generateReport = async () => {
        try {
            const report = await apiClient.getComplianceReports();
            const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = 'compliance-report.json';
            anchor.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error('Unable to generate compliance report');
        }
    };

    const filteredItems = allItems.filter((item: ComplianceItem) => {
        const matchesSearch =
            item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.entity.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.details.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === "all" || item.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const approvedCount = allItems.filter((i: ComplianceItem) => i.status === "approved").length;
    const pendingCount = allItems.filter((i: ComplianceItem) => i.status === "pending").length;
    const flaggedCount = allItems.filter((i: ComplianceItem) => i.status === "flagged").length;
    const kycItems = allItems.filter((item: ComplianceItem) => item.type === 'kyc');
    const verifiedKyc = kycItems.filter((item: ComplianceItem) => item.status === 'approved').length;
    const kycCompletion = kycItems.length > 0 ? Math.round((verifiedKyc / kycItems.length) * 100) : 0;

    return (
        <div className="p-4 lg:p-6 max-w-[1600px] mx-auto space-y-6 animate-fade-in">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div><p className="dashboard-eyebrow">Risk controls</p><h1 className="mt-2 text-3xl">Compliance review</h1><p className="mt-2 text-sm text-[#77766e]">Identity verification, transaction screening, and review outcomes.</p></div>
                <Button onClick={generateReport}>
                    <FileText className="h-4 w-4" />
                    Generate report
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard title="KYC completion" value={`${kycCompletion}%`} icon={ShieldCheck} subtitle={`${verifiedKyc} of ${kycItems.length} verified`} />
                <MetricCard title="Pending reviews" value={pendingCount} icon={Clock} subtitle="Needs review" />
                <MetricCard title="Flagged items" value={flaggedCount} icon={AlertTriangle} subtitle={flaggedCount ? "High priority" : "No open flags"} />
                <MetricCard title="Approved" value={approvedCount} icon={CheckCircle2} subtitle="This month" />
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search by ID, entity, or details..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-10 pl-10 pr-4 bg-[#111] border border-[#222] rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-700 transition-all"
                    />
                </div>

                <div className="flex items-center gap-2">
                    {[
                        { label: "All", value: "all" },
                        { label: "Pending", value: "pending" },
                        { label: "Flagged", value: "flagged" },
                        { label: "Approved", value: "approved" },
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

            {/* Compliance Items */}
            <div className="premium-card overflow-hidden">
                <div className="card-header">
                    <h3 className="font-semibold text-foreground text-[15px]">Compliance Checks</h3>
                </div>

                <div className="divide-y divide-border">
                    {isLoading ? (
                        <div className="p-12 text-center text-muted-foreground">Loading compliance items...</div>
                    ) : (
                        filteredItems.map((item) => {
                            const TypeIcon = typeIcons[item.type];

                            return (
                                <motion.div
                                    key={item.id}
                                    whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.02)" }}
                                    className="p-5 cursor-pointer transition-colors"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-start gap-4 flex-1">
                                            <div
                                                className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.status === "flagged"
                                                    ? "bg-red-500/10"
                                                    : item.status === "pending"
                                                        ? "bg-amber-500/10"
                                                        : "bg-emerald-500/10"
                                                    }`}
                                            >
                                                <TypeIcon
                                                    className={`w-5 h-5 ${item.status === "flagged"
                                                        ? "text-red-500"
                                                        : item.status === "pending"
                                                            ? "text-amber-500"
                                                            : "text-emerald-500"
                                                        }`}
                                                />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-semibold text-foreground text-sm">{item.entity}</h4>
                                                    <StatusBadge status={item.status} />
                                                </div>
                                                <p className="text-xs text-muted-foreground mb-2">
                                                    {item.id} • {typeLabels[item.type]}
                                                </p>
                                                <p className="text-sm text-muted-foreground">{item.details}</p>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <div
                                                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold mb-2 ${item.riskLevel === "high"
                                                    ? "bg-red-500/10 text-red-500"
                                                    : item.riskLevel === "medium"
                                                        ? "bg-amber-500/10 text-amber-500"
                                                        : "bg-emerald-500/10 text-emerald-500"
                                                    }`}
                                            >
                                                {item.riskLevel === "high" ? (
                                                    <AlertTriangle className="w-3 h-3" />
                                                ) : item.riskLevel === "medium" ? (
                                                    <Clock className="w-3 h-3" />
                                                ) : (
                                                    <CheckCircle2 className="w-3 h-3" />
                                                )}
                                                {item.riskLevel.toUpperCase()}
                                            </div>
                                            <p className="text-xs text-muted-foreground">{item.date}</p>
                                        </div>
                                    </div>

                                    {item.status === "pending" && (
                                        <div className="flex gap-2 mt-3 pt-3 border-t border-white/[0.06]">
                                            <Button className="btn-primary h-8 px-4 rounded-lg text-xs flex-1">
                                                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                                                Approve
                                            </Button>
                                            <Button className="btn-secondary h-8 px-4 rounded-lg text-xs flex-1">
                                                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                                                Reject
                                            </Button>
                                        </div>
                                    )}

                                    {item.status === "flagged" && (
                                        <div className="mt-3 pt-3 border-t border-border">
                                            <Button
                                                variant="institutional"
                                                className="h-8 px-4 text-xs w-full"
                                            >
                                                Review Details
                                            </Button>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })
                    )}
                </div>
            </div>

            {filteredItems.length === 0 && (
                <div className="premium-card p-12 text-center bg-card shadow-sm">
                    <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-20" />
                    <p className="text-muted-foreground font-medium">No compliance items found</p>
                </div>
            )}
        </div>
    );
}
