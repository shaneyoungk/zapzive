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

export function SecuritySection() {
  return (
    <section id="controls" className="border-b border-[#d9d6cd] bg-[#fffdf8] px-6 py-24 sm:py-32">
      <div className="homepage-frame">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.72fr)] lg:items-end lg:gap-20">
          <div>
            <p className="homepage-eyebrow">Payment controls</p>
            <h2 className="homepage-title">
              Decide who can prepare, approve,<br />
              <em>and release a payment.</em>
            </h2>
          </div>
          <p className="homepage-copy mt-0">
            Assign roles, require approval, and keep a record of every important change. The same payment record shows what happened, who acted, and what can happen next.
          </p>
        </div>

        <div className="mt-14 grid border-y border-[#d9d6cd] md:grid-cols-2">
          {controls.map(({ icon: Icon, title, copy }, index) => (
            <article
              key={title}
              className={`py-8 ${index < controls.length - 1 ? "border-b border-[#d9d6cd]" : ""} ${index < 2 ? "md:border-b" : "md:border-b-0"} ${index % 2 === 1 ? "md:border-l md:border-[#d9d6cd] md:pl-10" : "md:pr-10"}`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e8f4ef] text-[#087f5b]">
                <Icon size={19} strokeWidth={1.8} />
              </span>
              <h3 className="mt-5 text-xl font-bold tracking-[-.045em] text-[#20211e]">{title}</h3>
              <p className="mt-3 max-w-sm text-[15px] leading-7 text-[#5d5d56]">{copy}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 grid gap-6 border-y border-[#d9d6cd] py-7 lg:grid-cols-[minmax(0,.72fr)_minmax(0,1.15fr)_180px] lg:items-center lg:gap-10">
          <div>
            <p className="homepage-eyebrow">Approval sequence</p>
            <h3 className="mt-3 text-2xl font-bold tracking-[-.055em] text-[#20211e]">A release stays unavailable until its assigned review is complete.</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {["Payment created", "Approval complete", "Release status updated"].map((step, index) => (
              <div key={step} className="flex items-center gap-2 text-sm font-semibold text-[#34352f]">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e8f4ef] font-mono text-[10px] text-[#087f5b]">0{index + 1}</span>
                {step}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#087f5b] lg:justify-end">
            <Check size={16} /> Record attached
          </div>
        </div>
      </div>
    </section>
  );
}
