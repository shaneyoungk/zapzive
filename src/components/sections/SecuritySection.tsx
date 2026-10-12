import { Check, FileCheck2, Fingerprint, LockKeyhole, UsersRound } from "lucide-react";

const controls = [
  {
    icon: UsersRound,
    title: "Clear roles",
    copy: "Choose who can prepare, approve, review, or manage a workspace.",
  },
  {
    icon: LockKeyhole,
    title: "Visible status",
    copy: "See whether a payment is ready, waiting for review, blocked, or complete.",
  },
  {
    icon: FileCheck2,
    title: "Activity record",
    copy: "Keep the decision, person, time, and reference with each important change.",
  },
  {
    icon: Fingerprint,
    title: "Practice review flows",
    copy: "Use test-mode identity and risk review states without implying that an external provider is connected.",
  },
];

const sequence = ["Payment created", "Approval complete", "Release status updated"];

// Column dividers for one, two and four columns, so every row shares the same lines.
const columnClasses = [
  "sm:pr-8",
  "border-t sm:border-l sm:border-t-0 sm:pl-8 lg:pr-8",
  "border-t sm:pr-8 lg:border-l lg:border-t-0 lg:pl-8",
  "border-t sm:border-l sm:pl-8 lg:border-t-0",
];

export function SecuritySection() {
  return (
    <section id="controls" className="home-section border-b border-[#d9d6cd] bg-[#fffdf8]">
      <div className="homepage-frame">
        <header className="home-head">
          <p className="homepage-eyebrow">Payment controls</p>
          <div className="home-head__row">
            <h2 className="homepage-title">Decide who can prepare, approve, <em>and release a payment.</em></h2>
            <p className="homepage-copy">Assign roles, require approval, and keep a record of every important change. The same payment record shows what happened, who acted, and what can happen next.</p>
          </div>
        </header>

        <div className="home-section__body grid border-y border-[#d9d6cd] sm:grid-cols-2 lg:grid-cols-4">
          {controls.map(({ icon: Icon, title, copy }, index) => (
            <article key={title} className={`border-[#d9d6cd] py-8 ${columnClasses[index]}`}>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e8f4ef] text-[#087f5b]">
                <Icon size={19} strokeWidth={1.8} />
              </span>
              <h3 className="mt-5 text-lg font-bold tracking-[-.035em] text-[#20211e]">{title}</h3>
              <p className="mt-2 text-[15px] leading-7 text-[#5d5d56]">{copy}</p>
            </article>
          ))}
        </div>

        <div className="grid border-b border-[#d9d6cd] lg:grid-cols-4">
          <div className="py-8 lg:pr-8">
            <p className="homepage-eyebrow">Approval sequence</p>
            <h3 className="mt-3 text-[22px] font-bold leading-[1.2] tracking-[-.045em] text-[#20211e]">A release stays unavailable until its assigned review is complete.</h3>
          </div>
          {sequence.map((step, index) => (
            <div key={step} className="border-t border-[#d9d6cd] py-8 lg:border-l lg:border-t-0 lg:pl-8">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e8f4ef] font-mono text-[10px] font-semibold text-[#087f5b]">0{index + 1}</span>
                {index < sequence.length - 1 && <span className="hidden h-px flex-1 bg-[#cfe3d9] lg:block" aria-hidden="true" />}
              </div>
              <p className="mt-4 text-[15px] font-semibold text-[#20211e]">{step}</p>
              {index === sequence.length - 1 && (
                <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-[#087f5b]"><Check size={16} /> Record attached</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
