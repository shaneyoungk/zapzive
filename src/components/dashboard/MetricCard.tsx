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
                "premium-card dashboard-stat group p-5 transition-colors sm:p-6",
                onClick && "cursor-pointer hover:border-[#b9d9cc]",
                className
            )}
            onClick={onClick}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    <div className="mb-3 flex items-center gap-2">
                        <p className="metric-label">
                            {title}
                        </p>
                        {info && <InfoTooltip content={info} />}
                    </div>
                    <h3 className="metric-value text-[28px] leading-none text-[#20211e] tabular-nums">
                        {value}
                    </h3>
                </div>
                {customIconUrl ? (
                    <div className="dashboard-icon h-10 w-10">
                        <img src={customIconUrl} alt={title} className="w-6 h-6 object-contain" />
                    </div>
                ) : (
                    Icon && (
                        <div className="dashboard-icon h-10 w-10">
                            <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                        </div>
                    )
                )}
            </div>

            {(trend || subtitle) && (
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#e1dfd7] pt-3">
                    {trend && (
                        <div className={cn(
                            "flex items-center gap-1 text-xs font-medium text-[#087f5b]"
                        )}>
                            {isPositiveTrend && <TrendingUp className="w-3 h-3" />}
                            {isNegativeTrend && <TrendingDown className="w-3 h-3" />}
                            {isPositiveTrend && "+"}
                            {trend.value}%
                            {trend.label && <span className="text-muted-foreground ml-1">{trend.label}</span>}
                        </div>
                    )}
                    {subtitle && (
                        <p className="text-xs text-[#77766e]">
                            {subtitle}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
