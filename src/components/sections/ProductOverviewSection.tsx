import { ArrowRight, CircleDollarSign, FileCheck2, LockKeyhole, ShieldCheck, WalletCards } from "lucide-react";
import { Link } from "react-router-dom";

const modules = [
  { icon: WalletCards, title: "Treasury", action: "Fund and allocate", code: "01" },
  { icon: CircleDollarSign, title: "Payouts", action: "Batch and approve", code: "02" },
  { icon: LockKeyhole, title: "Escrow", action: "Lock and release", code: "03" },
  { icon: ShieldCheck, title: "Compliance", action: "Review and record", code: "04" },
];

export function ProductOverviewSection() {
  return (
    <section id="platform" className="border-y border-[#34352f] bg-[#20211e] px-6 py-20 text-[#f5f3ee] sm:py-28">
      <div className="mx-auto grid max-w-[1160px] gap-14 lg:grid-cols-[.78fr_1.22fr] lg:items-center lg:gap-20">
        <div>
          <p className="mono-label text-[#76d4b5]">The platform</p>
          <h2 className="mt-5 max-w-xl !text-[#f5f3ee] text-4xl font-semibold leading-[.98] tracking-[-.065em] sm:text-6xl">
            One layer.<br /><em className="text-[#11a879]">Every money flow.</em>
          </h2>
          <p className="mt-7 max-w-lg text-lg leading-8 text-[#b9b8b1]">Fund, approve, settle, and reconcile without stitching together separate tools.</p>

          <div className="mt-9 grid max-w-md grid-cols-[1fr_auto_1fr_auto_1fr] items-center border-y border-[#ffffff1a] py-5">
            {[
              ["01", "Fund"],
              ["02", "Control"],
              ["03", "Settle"],
            ].map(([number, label], index) => (
              <div key={label} className="contents">
                <div><p className="font-mono text-[9px] text-[#76d4b5]">{number}</p><p className="mt-1.5 text-sm font-semibold">{label}</p></div>
                {index < 2 && <ArrowRight size={14} className="text-[#575750]" />}
              </div>
            ))}
          </div>

          <Link to="/features" className="mt-8 inline-flex items-center gap-2 border-b border-[#76d4b5] pb-1 text-sm font-semibold text-[#76d4b5]">Explore the platform <ArrowRight size={15} /></Link>
        </div>

        <div className="border-y border-[#ffffff1a] text-[#f5f3ee]">
          <div className="flex flex-col justify-between gap-3 border-b border-[#ffffff1a] py-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center text-[#76d4b5]"><FileCheck2 size={18} /></span><div><p className="text-sm font-semibold">Operating map</p><p className="mono-label mt-1 text-[#77766e]">One connected record</p></div></div>
            <span className="self-start font-mono text-[10px] uppercase tracking-[.1em] text-[#76d4b5] sm:self-auto"><span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[#11a879]" />Active</span>
          </div>

          <div className="relative grid sm:grid-cols-2">
            {modules.map(({ icon: Icon, title, action, code }) => (
              <div key={title} className={`group py-6 transition-colors hover:bg-white/[.025] ${code !== "01" ? "border-t border-[#ffffff1a] sm:border-t-0" : ""} ${code === "02" || code === "04" ? "sm:border-l sm:pl-7" : "sm:pr-7"}`}>
                <div className="flex items-start justify-between gap-4"><span className="flex h-8 w-8 items-center justify-center text-[#76d4b5]"><Icon size={18} strokeWidth={1.8} /></span><span className="font-mono text-[9px] text-[#77766e]">{code}</span></div>
                <h3 className="mt-6 text-xl font-semibold tracking-[-.04em] text-[#f5f3ee]">{title}</h3>
                <p className="mt-2 text-sm text-[#b9b8b1]">{action}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-[#ffffff1a] py-5">
            <p className="mono-label text-[#77766e]">Settlement route</p>
            <div className="mt-4 grid grid-cols-1 items-center gap-3 text-center sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:text-left">
              <div><p className="text-xs font-semibold">Treasury</p><p className="mt-1 font-mono text-[9px] text-[#77766e]">USD</p></div>
              <ArrowRight size={14} className="mx-auto rotate-90 text-[#11a879] sm:rotate-0" />
              <div className="sm:text-center"><p className="text-xs font-semibold text-[#76d4b5]">Control layer</p><p className="mt-1 font-mono text-[9px] text-[#77766e]">USDC rail</p></div>
              <ArrowRight size={14} className="mx-auto rotate-90 text-[#11a879] sm:rotate-0" />
              <div className="sm:text-right"><p className="text-xs font-semibold">Local payout</p><p className="mt-1 font-mono text-[9px] text-[#77766e]">KES</p></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
