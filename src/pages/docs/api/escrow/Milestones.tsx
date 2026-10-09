import { DocCallout } from "@/components/docs/DocCallout";
import { CodeWindow } from "@/components/docs/CodeWindow";
import { Badge } from "@/components/ui/badge";
import { ListChecks, GitMerge, ShieldCheck, Zap, Workflow, FileCode, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MilestoneLogic() {
    return (
        <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20">
            {/* Hero Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <Badge variant="outline" className="bg-indigo-500/5 text-indigo-400 border-indigo-400/20 px-3 py-1">
                        Programmable Trust
                    </Badge>
                    <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/20 to-transparent" />
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-[#20211e] sm:text-5xl">
                    Milestone <span className="text-indigo-400">Logic</span>
                </h1>
                <p className="text-lg text-[#575750] leading-relaxed max-w-2xl">
                    Break down complex projects into verifiable payment triggers. Use multi-sig or oracle-based release conditions.
                </p>
            </div>

            <DocCallout icon={Workflow} title="Condition Auditing">
                Every milestone release is logged on-chain with a cryptographic proof of the met condition (e.g., a GitHub commit hash or signed delivery receipt).
            </DocCallout>

            {/* --- ENDPOINT: ADD MILESTONE --- */}
            <section className="space-y-6 pt-12 border-t border-[#d9d6cd]">
                <div className="flex items-center gap-3 mb-4">
                    <Badge className="bg-emerald-500/10 text-[#087f5b] py-1 px-3 border border-emerald-500/20 font-mono text-[10px]">POST</Badge>
                    <code className="text-lg font-mono text-[#20211e]">/api/escrow/contracts/:id/milestones</code>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#20211e]">Add/Append Milestone</h2>
                        <p className="text-[#575750] text-sm">
                            Define a new milestone for an existing contract. Requires approval from all signers.
                        </p>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-[#77766e] uppercase tracking-widest">Response Codes</h3>
                            <div className="space-y-2">
                                <ResponseCode code="201 Created" desc="Milestone proposal submitted." color="emerald" />
                                <ResponseCode code="403 Forbidden" desc="Contract is already locked." color="zinc" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <CodeWindow
                            title="add-milestone.bash"
                            code={`curl https://your-api.example.com/api/escrow/contracts/esc_123/milestones \\
  -d title="Frontend V2 completion" \\
  -d amount=400000 \\
  -d validator_id="vld_992"`}
                        />
                    </div>
                </div>
            </section>

            {/* --- ENDPOINT: APPROVE RELEASE --- */}
            <section className="space-y-6 pt-12 border-t border-[#d9d6cd]">
                <div className="flex items-center gap-3 mb-4">
                    <Badge className="bg-blue-500/10 text-[#087f5b] py-1 px-3 border border-blue-500/20 font-mono text-[10px]">POST</Badge>
                    <code className="text-lg font-mono text-[#20211e]">/api/escrow/milestones/:id/approve</code>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#20211e]">Approve Milestone</h2>
                        <p className="text-[#575750] text-sm">
                            Cast a vote to approve the release of funds for a specific milestone.
                        </p>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-[#77766e] uppercase tracking-widest">Response Codes</h3>
                            <div className="space-y-2">
                                <ResponseCode code="200 OK" desc="Approval logged. Funds released if threshold met." color="blue" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <CodeWindow
                            title="approve-milestone.bash"
                            code={`curl https://your-api.example.com/api/escrow/milestones/ms_771/approve \\
  -d signature="0x9a2b..."`}
                        />
                    </div>
                </div>
            </section>

            {/* Visualizer */}
            <div className="p-8 rounded-3xl bg-[#f5f3ee]/50 border border-[#d9d6cd] space-y-6">
                <h3 className="text-xl font-bold text-[#20211e]">Milestone Lifecycle</h3>
                <div className="flex items-center gap-4">
                    <div className="px-3 py-1.5 rounded-lg bg-[#f5f3ee] text-[10px] font-bold text-[#575750]">PROPOSED</div>
                    <ArrowRightLeft className="w-4 h-4 text-[#77766e]" />
                    <div className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-[10px] font-bold text-[#087f5b]">SIGNING</div>
                    <ArrowRightLeft className="w-4 h-4 text-[#77766e]" />
                    <div className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-[10px] font-bold text-[#087f5b]">RELEASED</div>
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

