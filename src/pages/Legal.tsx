import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, FileText, ShieldCheck, TriangleAlert } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

type LegalKind = "terms" | "privacy" | "risk-disclosure";

const documents: Record<LegalKind, { label: string; title: string; intro: string; icon: typeof FileText; sections: Array<{ heading: string; body: string }> }> = {
  terms: {
    label: "Terms of use",
    title: "The rules for using Zapzive.",
    intro: "These terms describe access to the Zapzive sandbox and the responsibilities that apply while you evaluate the product.",
    icon: FileText,
    sections: [
      { heading: "Sandbox scope", body: "Zapzive is an evaluation environment for modeling financial-operations workflows. It does not move live funds, open bank accounts, custody assets, execute blockchain transactions, or provide regulated financial services." },
      { heading: "Your workspace", body: "You are responsible for the accuracy of information entered into your workspace, keeping credentials private, and reviewing actions before submitting them. Do not enter secrets, real payment credentials, or sensitive personal data that is not needed for a test." },
      { heading: "Acceptable use", body: "Use the product lawfully and only for evaluation, development, documentation, and internal workflow testing. Do not probe, overload, reverse engineer, or use the sandbox to misrepresent a real payment or settlement." },
      { heading: "Availability and changes", body: "The sandbox may change as the product develops. We may add, remove, or revise test capabilities and will label material provider limitations inside the product and documentation." },
    ],
  },
  privacy: {
    label: "Privacy",
    title: "A small, clear data footprint.",
    intro: "This notice explains the information the sandbox needs to provide an account and preserve a useful test workspace.",
    icon: ShieldCheck,
    sections: [
      { heading: "Information we receive", body: "Account details such as name, email, company, and country are used to create and secure a workspace. Test recipients, workflow records, and configuration values are used to render the features you choose to test." },
      { heading: "How it is used", body: "We use workspace data to authenticate users, provide product functionality, troubleshoot issues, improve the sandbox, and communicate about the service. We do not claim that sandbox records are suitable for live financial or production decisions." },
      { heading: "What not to submit", body: "Do not submit private keys, seed phrases, bank credentials, card numbers, government identity documents, or real beneficiary data. The sandbox is not a regulated custody, KYC, or banking environment." },
      { heading: "Your choices", body: "For access, correction, deletion, or privacy questions, contact hello@zapzive.network and include the workspace email. We will verify the request before making account changes." },
    ],
  },
  "risk-disclosure": {
    label: "Risk disclosure",
    title: "Know what the test workspace does—and does not do.",
    intro: "Zapzive is designed to make workflow decisions visible during evaluation. It is not a promise that a real-world payment, quote, rail, or compliance decision will succeed.",
    icon: TriangleAlert,
    sections: [
      { heading: "No live execution", body: "Test balances, quotes, recipients, statuses, and settlement records are simulated. No bank, mobile-money, card, custody, FX, blockchain, or compliance-provider execution is connected in the sandbox." },
      { heading: "No financial advice", body: "Product screens and sample values are illustrative. They are not an offer, recommendation, quote, guarantee, or representation of availability in any market." },
      { heading: "Operational review remains necessary", body: "A workflow can be modeled as approved, ready, or reconciled in a test environment without being valid for production. Confirm permissions, beneficiary data, sanctions obligations, local rules, provider contracts, and settlement outcomes before any real integration." },
      { heading: "Report an issue", body: "If you see a state or sample value that could be mistaken for live execution, contact hello@zapzive.network with the page and workspace context so it can be corrected." },
    ],
  },
};

export default function Legal() {
  const pathname = useLocation().pathname.replace(/^\//, "") as LegalKind;
  const document = documents[pathname] ?? documents.terms;
  const Icon = document.icon;

  return <div className="public-page min-h-screen"><Navbar /><main>
    <section className="public-hero px-6 pb-16 pt-36 sm:pb-20 sm:pt-44"><div className="mx-auto max-w-[900px]">
      <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#087f5b] hover:text-[#20211e]"><ArrowLeft size={15} /> Back to Zapzive</Link>
      <div className="mt-12 flex items-start gap-5"><span className="editorial-list__icon"><Icon size={21} strokeWidth={1.7} /></span><div><p className="homepage-eyebrow">{document.label}</p><h1 className="homepage-title homepage-title--legal">{document.title}</h1></div></div>
      <p className="homepage-copy">{document.intro}</p><p className="public-metadata mt-5">Last updated · 02 October 2026</p>
    </div></section>
    <section className="public-section px-6 py-16 sm:py-24"><div className="mx-auto max-w-[900px] legal-list">{document.sections.map(section => <article key={section.heading}><h2>{section.heading}</h2><p>{section.body}</p></article>)}</div><p className="mx-auto mt-8 max-w-[900px] text-sm leading-6 text-[#77766e]">Questions about this document? <a className="font-semibold text-[#087f5b] underline-offset-4 hover:underline" href="mailto:hello@zapzive.network">hello@zapzive.network</a>.</p></section>
  </main><Footer /></div>;
}
