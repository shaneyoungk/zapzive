import { DocCallout } from "@/components/docs/DocCallout";
import { CodeWindow } from "@/components/docs/CodeWindow";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Clock, Filter, Layers, Database } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CustomReporting() {
    return (
        <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20">
            {/* Hero Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <Badge variant="outline" className="bg-purple-500/5 text-[#087f5b] border-purple-400/20 px-3 py-1">
                        Advanced Export
                    </Badge>
                    <div className="h-px flex-1 bg-gradient-to-r from-purple-500/20 to-transparent" />
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-[#20211e] sm:text-5xl">
                    Custom <span className="text-[#087f5b]">Reporting</span>
                </h1>
                <p className="text-lg text-[#575750] leading-relaxed max-w-2xl">
                    Bespoke datasets for reconciliation. Define your own dimensions, filters, and export formats via our reporting engine.
                </p>
            </div>

            <DocCallout icon={Database} title="Large Dataset Handling">
                Reports containing &gt;100k rows are processed asynchronously. You will receive a webhook notification with a temporary download link once the file is ready.
            </DocCallout>

            {/* --- ENDPOINT: CREATE REPORT --- */}
            <section className="space-y-6 pt-12 border-t border-[#d9d6cd]">
                <div className="flex items-center gap-3 mb-4">
                    <Badge className="bg-emerald-500/10 text-[#087f5b] py-1 px-3 border border-emerald-500/20 font-mono text-[10px]">POST</Badge>
                    <code className="text-lg font-mono text-[#20211e]">/api/analytics/reports</code>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#20211e]">Generate Report</h2>
                        <p className="text-[#575750] text-sm">
                            Create a new report job with custom filtering parameters.
                        </p>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-[#77766e] uppercase tracking-widest">Response Codes</h3>
                            <div className="space-y-2">
                                <ResponseCode code="201 Created" desc="Report job queued." color="emerald" />
                                <ResponseCode code="400 Bad Request" desc="Invalid dimension or filter." color="zinc" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <CodeWindow
                            title="create-report.bash"
                            code={`curl https://your-api.example.com/api/analytics/reports \\
  -d type="transaction_ledger" \\
  -d format="csv" \\
  -d columns[0]="worker_id" \\
  -d columns[1]="net_amount"`}
                        />
                    </div>
                </div>
            </section>

            {/* --- ENDPOINT: GET REPORT --- */}
            <section className="space-y-6 pt-12 border-t border-[#d9d6cd]">
                <div className="flex items-center gap-3 mb-4">
                    <Badge className="bg-blue-500/10 text-[#087f5b] py-1 px-3 border border-blue-500/20 font-mono text-[10px]">GET</Badge>
                    <code className="text-lg font-mono text-[#20211e]">/api/analytics/reports/:id</code>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#20211e]">Report Status</h2>
                        <p className="text-[#575750] text-sm">
                            Check if a report is ready and retrieve the transient download URL.
                        </p>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-[#77766e] uppercase tracking-widest">Response Codes</h3>
                            <div className="space-y-2">
                                <ResponseCode code="200 OK" desc="Returns download link if 'ready'." color="blue" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <CodeWindow
                            title="get-report.bash"
                            code={`curl https://your-api.example.com/api/analytics/reports/rep_882`}
                        />
                    </div>
                </div>
            </section>

            {/* Formats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-12">
                <div className="p-8 rounded-3xl bg-[#f5f3ee]/50 border border-[#d9d6cd] space-y-4">
                    <div className="flex items-center gap-3 text-[#087f5b]">
                        <FileText className="w-5 h-5" />
                        <h4 className="font-bold">JSON / CSV</h4>
                    </div>
                    <p className="text-xs text-[#77766e] leading-relaxed">
                        Standard machine-readable formats for ingestion into your internal accounting systems or data warehouses.
                    </p>
                </div>
                <div className="p-8 rounded-3xl bg-[#f5f3ee]/50 border border-[#d9d6cd] space-y-4">
                    <div className="flex items-center gap-3 text-[#087f5b]">
                        <Download className="w-5 h-5" />
                        <h4 className="font-bold">PDF (Branded)</h4>
                    </div>
                    <p className="text-xs text-[#77766e] leading-relaxed">
                        High-fidelity, branded reports suitable for board meetings or regulatory submissions.
                    </p>
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

