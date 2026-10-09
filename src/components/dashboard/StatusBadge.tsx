import { cn } from "@/lib/utils";

export type StatusType =
    | "settled"
    | "pending"
    | "flagged"
    | "processing"
    | "completed"
    | "failed"
    | "draft"
    | "active"
    | "inactive"
    | "approved"
    | "rejected"
    | "disputed"
    | "cancelled"
    | "verified";

interface StatusBadgeProps {
    status: StatusType;
    label?: string;
    showPulse?: boolean;
    className?: string;
}

const statusConfig: Record<StatusType, { color: string; bgColor: string; dot: string; label: string }> = {
    settled: {
        color: "text-[#087f5b]", bgColor: "bg-[#e8f4ef] border-[#b9d9cc]", dot: "bg-[#11a879]",
        label: "Settled"
    },
    completed: {
        color: "text-[#087f5b]", bgColor: "bg-[#e8f4ef] border-[#b9d9cc]", dot: "bg-[#11a879]",
        label: "Completed"
    },
    approved: {
        color: "text-[#087f5b]", bgColor: "bg-[#e8f4ef] border-[#b9d9cc]", dot: "bg-[#11a879]",
        label: "Approved"
    },
    active: {
        color: "text-[#087f5b]", bgColor: "bg-[#e8f4ef] border-[#b9d9cc]", dot: "bg-[#11a879]",
        label: "Active"
    },
    verified: {
        color: "text-[#087f5b]", bgColor: "bg-[#e8f4ef] border-[#b9d9cc]", dot: "bg-[#11a879]",
        label: "Verified"
    },
    pending: {
        color: "text-[#575750]", bgColor: "bg-[#f5f3ee] border-[#d9d6cd]", dot: "bg-[#77766e]",
        label: "Pending"
    },
    processing: {
        color: "text-[#087f5b]", bgColor: "bg-[#e8eee4] border-[#cdd8c8]", dot: "bg-[#11a879]",
        label: "Processing"
    },
    flagged: {
        color: "text-[#9a3535]", bgColor: "bg-[#f8eaea] border-[#e7c3c3]", dot: "bg-[#b33a3a]",
        label: "Flagged"
    },
    disputed: {
        color: "text-[#9a3535]", bgColor: "bg-[#f8eaea] border-[#e7c3c3]", dot: "bg-[#b33a3a]",
        label: "Disputed"
    },
    failed: {
        color: "text-[#9a3535]", bgColor: "bg-[#f8eaea] border-[#e7c3c3]", dot: "bg-[#b33a3a]",
        label: "Failed"
    },
    rejected: {
        color: "text-[#9a3535]", bgColor: "bg-[#f8eaea] border-[#e7c3c3]", dot: "bg-[#b33a3a]",
        label: "Rejected"
    },
    draft: {
        color: "text-[#77766e]", bgColor: "bg-[#fffdf8] border-[#d9d6cd] border-dashed", dot: "bg-[#aaa9a1]",
        label: "Draft"
    },
    cancelled: {
        color: "text-[#77766e]", bgColor: "bg-[#f5f3ee] border-[#d9d6cd]", dot: "bg-[#aaa9a1]",
        label: "Cancelled"
    },
    inactive: {
        color: "text-[#77766e]", bgColor: "bg-[#f5f3ee] border-[#d9d6cd]", dot: "bg-[#aaa9a1]",
        label: "Inactive"
    }
};

export default function StatusBadge({ status, label, showPulse = false, className }: StatusBadgeProps) {
    const config = statusConfig[status];
    const displayLabel = label || config.label;

    return (
        <div className={cn("relative inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] font-medium uppercase tracking-[.08em]", config.bgColor, config.color, className)}>
            {showPulse && <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />}
            {displayLabel}
        </div>
    );
}
