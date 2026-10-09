import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
    BarChart3, Building2, ChevronDown, ChevronLeft, ChevronRight, FlaskConical,
    HelpCircle, LayoutDashboard, LogOut, MapPin, Menu, Search, Send, Settings,
    Shield, ShieldCheck, Users, Wallet, X, Coins,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import CommandPalette from "@/components/layout/CommandPalette";
import NetworkHealthIndicator from "@/components/layout/NetworkHealthIndicator";
import NotificationsCenter from "@/components/layout/NotificationsCenter";
import { ZapziveLogo } from "@/components/ui/ZapziveLogo";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PageHeaderProvider, usePageHeader } from "@/contexts/PageHeaderContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLogout } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const navigationGroups = [
    {
        title: "Workspace",
        items: [
            { icon: LayoutDashboard, href: "/dashboard", label: "Overview" },
            { icon: BarChart3, href: "/dashboard/analytics", label: "Analytics" },
        ],
    },
    {
        title: "Money movement",
        items: [
            { icon: Users, href: "/dashboard/payroll", label: "Payroll" },
            { icon: ShieldCheck, href: "/dashboard/escrow", label: "Escrow" },
            { icon: Send, href: "/dashboard/remittance", label: "Remittance" },
            { icon: Wallet, href: "/dashboard/treasury", label: "Treasury" },
            { icon: Coins, href: "/dashboard/crypto", label: "Crypto payments" },
        ],
    },
    {
        title: "Controls",
        items: [
            { icon: Shield, href: "/dashboard/compliance", label: "Compliance" },
            { icon: MapPin, href: "/dashboard/agents", label: "Agents" },
        ],
    },
];

const pageMeta = [
    { match: "/dashboard/crypto", title: "Crypto payments", description: "Send USDC from your wallet and track settlement." },
    { match: "/dashboard/payroll/batches", title: "Payroll batch", description: "Review recipients, approvals, and settlement progress." },
    { match: "/dashboard/payroll/workers", title: "Worker profile", description: "Worker identity, payment details, and activity." },
    { match: "/dashboard/escrow/", title: "Escrow contract", description: "Manage milestones, evidence, and fund releases." },
    { match: "/dashboard/treasury/transfer", title: "Treasury transfer", description: "Move funds with a clear confirmation trail." },
    { match: "/dashboard/analytics", title: "Analytics", description: "Track volume, performance, and operational trends." },
    { match: "/dashboard/payroll", title: "Payroll", description: "Manage workers, batches, approvals, and payment history." },
    { match: "/dashboard/escrow", title: "Escrow", description: "Protect funds with milestone-based release controls." },
    { match: "/dashboard/remittance", title: "Remittance", description: "Send and monitor cross-border payouts." },
    { match: "/dashboard/treasury", title: "Treasury", description: "Manage liquidity, balances, and settlement assets." },
    { match: "/dashboard/compliance", title: "Compliance", description: "Review identity, risk, and transaction checks." },
    { match: "/dashboard/agents", title: "Agents", description: "Monitor local payout coverage and agent operations." },
    { match: "/dashboard/settings", title: "Settings", description: "Configure your organization, API access, and alerts." },
    { match: "/dashboard", title: "Overview", description: "Your financial position and operations at a glance." },
];

function DashboardHeader() {
    const { pathname } = useLocation();
    const { title: contextualTitle } = usePageHeader();
    const meta = useMemo(
        () => pageMeta.find((item) => pathname === item.match || pathname.startsWith(item.match.endsWith("/") ? item.match : item.match + "/")) ?? pageMeta[pageMeta.length - 1],
        [pathname],
    );

    return (
        <div className="min-w-0">
            <p className="dashboard-eyebrow hidden sm:block">Zapzive workspace</p>
            <div className="flex min-w-0 items-baseline gap-3">
                <h1 className="truncate text-[19px] font-semibold leading-tight tracking-[-0.035em] text-[#20211e] sm:text-[22px]">
                    {contextualTitle || meta.title}
                </h1>
                <p className="hidden truncate text-sm text-[#77766e] xl:block">{meta.description}</p>
            </div>
        </div>
    );
}

