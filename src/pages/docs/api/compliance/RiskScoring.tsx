import { DocCallout } from "@/components/docs/DocCallout";
import { CodeWindow } from "@/components/docs/CodeWindow";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, BarChart, Search, AlertOctagon, Scale, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export default function RiskScoring() {
    return (
        <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20">
            {/* Hero Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <Badge variant="outline" className="bg-red-500/5 text-[#9b463c] border-red-400/20 px-3 py-1">
                        High Assurance
                    </Badge>
                    <div className="h-px flex-1 bg-gradient-to-r from-red-500/20 to-transparent" />
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-[#20211e] sm:text-5xl">
                    Risk <span className="text-[#9b463c]">Scoring</span>
                </h1>
                <p className="text-lg text-[#575750] leading-relaxed max-w-2xl">
                    Every transaction and user is assigned a real-time risk score. Protect your platform from fraud, money laundering, and high-risk behavior.
                </p>
            </div>

            <DocCallout icon={ShieldAlert} title="Behavioral Analysis">
                Our risk engine looks beyond static data, analyzing velocity, device fingerprinting, and corridor-specific patterns to flag anomalies before they settle.
            </DocCallout>

            {/* --- ENDPOINT: GET SCORE --- */}
            <section className="space-y-6 pt-12 border-t border-[#d9d6cd]">
                <div className="flex items-center gap-3 mb-4">
                    <Badge className="bg-blue-500/10 text-[#087f5b] py-1 px-3 border border-blue-500/20 font-mono text-[10px]">GET</Badge>
                    <code className="text-lg font-mono text-[#20211e]">/api/compliance/risk/:worker_id</code>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#20211e]">Retrieve Risk Score</h2>
                        <p className="text-[#575750] text-sm">
                            Query the summarized risk profile for a specific worker.
                        </p>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-[#77766e] uppercase tracking-widest">Response Codes</h3>
                            <div className="space-y-2">
                                <ResponseCode code="200 OK" desc="Score and factors returned." color="blue" />
                                <ResponseCode code="404 Not Found" desc="ID not found in risk engine." color="zinc" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <CodeWindow
                            title="get-risk.bash"
                            code={`curl https://your-api.example.com/api/compliance/risk/wkr_772`}
                        />
                        <CodeWindow
                            title="Risk Object"
                            language="json"
                            code={`{
  "score": 82,
  "level": "low",
  "factors": [
    { "key": "velocity", "impact": "negative", "desc": "Normal pattern" },
    { "key": "geolocation", "impact": "positive", "desc": "Mismatched IP/Bank" }
  ]
}`}
                        />
                    </div>
                </div>
            </section>

            {/* --- ENDPOINT: ADD OVERRIDE --- */}
            <section className="space-y-6 pt-12 border-t border-[#d9d6cd]">
                <div className="flex items-center gap-3 mb-4">
                    <Badge className="bg-purple-500/10 text-[#087f5b] py-1 px-3 border border-purple-500/20 font-mono text-[10px]">POST</Badge>
                    <code className="text-lg font-mono text-[#20211e]">/api/compliance/risk/overrides</code>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#20211e]">Manual Override</h2>
                        <p className="text-[#575750] text-sm">
                            Whitelist or blacklist a specific worker ID regardless of their algorithmic risk score.
                        </p>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-[#77766e] uppercase tracking-widest">Response Codes</h3>
                            <div className="space-y-2">
                                <ResponseCode code="201 Created" desc="Override applied and logged." color="emerald" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <CodeWindow
                            title="apply-override.bash"
                            code={`curl https://your-api.example.com/api/compliance/risk/overrides \\
  -d worker_id="wkr_772" \\
  -d action="whitelist" \\
  -d note="Legacy partner approval"`}
                        />
                    </div>
                </div>
            </section>

            {/* Threshold Card */}
            <div className="p-8 rounded-3xl bg-[#f5f3ee]/50 border border-[#d9d6cd] space-y-6">
                <h3 className="text-xl font-bold text-[#20211e]">Risk Thresholds</h3>
                <div className="flex flex-col md:flex-row gap-4">
                    {[
                        { label: "Low (0-30)", outcome: "Automatic Approval", color: "text-[#087f5b]" },
                        { label: "Medium (31-70)", outcome: "Additional Auth Required", color: "text-[#9a6b12]" },
                        { label: "High (71-100)", outcome: "Manual Compliance Review", color: "text-[#9b463c]" }
                    ].map((row, i) => (
                        <div key={i} className="flex-1 p-4 rounded-2xl bg-[#20211e] border border-[#d9d6cd] space-y-1">
                            <span className={cn("text-[10px] font-bold uppercase", row.color)}>{row.label}</span>
                            <p className="text-xs text-[#20211e] font-medium">{row.outcome}</p>
                        </div>
                    ))}
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

