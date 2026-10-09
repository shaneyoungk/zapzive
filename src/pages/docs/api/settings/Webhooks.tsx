import { DocCallout } from "@/components/docs/DocCallout";
import { CodeWindow } from "@/components/docs/CodeWindow";
import { Badge } from "@/components/ui/badge";
import { Bell, Zap, ShieldCheck, RefreshCw, Radio, Link } from "lucide-react";
import { cn } from "@/lib/utils";

export default function WebhookManagement() {
    return (
        <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20">
            {/* Hero Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <Badge variant="outline" className="bg-blue-500/5 text-[#087f5b] border-blue-400/20 px-3 py-1">
                        Events Engine
                    </Badge>
                    <div className="h-px flex-1 bg-gradient-to-r from-blue-500/20 to-transparent" />
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-[#20211e] sm:text-5xl">
                    Webhook <span className="text-[#087f5b]">Management</span>
                </h1>
                <p className="text-lg text-[#575750] leading-relaxed max-w-2xl">
                    Build reactive applications. Get real-time notifications for payment settlements, worker status changes, and treasury alerts.
                </p>
            </div>

            <DocCallout icon={ShieldCheck} title="Signed Payloads">
                All webhook requests include a `zapzive-Signature` header. Always verify this signature using your endpoint's signing secret to prevent spoofing attacks.
            </DocCallout>

            {/* --- ENDPOINT: CREATE WEBHOOK --- */}
            <section className="space-y-6 pt-12 border-t border-[#d9d6cd]">
                <div className="flex items-center gap-3 mb-4">
                    <Badge className="bg-emerald-500/10 text-[#087f5b] py-1 px-3 border border-emerald-500/20 font-mono text-[10px]">POST</Badge>
                    <code className="text-lg font-mono text-[#20211e]">/api/settings/webhooks</code>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#20211e]">Register Endpoint</h2>
                        <p className="text-[#575750] text-sm">
                            Subscribe an HTTPS URL to specific platform events.
                        </p>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-[#77766e] uppercase tracking-widest">Response Codes</h3>
                            <div className="space-y-2">
                                <ResponseCode code="201 Created" desc="Webhook successfully registered." color="emerald" />
                                <ResponseCode code="400 Bad Request" desc="Invalid SSL/TLS certificate." color="zinc" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <CodeWindow
                            title="register-webhook.bash"
                            code={`curl https://your-api.example.com/api/settings/webhooks \\
  -d url="https://api.myapp.com/webhooks/zapzive" \\
  -d events[0]="payout.paid" \\
  -d events[1]="payout.failed"`}
                        />
                    </div>
                </div>
            </section>

            {/* --- ENDPOINT: TEST WEBHOOK --- */}
            <section className="space-y-6 pt-12 border-t border-[#d9d6cd]">
                <div className="flex items-center gap-3 mb-4">
                    <Badge className="bg-blue-500/10 text-[#087f5b] py-1 px-3 border border-blue-500/20 font-mono text-[10px]">POST</Badge>
                    <code className="text-lg font-mono text-[#20211e]">/api/settings/webhooks/:id/test</code>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#20211e]">Ping Endpoint</h2>
                        <p className="text-[#575750] text-sm">
                            Sends a `ping` event to your URL to verify connectivity and signature logic.
                        </p>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-[#77766e] uppercase tracking-widest">Response Codes</h3>
                            <div className="space-y-2">
                                <ResponseCode code="200 OK" desc="Ping delivered. 2xx received." color="blue" />
                                <ResponseCode code="502 Bad Gateway" desc="Remote server unreachable." color="red" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <CodeWindow
                            title="test-webhook.bash"
                            code={`curl https://your-api.example.com/api/settings/webhooks/whk_123/test`}
                        />
                    </div>
                </div>
            </section>

            {/* Event List */}
            <div className="p-8 rounded-3xl bg-[#f5f3ee]/40 border border-[#d9d6cd] space-y-4">
                <h4 className="text-sm font-bold text-[#20211e] uppercase tracking-widest">Common Events</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {['payout.paid', 'payout.failed', 'worker.created', 'worker.verified', 'batch.completed', 'treasury.low_balance'].map(e => (
                        <div key={e} className="flex items-center gap-2 text-xs text-[#77766e]">
                            <Radio className="w-3 h-3 text-blue-500" />
                            <code>{e}</code>
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

