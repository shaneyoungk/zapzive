import { CodeWindow } from "@/components/docs/CodeWindow";
import { DocCallout } from "@/components/docs/DocCallout";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, MapPin, ShieldCheck, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AgentsAPI() {
    return (
        <div className="space-y-16 max-w-5xl">
            <div>
                <div className="flex items-center gap-3 mb-6">
                    <h1 className="text-4xl font-bold text-[#20211e] tracking-tight">Agents API</h1>
                    <Badge variant="outline" className="border-emerald-500/20 text-[#087f5b]">Distribution Network</Badge>
                </div>
                <p className="text-xl text-[#575750] leading-relaxed max-w-3xl">
                    Manage your field agent network. Our Agents API allows you to register cash-in/cash-out points,
                    track agent balances, and manage terminal IDs globally.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <DocCallout type="info" title="What is an Agent?">
                    In the zapzive ecosystem, an Agent is a verified physical location authorized to perform last-mile cash disbursements.
                </DocCallout>
                <DocCallout type="warning" title="Anti-Terrorism Finance">
                    Agents are subject to Enhanced Due Diligence (EDD). Attempting to bypass verification will result in immediate suspension.
                </DocCallout>
            </div>

            {/* --- ENDPOINT: REGISTER AGENT --- */}
            <section className="space-y-8">
                <div className="flex items-center gap-3">
                    <Badge className="bg-emerald-500/10 text-[#087f5b] py-1 px-3 border border-emerald-500/20 font-mono">POST</Badge>
                    <code className="text-xl font-mono text-[#20211e]">/api/agents</code>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#20211e]">Register Agent</h2>
                        <p className="text-[#575750] leading-relaxed">
                            Create a new node in your distribution network.
                        </p>

                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-[#77766e] uppercase tracking-wider">Response Codes</h3>
                            <ResponseCode code="201 Created" desc="Agent registered and verified." color="emerald" />
                            <ResponseCode code="400 Bad Request" desc="Invalid geolocation data." color="zinc" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <CodeWindow
                            language="bash"
                            title="cURL"
                            code={`curl https://your-api.example.com/api/agents \\
  -u sk_test_...: \\
  -d name="Lagos Downtown Branch" \\
  -d location="6.5244, 3.3792"`}
                        />
                        <CodeWindow
                            language="json"
                            title="Response"
                            code={`{
  "id": "agn_224466",
  "status": "verified",
  "region": "NG"
}`}
                        />
                    </div>
                </div>
            </section>

            {/* --- ENDPOINT: LIST AGENTS --- */}
            <section className="space-y-8 py-16 border-t border-[#d9d6cd]">
                <div className="flex items-center gap-3">
                    <Badge className="bg-blue-500/10 text-[#087f5b] py-1 px-3 border border-blue-500/20 font-mono">GET</Badge>
                    <code className="text-xl font-mono text-[#20211e]">/api/agents</code>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#20211e]">List all agents</h2>
                        <p className="text-[#575750]">
                            Query all registered payout nodes within your network.
                        </p>
                        <ResponseCode code="200 OK" desc="List of agents returned." color="blue" />
                    </div>
                </div>
            </section>

            <DocCallout type="mistake" title="Terminal Overlap">
                Never use the same Terminal ID for multiple agents. This will cause reconciliation failures and trigger a manual security audit.
            </DocCallout>

            {/* Management grid */}
            <section className="bg-emerald-500/5 border border-emerald-500/10 rounded-3xl p-10">
                <h2 className="text-2xl font-bold text-[#20211e] mb-8 flex items-center gap-3 text-[#087f5b]">
                    <Zap className="w-6 h-6" /> Management Workflow
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <WorkflowBox title="Onboarding" desc="Automatic KYC/KYB background checks." />
                    <WorkflowBox title="Disbursement" desc="Lock funds for local cash collection." />
                    <WorkflowBox title="Commission" desc="Automated real-time revenue splitting." />
                </div>
            </section>

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

function WorkflowBox({ title, desc }: { title: string; desc: string }) {
    return (
        <div className="space-y-2">
            <h3 className="font-bold text-[#20211e]">{title}</h3>
            <p className="text-sm text-[#77766e] leading-relaxed">{desc}</p>
        </div>
    );
}

