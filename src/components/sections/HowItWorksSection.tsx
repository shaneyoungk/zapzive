import { CircleDollarSign, Clock3, FileCheck2, WalletCards } from "lucide-react";

const benefits = [
  {
    icon: CircleDollarSign,
    label: "Stablecoin funding",
    title: "See the payment terms before you create it.",
    copy: "Select a supported asset and review the source amount, fee, and destination amount before creating the instruction.",
  },
  {
    icon: Clock3,
    label: "One operational flow",
    title: "Prepare and approve in the same workspace.",
    copy: "Move a payment from preparation to review without passing batch files and status updates between separate tools. Final settlement time depends on the selected rail.",
  },
  {
    icon: FileCheck2,
    label: "One durable record",
    title: "Review a payment without rebuilding its history.",
    copy: "Keep the request, approver, recipient, status, and reference together after the payment is created.",
  },
];

const recordParts = [
  ["01", "Source balance", "The asset and amount selected for the payment."],
  ["02", "Approval decision", "Who approved it and when they did so."],
  ["03", "Delivery instruction", "The recipient, destination, and method chosen."],
  ["04", "Final record", "The resulting status and reference for review."],
] as const;

export function HowItWorksSection() {
  return (
    <section id="benefits" className="border-b border-[#d9d6cd] bg-[#e9eee7] px-6 py-24 sm:py-32">
      <div className="homepage-frame">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,.98fr)_minmax(300px,.82fr)] lg:items-end lg:gap-20">
          <div>
            <p className="homepage-eyebrow">Why it is useful</p>
            <h2 className="homepage-title">Use stablecoins without splitting the work <em>around the payment.</em></h2>
          </div>
          <div>
            <p className="homepage-copy mt-0">Most payment operations split funding, approvals, delivery, and reconciliation between different tools. Zapzive keeps the relevant decisions and the payment record in one workflow.</p>
            <p className="mt-5 flex items-start gap-2 text-sm leading-6 text-[#5d5d56]"><WalletCards size={16} className="mt-1 shrink-0 text-[#087f5b]" /> Use test balances to learn the flow, or use a supported connected crypto rail when it is available to your workspace.</p>
          </div>
        </div>

        <div className="mt-14 grid border-y border-[#cfd3c9] md:grid-cols-3">
          {benefits.map(({ icon: Icon, label, title, copy }, index) => (
            <article key={label} className={`py-8 ${index ? "border-t border-[#cfd3c9] md:border-l md:border-t-0 md:pl-8" : "md:pr-8"}`}>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e1f1eb] text-[#087f5b]"><Icon size={19} strokeWidth={1.8} /></span>
              <p className="mt-5 font-mono text-[10px] font-semibold uppercase tracking-[.11em] text-[#087f5b]">{label}</p>
              <h3 className="mt-3 max-w-sm text-2xl font-bold tracking-[-.05em] text-[#20211e]">{title}</h3>
              <p className="mt-3 max-w-sm text-[15px] leading-7 text-[#5d5d56]">{copy}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 border-y border-[#cfd3c9] py-7">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,.62fr)_minmax(0,1.38fr)] lg:items-center lg:gap-14">
            <div>
              <p className="homepage-eyebrow">The payment record</p>
              <h3 className="mt-3 max-w-md text-2xl font-bold tracking-[-.055em] text-[#20211e]">One payment keeps the information your team needs to approve, send, and review it.</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {recordParts.map(([number, title, copy]) => (
                <div key={number} className="grid grid-cols-[28px_minmax(0,1fr)] gap-3">
                  <span className="font-mono text-[10px] font-semibold tracking-[.08em] text-[#087f5b]">{number}</span>
                  <div><p className="text-sm font-bold text-[#20211e]">{title}</p><p className="mt-1 text-sm leading-6 text-[#5d5d56]">{copy}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
