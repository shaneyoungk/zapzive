import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import InfoTooltip from "./InfoTooltip";

interface MetricCardProps {
    title: string;
    value: string | number;
    icon?: LucideIcon;
    trend?: {
        value: number;
        label?: string;
    };
    subtitle?: string;
    onClick?: () => void;
    className?: string;
    info?: string;
    customIconUrl?: string; // Support for PNG icons
}

export default function MetricCard({
    title,
    value,
    icon: Icon,
    trend,
    subtitle,
    onClick,
    className,
    info,
    customIconUrl
}: MetricCardProps) {
    const isPositiveTrend = trend && trend.value > 0;
    const isNegativeTrend = trend && trend.value < 0;

    return (
        <div
            className={cn(
                "premium-card dashboard-stat group p-4 transition-colors sm:p-6",
                onClick && "cursor-pointer hover:border-[#c9d9cf]",
                className
            )}
            onClick={onClick}
            onKeyDown={onClick ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onClick(); } } : undefined}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                        <p className="truncate text-[13px] font-semibold text-[#55544d]">{title}</p>
                        {info && <InfoTooltip content={info} />}
                    </div>
                    <p className="dash-kpi-value mt-2.5 truncate">{value}</p>
                </div>
                {customIconUrl ? (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f1efe9]">
                        <img src={customIconUrl} alt="" className="h-5 w-5 object-contain" />
                    </span>
                ) : (
                    Icon && (
                        <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#edf6f1] text-primary sm:flex">
                            <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                        </span>
                    )
                )}
            </div>

            {(trend || subtitle) && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    {trend && (
                        <span className={cn(
                            "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11.5px] font-semibold tabular-nums",
                            isPositiveTrend && "bg-[#e7f3ed] text-[#0b6b4f]",
                            isNegativeTrend && "bg-[#fbecea] text-[#9a2f2f]",
                            !isPositiveTrend && !isNegativeTrend && "bg-[#f1efe9] text-[#6c6b63]"
                        )}>
                            {isPositiveTrend && <TrendingUp className="h-3 w-3" />}
                            {isNegativeTrend && <TrendingDown className="h-3 w-3" />}
                            {isPositiveTrend && "+"}
                            {trend.value}%
                        </span>
                    )}
                    {trend?.label && <span className="text-xs text-[#8a897f]">{trend.label}</span>}
                    {subtitle && <p className="text-xs text-[#8a897f]">{subtitle}</p>}
                </div>
            )}
        </div>
    );
}
