import { CircleDollarSign, Clock3, FileCheck2, WalletCards } from "lucide-react";

const benefits = [
  {
    icon: CircleDollarSign,
    label: "Prepare",
    title: "Import the run and fix it before anyone approves.",
    copy: "Upload last month's spreadsheet or pick recipients. Zapzive flags unknown names, duplicates, invalid numbers and unusual amounts row by row.",
  },
  {
    icon: Clock3,
    label: "Approve and send",
    title: "Replace WhatsApp approvals with a policy.",
    copy: "Your approval rules decide who signs off and why. Approvers see the total, the methods and every warning before they approve. Delivery time depends on the provider and method.",
  },
  {
    icon: FileCheck2,
    label: "Resolve and reconcile",
    title: "Know what failed, why, and what to do.",
    copy: "Failed and held payouts explain whether money moved and the next step. Each run closes with expected versus delivered and exports for your accounts.",
  },
];

const recordParts = [
  ["01", "Who and how much", "Recipient, amount, currency and payout method for every payout."],
  ["02", "Who approved it", "Each approver, the time, their comment and the policy that applied."],
  ["03", "What happened", "Every state change, with the provider reference and any failure reason."],
  ["04", "Did it reconcile", "Expected versus delivered, fees, and the date the run was reconciled."],
] as const;

export function HowItWorksSection() {
  return (
    <section id="benefits" className="home-section border-b border-[#d9d6cd] bg-[#e9eee7]">
      <div className="homepage-frame">
        <header className="home-head">
          <p className="homepage-eyebrow">The job</p>
          <div className="home-head__row">
            <h2 className="homepage-title">Pay 73 people on Friday <em>without losing track.</em></h2>
            <div className="home-head__aside">
              <p className="homepage-copy">Most payout runs are a spreadsheet, a bank portal, M-Pesa, WhatsApp approvals and a long afternoon of reconciliation. Zapzive puts preparation, approval, delivery status and reconciliation into one controlled workflow.</p>
              <p className="flex items-start gap-2 text-sm leading-6 text-[#5d5d56]"><WalletCards size={16} className="mt-1 shrink-0 text-[#087f5b]" /> Today Zapzive runs in a sandbox with a simulated provider. Live payouts will run through licensed payment partners; Zapzive does not hold your funds.</p>
            </div>
          </div>
        </header>

        <div className="home-section__body grid border-y border-[#cfd3c9] md:grid-cols-3">
          {benefits.map(({ icon: Icon, label, title, copy }, index) => (
            <article key={label} className={`py-8 ${index ? "border-t border-[#cfd3c9] md:border-l md:border-t-0 md:pl-8" : "md:pr-8"}`}>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e1f1eb] text-[#087f5b]"><Icon size={19} strokeWidth={1.8} /></span>
              <p className="mt-5 font-mono text-[10px] font-semibold uppercase tracking-[.11em] text-[#087f5b]">{label}</p>
              <h3 className="mt-3 max-w-sm text-[22px] font-bold leading-[1.2] tracking-[-.045em] text-[#20211e]">{title}</h3>
              <p className="mt-3 max-w-sm text-[15px] leading-7 text-[#5d5d56]">{copy}</p>
            </article>
          ))}
        </div>

        {/* The record strip sits on the same three columns as the cards above. */}
        <div className="grid border-b border-[#cfd3c9] md:grid-cols-3">
          <div className="py-8 md:pr-8">
            <p className="homepage-eyebrow">The payout record</p>
            <h3 className="mt-3 max-w-sm text-[22px] font-bold leading-[1.2] tracking-[-.045em] text-[#20211e]">Every payout answers the questions finance and auditors ask.</h3>
          </div>
          <div className="grid gap-x-8 gap-y-6 border-t border-[#cfd3c9] py-8 sm:grid-cols-2 md:col-span-2 md:border-l md:border-t-0 md:pl-8">
            {recordParts.map(([number, title, copy]) => (
              <div key={number} className="grid grid-cols-[28px_minmax(0,1fr)] gap-3">
                <span className="pt-[3px] font-mono text-[10px] font-semibold tracking-[.08em] text-[#087f5b]">{number}</span>
                <div><p className="text-sm font-bold text-[#20211e]">{title}</p><p className="mt-1 text-sm leading-6 text-[#5d5d56]">{copy}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
