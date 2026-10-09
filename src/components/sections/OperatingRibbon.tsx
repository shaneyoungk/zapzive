import { ArrowRight, FileCheck2, LockKeyhole, Send, WalletCards } from "lucide-react";

const capabilities = [
  { icon: WalletCards, title: "Fund", detail: "Treasury positions" },
  { icon: LockKeyhole, title: "Control", detail: "Approvals and escrow" },
  { icon: Send, title: "Move", detail: "Payouts and crypto rails" },
  { icon: FileCheck2, title: "Prove", detail: "One usable record" },
];

export function OperatingRibbon() {
  return (
    <section className="relative z-10 px-6 pb-20 sm:pb-28">
      <div className="mx-auto max-w-[1160px]">
        <div className="border-y border-[#d3d0c7]">
          <div className="flex flex-col gap-3 px-0 py-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="mono-label text-[#087f5b]">Built around the work behind a payment</p>
            <p className="text-sm text-[#77766e]">A clear path, from funding through reconciliation.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4">
            {capabilities.map(({ icon: Icon, title, detail }, index) => (
              <div key={title} className={`group relative flex gap-4 py-6 sm:pr-7 ${index ? "border-t border-[#dfdcd4] sm:border-t-0 lg:border-l lg:pl-7" : ""} ${index === 2 ? "sm:border-t lg:border-t-0" : ""}`}>
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center text-[#087f5b] transition group-hover:text-[#11a879]"><Icon size={18} strokeWidth={1.85} /></span>
                <div className="min-w-0"><p className="text-base font-semibold tracking-[-.035em] text-[#20211e]">{title}</p><p className="mt-1 text-sm text-[#77766e]">{detail}</p></div>
                {index < capabilities.length - 1 && <ArrowRight size={14} className="absolute -right-[7px] top-1/2 z-10 hidden -translate-y-1/2 bg-[#f5f3ee] text-[#11a879] lg:block" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
