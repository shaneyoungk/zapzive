import { ArrowRight, BarChart3, FileCheck2, LockKeyhole, Send, ShieldCheck, UsersRound, WalletCards } from "lucide-react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const capabilities = [
  { id: "payroll", icon: UsersRound, title: "Manage recipients and payouts", copy: "Create workers or recipients, prepare batches, and keep every payment row connected to a readable state.", cue: "Recipient → batch → approval → record", href: "/use-cases#payroll", label: "Explore payroll" },
  { id: "remittance", icon: Send, title: "Move funds with context", copy: "Model a remittance with a source asset, destination currency, test quote, fee, delivery method, and reference.", cue: "Asset → test quote → local method", href: "/use-cases#remittance", label: "Explore remittance" },
  { id: "treasury", icon: WalletCards, title: "Operate treasury positions", copy: "Separate available, reserved, pending, incoming, and outgoing balances so teams can reason about liquidity.", cue: "Available · reserved · pending", href: "/dashboard/treasury", label: "View treasury" },
  { id: "escrow", icon: LockKeyhole, title: "Control milestone releases", copy: "Attach evidence and approvals to milestone states, keeping release logic visible and auditable.", cue: "Evidence → review → release", href: "/use-cases#escrow", label: "Explore escrow" },
  { id: "controls", icon: ShieldCheck, title: "Apply operating controls", copy: "Set roles, approval steps, review records, and scoped API keys around each workflow.", cue: "Owner · operator · approver · reviewer", href: "/features#controls", label: "See controls" },
  { id: "reconciliation", icon: BarChart3, title: "Reconcile and report", copy: "Trace each material action by actor, reference, timestamp, amount, and resulting record.", cue: "Movement → event → record", href: "/docs/concepts/payments", label: "Read the model" },
  { id: "api", icon: FileCheck2, title: "Integrate through the API", copy: "Use test credentials, idempotency, explicit errors, and copyable examples for the same workflows.", cue: "Request → state → response", href: "/docs", label: "Read the docs" },
];

export default function Features() {
  return <div className="public-page min-h-screen"><Navbar /><main>
    <section className="public-hero px-6 pb-20 pt-40 lg:pb-28"><div className="homepage-frame"><p className="homepage-eyebrow">Platform</p><h1 className="homepage-title homepage-title--wide">One operating layer for global money <em>movement.</em></h1><p className="homepage-copy">Prepare a payment, apply the right review, follow delivery, and keep the resulting record in one place.</p></div></section>
    <section className="public-section px-6 py-20 sm:py-28"><div className="homepage-frame"><div className="public-section-heading"><div><p className="homepage-eyebrow">Capabilities by job</p><h2 className="homepage-title homepage-title--section">A clear place for every operation.</h2></div><span className="public-metadata">Test workspace · 07 areas</span></div><div className="editorial-list">{capabilities.map(({ id, icon: Icon, title, copy, cue, href, label }, index) => <article id={id} key={id} className="editorial-list__row"><div className="editorial-list__icon"><Icon size={19} strokeWidth={1.8} /></div><div><div className="flex flex-wrap items-baseline gap-3"><span className="public-index">0{index + 1}</span><h3>{title}</h3></div><p>{copy}</p><span>{cue}</span></div><Link to={href} className="homepage-link editorial-list__link">{label}<ArrowRight size={15} /></Link></article>)}</div></div></section>
    <section id="controls" className="public-note px-6 py-16 sm:py-20"><div className="homepage-frame grid gap-8 md:grid-cols-[.8fr_1.2fr] md:items-center"><div><p className="homepage-eyebrow">Current product stage</p><h2 className="homepage-title homepage-title--section">Built for evaluation, not live execution.</h2></div><p className="homepage-copy !mt-0">Test balances, quotes, recipients, and provider states help teams review a workflow. Live banking, custody, FX, blockchain settlement, and compliance providers are not connected.</p></div></section>
  </main><Footer /></div>;
}
