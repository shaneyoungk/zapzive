import { ArrowRight, CalendarDays, Clock3 } from "lucide-react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const articles = [
  { category: "Concept", title: "How a payment moves", excerpt: "Follow funding, approval, settlement, local delivery, and reconciliation as one connected record.", date: "Payment lifecycle", read: "Docs", href: "/docs/concepts/payments" },
  { category: "Implementation", title: "Build a complete payout workflow", excerpt: "Start with a recipient, create a batch, inspect each state, and finish with reconciliation.", date: "End-to-end example", read: "Guide", href: "/docs/examples/payroll" },
  { category: "Product stage", title: "What the sandbox does", excerpt: "Understand test balances, simulated providers, API keys, and the boundary between evaluation and production.", date: "Testing", read: "Docs", href: "/docs/testing" },
];

export default function Blog() {
  return <div className="public-page min-h-screen"><Navbar /><main>
    <section className="public-hero px-6 pb-20 pt-40"><div className="homepage-frame"><p className="homepage-eyebrow">Working notes</p><h1 className="homepage-title homepage-title--wide">Make the money flow <em>easy to understand.</em></h1><p className="homepage-copy">Short, practical guides for modeling financial operations with clear states, controls, and records.</p></div></section>
    <section className="public-section px-6 py-20"><div className="homepage-frame"><div className="resource-grid">{articles.map((article, index) => <article key={article.title} className="group resource-card"><div className="flex items-center justify-between"><span className="homepage-eyebrow">{article.category}</span><span className="public-index">0{index + 1}</span></div><h2>{article.title}</h2><p>{article.excerpt}</p><div><span><CalendarDays size={14} />{article.date}</span><span><Clock3 size={14} />{article.read}</span></div><Link to={article.href} className="homepage-link">Open guide <ArrowRight size={15} className="transition group-hover:translate-x-1" /></Link></article>)}</div></div></section>
  </main><Footer /></div>;
}
