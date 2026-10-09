import { DocCallout } from "@/components/docs/DocCallout";
import { CodeWindow } from "@/components/docs/CodeWindow";
import { Badge } from "@/components/ui/badge";
import { Smartphone, ShieldCheck, UserCheck, Play, ArrowRight, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export default function VerificationFlows() {
    return (
        <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20">
            {/* Hero Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <Badge variant="outline" className="bg-emerald-500/5 text-[#087f5b] border-emerald-400/20 px-3 py-1">
                        Hosted UI
                    </Badge>
                    <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/20 to-transparent" />
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-[#20211e] sm:text-5xl">
                    Verification <span className="text-[#087f5b]">Flows</span>
                </h1>
                <p className="text-lg text-[#575750] leading-relaxed max-w-2xl">
                    Embed high-conversion KYC sessions directly in your app. We handle the heavy lifting of image capture and data extraction.
                </p>
            </div>

            <DocCallout icon={Smartphone} title="Mobile-Optimized">
                Our verification sessions automatically transition to mobile via QR code for users on desktop, ensuring the best possible document photo quality.
            </DocCallout>

            {/* --- ENDPOINT: CREATE SESSION --- */}
            <section className="space-y-6 pt-12 border-t border-[#d9d6cd]">
                <div className="flex items-center gap-3 mb-4">
                    <Badge className="bg-emerald-500/10 text-[#087f5b] py-1 px-3 border border-emerald-500/20 font-mono text-[10px]">POST</Badge>
                    <code className="text-lg font-mono text-[#20211e]">/api/compliance/sessions</code>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#20211e]">Create Session</h2>
                        <p className="text-[#575750] text-sm">
                            Initiate a new hosted verification session and receive a temporary URL.
                        </p>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-[#77766e] uppercase tracking-widest">Response Codes</h3>
                            <div className="space-y-2">
                                <ResponseCode code="201 Created" desc="Session URL generated." color="emerald" />
                                <ResponseCode code="400 Bad Request" desc="Invalid region or config." color="zinc" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <CodeWindow
                            title="create-session.bash"
                            code={`curl https://your-api.example.com/api/compliance/sessions \\
  -d redirect_url="https://your-app.com/done" \\
  -d worker_id="wkr_123"`}
                        />
                    </div>
                </div>
            </section>

            {/* SDK Recap */}
            <div className="bg-[#f5f3ee]/40 border border-[#d9d6cd] p-8 rounded-3xl space-y-6">
                <h3 className="text-xl font-bold text-[#20211e]">Frontend SDK Integration</h3>
                <CodeWindow
                    language="typescript"
                    title="verify.tsx"
                    code={`import { zapziveVerify } from '@zapzive/verify-js';

const startVerification = () => {
  zapziveVerify.init({
    sessionUrl: data.session_url,
    onComplete: (res) => console.log('Verified!', res),
    onCancel: () => console.log('User quit')
  });
};`}
                />
            </div>

            {/* Steps */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
                {[
                    { title: "Configuration", desc: "Set required fields (ID, Selfie, etc).", icon: Zap },
                    { title: "Direct Link", desc: "User completes flow on our domain.", icon: Play },
                    { title: "Webhook", desc: "Receive final status payload.", icon: ArrowRight }
                ].map((item, i) => (
                    <div key={i} className="p-6 rounded-3xl bg-[#f5f3ee]/50 border border-[#d9d6cd] space-y-3">
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

