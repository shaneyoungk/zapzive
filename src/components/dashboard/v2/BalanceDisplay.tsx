import { Copy, RefreshCw, ChevronDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BalanceDisplay() {
    return (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[#77766e]">
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#e8eee4]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#11a879]" />
                    </div>
                    <span>Main Wallet</span>
                    <span className="text-[#aaa9a1]">/</span>
                    <span>Total Balance</span>
                </div>

                <div className="flex items-baseline gap-3">
                    <h1 className="text-4xl font-semibold tracking-[-.06em] text-[#20211e] tabular-nums">
                        $47,590.00
                    </h1>
                    <div className="flex items-center gap-1.5 rounded-full border border-[#b9d9cc] bg-[#e8eee4] px-2.5 py-1 text-xs font-semibold text-[#087f5b]">
                        <TrendingUp className="w-3 h-3" />
                        +$1,240 (Yield)
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <div className="flex cursor-pointer items-center gap-2 rounded-full border border-[#d9d6cd] bg-[#fffdf8] px-3 py-2 text-xs font-medium text-[#20211e] transition-colors hover:border-[#b9d9cc]">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#e8eee4] font-mono text-[7px] font-bold text-[#087f5b]">B</span>
                    Bitcoin (BTC)
                    <ChevronDown className="ml-1 h-3 w-3 text-[#77766e]" />
                </div>
                <div className="text-right mr-2 hidden md:block">
                    <div className="font-mono text-[9px] uppercase tracking-[.1em] text-[#77766e]">Wallet address</div>
                    <div className="flex items-center gap-1 font-mono text-xs text-[#575750]">
                        0x760...892
                        <Copy className="h-3 w-3 cursor-pointer text-[#77766e] hover:text-[#087f5b]" />
                    </div>
                </div>
                <Button size="icon" className="h-9 w-9 rounded-full">
                    <RefreshCw className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}
