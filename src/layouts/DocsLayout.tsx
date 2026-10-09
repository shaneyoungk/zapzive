import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { Outlet, useLocation } from "react-router-dom";
import { DocsSidebar } from "@/components/docs/DocsSidebar";
import { Navbar } from "@/components/layout/Navbar";
import { cn } from "@/lib/utils";

type PageHeading = { id: string; label: string };

const conceptualDocs = new Set([
  "/docs/api/remittance/payout-methods",
  "/docs/api/treasury/fx-swaps",
  "/docs/api/treasury/gas-management",
  "/docs/api/analytics/reporting",
  "/docs/api/compliance/verification-flows",
  "/docs/api/compliance/risk-scoring",
  "/docs/api/settings/team-access",
  "/docs/api/settings/webhooks",
  "/docs/api/remittance/tracking",
  "/docs/api/escrow/milestones",
  "/docs/api/escrow/disputes",
  "/docs/api/payroll/batch-processing",
  "/docs/api/payroll/worker-onboarding",
]);

function getPageLabel(pathname: string) {
  if (pathname === "/docs") return "Overview";
  const segment = pathname.split("/").filter(Boolean).at(-1) || "Overview";
  return segment.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function DocsLayout() {
  const { pathname } = useLocation();
  const isConceptual = conceptualDocs.has(pathname);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [headings, setHeadings] = useState<PageHeading[]>([]);
  const contentRef = useRef<HTMLElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    setIsSidebarOpen(false);

    const frame = window.requestAnimationFrame(() => {
      const pageHeadings = Array.from(contentRef.current?.querySelectorAll("h2") || []).map((heading, index) => {
        const label = heading.textContent?.trim() || `Section ${index + 1}`;
        const slug = label
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
        const id = heading.id || slug || `section-${index + 1}`;
        heading.id = id;
        return { id, label };
      });
      setHeadings(pageHeadings);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  return (
    <div className="docs-page min-h-screen bg-[#f5f3ee] text-[#20211e] antialiased selection:bg-[#76d4b5]">
      <Navbar />

      <div className="fixed inset-x-0 top-[60px] z-30 border-y border-[#d9d6cd] bg-[#f5f3ee]/95 backdrop-blur-md">
        <div className="mx-auto flex h-12 max-w-[1440px] items-center justify-between px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen((open) => !open)}
              aria-label="Toggle documentation navigation"
              aria-expanded={isSidebarOpen}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#d9d6cd] text-[#575750] lg:hidden"
            >
              {isSidebarOpen ? <X size={17} /> : <Menu size={17} />}
            </button>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[.1em] text-[#087f5b]">Documentation</span>
            <span className="text-[#b9b7ae]">/</span>
            <span className="truncate text-sm font-medium text-[#575750]">{getPageLabel(pathname)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-[#77766e] sm:inline">REST API</span>
            <span className="rounded-[8px] border border-[#cdd8c8] bg-[#e8eee4] px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[.08em] text-[#087f5b]">test mode</span>
          </div>
        </div>
      </div>

      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close documentation navigation"
          className="fixed inset-0 z-30 bg-[#20211e]/45 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed bottom-0 left-0 top-[108px] z-40 w-[286px] border-r border-[#d9d6cd] bg-[#f5f3ee] transition-transform duration-200 lg:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <DocsSidebar />
      </aside>

      <div className="pt-[108px] lg:pl-[286px]">
        <div className="mx-auto grid max-w-[1160px] grid-cols-1 gap-12 px-6 sm:px-8 2xl:grid-cols-[minmax(0,860px)_190px]">
          <main ref={contentRef} className="docs-content min-w-0 py-12 sm:py-16">
            {isConceptual && (
              <div className="mb-10 rounded-[14px] border border-[#d9d6cd] bg-[#fffdf8] p-5 text-sm leading-6 text-[#575750]">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[.12em] text-[#9a6b12]">Conceptual surface</p>
                <p className="mt-2">This page describes a planned provider-backed capability. Its example routes are not implemented in the current sandbox backend. Use the linked core API pages for working requests, and treat this page as design guidance only.</p>
              </div>
            )}
            <Outlet />
          </main>

          {headings.length > 1 && (
            <aside className="hidden py-16 2xl:block">
              <div className="sticky top-36 border-l border-[#d9d6cd] pl-5">
                <p className="font-mono text-[9px] font-semibold uppercase tracking-[.12em] text-[#77766e]">On this page</p>
                <nav className="mt-4 space-y-3" aria-label="On this page">
                  {headings.map((heading) => (
                    <a key={heading.id} href={`#${heading.id}`} className="block text-xs leading-5 text-[#77766e] transition hover:text-[#087f5b]">
                      {heading.label}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          )}
        </div>

        <footer className="mx-auto max-w-[1160px] border-t border-[#d9d6cd] px-6 py-8 text-xs text-[#77766e] sm:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p>{"\u00A9"} {new Date().getFullYear()} Zapzive Developer Documentation</p>
            <p>Need help? <a href="/contact" className="font-semibold text-[#087f5b]">Contact support</a></p>
          </div>
        </footer>
      </div>
    </div>
  );
}
