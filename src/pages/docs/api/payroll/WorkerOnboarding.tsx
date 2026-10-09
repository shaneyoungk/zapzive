import { DocCallout } from "@/components/docs/DocCallout";
import { CodeWindow } from "@/components/docs/CodeWindow";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, ShieldCheck, Mail, CreditCard, Building } from "lucide-react";
import { cn } from "@/lib/utils";

export default function WorkerOnboarding() {
    return (
        <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20">
            {/* Hero Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <Badge variant="outline" className="bg-emerald-500/5 text-[#087f5b] border-emerald-400/20 px-3 py-1">
                        Compliance First
                    </Badge>
                    <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/20 to-transparent" />
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-[#20211e] sm:text-5xl">
                    Worker <span className="text-[#087f5b]">Onboarding</span>
                </h1>
                <p className="text-lg text-[#575750] leading-relaxed max-w-2xl">
                    Onboard contractors and employees globally. We handle the complexity of local tax IDs and banking validations.
                </p>
            </div>

            <DocCallout icon={ShieldCheck} title="Verified Identities">
                All workers must pass a basic sanction check before their first payment. This is handled automatically during the onboarding POST request.
            </DocCallout>

            {/* --- ENDPOINT: CREATE WORKER --- */}
            <section className="space-y-6 pt-12 border-t border-[#d9d6cd]">
                <div className="flex items-center gap-3 mb-4">
                    <Badge className="bg-emerald-500/10 text-[#087f5b] py-1 px-3 border border-emerald-500/20 font-mono text-[10px]">POST</Badge>
                    <code className="text-lg font-mono text-[#20211e]">/api/payroll/workers</code>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#20211e]">Onboard Worker</h2>
                        <p className="text-[#575750] text-sm">
                            Register a new worker with their personal and banking details.
                        </p>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-[#77766e] uppercase tracking-widest">Response Codes</h3>
                            <div className="space-y-2">
                                <ResponseCode code="201 Created" desc="Worker successfully registered." color="emerald" />
                                <ResponseCode code="409 Conflict" desc="Worker with this email already exists." color="zinc" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <CodeWindow
                            title="onboard-worker.bash"
                            code={`curl https://your-api.example.com/api/payroll/workers \\
  -d name="Alice Smith" \\
  -d email="alice@example.com" \\
  -d country="GB" \\
  -d bank_account[sort_code]="10-20-30" \\
  -d bank_account[number]="12345678"`}
                        />
                    </div>
                </div>
            </section>

            {/* --- ENDPOINT: GET WORKER --- */}
            <section className="space-y-6 pt-12 border-t border-[#d9d6cd]">
                <div className="flex items-center gap-3 mb-4">
                    <Badge className="bg-blue-500/10 text-[#087f5b] py-1 px-3 border border-blue-500/20 font-mono text-[10px]">GET</Badge>
                    <code className="text-lg font-mono text-[#20211e]">/api/payroll/workers/:id</code>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#20211e]">Retrieve Worker</h2>
                        <p className="text-[#575750] text-sm">
                            Get worker details and verification status.
                        </p>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-[#77766e] uppercase tracking-widest">Response Codes</h3>
                            <div className="space-y-2">
                                <ResponseCode code="200 OK" desc="Worker details returned." color="blue" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <CodeWindow
                            title="get-worker.bash"
                            code={`curl https://your-api.example.com/api/payroll/workers/wkr_881`}
                        />
                    </div>
                </div>
            </section>

            {/* Verification Steps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-12">
                <div className="p-8 rounded-3xl bg-[#f5f3ee]/50 border border-[#d9d6cd] space-y-4">
                    <div className="flex items-center gap-3 text-[#087f5b]">
                        <Building className="w-5 h-5" />
                        <h4 className="font-bold">Banking Validation</h4>
                    </div>
                    <p className="text-xs text-[#77766e] leading-relaxed">
                        We perform MOD-10 and local clearing house checks on all account numbers before accepting them.
                    </p>
                </div>
                <div className="p-8 rounded-3xl bg-[#f5f3ee]/50 border border-[#d9d6cd] space-y-4">
                    <div className="flex items-center gap-3 text-[#087f5b]">
                        <ShieldCheck className="w-5 h-5" />
                        <h4 className="font-bold">Sanctions (OFAC/EU)</h4>
                    </div>
                    <p className="text-xs text-[#77766e] leading-relaxed">
Persisted review status can be used to hold a worker before payout. External identity and sanctions providers are not connected in the current sandbox.
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

