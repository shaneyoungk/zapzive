import { TrendingDown } from "lucide-react";

interface DonutChartProps {
    segments: Array<{
        label: string;
        value: number;
        color: string;
        bgColor: string;
    }>;
    total: number;
    size?: number;
}

export default function DonutChart({ segments, total, size = 160 }: DonutChartProps) {
    const radius = 40;
    const strokeWidth = 12;
    const circumference = 2 * Math.PI * radius;

    // Calculate segment positions
    let currentOffset = 0;
    const segmentData = segments.map((segment) => {
        const percentage = segment.value / total;
        const length = percentage * circumference;
        const dashArray = `${length} ${circumference - length}`;
        const dashOffset = -currentOffset;

        currentOffset += length;

        return {
            ...segment,
            length,
            dashArray,
            dashOffset,
        };
    });

    // Zapzive financial palette: one accent with clear neutral separation.
    const colors = [
        '#087f5b',
        '#11a879',
        '#76d4b5',
        '#aaa9a1',
    ];

    return (
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke="#e1dfd7"
                    strokeWidth={strokeWidth}
                />

                {/* Render segments */}
                {segmentData.map((segment, i) => (
                    <circle
                        key={i}
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="none"
                        stroke={colors[i % colors.length]}
                        strokeWidth={strokeWidth}
                        strokeLinecap="butt"
                        strokeDasharray={segment.dashArray}
                        strokeDashoffset={segment.dashOffset}
                        style={{
                            transition: 'all 0.4s ease-out',
                        }}
                    />
                ))}
            </svg>

            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-2xl font-semibold text-[#20211e] tabular-nums tracking-[-.05em]">
                    ${(total / 1000).toFixed(1)}K
                </div>
                <div className="mt-1 flex items-center gap-0.5 font-mono text-[9px] font-medium text-[#087f5b]">
                    <TrendingDown className="w-3 h-3 rotate-180" /> 12%
                </div>
            </div>
        </div>
    );
}
