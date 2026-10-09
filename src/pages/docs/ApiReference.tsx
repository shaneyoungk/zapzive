import type { LucideIcon } from "lucide-react";
import { ArrowRight, BarChart3, Braces, Landmark, LockKeyhole, Send, Settings2, ShieldCheck, UserRoundCog, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { CodeWindow } from "@/components/docs/CodeWindow";
import { DocCallout } from "@/components/docs/DocCallout";

const modules = [
  { title: "Remittance", copy: "Create and track local payouts.", href: "/docs/api/remittance", icon: Send },
  { title: "Payroll", copy: "Onboard workers and run batches.", href: "/docs/api/payroll", icon: UsersRound },
  { title: "Treasury", copy: "Manage the sandbox asset ledger and swaps.", href: "/docs/api/treasury", icon: Landmark },
  { title: "Escrow", copy: "Control milestone-based releases.", href: "/docs/api/escrow", icon: LockKeyhole },
  { title: "Compliance", copy: "Create and review sandbox KYC/AML records.", href: "/docs/api/compliance", icon: ShieldCheck },
  { title: "Analytics", copy: "Query operational and settlement data.", href: "/docs/api/analytics", icon: BarChart3 },
  { title: "Agents", copy: "Manage field and payout operators.", href: "/docs/api/agents", icon: UserRoundCog },
  { title: "Settings", copy: "Manage keys, profile, webhooks, and usage.", href: "/docs/api/settings", icon: Settings2 },
];

export default function ApiReference() {
  return (
    <div className="pb-24">
      <header className="border-b border-[#d9d6cd] pb-12">
        <div className="flex flex-wrap items-center gap-3">
          <p className="mono-label text-[#087f5b]">API reference</p>
          <span className="rounded-full border border-[#cdd8c8] bg-[#e8eee4] px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[.08em] text-[#087f5b]">sandbox API</span>
        </div>
        <h1 className="mt-5 text-5xl sm:text-6xl">Predictable APIs for moving money.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-[#575750]">
          Zapzive uses resource-oriented URLs, JSON request bodies, standard HTTP status codes, request IDs, and explicit sandbox state transitions across every financial workflow.
        </p>
      </header>

      <section className="mt-14">
        <p className="mono-label text-[#087f5b]">Request lifecycle</p>
        <h2 className="mt-3 text-3xl">Integrate in three stages.</h2>
        <div className="mt-7 grid overflow-hidden rounded-2xl border border-[#d9d6cd] bg-[#d9d6cd] md:grid-cols-3">
          <RoadmapStep number="01" title="Authenticate" copy="Create a sandbox key and initialize your server-side client." href="/docs/authentication" />
          <RoadmapStep number="02" title="Create resources" copy="Onboard recipients, fund balances, and submit payment instructions." href="/docs/quickstart" />
          <RoadmapStep number="03" title="Reconcile outcomes" copy="Read persisted sandbox states now; prepare signed webhook handling for provider-backed delivery." href="/docs/webhooks" />
        </div>
      </section>

      <section className="mt-16">
        <div className="grid gap-8 lg:grid-cols-[.85fr_1.15fr] lg:items-start">
          <div>
            <p className="mono-label text-[#087f5b]">Base URL and authentication</p>
            <h2 className="mt-3 text-3xl">Your first request.</h2>
            <p className="mt-4 text-base leading-7 text-[#575750]">Send secret keys with server-side requests only. Use the deployed API base URL, include the environment in the key, and send an idempotency key for every money-moving operation.</p>
            <Link to="/docs/authentication" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#087f5b]">Understand authentication <ArrowRight size={14} /></Link>
          </div>
          <CodeWindow
            showLineNumbers
            code={`curl https://your-api.example.com/api/remittance/quote \\
  -H "Authorization: Bearer sk_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{"amount":5000,"currency":"USDC","localCurrency":"KES"}'`}
            language="bash"
            title="Request a sandbox quote"
          />
        </div>
      </section>

      <DocCallout type="info" title="Versioning and request IDs">
        Log the <code>X-Request-Id</code> response header. The sandbox currently exposes unversioned <code>/api</code> routes; pin a versioned base URL when a production provider contract is enabled.
      </DocCallout>

      <section className="mt-16">
        <p className="mono-label text-[#087f5b]">Core resources</p>
        <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <h2 className="text-3xl">Choose the workflow you need.</h2>
          <p className="max-w-sm text-sm leading-6 text-[#77766e]">Every module uses the same authentication, pagination, errors, and event conventions.</p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {modules.map((module) => <ModuleCard key={module.title} {...module} />)}
        </div>
      </section>

      <section className="mt-16 border-t border-[#d9d6cd] pt-12">
        <p className="mono-label text-[#087f5b]">Platform conventions</p>
        <h2 className="mt-3 text-3xl">One model across every endpoint.</h2>
        <div className="mt-7 grid gap-px overflow-hidden rounded-2xl border border-[#d9d6cd] bg-[#d9d6cd] md:grid-cols-2">
          <div className="bg-[#fffdf8] p-6">
            <Braces size={18} className="text-[#087f5b]" />
            <h3 className="mt-5 text-lg">Resource-oriented JSON</h3>
            <p className="mt-2 text-sm leading-6 text-[#575750]">Consistent object IDs, timestamps, statuses, pagination, and error envelopes reduce integration-specific branching.</p>
          </div>
          <div className="bg-[#fffdf8] p-6">
            <ShieldCheck size={18} className="text-[#087f5b]" />
            <h3 className="mt-5 text-lg">Safe financial operations</h3>
            <p className="mt-2 text-sm leading-6 text-[#575750]">Idempotency, signed events, immutable audit records, and explicit state transitions protect every movement.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function RoadmapStep({ number, title, copy, href }: { number: string; title: string; copy: string; href: string }) {
  return (
    <Link to={href} className="group bg-[#fffdf8] p-6 transition hover:bg-[#f1f4ef]">
      <span className="font-mono text-[9px] font-semibold text-[#087f5b]">{number}</span>
      <h3 className="mt-5 text-xl transition group-hover:text-[#087f5b]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#575750]">{copy}</p>
      <ArrowRight size={15} className="mt-5 text-[#087f5b] transition group-hover:translate-x-1" />
    </Link>
  );
}

function ModuleCard({ title, copy, href, icon: Icon }: { title: string; copy: string; href: string; icon: LucideIcon }) {
  return (
    <Link to={href} className="group flex items-start gap-4 rounded-2xl border border-[#d9d6cd] bg-[#fffdf8] p-5 transition hover:border-[#11a879]">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#cdd8c8] bg-[#e8eee4] text-[#087f5b]"><Icon size={17} strokeWidth={1.8} /></span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3"><h3 className="text-base">{title}</h3><ArrowRight size={14} className="shrink-0 text-[#087f5b] transition group-hover:translate-x-1" /></div>
        <p className="mt-1.5 text-sm leading-6 text-[#77766e]">{copy}</p>
      </div>
    </Link>
  );
}
