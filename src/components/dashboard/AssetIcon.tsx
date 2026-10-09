import React from "react";
import { cn } from "@/lib/utils";

interface AssetIconProps {
    src?: string;
    symbol: string;
    className?: string;
    size?: "sm" | "md" | "lg" | "xl";
    forceWhite?: boolean;
}

const LOCAL_ICONS: Record<string, string> = {
    ETH: "/icons/ethereum.png",
    USDC: "/icons/usdc.png",
    MATIC: "/icons/polygon.png",
    USDT: "/icons/tether.png",
    BTC: "/icons/bitcoin.svg",
    DAI: "/icons/dai.svg",
    SOL: "/icons/solana.svg",
};

export default function AssetIcon({ src, symbol, className, size = "md", forceWhite }: AssetIconProps) {
    const [error, setError] = React.useState(false);

    const localSrc = LOCAL_ICONS[symbol.toUpperCase()];
    const finalSrc = localSrc || src;

    const isEmoji = finalSrc && /\p{Extended_Pictographic}/u.test(finalSrc);
    const assetStyle = forceWhite
        ? { bg: "bg-white", border: "border-[#d9d6cd]" }
        : { bg: "bg-[#e8eee4]", border: "border-[#cdd8c8]" };

    const sizeClasses = {
        sm: "h-9 w-9 text-[11px]",
        md: "h-12 w-12 text-sm",
        lg: "size-16 text-lg",
        xl: "size-24 text-2xl",
    };

    const containerBase = "relative flex items-center justify-center overflow-hidden rounded-xl border transition-colors";

    if (isEmoji) {
        return (
            <div className={cn(containerBase, assetStyle.bg, assetStyle.border, sizeClasses[size], className)}>
                <span className="relative z-10">{finalSrc}</span>
            </div>
        );
    }

    if (!finalSrc || error) {
        return (
            <div className={cn(containerBase, "border-[#cdd8c8] bg-[#e8eee4] font-mono font-medium text-[#087f5b]", sizeClasses[size], className)}>
                {symbol.slice(0, 2).toUpperCase()}
            </div>
        );
    }

    return (
        <div className={cn(containerBase, assetStyle.bg, assetStyle.border, sizeClasses[size], className)}>
            <img
                src={finalSrc}
                alt={symbol}
                className={cn(
                    "relative z-10 h-full w-full object-contain p-1"
                )}
                onError={() => setError(true)}
            />
        </div>
    );
}
