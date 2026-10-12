import React from "react";
import { cn } from "@/lib/utils";
import { NETWORKS, TOKEN_ICONS, flagFor, networkKeyFor } from "@/lib/brand-assets";

type IconSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZES: Record<IconSize, { box: string; badge: string; text: string }> = {
    xs: { box: "h-5 w-5", badge: "h-2.5 w-2.5", text: "text-[8px]" },
    sm: { box: "h-8 w-8", badge: "h-3.5 w-3.5", text: "text-[10px]" },
    md: { box: "h-10 w-10", badge: "h-4 w-4", text: "text-xs" },
    lg: { box: "h-14 w-14", badge: "h-5 w-5", text: "text-base" },
    xl: { box: "h-20 w-20", badge: "h-7 w-7", text: "text-xl" },
};

function Mark({ src, label, fallback, className, size, square }: { src?: string | null; label: string; fallback: string; className?: string; size: IconSize; square?: boolean }) {
    const [failed, setFailed] = React.useState(false);
    React.useEffect(() => setFailed(false), [src]);
    const shape = square ? "rounded-[28%]" : "rounded-full";

    if (!src || failed) {
        return (
            <span role="img" aria-label={label} className={cn("inline-flex shrink-0 items-center justify-center bg-[#e6ece3] font-semibold uppercase tracking-tight text-[#0b6b4f] ring-1 ring-inset ring-[#cfdccb]", shape, SIZES[size].box, SIZES[size].text, className)}>
                {fallback.slice(0, 2)}
            </span>
        );
    }

    return <img src={src} alt={label} draggable={false} onError={() => setFailed(true)} className={cn("shrink-0 select-none object-cover", shape, SIZES[size].box, className)} />;
}

interface AssetIconProps {
    symbol: string;
    /** Optional server-provided icon, used when no local brand mark exists. */
    src?: string;
    /** Chain id or network name; renders the network badge on the token. */
    network?: number | string | null;
    size?: IconSize;
    className?: string;
    /** @deprecated kept for older call sites */
    forceWhite?: boolean;
}

/** A token logo with an optional network badge, e.g. USDC on Base. */
export default function AssetIcon({ symbol, src, network, size = "md", className }: AssetIconProps) {
    const upper = (symbol || "").toUpperCase();
    const isEmoji = src && /\p{Extended_Pictographic}/u.test(src);
    const finalSrc = TOKEN_ICONS[upper] ?? (isEmoji ? null : src);
    const networkKey = networkKeyFor(network ?? null);
    const networkMeta = networkKey ? NETWORKS[networkKey] : null;

    return (
        <span className={cn("relative inline-flex shrink-0", className)} title={networkMeta ? `${upper} on ${networkMeta.name}` : upper}>
            <Mark src={finalSrc} label={upper} fallback={upper} size={size} />
            {networkMeta && (
                <img src={networkMeta.icon} alt={networkMeta.name} className={cn("absolute -bottom-0.5 -right-0.5 rounded-full object-cover ring-2 ring-[#fffdf8]", SIZES[size].badge)} />
            )}
        </span>
    );
}

export function NetworkIcon({ network, size = "sm", className }: { network: number | string; size?: IconSize; className?: string }) {
    const key = networkKeyFor(network);
    const meta = key ? NETWORKS[key] : null;
    const label = meta?.name ?? String(network);
    return <Mark src={meta?.icon} label={label} fallback={label} size={size} className={className} />;
}

/** Country flag for a currency (KES), ISO country code (ke), or country name (Kenya). */
export function CurrencyFlag({ code, size = "sm", className }: { code: string; size?: IconSize; className?: string }) {
    return <Mark src={flagFor(code)} label={code} fallback={code} size={size} className={cn("ring-1 ring-black/5", className)} />;
}
