import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
    AlertTriangle, BarChart3, Building2, CheckSquare, ChevronDown, ChevronLeft, ChevronRight, FlaskConical,
    BookOpen, HelpCircle, History, Home, Rocket, LogOut, Menu, Plug, Scale, Search, Send, Settings,
    UserRound, Users, X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import CommandPalette from "@/components/layout/CommandPalette";
import NetworkHealthIndicator from "@/components/layout/NetworkHealthIndicator";
import NotificationsCenter from "@/components/layout/NotificationsCenter";
import { ZapziveLogo } from "@/components/ui/ZapziveLogo";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PageHeaderProvider, usePageHeader } from "@/contexts/PageHeaderContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLogout } from "@/hooks/use-auth";
import { useApprovals, useExceptions } from "@/hooks/use-payouts";
import { cn } from "@/lib/utils";

// The MVP navigation: one payout-operations product. Earlier modules stay
// reachable from Labs and are labelled as experimental there.
const navigationGroups = [
    {
        title: "Workspace",
        items: [
            { icon: Home, href: "/dashboard", label: "Home" },
            { icon: Send, href: "/dashboard/payouts", label: "Payouts" },
            { icon: UserRound, href: "/dashboard/recipients", label: "Recipients" },
            { icon: CheckSquare, href: "/dashboard/approvals", label: "Approvals" },
            { icon: History, href: "/dashboard/activity", label: "Activity" },
        ],
    },
    {
        title: "Operations",
        items: [
            { icon: AlertTriangle, href: "/dashboard/exceptions", label: "Exceptions" },
            { icon: Scale, href: "/dashboard/reconciliation", label: "Reconciliation" },
            { icon: BarChart3, href: "/dashboard/reports", label: "Reports" },
        ],
    },
    {
        title: "Developer",
        items: [
            { icon: Plug, href: "/dashboard/integrations", label: "Integrations" },
            { icon: FlaskConical, href: "/dashboard/labs", label: "Labs" },
        ],
    },
    {
        title: "Organization",
        items: [
            { icon: Users, href: "/dashboard/team", label: "Team" },
        ],
    },
];

/** Routes kept for future phases. They render with a Labs banner and are not in the main navigation. */
export const LAB_ROUTES: Array<{ match: string; label: string }> = [
    { match: "/dashboard/escrow", label: "Escrow" },
    { match: "/dashboard/treasury", label: "Treasury" },
    { match: "/dashboard/remittance", label: "Remittance" },
    { match: "/dashboard/crypto", label: "Settlement lab" },
    { match: "/dashboard/compliance", label: "Compliance records" },
    { match: "/dashboard/agents", label: "Agents" },
    { match: "/dashboard/payroll/batches", label: "Legacy payroll batch" },
];

