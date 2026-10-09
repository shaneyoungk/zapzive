import { DocCallout } from "@/components/docs/DocCallout";
import { CodeWindow } from "@/components/docs/CodeWindow";
import { Badge } from "@/components/ui/badge";
import { Layers, Zap, Clock, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BatchProcessing() {
    return (
        <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20">
            {/* Hero Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <Badge variant="outline" className="bg-blue-500/5 text-[#087f5b] border-blue-400/20 px-3 py-1">
                        Sandbox workflow
                    </Badge>
                    <div className="h-px flex-1 bg-gradient-to-r from-blue-500/20 to-transparent" />
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-[#20211e] sm:text-5xl">
                    Batch <span className="text-[#087f5b]">Processing</span>
                </h1>
                <p className="text-lg text-[#575750] leading-relaxed max-w-2xl">
                    Create a payroll batch with one request, validate every worker, and keep the batch state available for review.
                </p>
            </div>

            <DocCallout icon={Layers} title="Atomic Batches">
                The sandbox validates the worker list and amounts before creating the batch. If validation fails, the batch is not created and the response explains what needs to change.
            </DocCallout>

            {/* --- ENDPOINT: CREATE BATCH --- */}
            <section className="space-y-6 pt-12 border-t border-[#d9d6cd]">
                <div className="flex items-center gap-3 mb-4">
                    <Badge className="bg-emerald-500/10 text-[#087f5b] py-1 px-3 border border-emerald-500/20 font-mono text-[10px]">POST</Badge>
                    <code className="text-lg font-mono text-[#20211e]">/api/payroll/batches</code>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#20211e]">Initiate Batch</h2>
                        <p className="text-[#575750] text-sm">
                            Submit one name, a `workerIds` array, and an `amounts` array with matching positions. Every worker must belong to the authenticated company and be verified.
                        </p>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-[#77766e] uppercase tracking-widest">Response Codes</h3>
                            <div className="space-y-2">
                                <ResponseCode code="201 Created" desc="Sandbox batch record created." color="emerald" />
                                <ResponseCode code="409 Conflict" desc="A worker is not eligible for payroll." color="zinc" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <CodeWindow
                            title="create-batch.bash"
                            code={`curl -X POST "$API_BASE_URL/api/payroll/batches" \\
  -H "Authorization: Bearer $ZAPZIVE_TEST_KEY" \\
  -H "Idempotency-Key: payroll-demo-001" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"October payroll","workerIds":["worker_1","worker_2"],"amounts":[250,180]}'`}
                        />
                    </div>
                </div>
            </section>

            {/* --- ENDPOINT: GET BATCH --- */}
            <section className="space-y-6 pt-12 border-t border-[#d9d6cd]">
                <div className="flex items-center gap-3 mb-4">
                    <Badge className="bg-blue-500/10 text-[#087f5b] py-1 px-3 border border-blue-500/20 font-mono text-[10px]">GET</Badge>
                    <code className="text-lg font-mono text-[#20211e]">/api/payroll/batches/:id</code>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#20211e]">Batch Status</h2>
                        <p className="text-[#575750] text-sm">
                            Retrieve the persisted sandbox state and payment rows for a batch.
                        </p>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-[#77766e] uppercase tracking-widest">Response Codes</h3>
                            <div className="space-y-2">
                                <ResponseCode code="200 OK" desc="Batch details returned." color="blue" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <CodeWindow
                            title="get-batch.bash"
                            code={`curl https://your-api.example.com/api/payroll/batches/bat_772`}
                        />
                    </div>
                </div>
            </section>

            {/* Batch Workflow Recap */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
                {[
                    { title: "Validation", desc: "Balance check & KYC verification of all recipients.", icon: Zap },
                    { title: "Execution", desc: "Parallel processing across local clearing houses.", icon: Clock },
                    { title: "Reporting", desc: "Automated ledger generation and tax receipts.", icon: FileText }
                ].map((item, i) => (
                    <div key={i} className="p-6 rounded-3xl bg-[#fffdf8] border border-[#d9d6cd] space-y-3">
                        <item.icon className="w-5 h-5 text-[#087f5b]" />
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

