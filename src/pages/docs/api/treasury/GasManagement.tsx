import { DocCallout } from "@/components/docs/DocCallout";
import { CodeWindow } from "@/components/docs/CodeWindow";
import { Badge } from "@/components/ui/badge";
import { Zap, ShieldCheck, Droplets, Gauge, AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export default function GasManagement() {
    return (
        <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20">
            {/* Hero Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <Badge variant="outline" className="bg-blue-500/5 text-[#087f5b] border-blue-400/20 px-3 py-1">
                        Network Infrastructure
                    </Badge>
                    <div className="h-px flex-1 bg-gradient-to-r from-blue-500/20 to-transparent" />
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-[#20211e] sm:text-5xl">
                    Gas <span className="text-[#087f5b]">Management</span>
                </h1>
                <p className="text-lg text-[#575750] leading-relaxed max-w-2xl">
                    Automate your protocol operations without worrying about transaction costs. We maintain gas reserves across 15+ networks.
                </p>
            </div>

            <DocCallout icon={Gauge} title="Predictive Scaling">
                Our engine monitors mempool congestion in real-time and dynamically adjusts gas limits to ensure your payroll transactions are never stuck.
            </DocCallout>

            {/* --- ENDPOINT: GET GAS STATUS --- */}
            <section className="space-y-6 pt-12 border-t border-[#d9d6cd]">
                <div className="flex items-center gap-3 mb-4">
                    <Badge className="bg-blue-500/10 text-[#087f5b] py-1 px-3 border border-blue-500/20 font-mono text-[10px]">GET</Badge>
                    <code className="text-lg font-mono text-[#20211e]">/api/treasury/gas/reserves</code>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#20211e]">Check Gas Reserves</h2>
                        <p className="text-[#575750] text-sm">
                            Query current gas balances and estimated transaction capacity for each supported network.
                        </p>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-[#77766e] uppercase tracking-widest">Response Codes</h3>
                            <div className="space-y-2">
                                <ResponseCode code="200 OK" desc="Returns map of network gas levels." color="blue" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <CodeWindow
                            title="get-gas.bash"
                            code={`curl https://your-api.example.com/api/treasury/gas/reserves \\
  -u sk_test_...:`}
                        />
                    </div>
                </div>
            </section>

            {/* --- ENDPOINT: UPDATE STRATEGY --- */}
            <section className="space-y-6 pt-12 border-t border-[#d9d6cd]">
                <div className="flex items-center gap-3 mb-4">
                    <Badge className="bg-purple-500/10 text-[#087f5b] py-1 px-3 border border-purple-500/20 font-mono text-[10px]">PATCH</Badge>
                    <code className="text-lg font-mono text-[#20211e]">/api/treasury/gas/strategy</code>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#20211e]">Update Strategy</h2>
                        <p className="text-[#575750] text-sm">
                            Configure automatic gas refill thresholds and maximum priority fees.
                        </p>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-[#77766e] uppercase tracking-widest">Response Codes</h3>
                            <div className="space-y-2">
                                <ResponseCode code="200 OK" desc="Strategy updated successfully." color="emerald" />
                                <ResponseCode code="400 Bad Request" desc="Invalid fee parameters." color="zinc" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <CodeWindow
                            title="update-strategy.bash"
                            code={`curl -X PATCH https://your-api.example.com/api/treasury/gas/strategy \\
  -d auto_refill=true \\
  -d min_reserve=0.5 \\
  -d max_gwei=150`}
                        />
                    </div>
                </div>
            </section>

            {/* Network Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-12">
                {[
                    { net: "Ethereum Mainnet", health: "Optimal", color: "text-[#087f5b]" },
                    { net: "Polygon PoS", health: "Slight Delay", color: "text-[#9a6b12]" },
                    { net: "Arbitrum One", health: "Optimal", color: "text-[#087f5b]" }
                ].map((item, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-[#f5f3ee]/50 border border-[#d9d6cd] flex items-center justify-between">
                        <span className="text-xs font-medium text-[#20211e]">{item.net}</span>
                        <div className="flex items-center gap-2 text-[10px]">
                            <div className={cn("w-1.5 h-1.5 rounded-full", item.color === "text-[#087f5b]" ? "bg-emerald-500" : "bg-amber-500")} />
                            <span className={item.color}>{item.health}</span>
                        </div>
                    </div>
                ))}
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

