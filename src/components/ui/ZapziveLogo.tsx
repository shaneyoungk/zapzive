import { cn } from "@/lib/utils";

interface ZapziveLogoProps {
    className?: string;
    size?: "xs" | "sm" | "md" | "lg";
}

const dimensions = {
    xs: { frame: "h-[22px] w-[76px]", asset: 94 },
    sm: { frame: "h-[32px] w-[112px]", asset: 138 },
    md: { frame: "h-[40px] w-[140px]", asset: 172 },
    lg: { frame: "h-[54px] w-[188px]", asset: 232 },
} as const;

/**
 * The supplied PNG is intentionally a square transparent canvas around a wide
 * wordmark. This component presents the full artwork at its natural ratio,
 * rather than stretching it or cropping it as if it were an icon.
 */
export const ZapziveLogo = ({ className, size = "md" }: ZapziveLogoProps) => {
    const preset = dimensions[size];

    return (
        <span className={cn("inline-flex shrink-0 leading-none", className)} role="img" aria-label="Zapzive">
            <span className={cn("relative block overflow-hidden", preset.frame)}>
                <img
                    src="/zapzive-logo.png"
                    alt=""
                    aria-hidden="true"
                    width={preset.asset}
                    height={preset.asset}
                    draggable={false}
                    className="absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 select-none"
                />
            </span>
        </span>
    );
};
