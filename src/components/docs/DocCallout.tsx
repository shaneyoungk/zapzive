import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

type CalloutType = "info" | "warning" | "error" | "success" | "tip" | "mistake";

interface DocCalloutProps {
  type?: CalloutType;
  icon?: LucideIcon;
  title?: string;
  children: ReactNode;
  className?: string;
}

const config: Record<CalloutType, { icon: LucideIcon; frame: string; iconStyle: string; label: string }> = {
  info: {
    icon: Info,
    frame: "border-[#cdd8c8] bg-[#e8eee4]",
    iconStyle: "border-[#b9d9cc] bg-[#fffdf8] text-[#087f5b]",
    label: "Note",
  },
  tip: {
    icon: Lightbulb,
    frame: "border-[#cdd8c8] bg-[#f0f3ed]",
    iconStyle: "border-[#b9d9cc] bg-[#fffdf8] text-[#087f5b]",
    label: "Tip",
  },
  success: {
    icon: CheckCircle2,
    frame: "border-[#b9d9cc] bg-[#e5f1eb]",
    iconStyle: "border-[#a8cfbf] bg-[#fffdf8] text-[#087f5b]",
    label: "Success",
  },
  warning: {
    icon: AlertTriangle,
    frame: "border-[#d9d6cd] bg-[#efede6]",
    iconStyle: "border-[#cfcbc0] bg-[#fffdf8] text-[#575750]",
    label: "Important",
  },
  error: {
    icon: AlertCircle,
    frame: "border-[#dfc7c2] bg-[#f4e9e7]",
    iconStyle: "border-[#d7b8b1] bg-[#fffdf8] text-[#9b463c]",
    label: "Error",
  },
  mistake: {
    icon: AlertCircle,
    frame: "border-[#dfc7c2] bg-[#f4e9e7]",
    iconStyle: "border-[#d7b8b1] bg-[#fffdf8] text-[#9b463c]",
    label: "Avoid",
  },
};

export function DocCallout({ type = "info", icon, title, children, className }: DocCalloutProps) {
  const styles = config[type];
  const Icon = icon || styles.icon;

  return (
    <aside
      role={type === "error" || type === "mistake" ? "alert" : "note"}
      className={cn("my-8 flex gap-4 rounded-2xl border p-5 sm:p-6", styles.frame, className)}
    >
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border", styles.iconStyle)}>
        <Icon size={17} strokeWidth={1.9} aria-hidden="true" />
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="font-mono text-[9px] font-semibold uppercase tracking-[.12em] text-[#77766e]">{title || styles.label}</p>
        <div className="mt-2 text-sm leading-6 text-[#575750]">{children}</div>
      </div>
    </aside>
  );
}
