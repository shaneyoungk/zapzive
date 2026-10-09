import { ArrowRight, Building2, CheckCircle2, MapPin, Radio, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const capabilities = [
    { icon: Smartphone, title: "Mobile money", description: "Route payouts to supported mobile wallets with delivery confirmation." },
    { icon: Building2, title: "Bank settlement", description: "Use verified local banking partners for account-based delivery." },
    { icon: MapPin, title: "Cash pickup", description: "Coordinate compliant cash collection through approved locations." },
];

export default function Agents() {
    const navigate = useNavigate();

    return (
        <div className="space-y-6">
            <section className="premium-card overflow-hidden">
                <div className="grid lg:grid-cols-[1.15fr_.85fr]">
                    <div className="p-7 sm:p-9 lg:p-12">
                        <span className="status-chip"><Radio className="h-3 w-3" /> Institutional beta</span>
                        <p className="dashboard-eyebrow mt-9">Local payout network</p>
                        <h1 className="mt-3 max-w-2xl text-4xl sm:text-5xl">Local delivery, managed from one workspace.</h1>
                        <p className="mt-5 max-w-xl text-base leading-7 text-[#575750]">The agent network extends Zapzive settlement into supported bank, mobile-money, and cash-out corridors with the operational record attached.</p>
                        <div className="mt-8 flex flex-wrap items-center gap-3">
                            <Button onClick={() => navigate("/contact")}>Join the beta <ArrowRight className="h-4 w-4" /></Button>
                            <Button variant="outline" onClick={() => navigate("/docs")}>Read integration guide</Button>
                        </div>
                    </div>
                    <div className="border-t border-[#d9d6cd] bg-[#e8eee4] p-7 sm:p-9 lg:border-l lg:border-t-0 lg:p-12">
                        <p className="metric-label">Rollout readiness</p>
                        <div className="mt-7 space-y-5">
                            {["Partner due diligence", "Payout status webhooks", "Settlement reconciliation"].map((item, index) => (
                                <div key={item} className="flex items-center gap-3 border-b border-[#cdd8c8] pb-5 last:border-0 last:pb-0">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#b9d9cc] bg-[#fffdf8] font-mono text-[9px] text-[#087f5b]">0{index + 1}</span>
                                    <span className="flex-1 text-sm font-semibold text-[#20211e]">{item}</span>
                                    <CheckCircle2 className="h-4 w-4 text-[#087f5b]" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section>
                <div className="mb-4"><p className="dashboard-eyebrow">Coverage model</p><h2 className="mt-2 text-2xl">Three local delivery paths.</h2></div>
                <div className="grid gap-4 md:grid-cols-3">
                    {capabilities.map(({ icon: Icon, title, description }) => (
                        <article key={title} className="premium-card p-6">
                            <span className="dashboard-icon h-10 w-10"><Icon className="h-[18px] w-[18px]" /></span>
                            <h3 className="mt-7 text-lg">{title}</h3>
                            <p className="mt-3 text-sm leading-6 text-[#77766e]">{description}</p>
                        </article>
                    ))}
                </div>
            </section>
        </div>
    );
}
