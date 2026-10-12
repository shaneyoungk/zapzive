import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  BarChart3,
  BookOpen,
  BookOpenCheck,
  Braces,
  Building2,
  ChevronRight,
  CircleAlert,
  Component,
  FlaskConical,
  KeyRound,
  Landmark,
  LockKeyhole,
  MessageCircle,
  Package,
  Rocket,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  UserRoundCog,
  UsersRound,
  Webhook,
  X,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

type SubItem = { title: string; href: string; method?: "GET" | "POST" | "PUT" | "DELETE" };
type NavItem = { title: string; href: string; icon: LucideIcon; subItems?: SubItem[] };
type NavSection = { title: string; items: NavItem[] };

const navigation: NavSection[] = [
  {
    title: "Start here",
    items: [
      { title: "Overview", href: "/docs", icon: BookOpen },
      { title: "Payout operations API", href: "/docs/payouts", icon: Send },
      { title: "Quickstart", href: "/docs/quickstart", icon: Rocket },
      { title: "Authentication", href: "/docs/authentication", icon: KeyRound },
      { title: "Webhooks", href: "/docs/webhooks", icon: Webhook },
      { title: "Errors", href: "/docs/errors", icon: CircleAlert },
      { title: "Testing", href: "/docs/testing", icon: FlaskConical },
      { title: "Go live", href: "/docs/go-live", icon: BadgeCheck },
    ],
  },
  {
    title: "Guides",
    items: [
      { title: "Payment lifecycle", href: "/docs/concepts/payments", icon: Send },
      { title: "Escrow model", href: "/docs/concepts/escrow", icon: LockKeyhole },
      { title: "Enterprise setup", href: "/docs/solutions/enterprise", icon: Building2 },
    ],
  },
  {
    title: "Examples",
    items: [
      { title: "End-to-end solutions", href: "/docs/examples", icon: BookOpenCheck },
    ],
  },
  {
    title: "API reference",
    items: [
      { title: "API overview", href: "/docs/api", icon: Braces },
      {
        title: "Remittance",
        href: "/docs/api/remittance",
        icon: Send,
        subItems: [
          { title: "Payout methods", href: "/docs/api/remittance/payout-methods", method: "GET" },
          { title: "Transaction tracking", href: "/docs/api/remittance/tracking", method: "GET" },
        ],
      },
      {
        title: "Payroll",
        href: "/docs/api/payroll",
        icon: UsersRound,
        subItems: [
          { title: "Batch processing", href: "/docs/api/payroll/batch-processing", method: "POST" },
          { title: "Worker onboarding", href: "/docs/api/payroll/worker-onboarding", method: "POST" },
        ],
      },
      {
        title: "Treasury",
        href: "/docs/api/treasury",
        icon: Landmark,
        subItems: [
          { title: "FX swaps", href: "/docs/api/treasury/fx-swaps", method: "POST" },
          { title: "Gas management", href: "/docs/api/treasury/gas-management", method: "GET" },
        ],
      },
      {
        title: "Escrow",
        href: "/docs/api/escrow",
        icon: LockKeyhole,
        subItems: [
          { title: "Milestone logic", href: "/docs/api/escrow/milestones", method: "POST" },
          { title: "Dispute arbitration", href: "/docs/api/escrow/disputes", method: "POST" },
        ],
      },
      {
        title: "Analytics",
        href: "/docs/api/analytics",
        icon: BarChart3,
        subItems: [{ title: "Custom reporting", href: "/docs/api/analytics/reporting", method: "POST" }],
      },
      {
        title: "Compliance",
        href: "/docs/api/compliance",
        icon: ShieldCheck,
        subItems: [
          { title: "Verification flows", href: "/docs/api/compliance/verification-flows", method: "POST" },
          { title: "Risk scoring", href: "/docs/api/compliance/risk-scoring", method: "GET" },
        ],
      },
      { title: "Agents", href: "/docs/api/agents", icon: UserRoundCog },
      {
        title: "Settings",
        href: "/docs/api/settings",
        icon: Settings2,
        subItems: [
          { title: "Webhook events", href: "/docs/api/settings/webhooks", method: "POST" },
          { title: "Team permissions", href: "/docs/api/settings/team-access", method: "POST" },
        ],
      },
    ],
  },
  {
    title: "SDKs",
    items: [
      { title: "Node.js", href: "/docs/sdks/node", icon: Package },
      { title: "Python", href: "/docs/sdks/python", icon: Package },
      { title: "React", href: "/docs/sdks/react", icon: Component },
    ],
  },
];

