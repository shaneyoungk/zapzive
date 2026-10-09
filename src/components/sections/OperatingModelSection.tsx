import { ArrowRight, CircleCheck, FileCheck2, Landmark, LockKeyhole, Send, ShieldCheck, WalletCards } from "lucide-react";

const flows = [
  { icon: WalletCards, label: "Treasury", detail: "Set aside and track funds" },
  { icon: Send, label: "Payroll", detail: "Pay a team in one batch" },
  { icon: Landmark, label: "Remittance", detail: "Review a send before delivery" },
  { icon: LockKeyhole, label: "Escrow", detail: "Hold funds until work is approved" },
];

const controls = [
  { icon: ShieldCheck, label: "Approvals", detail: "Choose who can release" },
  { icon: CircleCheck, label: "Clear status", detail: "See what needs action" },
  { icon: FileCheck2, label: "Activity record", detail: "Know what happened and when" },
  { icon: ArrowRight, label: "Reconciliation", detail: "Check the result against the plan" },
];

export function OperatingModelSection() {
  return <section id="operating-model" className="border-b border-[#d9d6cd] bg-[#fffdf8] px-6 py-24 sm:py-32">
    <div className="homepage-frame">
      <div className="grid gap-8 lg:grid-cols-[.95fr_1.05fr] lg:items-end">
        <div><p className="homepage-eyebrow">One way of working</p><h2 className="homepage-title">Different money jobs.<br /><em>The same clear process.</em></h2></div>
        <p className="homepage-copy lg:justify-self-end">Whether you are paying a team, sending money, managing balances, or holding an escrow payment, the process stays familiar from start to finish.</p>
      </div>

      <div className="mt-14 grid border-y border-[#d9d6cd] lg:grid-cols-[minmax(0,1fr)_220px_minmax(0,1fr)]">
        <div className="grid sm:grid-cols-2">
          {flows.map(({ icon: Icon, label, detail }, index) => <div key={label} className={`flex items-start gap-3 py-6 ${index ? "border-t border-[#d9d6cd] sm:border-t-0" : ""} ${index % 2 ? "sm:border-l sm:border-[#d9d6cd] sm:pl-6" : "sm:pr-6"} ${index > 1 ? "sm:border-t sm:border-[#d9d6cd]" : ""}`}><Icon size={18} className="mt-0.5 shrink-0 text-[#087f5b]" strokeWidth={1.8} /><div><p className="text-sm font-bold text-[#20211e]">{label}</p><p className="mt-1 text-sm leading-6 text-[#5d5d56]">{detail}</p></div></div>)}
        </div>

        <div className="hidden items-center justify-center border-x border-[#d9d6cd] px-5 lg:flex"><div className="text-center"><img src="/visuals/operating-model.svg" alt="" aria-hidden="true" className="mx-auto w-44" /><p className="mt-1 font-mono text-[9px] uppercase tracking-[.11em] text-[#087f5b]">Shared record</p></div></div>

        <div className="border-t border-[#d9d6cd] lg:border-t-0">
          {controls.map(({ icon: Icon, label, detail }, index) => <div key={label} className={`flex items-start gap-3 py-6 ${index ? "border-t border-[#d9d6cd]" : ""} lg:pl-8`}><Icon size={18} className="mt-0.5 shrink-0 text-[#087f5b]" strokeWidth={1.8} /><div><p className="text-sm font-bold text-[#20211e]">{label}</p><p className="mt-1 text-sm leading-6 text-[#5d5d56]">{detail}</p></div></div>)}
        </div>
      </div>
    </div>
  </section>;
}
