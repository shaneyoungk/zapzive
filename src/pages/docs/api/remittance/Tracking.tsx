import { DocCallout } from "@/components/docs/DocCallout";
import { CodeWindow } from "@/components/docs/CodeWindow";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Clock, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TransactionTracking() {
    return (
        <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20">
            {/* Hero Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <Badge variant="outline" className="bg-emerald-500/5 text-[#087f5b] border-emerald-500/20 px-3 py-1">
                        Real-time Ledger
                    </Badge>
                    <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/20 to-transparent" />
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-[#20211e] sm:text-5xl">
                    Transaction <span className="text-[#087f5b]">Tracking</span>
                </h1>
                <p className="text-lg text-[#575750] leading-relaxed max-w-2xl">
                    End-to-end visibility into every transfer. From local rail submission to final proof of payment.
                </p>
            </div>

            <DocCallout icon={Search} title="Idempotency & Tracing">
                Every transaction generates a unique `trace_id` that can be used to query status across our banking partners' internal systems.
            </DocCallout>

            {/* --- ENDPOINT: GET STATUS --- */}
            <section className="space-y-6 pt-12 border-t border-[#d9d6cd]">
                <div className="flex items-center gap-3 mb-4">
                    <Badge className="bg-blue-500/10 text-[#087f5b] py-1 px-3 border border-blue-500/20 font-mono text-[10px]">GET</Badge>
                    <code className="text-lg font-mono text-[#20211e]">/api/remittance/:id</code>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#20211e]">Track Progress</h2>
                        <p className="text-[#575750] text-sm">
                            Returns the current status, estimated arrival time, and rail-specific tracking numbers.
                        </p>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-[#77766e] uppercase tracking-widest">Response Codes</h3>
                            <div className="space-y-2">
                                <ResponseCode code="200 OK" desc="Returns full transaction object." color="blue" />
                                <ResponseCode code="404 Not Found" desc="Transfer ID does not exist." color="zinc" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <CodeWindow
                            title="track-transfer.bash"
                            code={`curl https://your-api.example.com/api/remittance/tr_A9B8C7 \\
  -u sk_test_...:`}
                        />
                        <CodeWindow
                            title="Status Object"
                            language="json"
                            code={`{
  "id": "tr_A9B8C7",
  "status": "in_transit",
  "rail_status": "submitted_to_sepa",
  "eta": "2024-03-24T14:30:00Z",
  "tracking_url": "https://trace.zapzive.com/tr_A9B8C7"
}`}
                        />
                    </div>
                </div>
            </section>

            {/* --- ENDPOINT: UPDATE METADATA --- */}
            <section className="space-y-6 pt-12 border-t border-[#d9d6cd]">
                <div className="flex items-center gap-3 mb-4">
                    <Badge className="bg-purple-500/10 text-[#087f5b] py-1 px-3 border border-purple-500/20 font-mono text-[10px]">PATCH</Badge>
                    <code className="text-lg font-mono text-[#20211e]">/api/remittance/:id</code>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#20211e]">Update Metadata</h2>
                        <p className="text-[#575750] text-sm">
                            Attach custom reference IDs or notes to an existing transaction for easier reconciliation.
                        </p>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-[#77766e] uppercase tracking-widest">Response Codes</h3>
                            <div className="space-y-2">
                                <ResponseCode code="200 OK" desc="Update successful." color="emerald" />
                                <ResponseCode code="403 Forbidden" desc="Cannot update immutable fields." color="zinc" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <CodeWindow
                            title="update-metadata.bash"
                            code={`curl -X PATCH https://your-api.example.com/api/remittance/tr_A9B8C7 \\
  -d metadata[internal_batch_id]="B-992"`}
                        />
                    </div>
                </div>
            </section>

            {/* Status Visualizer Mockup */}
            <div className="bg-[#f5f3ee]/40 border border-[#d9d6cd] p-8 rounded-3xl space-y-8">
                <h3 className="text-xl font-bold text-[#20211e]">Status Lifecyle</h3>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative">
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-[#f5f3ee] -translate-y-1/2 hidden md:block" />
                    {[
                        { label: "Submitted", icon: RefreshCw, active: true },
                        { label: "Banking Rail", icon: Clock, active: true },
                        { label: "Final Clearing", icon: MapPin, active: false },
                        { label: "Settled", icon: CheckCircle2, active: false }
                    ].map((step, i) => (
                        <div key={i} className="relative z-10 flex flex-col items-center gap-2">
                            <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center border transition-colors",
                                step.active ? "bg-emerald-500/10 border-emerald-500/20 text-[#087f5b]" : "bg-black border-[#cdd8c8] text-[#77766e]"
                            )}>
                                <step.icon className="w-5 h-5" />
                            </div>
                            <span className={cn("text-[10px] font-bold uppercase tracking-wider", step.active ? "text-[#087f5b]" : "text-[#77766e]")}>
                                {step.label}
                            </span>
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

