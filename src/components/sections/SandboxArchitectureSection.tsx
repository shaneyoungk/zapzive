import { ArrowRight, Check, FlaskConical, Network, ShieldCheck } from "lucide-react";

const layers = [
  {
    icon: Network,
    title: "Plan the work",
    copy: "Create a sample payroll batch, transfer, balance move, or escrow release.",
  },
  {
    icon: ShieldCheck,
    title: "Choose the checks",
    copy: "Set the approval and review steps that need to happen before a release.",
  },
  {
    icon: FlaskConical,
    title: "Review the result",
    copy: "Inspect the sample outcome, status history, and audit record in one place.",
  },
];

export function SandboxArchitectureSection() {
  return (
    <section className="homepage-dark relative overflow-hidden border-b border-[#34352f] px-6 py-24 sm:py-32">
      <div className="homepage-frame relative grid gap-14 lg:grid-cols-[minmax(0,.83fr)_minmax(0,1.17fr)] lg:items-center lg:gap-24">
        <div>
          <p className="homepage-eyebrow"><FlaskConical size={14} /> Sandbox, not live money</p>
          <h2 className="homepage-title">
            Try the full flow.<br />
            <em>Keep the risk out.</em>
          </h2>
          <p className="homepage-copy">
            Explore how a payment moves from setup to review without connecting a bank, custody account, blockchain rail, or compliance provider.
          </p>
          <div className="mt-8 inline-flex items-center gap-2 border border-[#7de0bf]/40 bg-[#7de0bf]/10 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[.12em] text-[#9ae6c9]">
            <Check size={14} /> Safe test environment
          </div>
        </div>

        <div className="border-y border-[#ffffff26]">
          <div>
            {layers.map(({ icon: Icon, title, copy }, index) => (
              <div key={title} className="grid gap-4 border-b border-[#ffffff1f] py-6 last:border-b-0 sm:grid-cols-[48px_minmax(0,1fr)_auto] sm:items-start sm:gap-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#7de0bf]/30 bg-[#7de0bf]/10 text-[#7de0bf]">
                  <Icon size={18} strokeWidth={1.8} />
                </span>
                <div>
                  <h3 className="text-xl font-bold tracking-[-.045em] text-[#fffdf8]">{title}</h3>
                  <p className="mt-2 max-w-md text-[15px] leading-7 text-[#d5d4cb]">{copy}</p>
                </div>
                <span className="font-mono text-[11px] font-semibold tracking-[.12em] text-[#7de0bf]">0{index + 1}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ffffff26] py-5 text-sm">
            <span className="font-semibold text-[#f1efe8]">No live funds move in this environment.</span>
            <span className="inline-flex items-center gap-2 font-medium text-[#9ae6c9]">Inspect each state <ArrowRight size={15} /></span>
          </div>
        </div>
      </div>
    </section>
  );
}
