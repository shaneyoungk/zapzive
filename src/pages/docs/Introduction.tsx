import { ArrowRight, Building2, Globe2, Layers3, ShieldCheck, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { DocCallout } from "@/components/docs/DocCallout";

const pillars = [
  { icon: Globe2, label: "Sandbox corridors", value: "Defined test routes", copy: "Exercise local-currency settlement through one predictable integration." },
  { icon: ShieldCheck, label: "Compliance", value: "Review records", copy: "Create company-scoped sandbox KYC and AML review items with explicit status." },
  { icon: Zap, label: "Settlement", value: "Sandbox state", copy: "Track persisted money movement from instruction through the sandbox ledger." },
];

const flow = [
  { icon: ShieldCheck, title: "Onboard", copy: "Verify businesses and recipients" },
  { icon: Building2, title: "Fund", copy: "Allocate treasury balances" },
  { icon: Layers3, title: "Execute", copy: "Run payouts and payroll" },
  { icon: Zap, title: "Reconcile", copy: "Sync status and reporting" },
];

export default function Introduction() {
  return <div className="max-w-6xl space-y-20 pb-24">
    <DocCallout type="info" title="Sandbox first">These guides describe the current Zapzive sandbox. Test balances, quotes, recipients, and settlement records are simulated; live banking, custody, blockchain, FX, and compliance-provider connections are not enabled.</DocCallout>
    <section className="border-b border-[#d9d6cd] pb-16">
      <p className="mono-label mb-6 text-[#087f5b]">Developer platform · Sandbox</p>
      <h1 className="max-w-4xl text-5xl font-semibold leading-[.96] tracking-[-.07em] md:text-7xl">Build a clear<br /><em className="text-[#11a879]">money movement flow.</em></h1>
      <p className="mt-8 max-w-3xl text-lg leading-8 text-[#575750]">Use one consistent model for payroll, remittance, treasury, and escrow workflows. Every guide shows the request, state, response, and control that comes next.</p>
      <div className="mt-9 flex flex-col gap-3 sm:flex-row"><Link to="/docs/quickstart" className="inline-flex h-12 items-center justify-center gap-3 rounded-full bg-[#20211e] px-6 text-sm font-semibold text-[#f5f3ee] transition hover:bg-[#11a879] hover:text-[#20211e]">Start integrating <ArrowRight size={16} /></Link><Link to="/docs/api" className="inline-flex h-12 items-center justify-center rounded-full border border-[#b9b7ae] px-6 text-sm font-semibold text-[#20211e] transition hover:border-[#20211e]">Explore API reference</Link></div>
    </section>

    <section><div className="mb-8 flex items-end justify-between gap-6"><div><p className="mono-label text-[#087f5b]">Platform fundamentals</p><h2 className="mt-3 text-3xl font-semibold tracking-[-.055em]">A clear foundation for every workflow.</h2></div><p className="hidden max-w-sm text-sm leading-6 text-[#77766e] md:block">Stable primitives make complex finance operations easier to build, test, and maintain.</p></div><div className="grid overflow-hidden rounded-[20px] border border-[#d9d6cd] bg-[#d9d6cd] md:grid-cols-3">{pillars.map(({ icon: Icon, label, value, copy }) => <article key={label} className="bg-[#fffdf8] p-7"><span className="product-icon"><Icon size={18} /></span><p className="mono-label mt-8 text-[#77766e]">{label}</p><h3 className="mt-2 text-xl font-semibold tracking-[-.04em]">{value}</h3><p className="mt-3 text-sm leading-6 text-[#575750]">{copy}</p></article>)}</div></section>

    <DocCallout type="info" title="Implementation standard">Every guide includes expected requests, response states, and failure paths. Use the testing environment before creating live credentials.</DocCallout>

    <section className="flex flex-col justify-between gap-6 rounded-[20px] border border-[#cdd8c8] bg-[#e8eee4] p-7 md:flex-row md:items-center"><div><p className="mono-label text-[#087f5b]">Examples</p><h2 className="mt-3 text-2xl">See complete solutions, end to end.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#575750]">Start with payroll, supplier payouts, marketplace escrow, or treasury settlement and follow the full implementation path.</p></div><Link to="/docs/examples" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#11a879] px-5 py-3.5 text-sm font-semibold text-[#20211e]">Browse examples <ArrowRight size={15} /></Link></section>

    <section><div className="grid gap-10 lg:grid-cols-[.65fr_1.35fr]"><div><p className="mono-label text-[#087f5b]">Connected by design</p><h2 className="mt-4 text-4xl font-semibold leading-[1.02] tracking-[-.06em]">One lifecycle,<br />not four products.</h2><p className="mt-5 text-sm leading-6 text-[#575750]">Identity, funding, execution, and reporting share the same operational record.</p></div><div className="rounded-[20px] border border-[#34352f] bg-[#20211e] p-6 text-[#f5f3ee] sm:p-8"><div className="divide-y divide-[#ffffff1a]">{flow.map(({ icon: Icon, title, copy }, index) => <div key={title} className="grid grid-cols-[40px_1fr_auto] items-center gap-4 py-5 first:pt-0 last:pb-0"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#11a87944] bg-[#11a87914] text-[#76d4b5]"><Icon size={17} /></span><div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs text-[#aaa9a1]">{copy}</p></div><span className="font-mono text-[10px] text-[#76d4b5]">0{index + 1}</span></div>)}</div></div></div></section>

    <section className="flex flex-col justify-between gap-8 rounded-[20px] border border-[#cdd8c8] bg-[#e8eee4] p-8 md:flex-row md:items-center"><div><p className="mono-label text-[#087f5b]">First request</p><h3 className="mt-3 text-2xl font-semibold tracking-[-.05em]">Send a test payment in under five minutes.</h3><p className="mt-2 text-sm text-[#575750]">SDKs are available for Node.js, Python, and React.</p></div><Link to="/docs/quickstart" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#11a879] px-6 py-3.5 text-sm font-semibold text-[#20211e]">Get test keys <ArrowRight size={15} /></Link></section>
  </div>;
}
