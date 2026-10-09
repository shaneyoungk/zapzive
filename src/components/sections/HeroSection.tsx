import { ArrowRight, ArrowUpRight, CheckCircle2, ShieldCheck, WalletCards } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { BackgroundPaths } from "@/components/ui/background-paths";

const heroAssurances = [
  { icon: WalletCards, title: "Start with test balances", detail: "Learn the full payment flow before using a connected rail." },
  { icon: ShieldCheck, title: "Set the right approval", detail: "Route each payment to the people who need to review it." },
  { icon: CheckCircle2, title: "Keep the payment record", detail: "See the recipient, delivery state, and reference in one place." },
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
            Stablecoin payments for global teams
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="homepage-title homepage-title--hero hero-title"
          >
            Fund global payouts with stablecoins.<br />
            <em>Keep approvals, delivery, and proof together.</em>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
            className="homepage-copy hero-copy"
          >
            Create a batch, assign reviewers, choose the delivery method, and check the complete payment record before sending. Start with test balances, then use a supported connected rail when your workspace is ready.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="hero-actions"
          >
            <Link to="/signup" className="hero-primary-action">
              Create a workspace <ArrowUpRight size={17} />
            </Link>
            <a href="#benefits" className="hero-secondary-action">
              See the payment flow <ArrowRight size={16} />
            </a>
          </motion.div>
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
