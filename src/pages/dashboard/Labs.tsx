import { Link } from "react-router-dom";
import { ArrowRight, Coins, FileClock, Globe2, MapPin, Shield, ShieldCheck, Wallet, type LucideIcon } from "lucide-react";
import PageIntro from "@/components/dashboard/PageIntro";
import { Panel } from "@/components/ops";

const LABS: Array<{ href: string; icon: LucideIcon; name: string; status: string; description: string }> = [
    { href: "/dashboard/crypto", icon: Coins, name: "Settlement lab", status: "Technically working on public testnets", description: "Wallet-signed USDC transfers with on-chain confirmation. Kept as research for stablecoin settlement behind providers, not as an operator workflow." },
    { href: "/dashboard/treasury", icon: Wallet, name: "Treasury", status: "Read-only", description: "Chain-level balances of verified wallets. Payout funding lives in Funding; multi-chain treasury is a later phase." },
    { href: "/dashboard/escrow", icon: ShieldCheck, name: "Escrow", status: "Experimental", description: "Milestone settlement sandbox. Not part of the core payout workflow; retained for future milestone-payment research." },
    { href: "/dashboard/remittance", icon: Globe2, name: "Remittance", status: "Superseded", description: "The earlier cross-border module. Cross-border payouts now run as corridors inside Payouts." },
    { href: "/dashboard/compliance", icon: Shield, name: "Compliance records", status: "Sample records", description: "Review records only. Zapzive does not perform KYC, AML or sanctions screening without a connected provider." },
    { href: "/dashboard/agents", icon: MapPin, name: "Agents", status: "Concept", description: "Local payout agent network. No complete workflow yet." },
];

export default function Labs() {
    return (
        <div className="space-y-6">
            <PageIntro title="Labs" description="Earlier and experimental modules kept for future phases. They are sandbox-only and outside the core payout workflow." />
            <Panel title="Experimental modules" id="labs-title">
                <ul className="divide-y divide-[#ece9e1]">
                    {LABS.map((item) => (
                        <li key={item.href}>
                            <Link to={item.href} className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-[#faf9f6]">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f1efe9] text-[#55544d]"><item.icon className="h-[18px] w-[18px]" /></span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex flex-wrap items-center gap-2"><span className="text-[14px] font-semibold text-[#1b1c19]">{item.name}</span><span className="rounded-full bg-[#f1efe9] px-2 py-0.5 text-[11px] font-semibold text-[#6c6b63]">{item.status}</span></span>
                                    <span className="mt-0.5 block text-[13px] leading-6 text-[#74736b]">{item.description}</span>
                                </span>
                                <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-[#9a998f]" />
                            </Link>
                        </li>
                    ))}
                </ul>
            </Panel>
            <p className="flex items-center gap-2 text-xs text-[#8a897f]"><FileClock className="h-3.5 w-3.5" /> The legacy payroll batches are read-only history. New payouts use payout runs.</p>
        </div>
    );
}
