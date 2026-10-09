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
            "pointer-events-auto flex w-full items-center justify-between border-b border-[#ffffff1f] bg-[#183a30]/[.98] text-[#f7f5ef] backdrop-blur-md transition-all duration-300",
            isScrolled ? "px-6 py-3 shadow-[0_5px_20px_rgba(18,35,29,.24)]" : "px-6 py-3.5"
          )
          }>
          {/* Left: Logo */}
            <Link to="/" className="mr-8 flex items-center gap-2 group">
            <ZapziveLogo size="sm" className="opacity-95 group-hover:opacity-100 transition-opacity" />
          </Link>

          {/* Center: Nav Links */}
          <div className="hidden lg:flex items-center gap-7 mr-auto">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className={cn("text-[11px] uppercase tracking-[0.12em] font-bold transition-colors duration-200", location.pathname.startsWith(link.href) ? "text-[#7de0bf]" : "text-[#d5d4cb] hover:text-[#fffdf8]")}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-5">
            <Link to="/login" className="text-[11px] uppercase tracking-[.12em] font-bold text-[#d5d4cb] hover:text-[#fffdf8] transition-colors">
              Log in
            </Link>

            <Link to="/signup">
              <Button className="h-9 rounded-[10px] bg-[#7de0bf] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[.11em] text-[#17382d] transition-colors hover:bg-[#fffdf8]">
                Open workspace
              </Button>
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation"
            className="lg:hidden rounded-xl p-2 text-[#f7f5ef] transition-colors hover:bg-white/10"
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
            <div className="flex flex-col gap-4 rounded-2xl border border-[#ffffff1f] bg-[#183a30] p-6 text-[#f7f5ef] shadow-[0_18px_44px_rgba(18,35,29,.28)]">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between rounded-lg p-2 text-lg font-semibold text-[#d5d4cb] transition-colors hover:bg-white/10 hover:text-[#fffdf8]"
                >
                  {link.label}
                </Link>
              ))}
              <div className="my-2 h-px bg-[#ffffff1f]" />
              <div className="flex flex-col gap-3">
                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="py-2 text-center font-semibold text-[#d5d4cb] transition-colors hover:text-[#fffdf8]">
                  Log in
                </Link>
                <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button className="w-full rounded-[10px] bg-[#7de0bf] py-3 font-bold text-[#17382d] transition-colors hover:bg-[#fffdf8]">
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
