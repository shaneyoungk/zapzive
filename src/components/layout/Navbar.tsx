import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { ZapziveLogo } from "@/components/ui/ZapziveLogo";

const navLinks = [
  { label: "Platform", href: "/features" },
  { label: "Use cases", href: "/use-cases" },
  { label: "Developers", href: "/docs" },
  { label: "Pricing", href: "/pricing" },
  { label: "Company", href: "/about" },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <div className="fixed top-0 inset-x-0 z-50 flex justify-center pointer-events-none">
        <motion.nav
          initial={false}
          className={cn(
            "pointer-events-auto flex w-full items-center justify-between border-b border-[#e6e3db] bg-[#ffffff] text-[#20211e] transition-all duration-300",
            isScrolled ? "px-6 py-3 shadow-[0_6px_24px_rgba(32,33,30,.08)]" : "px-6 py-3.5"
          )
          }>
          {/* Left: Logo */}
          <Link to="/" className="mr-8 flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087f5b]/40 focus-visible:ring-offset-4">
            <ZapziveLogo size="sm" />
          </Link>

          {/* Center: Nav Links */}
          <div className="hidden lg:flex items-center gap-7 mr-auto">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                aria-current={location.pathname.startsWith(link.href) ? "page" : undefined}
                className={cn("rounded-md text-[11px] uppercase tracking-[0.12em] font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087f5b]/40 focus-visible:ring-offset-4", location.pathname.startsWith(link.href) ? "text-[#087f5b]" : "text-[#5d5d56] hover:text-[#20211e]")}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-5">
            <Link to="/login" className="rounded-md text-[11px] uppercase tracking-[.12em] font-bold text-[#5d5d56] transition-colors hover:text-[#20211e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087f5b]/40 focus-visible:ring-offset-4">
              Log in
            </Link>

            <Link to="/signup">
              <Button className="h-9 rounded-[10px] bg-[#087f5b] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[.11em] text-[#fffdf8] shadow-[0_6px_14px_rgba(8,127,91,.18)] transition-colors hover:bg-[#056a4b]">
                Open workspace
              </Button>
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation"
            aria-expanded={isMobileMenuOpen}
            className="lg:hidden rounded-xl p-2 text-[#20211e] transition-colors hover:bg-[#f5f3ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087f5b]/40"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </motion.nav>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-4 top-24 z-40 lg:hidden"
          >
            <div className="flex flex-col gap-4 rounded-2xl border border-[#e6e3db] bg-[#ffffff] p-6 text-[#20211e] shadow-[0_18px_44px_rgba(32,33,30,.12)]">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-current={location.pathname.startsWith(link.href) ? "page" : undefined}
                  className={cn("flex items-center justify-between rounded-lg p-2 text-lg font-semibold transition-colors hover:bg-[#f5f3ee] hover:text-[#087f5b]", location.pathname.startsWith(link.href) ? "bg-[#e8eee4] text-[#087f5b]" : "text-[#20211e]")}
                >
                  {link.label}
                </Link>
              ))}
              <div className="my-2 h-px bg-[#e6e3db]" />
              <div className="flex flex-col gap-3">
                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="py-2 text-center font-semibold text-[#5d5d56] transition-colors hover:text-[#087f5b]">
                  Log in
                </Link>
                <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button className="w-full rounded-[10px] bg-[#087f5b] py-3 font-bold text-[#fffdf8] transition-colors hover:bg-[#056a4b]">
                    Open workspace
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