function SidebarNavigation({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
    const { pathname } = useLocation();

    return (
        <nav className="space-y-7" aria-label="Dashboard navigation">
            {navigationGroups.map((group) => (
                <div key={group.title}>
                    {!collapsed && <p className="mb-2 px-3 font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-[#85857d]">{group.title}</p>}
                    <div className="space-y-1">
                        {group.items.map((item) => {
                            const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
                            const content = (
                                <Link
                                    to={item.href}
                                    onClick={onNavigate}
                                    aria-current={active ? "page" : undefined}
                                    className={cn(
                                        "group relative flex h-10 items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-colors",
                                        collapsed && "justify-center px-0",
                                        active ? "text-[#f5f3ee]" : "text-[#aaa9a1] hover:bg-white/[0.06] hover:text-[#f5f3ee]",
                                    )}
                                >
                                    {active && <span className="absolute left-0 h-5 w-[3px] rounded-r-full bg-[#11a879]" />}
                                    <item.icon className={cn("h-[17px] w-[17px] shrink-0", active ? "text-[#087f5b]" : "text-[#85857d] group-hover:text-[#c9c8c0]")} strokeWidth={1.8} />
                                    {!collapsed && <span>{item.label}</span>}
                                </Link>
                            );

                            return collapsed ? (
                                <Tooltip key={item.href}>
                                    <TooltipTrigger asChild>{content}</TooltipTrigger>
                                    <TooltipContent side="right" className="ml-2 border-[#2f5e50] bg-[#183a30] text-[#f5f3ee]">{item.label}</TooltipContent>
                                </Tooltip>
                            ) : <div key={item.href}>{content}</div>;
                        })}
                    </div>
                </div>
            ))}
        </nav>
    );
}

export default function DashboardLayout() {
    const { user, company } = useAuth();
    const logout = useLogout();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [commandOpen, setCommandOpen] = useState(false);
    const [showTestNotice, setShowTestNotice] = useState(true);
    const [collapsed, setCollapsed] = useState(() => localStorage.getItem("sidebarCollapsed") === "true");

    useEffect(() => {
        document.body.classList.add("dashboard-active");
        return () => document.body.classList.remove("dashboard-active");
    }, []);

    useEffect(() => localStorage.setItem("sidebarCollapsed", String(collapsed)), [collapsed]);

    useEffect(() => {
        const openSearch = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
                event.preventDefault();
                setCommandOpen(true);
            }
        };
        window.addEventListener("keydown", openSearch);
        return () => window.removeEventListener("keydown", openSearch);
    }, []);

    const initials = user?.name?.substring(0, 2).toUpperCase() || "ZA";
    const companyInitials = company?.name?.substring(0, 2).toUpperCase() || "ZA";

    return (
        <PageHeaderProvider>
            <TooltipProvider delayDuration={100}>
                <div data-dashboard className="flex min-h-screen bg-[#f5f3ee] text-[#20211e]">
                    <aside className={cn("fixed inset-y-0 left-0 z-50 hidden flex-col border-r border-[#2f5e50] bg-[#183a30] transition-[width] duration-200 lg:flex", collapsed ? "w-[84px]" : "w-[264px]")}>
                        <div className={cn("flex h-[72px] items-center border-b border-[#2f5e50]", collapsed ? "justify-center px-3" : "px-6")}>
                            <ZapziveLogo size={collapsed ? "xs" : "sm"} />
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 py-5">
                            {!collapsed && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="mb-7 flex w-full items-center gap-3 rounded-[12px] border border-[#2f5e50] bg-white/[0.035] p-2.5 text-left transition-colors hover:bg-white/[0.07]">
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#3c6c5d] bg-[#20463a] text-xs font-semibold text-[#76d4b5]">{companyInitials}</span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-[13px] font-semibold text-[#f5f3ee]">{company?.name || "Zapzive Finance"}</span>
                                                <span className="mt-0.5 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-[#92928a]"><span className="h-1.5 w-1.5 rounded-full bg-[#11a879]" />{company?.isTestMode ? "Test workspace" : "Live workspace"}</span>
                                            </span>
                                            <ChevronDown className="h-4 w-4 text-[#85857d]" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-60 rounded-xl border-[#d9d6cd] bg-[#fffdf8] p-2 shadow-xl">
                                        <DropdownMenuLabel className="font-mono text-[9px] uppercase tracking-[.14em] text-[#77766e]">Organization</DropdownMenuLabel>
                                        <DropdownMenuItem className="gap-3 rounded-lg bg-[#e8eee4] text-[#20211e]"><Building2 className="h-4 w-4 text-[#087f5b]" /><span className="truncate">{company?.name || "Zapzive Finance"}</span></DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="gap-3 rounded-lg text-[#575750]"><HelpCircle className="h-4 w-4" /> Contact support</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                            <SidebarNavigation collapsed={collapsed} />
                        </div>

                        <div className="border-t border-[#2f5e50] p-4">
                            <Link to="/dashboard/settings" className={cn("mb-3 flex h-10 items-center gap-3 rounded-xl px-3 text-[13px] font-medium text-[#aaa9a1] transition-colors hover:bg-white/[0.06] hover:text-[#f5f3ee]", collapsed && "justify-center px-0")}><Settings className="h-[17px] w-[17px]" />{!collapsed && "Settings"}</Link>
                            <div className={cn("flex items-center gap-3 border-t border-[#2f5e50] pt-4", collapsed && "flex-col")}>
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#3c6c5d] bg-[#20463a] text-[11px] font-semibold text-[#f5f3ee]">{initials}</span>
                                {!collapsed && <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-[#f5f3ee]">{user?.name || "Workspace admin"}</span><span className="block truncate text-[10px] text-[#85857d]">{user?.email || "admin@zapzive.com"}</span></span>}
                                {!collapsed && <button onClick={logout} aria-label="Log out" className="rounded-lg p-2 text-[#85857d] hover:bg-white/[0.06] hover:text-[#f5f3ee]"><LogOut className="h-4 w-4" /></button>}
                            </div>
                            <button onClick={() => setCollapsed((value) => !value)} className="mt-3 flex h-8 w-full items-center justify-center rounded-lg text-[#85857d] hover:bg-white/[0.06] hover:text-[#f5f3ee]" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>{collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}</button>
                        </div>
                    </aside>

                    <div className={cn("flex min-h-screen min-w-0 flex-1 flex-col transition-[margin] duration-200", collapsed ? "lg:ml-[84px]" : "lg:ml-[264px]")}>
                        <header className="sticky top-0 z-40 flex h-[72px] items-center justify-between gap-4 border-b border-[#d9d6cd] bg-[#f5f3ee]/95 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
                            <div className="flex min-w-0 items-center gap-3">
                                <button onClick={() => setMobileOpen(true)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[#d9d6cd] bg-[#fffdf8] text-[#575750] lg:hidden" aria-label="Open navigation"><Menu className="h-4 w-4" /></button>
                                <DashboardHeader />
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                <button onClick={() => setCommandOpen(true)} className="hidden h-9 items-center gap-2 rounded-[10px] border border-[#d9d6cd] bg-[#fffdf8] px-3 text-xs text-[#77766e] transition-colors hover:border-[#b9d9cc] hover:text-[#20211e] sm:flex"><Search className="h-3.5 w-3.5 text-[#087f5b]" /><span className="hidden md:inline">Search</span><kbd className="rounded border border-[#d9d6cd] bg-[#f5f3ee] px-1.5 py-0.5 font-mono text-[9px]">Ctrl K</kbd></button>
                                <span className="hidden sm:block"><NetworkHealthIndicator /></span>
                                <NotificationsCenter />
                                <span className="mx-1 hidden h-6 w-px bg-[#d9d6cd] sm:block" />
                                <button onClick={() => navigate("/dashboard/settings")} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#183a30] text-[10px] font-semibold text-[#f5f3ee]" aria-label="Open account settings">{initials}</button>
                            </div>
                        </header>

                        <main className="min-w-0 flex-1 bg-[#f5f3ee] px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
                            {showTestNotice && company?.isTestMode && (
                                <div className="dashboard-test-notice mx-auto mb-6 flex max-w-[1440px] flex-col justify-between gap-4 sm:flex-row sm:items-center">
                                    <div className="flex items-start gap-3"><span className="dashboard-icon h-9 w-9"><FlaskConical className="h-4 w-4" /></span><div><p className="text-sm font-semibold text-[#20211e]">Test workspace</p><p className="mt-0.5 text-xs leading-5 text-[#575750]">Explore every workflow with sample data. No real funds will move.</p></div></div>
                                    <div className="flex items-center gap-2 pl-12 sm:pl-0"><Button variant="ghost" size="sm" onClick={() => setShowTestNotice(false)}>Dismiss</Button><Button size="sm" onClick={() => navigate("/dashboard/settings")}>Review live setup</Button></div>
                                </div>
                            )}
                            <div data-dashboard-content className="mx-auto w-full max-w-[1440px] min-w-0 animate-fade-in"><Outlet /></div>
                        </main>
                    </div>

                    <AnimatePresence>{mobileOpen && <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} className="fixed inset-0 z-[60] bg-[#20211e]/55 backdrop-blur-sm lg:hidden" aria-label="Close navigation" />}</AnimatePresence>
                    <AnimatePresence>
                        {mobileOpen && (
                            <motion.aside initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ duration: 0.2 }} className="fixed inset-y-0 left-0 z-[70] flex w-[286px] flex-col border-r border-[#2f5e50] bg-[#183a30] lg:hidden">
                                <div className="flex h-[72px] items-center justify-between border-b border-[#2f5e50] px-5"><ZapziveLogo size="sm" /><button onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-[#aaa9a1]" aria-label="Close navigation"><X className="h-4 w-4" /></button></div>
                                <div className="flex-1 overflow-y-auto p-4 pt-6"><SidebarNavigation onNavigate={() => setMobileOpen(false)} /></div>
                                <div className="border-t border-[#2f5e50] p-4"><button onClick={logout} className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm text-[#aaa9a1]"><LogOut className="h-4 w-4" /> Log out</button></div>
                            </motion.aside>
                        )}
                    </AnimatePresence>
                    <CommandPalette isOpen={commandOpen} onClose={() => setCommandOpen(false)} />
                </div>
            </TooltipProvider>
        </PageHeaderProvider>
    );
}
