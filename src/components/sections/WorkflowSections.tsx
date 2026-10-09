import { ArrowUpRight, Clock3, Landmark, LockKeyhole, Send, TrendingUp, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { ServicesCard } from "@/components/ui/services-card";

type WorkflowKind = "payroll" | "remittance" | "treasury" | "escrow";

const workflows = [
  {
    id: "payroll",
    kind: "payroll" as const,
    number: "01",
    icon: UsersRound,
    eyebrow: "Payroll",
    title: "Pay a team from one reviewed batch.",
    copy: "Add workers and amounts, confirm the total, then route the batch for approval before it is sent.",
    href: "/use-cases#payroll",
    cta: "Explore payroll",
  },
  {
    id: "remittance",
    kind: "remittance" as const,
    number: "02",
    icon: Send,
    eyebrow: "Remittance",
    title: "Review cost and delivery before you send.",
    copy: "Check what leaves your balance, what the recipient receives, and how the payment will be delivered.",
    href: "/use-cases#remittance",
    cta: "Explore remittance",
  },
  {
    id: "treasury",
    kind: "treasury" as const,
    number: "03",
    icon: Landmark,
    eyebrow: "Treasury",
    title: "See what each balance is available for.",
    copy: "Separate available, reserved, and pending funds so the next funding decision is clear.",
    href: "/features#treasury",
    cta: "Explore treasury",
  },
  {
    id: "escrow",
    kind: "escrow" as const,
    number: "04",
    icon: LockKeyhole,
    eyebrow: "Escrow",
    title: "Release money after a milestone is approved.",
    copy: "Attach the work record, assign reviewers, and keep funds held until the agreed condition is met.",
    href: "/use-cases#escrow",
    cta: "Explore escrow",
  },
];

function Preview({ kind }: { kind: WorkflowKind }) {
  if (kind === "payroll") {
    return (
      <div className="workflow-preview">
        <div className="flex items-center justify-between border-b border-[#d9d6cd] pb-3">
          <div><p className="text-sm font-bold text-[#20211e]">October contractors</p><p className="mt-1 font-mono text-[10px] uppercase tracking-[.08em] text-[#5d5d56]">12 recipients</p></div>
          <p className="font-mono text-sm font-semibold text-[#20211e]">18,420 USDC</p>
        </div>
        {["Amara Okafor", "Daniel Mwangi", "Moses Kamau"].map((name, index) => (
          <div key={name} className="flex items-center gap-3 border-b border-[#e4e1d9] py-3 last:border-b-0">
            <UsersRound size={15} className="text-[#087f5b]" />
            <span className="flex-1 text-sm font-medium text-[#20211e]">{name}</span>
            <span className={`font-mono text-[10px] ${index === 2 ? "text-[#5d5d56]" : "text-[#087f5b]"}`}>{index === 2 ? "Review" : "Ready"}</span>
          </div>
        ))}
      </div>
    );
  }

  if (kind === "remittance") {
    return (
      <div className="workflow-preview">
        <div className="grid grid-cols-2 gap-y-5">
          <div><p className="workflow-preview__label">You send</p><p className="mt-2 text-base font-bold text-[#20211e]">1,000 USDC</p></div>
          <div><p className="workflow-preview__label">They receive</p><p className="mt-2 text-base font-bold text-[#087f5b]">128,395 KES</p></div>
          <div><p className="workflow-preview__label">Test fee</p><p className="mt-2 text-sm font-semibold text-[#20211e]">8.00 USDC</p></div>
          <div><p className="workflow-preview__label">Delivery</p><p className="mt-2 text-sm font-semibold text-[#20211e]">Bank account</p></div>
        </div>
        <div className="mt-5 flex items-center gap-2 border-t border-[#d9d6cd] pt-4 text-xs font-semibold text-[#087f5b]"><Clock3 size={14} /> Test quote ready to review</div>
      </div>
    );
  }

  if (kind === "treasury") {
    return (
      <div className="workflow-preview">
        <div className="grid grid-cols-3 divide-x divide-[#d9d6cd]">
          <div className="pr-4"><p className="workflow-preview__label">Available</p><p className="mt-2 text-lg font-bold tracking-[-.04em] text-[#20211e]">42,800</p></div>
          <div className="px-4"><p className="workflow-preview__label">Reserved</p><p className="mt-2 text-lg font-bold tracking-[-.04em] text-[#20211e]">12,400</p></div>
          <div className="pl-4"><p className="workflow-preview__label">Pending</p><p className="mt-2 text-lg font-bold tracking-[-.04em] text-[#20211e]">4,180</p></div>
        </div>
        <div className="mt-6 border-t border-[#d9d6cd] pt-4">
          <div className="flex items-center justify-between text-xs font-medium text-[#5d5d56]"><span className="flex items-center gap-2"><TrendingUp size={14} className="text-[#087f5b]" /> Balance ready to use</span><span className="font-mono text-[10px]">TRS-5829</span></div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e8eee4]"><div className="h-full w-[68%] rounded-full bg-[#11a879]" /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="workflow-preview">
      <div className="flex items-center justify-between border-b border-[#d9d6cd] pb-3">
        <div><p className="text-sm font-bold text-[#20211e]">Website delivery</p><p className="mt-1 font-mono text-[10px] uppercase tracking-[.08em] text-[#5d5d56]">Milestone 02 of 04</p></div>
        <LockKeyhole size={17} className="text-[#087f5b]" />
      </div>
      {[["Funds", "Held"], ["Evidence", "Attached"], ["Approval", "Waiting"], ["Release", "Locked"]].map(([label, value], index) => (
        <div key={label} className="flex items-center gap-3 border-b border-[#e4e1d9] py-3 last:border-b-0">
          <span className={`h-2.5 w-2.5 rounded-full ${index < 2 ? "bg-[#11a879]" : "border border-[#087f5b]"}`} />
          <span className="flex-1 text-sm font-medium text-[#20211e]">{label}</span>
          <span className="font-mono text-[10px] text-[#5d5d56]">{value}</span>
        </div>
      ))}
    </div>
  );
}

export function WorkflowSections() {
  return (
    <section id="workflows" className="border-b border-[#d9d6cd] bg-[#f5f3ee] px-6 py-24 sm:py-32">
      <div className="homepage-frame">
        <div className="grid gap-8 lg:grid-cols-[.95fr_1.05fr] lg:items-end">
          <div>
            <p className="homepage-eyebrow">Choose a workflow</p>
            <h2 className="homepage-title">The right operational flow for the payment <em>you need to make.</em></h2>
          </div>
          <p className="homepage-copy lg:justify-self-end">Start with a clear job. Each workflow gives you the relevant checks and a payment record without forcing you to assemble the process yourself.</p>
        </div>

        <div className="workflow-services-grid mt-14">
          {workflows.map((workflow) => {
            const Icon = workflow.icon;

            return (
              <ServicesCard id={workflow.id} key={workflow.id} className="workflow-service-card">
                <div className="workflow-service-card__top">
                  <span className="workflow-service-card__number">{workflow.number}</span>
                  <span className="workflow-service-card__icon"><Icon size={18} strokeWidth={1.8} /></span>
                </div>

                <div className="workflow-service-card__copy">
                  <p className="homepage-eyebrow">{workflow.eyebrow}</p>
                  <h3>{workflow.title}</h3>
                  <p>{workflow.copy}</p>
                </div>

                <div className="workflow-service-card__sample">
                  <p className="workflow-service-card__sample-label">Example workspace data</p>
                  <Preview kind={workflow.kind} />
                </div>

                <Link to={workflow.href} className="workflow-service-card__link">
                  {workflow.cta} <ArrowUpRight size={16} />
                </Link>
              </ServicesCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}
