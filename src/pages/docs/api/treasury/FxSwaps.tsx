import { DocCallout } from "@/components/docs/DocCallout";
import { CodeWindow } from "@/components/docs/CodeWindow";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft, Zap, ShieldCheck, TrendingUp, Calculator, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export default function FXSwaps() {
    return (
        <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20">
            {/* Hero Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <Badge variant="outline" className="bg-amber-500/5 text-[#9a6b12] border-amber-400/20 px-3 py-1">
                        Zero Slippage
                    </Badge>
                    <div className="h-px flex-1 bg-gradient-to-r from-amber-500/20 to-transparent" />
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-[#20211e] sm:text-5xl">
                    FX <span className="text-[#9a6b12]">Swaps</span>
                </h1>
                <p className="text-lg text-[#575750] leading-relaxed max-w-2xl">
                    Convert between fiat and stablecoins with institutional liquidity. Locked rates for 30 seconds to ensure predictable payroll costs.
                </p>
            </div>

            <DocCallout icon={TrendingUp} title="Guaranteed Rates">
                Once a swap quote is generated, the price is guaranteed for 30 seconds, protecting you against intra-minute volatility during large payroll executions.
            </DocCallout>

            {/* --- ENDPOINT: CREATE QUOTE --- */}
            <section className="space-y-6 pt-12 border-t border-[#d9d6cd]">
                <div className="flex items-center gap-3 mb-4">
                    <Badge className="bg-blue-500/10 text-[#087f5b] py-1 px-3 border border-blue-500/20 font-mono text-[10px]">GET</Badge>
                    <code className="text-lg font-mono text-[#20211e]">/api/treasury/swaps/quote</code>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#20211e]">Request Quote</h2>
                        <p className="text-[#575750] text-sm">
                            Get a live FX rate for a specific currency pair. Quotes are valid for 30 seconds.
                        </p>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-[#77766e] uppercase tracking-widest">Response Codes</h3>
                            <div className="space-y-2">
                                <ResponseCode code="200 OK" desc="Quote generated successfully." color="blue" />
                                <ResponseCode code="400 Bad Request" desc="Unsupported currency pair." color="zinc" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <CodeWindow
                            title="get-quote.bash"
                            code={`curl https://your-api.example.com/api/treasury/swaps/quote?from=USDC&to=EUR&amount=50000`}
                        />
                    </div>
                </div>
            </section>

            {/* --- ENDPOINT: EXECUTE SWAP --- */}
            <section className="space-y-6 pt-12 border-t border-[#d9d6cd]">
                <div className="flex items-center gap-3 mb-4">
                    <Badge className="bg-emerald-500/10 text-[#087f5b] py-1 px-3 border border-emerald-500/20 font-mono text-[10px]">POST</Badge>
                    <code className="text-lg font-mono text-[#20211e]">/api/treasury/swaps</code>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#20211e]">Execute Swap</h2>
                        <p className="text-[#575750] text-sm">
                            Commit to a previously generated quote to finalize the currency conversion.
                        </p>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-[#77766e] uppercase tracking-widest">Response Codes</h3>
                            <div className="space-y-2">
                                <ResponseCode code="201 Created" desc="Swap executed and settled." color="emerald" />
                                <ResponseCode code="410 Gone" desc="Quote has expired." color="zinc" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <CodeWindow
                            title="execute-swap.bash"
                            code={`curl https://your-api.example.com/api/treasury/swaps \\
  -d quote_id="quo_123456789"`}
                        />
                    </div>
                </div>
            </section>

            {/* Comparison */}
            <div className="p-8 rounded-3xl bg-[#f5f3ee]/50 border border-[#d9d6cd]">
                <h3 className="text-xl font-bold text-[#20211e] mb-6">Market vs Limit Swaps</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <h4 className="text-sm font-bold text-[#9a6b12]">Market Swaps</h4>
                        <p className="text-xs text-[#77766e] leading-relaxed">
                            Immediate execution at the best available rate. Best for time-sensitive payroll runs.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-sm font-bold text-[#087f5b]">Limit Swaps</h4>
                        <p className="text-xs text-[#77766e] leading-relaxed">
                            Specify a target rate. Execution occurs once the mid-market price hits your threshold.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ResponseCode({ code, desc, color }: { code: string; desc: string; color: "emerald" | "blue" | "red" | "zinc" }) {
    const colorClasses = {
        emerald: "bg-emerald-500/10 text-[#087f5b] border-emerald-500/20",
        blue: "bg-blue-500/10 text-[#087f5b] border-blue-500/20",
        red: "bg-red-500/10 text-[#9b463c] border-red-500/20",
        zinc: "bg-[#f5f3ee] text-[#575750] border-[#cdd8c8]"
    };

    return (
        <div className={cn("flex items-center gap-4 p-4 rounded-xl border", colorClasses[color])}>
            <span className="font-mono font-bold text-sm min-w-[100px]">{code}</span>
            <span className="text-xs opacity-80">{desc}</span>
        </div>
    );
}

