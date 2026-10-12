import { cn } from "@/lib/utils";

interface ZapziveLogoProps {
    className?: string;
    size?: "xs" | "sm" | "md" | "lg";
    /** "dark" ink for light surfaces (default); "light" ink for dark surfaces. */
    tone?: "dark" | "light";
    /** Only the Z mark, for tight spaces such as a collapsed sidebar. */
    markOnly?: boolean;
}

// The wordmark artwork is 1958 × 1056 (≈ 1.85 : 1); heights are set so it sits on the text baseline grid.
const heights = { xs: "h-6", sm: "h-8", md: "h-10", lg: "h-12" } as const;

export const ZapziveLogo = ({ className, size = "md", tone = "dark", markOnly = false }: ZapziveLogoProps) => {
    const src = markOnly ? "/zapzive-mark.png" : tone === "light" ? "/zapzive-wordmark-light.png" : "/zapzive-wordmark.png";

    return (
        <span className={cn("inline-flex shrink-0 leading-none", className)} role="img" aria-label="Zapzive">
            <img
                src={src}
                alt=""
                aria-hidden="true"
                draggable={false}
                className={cn("w-auto select-none object-contain", heights[size], markOnly && "aspect-square")}
            />
        </span>
    );
};