export function DocsSidebar() {
  const { pathname } = useLocation();
  const [query, setQuery] = useState("");

  const filteredNavigation = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return navigation;

    return navigation
      .map((section) => ({
        ...section,
        items: section.items
          .map((item) => {
            const matchingSubItems = item.subItems?.filter((subItem) => subItem.title.toLowerCase().includes(search));
            if (item.title.toLowerCase().includes(search)) return item;
            if (matchingSubItems?.length) return { ...item, subItems: matchingSubItems };
            return null;
          })
          .filter((item): item is NavItem => item !== null),
      }))
      .filter((section) => section.items.length > 0);
  }, [query]);

  return (
    <div className="flex h-full flex-col overflow-y-auto px-4 py-5 custom-scrollbar">
      <div className="relative mb-7">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#92928a]" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search documentation"
          aria-label="Search documentation"
          className="h-10 w-full rounded-xl border border-[#d9d6cd] bg-[#fffdf8] pl-9 pr-9 text-sm text-[#20211e] outline-none transition placeholder:text-[#aaa9a1] focus:border-[#11a879] focus:ring-2 focus:ring-[#11a8791f]"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center text-[#77766e] hover:text-[#20211e]">
            <X size={14} />
          </button>
        )}
      </div>

      <nav aria-label="Documentation" className="space-y-9">
        {filteredNavigation.map((section) => (
          <section key={section.title}>
            <h2 className="px-3 font-mono text-[9px] font-semibold uppercase tracking-[.14em] text-[#92928a]">{section.title}</h2>
            <div className="mt-3 space-y-1">
              {section.items.map((item) => {
                const hasSubItems = Boolean(item.subItems?.length);
                const isExactActive = pathname === item.href;
                const isGroupActive = isExactActive || Boolean(item.subItems?.some((subItem) => pathname === subItem.href));
                const showSubItems = hasSubItems && (isGroupActive || Boolean(query));
                const Icon = item.icon;

                return (
                  <div key={item.href}>
                    <Link
                      to={item.href}
                      className={cn(
                        "group flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                        isExactActive
                          ? "bg-[#183a30] font-semibold text-[#f5f3ee]"
                          : isGroupActive
                            ? "bg-[#e8eee4] font-semibold text-[#20211e]"
                            : "text-[#575750] hover:bg-[#ece9e1] hover:text-[#20211e]",
                      )}
                    >
                      <Icon size={15} strokeWidth={1.8} className={cn("shrink-0", isExactActive ? "text-[#76d4b5]" : "text-[#087f5b]")} />
                      <span className="min-w-0 flex-1 truncate">{item.title}</span>
                      {hasSubItems && <ChevronRight size={13} className={cn("shrink-0 text-[#92928a] transition", showSubItems && "rotate-90")} />}
                    </Link>

                    {showSubItems && (
                      <div className="ml-5 mt-1 space-y-1 border-l border-[#d9d6cd] pl-4">
                        {item.subItems?.map((subItem) => {
                          const active = pathname === subItem.href;
                          return (
                            <Link
                              key={subItem.href}
                              to={subItem.href}
                              className={cn(
                                "flex min-h-8 items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs transition",
                                active ? "bg-[#e8eee4] font-semibold text-[#087f5b]" : "text-[#77766e] hover:text-[#20211e]",
                              )}
                            >
                              <span>{subItem.title}</span>
                              {subItem.method && <span className="rounded border border-[#cdd8c8] bg-[#fffdf8] px-1.5 py-0.5 font-mono text-[8px] font-semibold text-[#087f5b]">{subItem.method}</span>}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

      {!filteredNavigation.length && <p className="px-3 py-8 text-sm text-[#77766e]">No documentation found.</p>}

      <div className="mt-10 border-t border-[#d9d6cd] px-3 pb-3 pt-6">
        <div className="flex items-start gap-3">
          <MessageCircle size={16} className="mt-0.5 shrink-0 text-[#087f5b]" />
          <div>
            <p className="text-xs font-semibold text-[#20211e]">Need integration help?</p>
            <Link to="/contact" className="mt-1 inline-block text-xs text-[#087f5b] hover:underline">Contact support</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
