import { ArrowRight, CheckCircle2, FileCheck2, Landmark, ShieldCheck, WalletCards } from "lucide-react";
import { Link } from "react-router-dom";

const evidence = [
  { icon: WalletCards, label: "Funding source", value: "Treasury balance" },
  { icon: ShieldCheck, label: "Control state", value: "2 approvals complete" },
  { icon: FileCheck2, label: "Settlement proof", value: "Receipt attached" },
];

export function RecordSection() {
  return (
    <section className="border-t border-[#d9d6cd] bg-[#f5f3ee] px-6 py-24 sm:py-32">
      <div className="mx-auto grid max-w-[1160px] gap-12 lg:grid-cols-[.72fr_1.28fr] lg:items-end lg:gap-20">
        <div>
          <p className="mono-label text-[#087f5b]">The record is part of the product</p>
          <h2 className="mt-5 max-w-md text-4xl font-semibold leading-[.98] tracking-[-.065em] text-[#20211e] sm:text-6xl">
            A payment is more than a <em className="text-[#087f5b]">confirmation.</em>
          </h2>
          <p className="mt-7 max-w-md text-lg leading-8 text-[#66665f]">
            It should answer where funds came from, who released them, and what happened next—without a separate investigation.
          </p>
          <Link to="/features" className="mt-8 inline-flex items-center gap-2 border-b border-[#11a879] pb-1 text-sm font-semibold text-[#20211e] transition hover:text-[#087f5b]">
            See how controls work <ArrowRight size={15} />
          </Link>
        </div>

        <div className="border-y border-[#cdd8c8]">
          <div className="flex flex-col gap-4 border-b border-[#dfdcd4] py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center text-[#087f5b]"><Landmark size={18} strokeWidth={1.8} /></span>
              <div><p className="text-sm font-semibold text-[#20211e]">Payment record</p><p className="mono-label mt-1 text-[#77766e]">PR-2048 · payroll batch</p></div>
            </div>
            <span className="flex items-center gap-2 self-start font-mono text-[10px] uppercase tracking-[.1em] text-[#087f5b] sm:self-auto"><CheckCircle2 size={13} /> Ready to release</span>
          </div>

          <div className="grid border-b border-[#dfdcd4] sm:grid-cols-3">
            <div className="py-5 sm:pr-6">
              <p className="mono-label text-[#77766e]">From</p>
              <p className="mt-3 text-xl font-semibold tracking-[-.045em] text-[#20211e]">$42,500.00</p>
              <p className="mt-1.5 text-sm text-[#66665f]">Operating treasury</p>
            </div>
            <div className="border-t border-[#dfdcd4] py-5 sm:border-l sm:border-t-0 sm:px-6">
              <p className="mono-label text-[#77766e]">Through</p>
              <p className="mt-3 text-xl font-semibold tracking-[-.045em] text-[#087f5b]">USDC rail</p>
              <p className="mt-1.5 text-sm text-[#66665f]">Rate and controls checked</p>
            </div>
            <div className="border-t border-[#dfdcd4] py-5 sm:border-l sm:border-t-0 sm:pl-6">
              <p className="mono-label text-[#77766e]">To</p>
              <p className="mt-3 text-xl font-semibold tracking-[-.045em] text-[#20211e]">3 recipients</p>
              <p className="mt-1.5 text-sm text-[#66665f]">Payout details attached</p>
            </div>
          </div>

          <div className="grid gap-x-8 sm:grid-cols-3">
            {evidence.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3 border-b border-[#e1dfd7] py-4 last:border-b-0 sm:border-b-0 sm:py-5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center text-[#087f5b]"><Icon size={15} strokeWidth={1.9} /></span>
                <div className="min-w-0"><p className="text-sm font-medium text-[#20211e]">{label}</p><p className="mt-1 font-mono text-[10px] text-[#66665f]">{value}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
