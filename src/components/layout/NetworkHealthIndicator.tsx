import { useState } from "react";
import { FlaskConical, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * The dashboard currently runs in a persisted sandbox. A health badge that
 * claims live rails are operational would be misleading, so this control
 * explains the environment instead of inventing provider telemetry.
 */
export default function NetworkHealthIndicator() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className="flex h-9 items-center gap-2 rounded-full border border-[#cdd8c8] bg-[#e8eee4] px-3 text-[#087f5b] transition-colors hover:border-[#b9d9cc] focus:outline-none focus:ring-2 focus:ring-[#11a87966]"
                    aria-label="View sandbox environment details"
                >
                    <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="hidden text-xs font-semibold sm:inline">Sandbox</span>
                </button>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                className="w-80 overflow-hidden rounded-2xl border-[#d9d6cd] bg-[#fffdf8] p-0 text-[#20211e] shadow-xl"
            >
                <div className="border-b border-[#e1dfd7] px-4 py-3.5">
                    <h3 className="flex items-center gap-2 font-semibold text-[#20211e]">
                        <FlaskConical className="h-4 w-4 text-[#087f5b]" aria-hidden="true" />
                        Sandbox environment
                    </h3>
                </div>
                <div className="space-y-3 p-4">
                    <div className="flex items-start gap-3 rounded-xl border border-[#cdd8c8] bg-[#e8eee4] p-3">
                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#087f5b]" aria-hidden="true" />
                        <p className="text-sm leading-5 text-[#575750]">
                            Balances, transfers, payroll, and escrow actions are persisted as test records. No live bank, blockchain, or liquidity provider is connected.
                        </p>
                    </div>
                    <p className="text-xs leading-5 text-[#77766e]">
                        Production access requires reviewed credentials and a provider-backed settlement configuration.
                    </p>
                </div>
                <div className="border-t border-[#e1dfd7] bg-[#f5f3ee] px-4 py-2.5">
                    <p className="font-mono text-[9px] uppercase tracking-[.08em] text-[#77766e]">
                        Environment: test
                    </p>
                </div>
            </PopoverContent>
        </Popover>
    );
}
