import { ArrowRight, Compass, Globe2, ShieldCheck, Waypoints } from "lucide-react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const principles = [
  { icon: Compass, title: "Clarity over complexity", copy: "Financial operations should be understandable before they are automated." },
  { icon: ShieldCheck, title: "Control by default", copy: "Approval, compliance, and audit context belong inside every movement." },
  { icon: Waypoints, title: "Local reach, one model", copy: "Different payment rails should not create fragmented operating workflows." },
];

export default function About() {
  return <div className="public-page min-h-screen"><Navbar /><main>
    <section className="public-hero px-6 pb-20 pt-40 lg:pb-28"><div className="homepage-frame"><p className="homepage-eyebrow">About Zapzive</p><h1 className="homepage-title homepage-title--wide">Make every movement easier to <em>understand.</em></h1><div className="public-intro-grid"><p>We are building a clearer operating layer for payments, treasury, and programmable financial controls.</p><p>Today, Zapzive is a test workspace for modeling approvals, recipients, escrow, reconciliation, and compliance records around a financial movement.</p></div></div></section>
    <section className="public-section px-6 py-20 lg:py-28"><div className="homepage-frame grid gap-16 lg:grid-cols-[.8fr_1.2fr]"><div><p className="homepage-eyebrow">Our mission</p><h2 className="homepage-title homepage-title--section">Make cross-border finance clear, visible, and controlled.</h2></div><div className="public-statement"><Globe2 size={25} strokeWidth={1.7} /><p>Global businesses should not need a patchwork of bank portals, spreadsheets, wallet tools, and private messages to understand where their money is.</p><span>We focus on the operational record around the transaction—not only the transaction itself.</span></div></div></section>
    <section className="homepage-dark px-6 py-20"><div className="homepage-frame"><div className="mb-12 grid gap-6 md:grid-cols-2"><p className="homepage-eyebrow">What guides the product</p><h2 className="homepage-title homepage-title--section">Principles before features.</h2></div><div className="public-principles">{principles.map(({ icon: Icon, title, copy }) => <article key={title}><Icon size={20} /><h3>{title}</h3><p>{copy}</p></article>)}</div></div></section>
    <section className="public-section px-6 py-20"><div className="homepage-frame flex flex-col justify-between gap-6 border-b border-[#d9d6cd] pb-8 md:flex-row md:items-end"><h2 className="homepage-title homepage-title--section">Build the next global financial workflow with us.</h2><Link to="/contact" className="homepage-link">Start a conversation <ArrowRight size={15} /></Link></div></section>
  </main><Footer /></div>;
}
