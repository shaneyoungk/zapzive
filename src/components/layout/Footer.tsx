import { FlaskConical } from "lucide-react";
import { Link } from "react-router-dom";
import { ZapziveLogo } from "@/components/ui/ZapziveLogo";

const footerLinks = {
  Platform: [
    { label: "Payout runs", href: "/features#runs" },
    { label: "Recipients", href: "/features#recipients" },
    { label: "Approvals", href: "/features#approvals" },
    { label: "Reconciliation", href: "/features#reconciliation" },
    { label: "Controls", href: "/features#controls" },
  ],
  Developers: [
    { label: "Documentation", href: "/docs" },
    { label: "API reference", href: "/docs/api" },
    { label: "Examples", href: "/docs/examples" },
    { label: "Testing", href: "/docs/testing" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Pricing", href: "/pricing" },
  ],
  Legal: [
    { label: "Terms", href: "/terms" },
    { label: "Privacy", href: "/privacy" },
    { label: "Risk disclosure", href: "/risk-disclosure" },
  ],
};

export function Footer() {
  return (
    <footer className="homepage-dark overflow-hidden border-t border-[#ffffff1f] px-6">
      <div className="homepage-frame">
        <div className="grid gap-14 py-16 sm:py-20 lg:grid-cols-[minmax(255px,.82fr)_minmax(0,2fr)] lg:gap-24">
          <div className="max-w-[330px]">
            <Link to="/" aria-label="Zapzive home" className="inline-flex border-b border-[#7de0bf] pb-5">
              <ZapziveLogo size="lg" tone="light" />
            </Link>
            <p className="mt-7 font-mono text-[10px] font-semibold uppercase tracking-[.13em] text-[#7de0bf]">Payment operations</p>
            <h2 className="mt-4 text-[22px] font-bold leading-[1.2] tracking-[-.04em] text-[#fffdf8]">Prepare, approve, and review payments from one workspace.</h2>
            <p className="mt-5 text-sm leading-6 text-[#d5d4cb]">Payout operations for African businesses: prepare, approve, send and reconcile payouts from one controlled workspace.</p>
          </div>

          <nav aria-label="Footer navigation" className="grid grid-cols-2 gap-x-9 gap-y-12 md:grid-cols-4">
            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category}>
                <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[.12em] text-[#7de0bf]">{category}</h3>
                <ul className="mt-6 space-y-4">
                  {links.map((link) => (
                    <li key={link.label}>
                      <Link to={link.href} className="text-sm font-medium text-[#d5d4cb] transition-colors hover:text-[#7de0bf]">{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-4 border-t border-[#ffffff1f] py-7 text-xs text-[#c4c3bb] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span>{"\u00A9"} {new Date().getFullYear()} Zapzive</span>
            <span className="hidden h-1 w-1 rounded-full bg-[#7b7b73] sm:block" />
            <span className="inline-flex items-center gap-2"><FlaskConical size={13} /> Test mode is available. Connected rail availability depends on the selected network.</span>
          </div>
          <Link to="/docs/testing" className="font-semibold text-[#d5d4cb] underline-offset-4 hover:text-[#7de0bf] hover:underline">Read about test mode</Link>
        </div>
      </div>
    </footer>
  );
}
