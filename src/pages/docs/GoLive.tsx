import { ArrowRight, Check, LockKeyhole, ServerCog, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { DocCallout } from "@/components/docs/DocCallout";

const gates = [
  {
    icon: ShieldCheck,
    title: "Identity and access",
    copy: "Verify organization ownership, keep secret keys server-side, enforce least-privilege roles, and test logout/session revocation.",
    checks: ["Business verification complete", "Keys stored in a secret manager", "Approver roles tested"],
  },
  {
    icon: ServerCog,
    title: "Provider readiness",
    copy: "The repository currently runs a persisted sandbox. Live bank, blockchain, FX, and webhook delivery providers must be connected and reviewed before real funds are enabled.",
    checks: ["Provider contracts and credentials configured", "Durable job and retry strategy deployed", "Live mode approval recorded"],
  },
  {
    icon: LockKeyhole,
    title: "Operational controls",
    copy: "Reconcile every movement, preserve request IDs, alert on failures, and prove idempotency and authorization behavior under retries.",
    checks: ["Ledger reconciliation is automated", "Signed webhook verification is tested", "Incident and rollback runbooks exist"],
  },
];

export default function GoLive() {
  return (
    <div className="pb-24">
      <header className="border-b border-[#d9d6cd] pb-12">
        <p className="mono-label text-[#087f5b]">Production readiness · Review required</p>
        <h1 className="mt-5 max-w-4xl text-5xl sm:text-6xl">Go live when the controls are real.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-[#575750]">
          Use this gate to move from the persisted sandbox to a reviewed provider-backed deployment. The current repository does not move live money by swapping a key.
        </p>
      </header>

      <DocCallout type="warning" title="Current platform boundary">
        Sandbox balances, payroll, remittances, treasury actions, and escrow are persisted locally for testing. Live provider settlement, durable background workers, MFA, and production webhook delivery still require deployment-specific implementation and review.
      </DocCallout>

      <section className="mt-14" aria-labelledby="launch-gates">
        <p className="mono-label text-[#087f5b]">Launch gates</p>
        <h2 id="launch-gates" className="mt-3 text-3xl">Prove each layer before enabling live access.</h2>
        <div className="mt-8 grid gap-4">
          {gates.map(({ icon: Icon, title, copy, checks }) => (
            <article key={title} className="grid gap-6 rounded-2xl border border-[#d9d6cd] bg-[#fffdf8] p-6 sm:p-7 lg:grid-cols-[56px_minmax(0,1fr)_minmax(260px,.8fr)] lg:items-start">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#cdd8c8] bg-[#e8eee4] text-[#087f5b]">
                <Icon size={19} strokeWidth={1.8} />
              </span>
              <div>
                <h3 className="text-xl">{title}</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#575750]">{copy}</p>
              </div>
              <ul className="space-y-3 border-t border-[#e1dfd7] pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                {checks.map((check) => (
                  <li key={check} className="flex items-start gap-2 text-sm text-[#575750]">
                    <Check size={15} className="mt-0.5 shrink-0 text-[#087f5b]" />
                    {check}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-14 rounded-2xl border border-[#cdd8c8] bg-[#e8eee4] p-6 sm:p-8">
        <p className="mono-label text-[#087f5b]">Recommended order</p>
        <h2 className="mt-3 text-2xl">Sandbox → staging → reviewed production.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#575750]">
          Keep environments and credentials separate. Run a small, reconciled staging flow, complete the security review, then enable live providers through an explicit operational change.
        </p>
        <Link to="/docs/testing" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#11a879] px-5 py-3 text-sm font-semibold text-[#20211e] hover:bg-[#76d4b5]">
          Return to sandbox testing <ArrowRight size={15} />
        </Link>
      </section>
    </div>
  );
}
