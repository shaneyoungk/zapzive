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

const TONES = {
    positive: { color: "text-[#0b6b4f]", bgColor: "bg-[#e7f3ed] ring-[#bfe0d0]", dot: "bg-[#11a879]" },
    progress: { color: "text-[#1f5fa8]", bgColor: "bg-[#eaf1fb] ring-[#c8d9f0]", dot: "bg-[#3b82d6]" },
    waiting: { color: "text-[#8a5a0b]", bgColor: "bg-[#fdf4e3] ring-[#f0dcb0]", dot: "bg-[#d99a1e]" },
    negative: { color: "text-[#9a2f2f]", bgColor: "bg-[#fbecea] ring-[#efc9c4]", dot: "bg-[#cf4b3f]" },
    neutral: { color: "text-[#5f5e57]", bgColor: "bg-[#f1efe9] ring-[#dedbd2]", dot: "bg-[#a3a29a]" },
} as const;

const statusConfig: Record<StatusType, { tone: keyof typeof TONES; label: string }> = {
    settled: { tone: "positive", label: "Settled" },
    completed: { tone: "positive", label: "Completed" },
    approved: { tone: "positive", label: "Approved" },
    active: { tone: "positive", label: "Active" },
    verified: { tone: "positive", label: "Verified" },
    processing: { tone: "progress", label: "Processing" },
    pending: { tone: "waiting", label: "Pending" },
    flagged: { tone: "negative", label: "Flagged" },
    disputed: { tone: "negative", label: "Disputed" },
    failed: { tone: "negative", label: "Failed" },
    rejected: { tone: "negative", label: "Rejected" },
    draft: { tone: "neutral", label: "Draft" },
    cancelled: { tone: "neutral", label: "Cancelled" },
    inactive: { tone: "neutral", label: "Inactive" },
};

/** Maps any backend status string onto a badge state. */
export function toStatusType(value: string | null | undefined): StatusType {
    const v = (value || "").toLowerCase().replace(/[\s_-]+/g, "");
    if (v in statusConfig) return v as StatusType;
    if (["confirmed", "delivered", "paid", "released", "success"].includes(v)) return "completed";
    if (["inprogress", "confirming", "submitted", "sending", "scheduled"].includes(v)) return "processing";
    if (["awaitingsignature", "awaitingapproval", "review", "inreview", "pendingapproval"].includes(v)) return "pending";
    if (["error", "reorged", "expired"].includes(v)) return "failed";
    return "pending";
}

export default function StatusBadge({ status, label, showPulse = true, className }: StatusBadgeProps) {
    const resolved: StatusType = status in statusConfig ? status : toStatusType(status);
    const config = statusConfig[resolved];
    const tone = TONES[config.tone];
    const live = resolved === "processing";

    return (
        <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-[3px] text-[11.5px] font-semibold leading-4 ring-1 ring-inset", tone.bgColor, tone.color, className)}>
            {showPulse && (
                <span className="relative flex h-1.5 w-1.5">
                    {live && <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", tone.dot)} />}
                    <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", tone.dot)} />
                </span>
            )}
            {label || config.label}
        </span>
    );
}
