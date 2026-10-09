import { cn } from "@/lib/utils";

interface LiquiditySegment {
    label: string;
    value: number;
    color: string;
    bgColor: string; // Tailwind class
}

interface LiquidityBarProps {
    segments: LiquiditySegment[];
    total: number;
    className?: string;
}

export default function LiquidityBar({ segments, total, className }: LiquidityBarProps) {
    const safeTotal = total > 0 ? total : 1;
    return (
        <div className={cn("w-full", className)}>
            {/* The Bar */}
            <div className="mb-6 flex h-2.5 w-full overflow-hidden rounded-full bg-[#e1dfd7] ring-1 ring-[#d9d6cd]">
                {segments.map((segment, index) => {
                    const percentage = (segment.value / safeTotal) * 100;
                    if (percentage === 0) return null;

                    return (
                        <div
                            key={index}
                            style={{ width: `${percentage}%` }}
                            className={cn(
                                "h-full border-r border-[#fffdf8] last:border-0",
                                segment.bgColor
                            )}
                        />
                    );
                })}
            </div>

            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3">
                {segments.map((segment, index) => (
                    <div key={`row-${index}`} className="contents group">
                        {/* Col 1: Bullet */}
                        <div className={cn("h-2 w-2 rounded-full ring-1 ring-[#d9d6cd]", segment.bgColor)} />

                        {/* Col 2: Label */}
                        <span className="text-[11px] font-medium text-[#575750]">
                            {segment.label}
                        </span>

                        <span className="whitespace-nowrap text-right font-mono text-[10px] font-medium tabular-nums text-[#20211e]">
                            <span className="mr-2 text-[#77766e]">{total > 0 ? ((segment.value / total) * 100).toFixed(0) : "0"}%</span>${segment.value.toLocaleString()}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