const CRUMBS: Array<{ match: RegExp; crumbs: Array<{ label: string; href?: string }> }> = [
    { match: /^\/dashboard\/payouts\/new/, crumbs: [{ label: "Payouts", href: "/dashboard/payouts" }, { label: "New payout run" }] },
    { match: /^\/dashboard\/payouts\/runs\//, crumbs: [{ label: "Payouts", href: "/dashboard/payouts" }, { label: "Payout run" }] },
    { match: /^\/dashboard\/payouts\/movements\//, crumbs: [{ label: "Payouts", href: "/dashboard/payouts" }, { label: "Payout" }] },
    { match: /^\/dashboard\/payouts/, crumbs: [{ label: "Payouts" }] },
    { match: /^\/dashboard\/recipients\/./, crumbs: [{ label: "Recipients", href: "/dashboard/recipients" }, { label: "Recipient" }] },
    { match: /^\/dashboard\/recipients/, crumbs: [{ label: "Recipients" }] },
    { match: /^\/dashboard\/approvals/, crumbs: [{ label: "Approvals" }] },
    { match: /^\/dashboard\/activity/, crumbs: [{ label: "Activity" }] },
    { match: /^\/dashboard\/exceptions/, crumbs: [{ label: "Exceptions" }] },
    { match: /^\/dashboard\/reconciliation/, crumbs: [{ label: "Reconciliation" }] },
    { match: /^\/dashboard\/reports/, crumbs: [{ label: "Reports" }] },
    { match: /^\/dashboard\/funding/, crumbs: [{ label: "Funding" }] },
    { match: /^\/dashboard\/integrations/, crumbs: [{ label: "Integrations" }] },
    { match: /^\/dashboard\/labs/, crumbs: [{ label: "Labs" }] },
    { match: /^\/dashboard\/team/, crumbs: [{ label: "Team" }] },
    { match: /^\/dashboard\/settings/, crumbs: [{ label: "Settings" }] },
    { match: /^\/dashboard\/?$/, crumbs: [{ label: "Home" }] },
];

/** Top-bar context: breadcrumbs only. The page itself owns its title. */
function Breadcrumbs() {
    const { pathname } = useLocation();
    const { title: contextualTitle } = usePageHeader();
    const crumbs = useMemo(() => {
        const lab = LAB_ROUTES.find((item) => pathname.startsWith(item.match));
        if (lab) return [{ label: "Labs", href: "/dashboard/labs" }, { label: lab.label }];
        const match = CRUMBS.find((item) => item.match.test(pathname))?.crumbs ?? [{ label: "Home" }];
        return contextualTitle ? [...match.slice(0, -1), { label: contextualTitle }] : match;
    }, [pathname, contextualTitle]);
    return (
        <nav aria-label="Breadcrumb" className="min-w-0">
            <ol className="flex min-w-0 items-center gap-1.5 text-[14px]">
                {crumbs.map((crumb, index) => (
                    <Fragment key={`${crumb.label}-${index}`}>
                        {index > 0 && <li aria-hidden="true" className="text-[#c4c2b9]">/</li>}
                        <li className={cn("min-w-0 truncate", index === crumbs.length - 1 ? "font-semibold text-[#1b1c19]" : "text-[#74736b]")} aria-current={index === crumbs.length - 1 ? "page" : undefined}>
                            {"href" in crumb && crumb.href && index < crumbs.length - 1 ? <Link to={crumb.href} className="rounded hover:text-[#1b1c19]">{crumb.label}</Link> : crumb.label}
                        </li>
                    </Fragment>
                ))}
            </ol>
        </nav>
    );
}

/** Counts of work waiting on a person, shown next to the owning section. */
function useNavigationBadges(): Record<string, number> {
    const approvals = useApprovals();
    const exceptions = useExceptions();
    return {
        "/dashboard/approvals": (approvals.data?.runs.length ?? 0) + (approvals.data?.heldPayouts.length ?? 0),
        "/dashboard/exceptions": exceptions.data?.payouts.length ?? 0,
    };
}

function LabsBanner() {
    const { pathname } = useLocation();
    const lab = LAB_ROUTES.find((item) => pathname.startsWith(item.match));
    if (!lab) return null;
    return (
        <div className="mx-auto mb-6 flex max-w-[1440px] flex-col gap-3 rounded-2xl border border-[#e7e4dc] bg-white p-4 sm:flex-row sm:items-center sm:justify-between" role="note">
            <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f1efe9] text-[#55544d]"><FlaskConical className="h-4 w-4" /></span>
                <div>
                    <p className="text-sm font-semibold text-[#1b1c19]">Labs · {lab.label} is experimental</p>
                    <p className="mt-0.5 text-xs leading-5 text-[#74736b]">Not part of the core payout workflow; kept for future research. Sandbox only, no live funds move.</p>
                </div>
            </div>
            <Link to="/dashboard/labs" className="shrink-0 text-xs font-semibold text-primary hover:underline">About Labs</Link>
        </div>
    );
}

function SidebarNavigation({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
    const { pathname } = useLocation();
    const badges = useNavigationBadges();

    return (
        <nav className="space-y-5" aria-label="Dashboard navigation">
            {navigationGroups.map((group) => (
                <div key={group.title}>
                    {!collapsed && <p className="mb-2 px-3 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#7fa597]">{group.title}</p>}
                    {collapsed && <span className="mx-auto mb-2 block h-px w-6 bg-[#24564a]" />}
                    <div className="space-y-1">
                        {group.items.map((item) => {
                            const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
                            const badge = badges[item.href] ?? 0;
                            const content = (
                                <Link
                                    to={item.href}
                                    onClick={onNavigate}
                                    aria-current={active ? "page" : undefined}
                                    className={cn(
                                        "group relative flex h-10 items-center gap-3 rounded-[10px] px-3 text-[13.5px] font-semibold transition-colors duration-150",
                                        collapsed && "justify-center px-0",
                                        active
                                            ? "bg-[#ffffff] text-[#123a2f]"
                                            : "text-[#c7d9d1] hover:bg-[#1a4a3b] hover:text-white",
                                    )}
                                >
                                                                        <item.icon className={cn("h-[18px] w-[18px] shrink-0 transition-colors", active ? "text-primary" : "text-[#8fb0a4] group-hover:text-white")} strokeWidth={2} />
                                    {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                                    {badge > 0 && (collapsed
                                        ? <span className="absolute right-2 top-1.5 h-2 w-2 rounded-full bg-[#e8a33a] ring-2 ring-[#123a2f]" />
                                        : <span className={cn("min-w-[20px] rounded-md px-1.5 text-center text-[10.5px] font-bold leading-[18px]", active ? "bg-[#123a2f] text-white" : "bg-[#e8a33a] text-[#2b1d03]")}>{badge}</span>)}
                                </Link>
                            );

                            return collapsed ? (
                                <Tooltip key={item.href}>
                                    <TooltipTrigger asChild>{content}</TooltipTrigger>
                                    <TooltipContent side="right" className="ml-2 rounded-lg border-0 bg-[#0e2a22] px-2.5 py-1.5 text-xs font-medium text-white shadow-lg">{item.label}{badge > 0 ? ` · ${badge} waiting` : ""}</TooltipContent>
                                </Tooltip>
                            ) : <div key={item.href}>{content}</div>;
                        })}
                    </div>
                </div>
            ))}
        </nav>
    );
}

function WorkspaceBadge({ name, initials, testMode }: { name: string; initials: string; testMode: boolean }) {
    return (
        <>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#1d5241] text-xs font-bold text-[#cdeee0]">{initials}</span>
            <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-[13px] font-semibold text-white">{name}</span>
                <span className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-[#9fbcb1]">
                    <span className={cn("h-1.5 w-1.5 rounded-full", testMode ? "bg-[#c9a35a]" : "bg-[#8fd9bd]")} />
                    {testMode ? "Sandbox" : "Live"}
                </span>
            </span>
        </>
    );
}

/** A quiet next step for workspaces still in test mode. */
function GoLiveCard({ onOpen }: { onOpen: () => void }) {
    return (
        <button onClick={onOpen} className="group flex h-10 w-full items-center gap-3 rounded-[10px] px-3 text-left text-[13.5px] font-semibold text-[#c7d9d1] transition-colors hover:bg-[#1a4a3b] hover:text-white">
            <Rocket className="h-[18px] w-[18px] shrink-0 text-[#8fb0a4] group-hover:text-white" strokeWidth={2} />
            <span className="flex-1 truncate">Go-live checklist</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-[#8fb0a4]" />
        </button>
    );
}

const SIDEBAR_SURFACE = "bg-[#123a2f]";

export default function DashboardLayout() {
    const { user, company } = useAuth();
    const logout = useLogout();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [commandOpen, setCommandOpen] = useState(false);
    const [showTestNotice, setShowTestNotice] = useState(() => {
        try { return localStorage.getItem("zapzive:testNoticeDismissed") !== "true"; } catch { return true; }
    });
    const dismissTestNotice = () => {
        setShowTestNotice(false);
        try { localStorage.setItem("zapzive:testNoticeDismissed", "true"); } catch { /* storage unavailable */ }
    };
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

    const { pathname } = useLocation();
    const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform);
    const initials = user?.name?.substring(0, 2).toUpperCase() || "ZA";
    const companyInitials = company?.name?.substring(0, 2).toUpperCase() || "ZA";
    const companyName = company?.name || "Zapzive Finance";
    const testMode = company?.isTestMode !== false;

    return (
        <PageHeaderProvider>
            <TooltipProvider delayDuration={100}>
                <div data-dashboard className="flex min-h-screen bg-[#f5f3ee] text-[#20211e]">
                    <aside className={cn("fixed inset-y-0 left-0 z-50 hidden flex-col transition-[width] duration-200 lg:flex", SIDEBAR_SURFACE, collapsed ? "w-[76px]" : "w-[256px]")}>
                        <div className={cn("flex h-16 shrink-0 items-center border-b border-r border-[#ebe8e0] bg-white", collapsed ? "justify-center px-3" : "px-6")}>
                            <Link to="/dashboard" aria-label="Zapzive overview" className="rounded-md"><ZapziveLogo size={collapsed ? "sm" : "md"} markOnly={collapsed} /></Link>
                        </div>

                        {collapsed ? (
                            <Tooltip>
                                <TooltipTrigger asChild><span className="flex h-14 shrink-0 items-center justify-center bg-[#0d2c23]"><span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#1d5241] text-xs font-bold text-[#cdeee0]">{companyInitials}</span></span></TooltipTrigger>
                                <TooltipContent side="right" className="ml-2 rounded-lg border-0 bg-[#0e2a22] px-2.5 py-1.5 text-xs font-medium text-white">{companyName} · {testMode ? "Sandbox" : "Live"}</TooltipContent>
                            </Tooltip>
                        ) : (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="flex h-[68px] w-full shrink-0 items-center gap-3 bg-[#0d2c23] px-5 transition-colors hover:bg-[#0b261e]">
                                        <WorkspaceBadge name={companyName} initials={companyInitials} testMode={testMode} />
                                        <ChevronDown className="h-4 w-4 shrink-0 text-[#8fb0a4]" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-[224px] rounded-xl border-[#e3e0d7] bg-white p-1.5 shadow-xl">
                                    <DropdownMenuLabel className="px-2 text-[11px] font-semibold text-[#8a897f]">Workspace</DropdownMenuLabel>
                                    <DropdownMenuItem className="gap-2.5 rounded-lg bg-[#f4f2ec] text-[13px] font-medium text-[#1b1c19]"><Building2 className="h-4 w-4 text-primary" /><span className="truncate">{companyName}</span></DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={() => navigate("/dashboard/settings")} className="cursor-pointer gap-2.5 rounded-lg text-[13px] text-[#55544d]"><Settings className="h-4 w-4" /> Workspace settings</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => navigate("/contact")} className="cursor-pointer gap-2.5 rounded-lg text-[13px] text-[#55544d]"><HelpCircle className="h-4 w-4" /> Contact support</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}

                        <div className="dash-no-scrollbar flex-1 overflow-y-auto px-3 py-5">
                            <SidebarNavigation collapsed={collapsed} />
                        </div>

                        <div className="shrink-0 border-t border-[#24564a] px-3 py-3">
                            {!collapsed && testMode && <GoLiveCard onOpen={() => navigate("/dashboard/settings")} />}
                            <Link to="/dashboard/settings" className={cn("flex h-10 items-center gap-3 rounded-[10px] px-3 text-[13.5px] font-semibold transition-colors", pathname.startsWith("/dashboard/settings") ? "bg-[#ffffff] text-[#123a2f]" : "text-[#c7d9d1] hover:bg-[#1a4a3b] hover:text-white", collapsed && "justify-center px-0")}><Settings className={cn("h-[18px] w-[18px]", pathname.startsWith("/dashboard/settings") ? "text-primary" : "text-[#8fb0a4]")} strokeWidth={2} />{!collapsed && "Settings"}</Link>
                        </div>

                        <div className={cn("flex shrink-0 items-center gap-3 bg-[#0d2c23] px-5 py-3.5", collapsed && "flex-col px-3")}>
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f5f3ee] text-[11px] font-bold text-[#123a2f]">{initials}</span>
                            {!collapsed && <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold text-white">{user?.name || "Workspace admin"}</span><span className="block truncate text-[11px] text-[#8fb0a4]">{user?.email || "admin@zapzive.com"}</span></span>}
                            {!collapsed && <button onClick={logout} aria-label="Log out" title="Log out" className="rounded-lg p-1.5 text-[#8fb0a4] hover:bg-[#1a4a3b] hover:text-white"><LogOut className="h-4 w-4" /></button>}
                            <button onClick={() => setCollapsed((value) => !value)} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="rounded-lg p-1.5 text-[#8fb0a4] hover:bg-[#1a4a3b] hover:text-white" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>{collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}</button>
                        </div>
                    </aside>

                    <div className={cn("flex min-h-screen min-w-0 flex-1 flex-col transition-[margin] duration-200", collapsed ? "lg:ml-[76px]" : "lg:ml-[256px]")}>
                        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-[#ebe8e0] bg-white/95 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
                            <div className="flex min-w-0 items-center gap-3">
                                <button onClick={() => setMobileOpen(true)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[#ebe8e0] bg-white text-[#55544d] lg:hidden" aria-label="Open navigation"><Menu className="h-4 w-4" /></button>
                                <Breadcrumbs />
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                <button onClick={() => setCommandOpen(true)} className="flex h-9 items-center gap-2 rounded-[10px] border border-[#ebe8e0] bg-[#faf9f6] px-2.5 text-xs text-[#8a897f] transition-colors hover:border-[#dcd9d0] hover:bg-white hover:text-[#1b1c19] md:w-60 md:px-3" aria-label="Search"><Search className="h-3.5 w-3.5" /><span className="hidden flex-1 text-left md:inline">Search or jump to…</span><kbd className="hidden rounded-md border border-[#ebe8e0] bg-white px-1.5 py-0.5 font-mono text-[10px] text-[#8a897f] md:inline">{isMac ? "⌘K" : "Ctrl K"}</kbd></button>
                                <span className="hidden sm:block"><NetworkHealthIndicator /></span>
                                <NotificationsCenter />
                                <span className="mx-1 hidden h-6 w-px bg-[#ebe8e0] sm:block" />
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="flex h-9 w-9 items-center justify-center rounded-full bg-[#123a2f] text-[11px] font-semibold text-white ring-offset-2 transition-shadow hover:ring-2 hover:ring-[#b9d9cc]" aria-label="Open account menu">{initials}</button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-64 rounded-xl border-[#e3e0d7] bg-white p-1.5 shadow-xl">
                                        <div className="px-2 py-2">
                                            <p className="truncate text-sm font-semibold text-[#1b1c19]">{user?.name || "Workspace admin"}</p>
                                            <p className="truncate text-xs text-[#8a897f]">{user?.email}</p>
                                            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#f4f2ec] px-2 py-0.5 text-[11px] font-semibold capitalize text-[#55544d]"><Building2 className="h-3 w-3" />{companyName}{user?.role ? ` · ${user.role}` : ""}</p>
                                        </div>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onSelect={() => navigate("/dashboard/settings")} className="cursor-pointer gap-2.5 rounded-lg text-[13px]"><Settings className="h-4 w-4 text-[#8a897f]" /> Workspace settings</DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => window.open("/docs", "_blank", "noopener")} className="cursor-pointer gap-2.5 rounded-lg text-[13px]"><BookOpen className="h-4 w-4 text-[#8a897f]" /> Documentation</DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => navigate("/contact")} className="cursor-pointer gap-2.5 rounded-lg text-[13px]"><HelpCircle className="h-4 w-4 text-[#8a897f]" /> Contact support</DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onSelect={logout} className="cursor-pointer gap-2.5 rounded-lg text-[13px] text-[#9a2f2f] focus:text-[#9a2f2f]"><LogOut className="h-4 w-4" /> Log out</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </header>

                        <main className="min-w-0 flex-1 bg-[#f5f3ee] px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
                            <LabsBanner />
                            <div data-dashboard-content className="mx-auto w-full max-w-[1440px] min-w-0 animate-fade-in"><Outlet /></div>
                        </main>
                    </div>

                    <AnimatePresence>{mobileOpen && <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} className="fixed inset-0 z-[60] bg-[#1b1c19]/40 lg:hidden" aria-label="Close navigation" />}</AnimatePresence>
                    <AnimatePresence>
                        {mobileOpen && (
                            <motion.aside initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ duration: 0.2 }} className={cn("fixed inset-y-0 left-0 z-[70] flex w-[286px] flex-col shadow-2xl lg:hidden", SIDEBAR_SURFACE)}>
                                <div className="flex h-16 items-center justify-between border-b border-[#ebe8e0] bg-white px-5"><ZapziveLogo size="md" /><button onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-[#8a897f] hover:bg-[#f4f2ec] hover:text-[#1b1c19]" aria-label="Close navigation"><X className="h-4 w-4" /></button></div>
                                <div className="flex h-[68px] shrink-0 items-center gap-3 bg-[#0d2c23] px-5"><WorkspaceBadge name={companyName} initials={companyInitials} testMode={testMode} /></div>
                                <div className="dash-no-scrollbar flex-1 overflow-y-auto px-3 py-5">
                                    <SidebarNavigation onNavigate={() => setMobileOpen(false)} />
                                </div>
                                <div className="shrink-0 border-t border-[#24564a] px-3 py-3">
                                    {testMode && <GoLiveCard onOpen={() => { setMobileOpen(false); navigate("/dashboard/settings"); }} />}
                                    <Link to="/dashboard/settings" onClick={() => setMobileOpen(false)} className="flex h-10 items-center gap-3 rounded-[10px] px-3 text-[13.5px] font-semibold text-[#c7d9d1] hover:bg-[#1a4a3b] hover:text-white"><Settings className="h-[18px] w-[18px] text-[#8fb0a4]" strokeWidth={2} /> Settings</Link>
                                </div>
                                <div className="flex shrink-0 items-center gap-3 bg-[#0d2c23] px-5 py-3.5">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f5f3ee] text-[11px] font-bold text-[#123a2f]">{initials}</span>
                                    <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold text-white">{user?.name || "Workspace admin"}</span><span className="block truncate text-[11px] text-[#8fb0a4]">{user?.email}</span></span>
                                    <button onClick={logout} aria-label="Log out" className="rounded-lg p-1.5 text-[#8fb0a4] hover:bg-[#1a4a3b] hover:text-white"><LogOut className="h-4 w-4" /></button>
                                </div>
                            </motion.aside>
                        )}
                    </AnimatePresence>
                    <CommandPalette isOpen={commandOpen} onClose={() => setCommandOpen(false)} />
                </div>
            </TooltipProvider>
        </PageHeaderProvider>
    );
}
