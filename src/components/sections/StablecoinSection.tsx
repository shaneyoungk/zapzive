import { ArrowRight, ShieldCheck, Wallet, Landmark } from "lucide-react";
import { NETWORKS, PUBLIC_NETWORKS, TOKEN_ICONS } from "@/lib/brand-assets";

const points: Array<{ icon: typeof Landmark; title: string; copy: string; tag: "Planned" | "In the sandbox" }> = [
  {
    icon: Landmark,
    title: "Settle in dollars, deliver in local currency.",
    copy: "Stablecoin settlement is designed to carry value from your USD funding to local payout partners, so recipients receive KES, UGX, NGN or GHS by M-Pesa, mobile money or bank. Today these payouts use a simulated sandbox provider.",
    tag: "Planned",
  },
  {
    icon: Wallet,
    title: "Pay straight to USDC wallets.",
    tag: "In the sandbox",
    copy: "Contractors who prefer dollars can receive USDC on Base, Ethereum, Polygon, Arbitrum or Optimism. Addresses are format-checked, and a changed address holds the payout until someone approves it.",
  },
  {
    icon: ShieldCheck,
    title: "Same controls as every other payout.",
    copy: "USDC payouts go through the same validation, approval policy, audit trail and reconciliation. There is no separate crypto workflow to learn.",
    tag: "In the sandbox",
  },
];

const destinations = [
  { label: "M-Pesa", detail: "KES · Kenya" },
  { label: "Bank account", detail: "NGN · Nigeria" },
  { label: "USDC wallet", detail: "USDC · on Base", token: true },
];

function FlowCard() {
  return (
    <div className="rounded-2xl border border-[#d4d8ce] bg-[#fbfaf6] p-5 sm:p-6" aria-label="How settlement is designed to work">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[.11em] text-[#74736b]">How settlement is designed to work</p>

      <div className="mt-5 flex items-center gap-3 rounded-xl border border-[#e3e1d9] bg-white px-4 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef2ec] text-sm font-bold text-[#20211e]">$</span>
        <div className="min-w-0"><p className="text-sm font-bold text-[#20211e]">You fund in USD</p><p className="text-xs text-[#74736b]">One balance for the whole run</p></div>
      </div>

      <div className="ml-[34px] h-5 border-l border-dashed border-[#9fc9b6]" aria-hidden="true" />

      <div className="flex items-center gap-3 rounded-xl border border-[#bfe0d0] bg-[#edf6f1] px-4 py-3">
        <img src={TOKEN_ICONS.USDC} alt="" className="h-9 w-9 rounded-full" />
        <div className="min-w-0 flex-1"><p className="flex items-center gap-2 text-sm font-bold text-[#20211e]">Settles over USDC <span className="rounded-full bg-white px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[.08em] text-[#8a5a0b] ring-1 ring-[#f0dcb0]">Planned</span></p><p className="text-xs text-[#55544d]">A dollar stablecoin, redeemable 1:1</p></div>
        <div className="hidden -space-x-1.5 sm:flex" aria-label="Supported networks">
          {PUBLIC_NETWORKS.map((key) => <img key={key} src={NETWORKS[key].icon} alt={NETWORKS[key].name} title={NETWORKS[key].name} className="h-5 w-5 rounded-full bg-white ring-2 ring-[#edf6f1]" />)}
        </div>
      </div>

      <div className="ml-[34px] h-5 border-l border-dashed border-[#9fc9b6]" aria-hidden="true" />

      <ul className="grid gap-2">
        {destinations.map((item) => (
          <li key={item.label} className="flex items-center gap-3 rounded-xl border border-[#e3e1d9] bg-white px-4 py-2.5">
            <ArrowRight size={14} className="shrink-0 text-[#087f5b]" />
            <span className="text-sm font-semibold text-[#20211e]">{item.label}</span>
            <span className="ml-auto flex items-center gap-1.5 text-xs text-[#74736b]">{item.token && <img src={TOKEN_ICONS.USDC} alt="" className="h-3.5 w-3.5 rounded-full" />}{item.detail}</span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs leading-5 text-[#74736b]">Your team sees dollars and local currency. No one manages keys, gas or networks.</p>
    </div>
  );
}

export function StablecoinSection() {
  return (
    <section id="stablecoins" className="home-section border-b border-[#d9d6cd] bg-[#f4f2ec]">
      <div className="homepage-frame">
        <header className="home-head">
          <p className="homepage-eyebrow">Stablecoin rails</p>
          <div className="home-head__row">
            <h2 className="homepage-title">Stablecoin settlement, <em>without the crypto work.</em></h2>
            <p className="homepage-copy">Zapzive is designed to settle over stablecoin rails, which can move dollars across borders faster and more cheaply than correspondent banking, while your finance team keeps working in dollars and shillings.</p>
          </div>
        </header>

        <div className="home-section__body grid gap-12 lg:grid-cols-2 lg:items-start lg:gap-16">
          <div>
            <div className="grid gap-7">
              {points.map(({ icon: Icon, title, copy, tag }) => (
                <div key={title} className="grid grid-cols-[40px_minmax(0,1fr)] gap-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e1f1eb] text-[#087f5b]"><Icon size={18} strokeWidth={1.8} /></span>
                  <div>
                    <h3 className="text-lg font-bold tracking-[-.04em] text-[#20211e]">{title}</h3>
                    <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[.08em] ring-1 ${tag === "Planned" ? "bg-[#fdf4e3] text-[#8a5a0b] ring-[#f0dcb0]" : "bg-[#e7f3ed] text-[#0b6b4f] ring-[#bfe0d0]"}`}>{tag}</span>
                    <p className="mt-1.5 max-w-lg text-[15px] leading-7 text-[#5d5d56]">{copy}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-8 max-w-lg border-t border-[#d9d6cd] pt-5 text-sm leading-6 text-[#74736b]">USDC wallet payouts work today in the sandbox with a simulated provider. Stablecoin settlement for local-currency payouts is planned and will run through licensed partners.</p>
          </div>

          <FlowCard />
        </div>
      </div>
    </section>
  );
}
