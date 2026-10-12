import { ArrowRight, ArrowUpRight, CheckCircle2, ShieldCheck, WalletCards } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { TOKEN_ICONS } from "@/lib/brand-assets";

const heroAssurances = [
  { icon: WalletCards, title: "Catch problems before payday", detail: "Duplicates, changed payout details and unsupported methods are flagged before anyone approves." },
  { icon: ShieldCheck, title: "Approvals that match your risk", detail: "Amount tiers, new recipients and detail changes route to the right approver." },
  { icon: CheckCircle2, title: "One reconciled record", detail: "Expected versus delivered, provider references and journal exports for every run." },
];

export function HeroSection() {
  return (
    <BackgroundPaths id="payment-hero-paths" className="zapzive-hero px-6 pb-12 pt-32 sm:pb-16 sm:pt-40 lg:pb-20 lg:pt-44">
      <div className="hero-paths-wash" aria-hidden="true" />

      <div className="homepage-frame relative z-10">
        <div className="hero-copy-block">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="homepage-eyebrow hero-eyebrow"
          >
            Payout operations for African businesses
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="homepage-title homepage-title--hero hero-title"
          >
            Prepare, approve, send, and reconcile payouts.<br />
            <em>One payout run. Every approval. One record.</em>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
            className="homepage-copy hero-copy"
          >
            For finance teams paying 20 to 250 contractors, vendors and creators by M-Pesa, bank transfer, mobile money or USDC wallet. Zapzive is the control layer above your payment providers: import the run, fix problems before payday, route it through approval, and keep a record that reconciles. Start free in the sandbox; no live funds move.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="hero-actions"
          >
            <Link to="/signup" className="hero-primary-action">
              Start in the sandbox <ArrowUpRight size={17} />
            </Link>
            <a href="#benefits" className="hero-secondary-action">
              See how a payout run works <ArrowRight size={16} />
            </a>
          </motion.div>

          <motion.a
            href="#stablecoins"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className="group mt-5 inline-flex max-w-full items-center gap-2.5 rounded-full border border-[#d9d6cd] bg-[rgba(255,253,248,.78)] py-1.5 pl-1.5 pr-3.5 text-[13px] text-[#5d5d56] transition-colors hover:border-[#087f5b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087f5b]"
          >
            <img src={TOKEN_ICONS.USDC} alt="" className="h-6 w-6 shrink-0 rounded-full" />
            <span><b className="font-bold text-[#20211e]">USDC wallets and stablecoin settlement</b>, simulated in the sandbox</span>
            <ArrowRight size={14} className="shrink-0 text-[#087f5b] transition-transform group-hover:translate-x-0.5" />
          </motion.a>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="hero-assurance-rail"
        >
          {heroAssurances.map(({ icon: Icon, title, detail }) => (
            <div key={title} className="hero-assurance-rail__item">
              <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
              <div>
                <p>{title}</p>
                <span>{detail}</span>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </BackgroundPaths>
  );
}
