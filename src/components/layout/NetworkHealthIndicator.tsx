import { useState } from "react";
import { Link } from "react-router-dom";
import { FlaskConical, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Environment pill. Finance operators see "Sandbox" or "Live"; chain and
 * testnet detail lives in Integrations → Diagnostics.
 */
export default function NetworkHealthIndicator() {
    const [isOpen, setIsOpen] = useState(false);
    const { company } = useAuth();
    const sandbox = company?.isTestMode !== false;

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={sandbox
                        ? "flex h-9 items-center gap-2 rounded-full border border-[#f0dcb0] bg-[#fdf6e7] px-3 text-[#8a5a0b] transition-colors hover:border-[#e6c98d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e6c98d]"
                        : "flex h-9 items-center gap-2 rounded-full border border-[#bfe0d0] bg-[#e7f3ed] px-3 text-[#0b6b4f] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#bfe0d0]"}
                    aria-label={sandbox ? "Sandbox environment: uses test balances, no live funds move" : "Live environment"}
                >
                    {sandbox ? <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" /> : <span className="h-2 w-2 rounded-full bg-[#11a879]" aria-hidden="true" />}
                    <span className="hidden text-xs font-semibold sm:inline">{sandbox ? "Sandbox" : "Live"}</span>
                </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 overflow-hidden rounded-2xl border-[#e3e0d7] bg-white p-0 text-[#1b1c19] shadow-xl">
                <div className="border-b border-[#ece9e1] px-4 py-3.5">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">{sandbox ? <FlaskConical className="h-4 w-4 text-[#8a5a0b]" /> : null}{sandbox ? "Sandbox environment" : "Live environment"}</h3>
                </div>
                <div className="space-y-3 p-4 text-[13px] leading-6 text-[#55544d]">
                    <div className="flex items-start gap-2.5">
                        <Info className="mt-1 h-4 w-4 shrink-0 text-[#8a897f]" aria-hidden="true" />
                        <p>{sandbox ? "Uses test balances and simulated provider infrastructure. No live funds move." : "Payouts are executed by your connected, licensed providers."}</p>
                    </div>
                    {sandbox && <p className="text-xs text-[#8a897f]">Sandbox payouts settle through the Zapzive sandbox provider. Its quotes, fees and outcomes are labelled as sandbox everywhere they appear.</p>}
                </div>
                <div className="flex items-center justify-between border-t border-[#ece9e1] bg-[#faf9f6] px-4 py-2.5 text-xs">
                    <Link to="/dashboard/integrations" onClick={() => setIsOpen(false)} className="font-semibold text-primary hover:underline">Providers and diagnostics</Link>
                    <Link to="/dashboard/settings" onClick={() => setIsOpen(false)} className="text-[#74736b] hover:text-[#1b1c19]">Environment settings</Link>
                </div>
            </PopoverContent>
        </Popover>
    );
}
