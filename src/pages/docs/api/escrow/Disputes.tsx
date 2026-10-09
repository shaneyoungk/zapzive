import { DocCallout } from "@/components/docs/DocCallout";
import { CodeWindow } from "@/components/docs/CodeWindow";
import { Badge } from "@/components/ui/badge";
import { Gavel, Scale, AlertOctagon, ShieldAlert, MessageSquare, FileWarning } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DisputeArbitration() {
    return (
        <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20">
            {/* Hero Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <Badge variant="outline" className="bg-red-500/5 text-[#9b463c] border-red-400/20 px-3 py-1">
                        Conflict Resolution
                    </Badge>
                    <div className="h-px flex-1 bg-gradient-to-r from-red-500/20 to-transparent" />
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-[#20211e] sm:text-5xl">
                    Dispute <span className="text-[#9b463c]">Arbitration</span>
                </h1>
                <p className="text-lg text-[#575750] leading-relaxed max-w-2xl">
                    Handling the edge cases. When participants disagree, our Kleros-integrated arbitration system steps in to resolve the lock.
                </p>
            </div>

            <DocCallout icon={ShieldAlert} title="Evidence-based Resolution">
                Arbitrators only review evidence submitted within the first 72 hours of a dispute being raised. Ensure your system automatically uploads delivery logs.
            </DocCallout>

            {/* --- ENDPOINT: RAISE DISPUTE --- */}
            <section className="space-y-6 pt-12 border-t border-[#d9d6cd]">
                <div className="flex items-center gap-3 mb-4">
                    <Badge className="bg-red-500/10 text-[#9b463c] py-1 px-3 border border-red-500/20 font-mono text-[10px]">POST</Badge>
                    <code className="text-lg font-mono text-[#20211e]">/api/escrow/contracts/:id/dispute</code>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#20211e]">Raise Dispute</h2>
                        <p className="text-[#575750] text-sm">
                            Freezes the escrow contract and notifies the arbitrator pool.
                        </p>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-[#77766e] uppercase tracking-widest">Response Codes</h3>
                            <div className="space-y-2">
                                <ResponseCode code="201 Created" desc="Dispute raised. Contract frozen." color="red" />
                                <ResponseCode code="403 Forbidden" desc="Contract is already settled." color="zinc" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <CodeWindow
                            title="raise-dispute.bash"
                            code={`curl https://your-api.example.com/api/escrow/contracts/esc_123/dispute \\
  -d reason="undelivered_goods" \\
  -d evidence_url="https://s3.zapzive/ev_991.zip"`}
                        />
                    </div>
                </div>
            </section>

            {/* --- ENDPOINT: GET DISPUTE --- */}
            <section className="space-y-6 pt-12 border-t border-[#d9d6cd]">
                <div className="flex items-center gap-3 mb-4">
                    <Badge className="bg-blue-500/10 text-[#087f5b] py-1 px-3 border border-blue-500/20 font-mono text-[10px]">GET</Badge>
                    <code className="text-lg font-mono text-[#20211e]">/api/escrow/disputes/:id</code>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#20211e]">Dispute Status</h2>
                        <p className="text-[#575750] text-sm">
                            Query the progress of an active arbitration case.
                        </p>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-[#77766e] uppercase tracking-widest">Response Codes</h3>
                            <div className="space-y-2">
                                <ResponseCode code="200 OK" desc="Returns ruling details." color="blue" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <CodeWindow
                            title="get-dispute.bash"
                            code={`curl https://your-api.example.com/api/escrow/disputes/dsp_771`}
                        />
                    </div>
                </div>
            </section>

            {/* Workflow recap */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
                {[
                    { title: "Evidence", desc: "Automated aggregation of logs and Receipts.", icon: FileWarning },
                    { title: "Arbitration", desc: "Third-party cryptographic jury review.", icon: Gavel },
                    { title: "Ruling", desc: "Funds allocated based on consensus decision.", icon: Scale }
                ].map((item, i) => (
                    <div key={i} className="p-6 rounded-3xl bg-[#f5f3ee]/40 border border-[#d9d6cd] space-y-3">
                        <item.icon className="w-5 h-5 text-[#9b463c]" />
                        <h4 className="font-bold text-[#20211e] text-sm">{item.title}</h4>
                        <p className="text-xs text-[#77766e] leading-relaxed">{item.desc}</p>
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

