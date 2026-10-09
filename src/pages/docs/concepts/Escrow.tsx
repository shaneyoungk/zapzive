import { Badge } from "@/components/ui/badge";
import { Shield, Lock, Unlock, Gavel } from "lucide-react";

export default function EscrowConcept() {
    return (
        <div className="space-y-16 max-w-5xl">
            <section className="space-y-6">
                <h1 className="text-4xl font-bold text-[#20211e] tracking-tight">Programmable Escrow</h1>
                <p className="text-xl text-[#575750] leading-relaxed max-w-3xl">
                    Move beyond simple transfers. Build complex, trustless agreements that hold funds until
                    real-world conditions are met.
                </p>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-[#20211e]">How it works</h2>
                    <p className="text-[#575750] leading-relaxed">
                        Escrow contracts on zapzive act as logical vaults. You define participants (Client, Contractor),
                        a total budget, and milestones.
                    </p>
                    <ul className="space-y-4">
                        <StepItem icon={<Lock className="w-4 h-4" />} text="Client initiates and funds the contract." />
                        <StepItem icon={<Shield className="w-4 h-4" />} text="Funds are locked in a neutral zapzive vault." />
                        <StepItem icon={<Unlock className="w-4 h-4" />} text="Contractor submits work; Client releases specific milestones." />
                    </ul>
                </div>
                <div className="bg-[#fffdf8] border border-[#d9d6cd] rounded-2xl p-8 space-y-6">
                    <div className="flex items-center gap-2 text-[#9b463c]">
                        <Gavel className="w-5 h-5" />
                        <h3 className="font-bold">Dispute Resolution</h3>
                    </div>
                    <p className="text-sm text-[#77766e] leading-relaxed">
                        If an agreement fails, either party can raise a Dispute. Our automated arbitration system
                        freezes funds and triggers a manual review by zapzive compliance officers.
                    </p>
                    <Badge className="bg-red-500/10 text-[#9b463c] border-red-500/20">Admin Review Guaranteed</Badge>
                </div>
            </div>
        </div>
    );
}

function StepItem({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <li className="flex items-center gap-3 text-sm text-[#575750]">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-[#087f5b] shrink-0">
                {icon}
            </div>
            {text}
        </li>
    );
}

