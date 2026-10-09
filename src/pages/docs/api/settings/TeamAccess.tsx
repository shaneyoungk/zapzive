import { DocCallout } from "@/components/docs/DocCallout";
import { CodeWindow } from "@/components/docs/CodeWindow";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, Key, UserPlus, UserX, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TeamAccess() {
    return (
        <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20">
            {/* Hero Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <Badge variant="outline" className="bg-[#f5f3ee] text-[#575750] border-[#d9d6cd] px-3 py-1">
                        RBAC Infrastructure
                    </Badge>
                    <div className="h-px flex-1 bg-gradient-to-r from-zinc-500/20 to-transparent" />
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-[#20211e] sm:text-5xl">
                    Team <span className="text-[#77766e]">Access</span>
                </h1>
                <p className="text-lg text-[#575750] leading-relaxed max-w-2xl">
                    Manage permissions at scale. Define custom roles and scopes to ensure users only access the data and rails they need.
                </p>
            </div>

            <DocCallout icon={Shield} title="Least Privilege">
                We recommend using scoped API keys for server-to-server communication, limiting them to specific endpoints like `remittance.create` or `analytics.read`.
            </DocCallout>

            {/* --- ENDPOINT: INVITE MEMBER --- */}
            <section className="space-y-6 pt-12 border-t border-[#d9d6cd]">
                <div className="flex items-center gap-3 mb-4">
                    <Badge className="bg-emerald-500/10 text-[#087f5b] py-1 px-3 border border-emerald-500/20 font-mono text-[10px]">POST</Badge>
                    <code className="text-lg font-mono text-[#20211e]">/api/settings/team/invites</code>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#20211e]">Invite Member</h2>
                        <p className="text-[#575750] text-sm">
                            Send an invitation email with a specific role assignment.
                        </p>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-[#77766e] uppercase tracking-widest">Response Codes</h3>
                            <div className="space-y-2">
                                <ResponseCode code="201 Created" desc="Invite sent successfully." color="emerald" />
                                <ResponseCode code="403 Forbidden" desc="Insufficient admin rights." color="zinc" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <CodeWindow
                            title="invite-member.bash"
                            code={`curl https://your-api.example.com/api/settings/team/invites \\
  -d email="ops@example.com" \\
  -d role="treasury_manager"`}
                        />
                    </div>
                </div>
            </section>

            {/* --- ENDPOINT: REMOVE MEMBER --- */}
            <section className="space-y-6 pt-12 border-t border-[#d9d6cd]">
                <div className="flex items-center gap-3 mb-4">
                    <Badge className="bg-red-500/10 text-[#9b463c] py-1 px-3 border border-red-500/20 font-mono text-[10px]">DELETE</Badge>
                    <code className="text-lg font-mono text-[#20211e]">/api/settings/team/members/:id</code>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#20211e]">Remove Member</h2>
                        <p className="text-[#575750] text-sm">
                            Revoke access for a team member and invalidate all their active sessions.
                        </p>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-[#77766e] uppercase tracking-widest">Response Codes</h3>
                            <div className="space-y-2">
                                <ResponseCode code="200 OK" desc="Member access revoked." color="red" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Role List */}
            <div className="bg-[#f5f3ee]/40 border border-[#d9d6cd] p-8 rounded-3xl space-y-4">
                <h4 className="text-sm font-bold text-[#20211e] uppercase tracking-widest">Available Roles</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                        { r: "Admin", d: "Full platform access." },
                        { r: "Developer", d: "API and Webhook management." },
                        { r: "Treasury", d: "Balance and FX swap access." },
                        { r: "Compliance", d: "KYC and Dispute review." }
                    ].map(role => (
                        <div key={role.r} className="space-y-1">
                            <span className="text-xs font-bold text-[#20211e]">{role.r}</span>
                            <p className="text-[10px] text-[#77766e]">{role.d}</p>
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

