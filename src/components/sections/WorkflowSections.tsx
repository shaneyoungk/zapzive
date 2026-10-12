import { AlertTriangle, ArrowUpRight, Scale, ShieldCheck, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { ServicesCard } from "@/components/ui/services-card";

type WorkflowKind = "runs" | "approvals" | "exceptions" | "reconciliation";

const workflows = [
  {
    id: "runs", kind: "runs" as const, number: "01", icon: UsersRound, eyebrow: "Payout runs",
    title: "Prepare a run and validate every row.",
    copy: "Import a CSV or choose recipients. Each payout is checked for unknown recipients, duplicates, invalid details and unusual amounts, and quoted in the sandbox.",
    href: "/features#runs", cta: "How payout runs work",
  },
  {
    id: "approvals", kind: "approvals" as const, number: "02", icon: ShieldCheck, eyebrow: "Approvals",
    title: "Approval rules instead of chat threads.",
    copy: "Set amount tiers and rules for new recipients and changed payout details. Approvers see exactly why their sign-off is needed.",
    href: "/features#approvals", cta: "How approvals work",
  },
  {
    id: "exceptions", kind: "exceptions" as const, number: "03", icon: AlertTriangle, eyebrow: "Exceptions",
    title: "Failures that explain themselves.",
    copy: "Every failed or held payout says what happened, whether money moved, what to do next and who can do it.",
    href: "/features#exceptions", cta: "How exceptions work",
  },
  {
    id: "reconciliation", kind: "reconciliation" as const, number: "04", icon: Scale, eyebrow: "Reconciliation",
    title: "Close every run with a record that adds up.",
    copy: "Expected versus delivered, outstanding amounts, provider references and fees, with ledger and journal exports.",
    href: "/features#reconciliation", cta: "How reconciliation works",
  },
];

function Preview({ kind }: { kind: WorkflowKind }) {
  if (kind === "runs") {
    return (
      <div className="workflow-preview">
        <div className="flex items-center justify-between border-b border-[#d9d6cd] pb-3">
          <div><p className="text-sm font-bold text-[#20211e]">October contractors</p><p className="mt-1 font-mono text-[10px] uppercase tracking-[.08em] text-[#5d5d56]">73 rows imported</p></div>
          <p className="font-mono text-sm font-semibold text-[#20211e]">KES 4.94M</p>
        </div>
        {[["69 ready", "text-[#087f5b]"], ["2 require correction", "text-[#9a2f2f]"], ["1 possible duplicate", "text-[#8a5a0b]"], ["1 payout-detail change", "text-[#8a5a0b]"]].map(([label, tone]) => (
          <div key={label} className="flex items-center gap-3 border-b border-[#e4e1d9] py-2.5 last:border-b-0">
            <span className={`h-2 w-2 rounded-full bg-current ${tone}`} />
            <span className={`flex-1 text-sm font-medium ${tone}`}>{label}</span>
          </div>
        ))}
      </div>
    );
  }
  if (kind === "approvals") {
    return (
      <div className="workflow-preview">
        <p className="text-sm font-bold text-[#20211e]">Approve payout run?</p>
        <div className="mt-3 grid grid-cols-2 gap-y-3 text-sm">
          <span className="text-[#5d5d56]">Payouts</span><span className="text-right font-semibold text-[#20211e]">73</span>
          <span className="text-[#5d5d56]">Total</span><span className="text-right font-semibold text-[#20211e]">KES 4,940,000</span>
          <span className="text-[#5d5d56]">Methods</span><span className="text-right font-semibold text-[#20211e]">M-Pesa, bank</span>
        </div>
        <p className="mt-4 border-t border-[#d9d6cd] pt-3 text-xs leading-5 text-[#5d5d56]">Requires one approver: the total exceeds KES 1,000,000 and 1 recipient changed bank details.</p>
      </div>
    );
  }
  if (kind === "exceptions") {
    return (
      <div className="workflow-preview">
        <div className="flex items-center justify-between border-b border-[#d9d6cd] pb-3">
          <div><p className="text-sm font-bold text-[#20211e]">Peter Mwangi</p><p className="mt-1 font-mono text-[10px] uppercase tracking-[.08em] text-[#9a2f2f]">Failed</p></div>
          <p className="font-mono text-sm font-semibold text-[#20211e]">KES 48,200</p>
        </div>
        <p className="pt-3 text-sm text-[#20211e]">Beneficiary account unavailable.</p>
        <p className="mt-1 text-xs leading-5 text-[#5d5d56]">No money reached the recipient; the reserved funds were released.</p>
        <div className="mt-3 flex gap-2 text-xs font-semibold"><span className="rounded-full border border-[#d9d6cd] px-2.5 py-1 text-[#20211e]">Change payout method</span><span className="rounded-full border border-[#d9d6cd] px-2.5 py-1 text-[#20211e]">Retry</span></div>
      </div>
    );
  }
  return (
    <div className="workflow-preview">
      <div className="grid grid-cols-2 gap-y-2.5 text-sm">
        {[["Requested", "73"], ["Delivered", "70"], ["Processing", "1"], ["Failed", "2"], ["Expected", "KES 4,940,000"], ["Delivered", "KES 4,812,600"], ["Outstanding", "KES 127,400"]].map(([label, value], index) => (
          <div key={index} className="contents"><span className="text-[#5d5d56]">{label}</span><span className={`text-right font-semibold ${label === "Outstanding" || label === "Failed" ? "text-[#9a2f2f]" : "text-[#20211e]"}`}>{value}</span></div>
        ))}
      </div>
    </div>
  );
}

export function WorkflowSections() {
  return (
    <section id="workflows" className="home-section border-b border-[#d9d6cd] bg-[#f5f3ee]">
      <div className="homepage-frame">
        <header className="home-head">
          <p className="homepage-eyebrow">How it works</p>
          <div className="home-head__row">
            <h2 className="homepage-title">From spreadsheet to reconciled run, <em>in one controlled workspace.</em></h2>
            <p className="homepage-copy">Zapzive controls preparation, approval, state and reconciliation. Licensed providers execute the transfer. The examples below are illustrative sandbox data.</p>
          </div>
        </header>

        <div className="workflow-services-grid home-section__body">
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
                  <p className="workflow-service-card__sample-label">Illustrative example</p>
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
