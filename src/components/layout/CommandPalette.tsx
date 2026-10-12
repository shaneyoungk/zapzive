import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BarChart3, CheckSquare, FileUp, History, Home, Plug, Plus, Scale, Search, Send, Settings, UserPlus, UserRound, Users, type LucideIcon } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { payoutsApi } from "@/lib/payouts-api";
import { money, moneyList, RUN_STATES, MOVEMENT_STATES } from "@/lib/payout-format";
import { cn } from "@/lib/utils";

interface PaletteItem { id: string; label: string; hint?: string; icon: LucideIcon; href: string; group: string }

const COMMANDS: PaletteItem[] = [
    { id: "c-run", label: "Create payout run", icon: Plus, href: "/dashboard/payouts/new", group: "Commands" },
    { id: "c-import", label: "Import payouts from CSV", icon: FileUp, href: "/dashboard/payouts/new?mode=import", group: "Commands" },
    { id: "c-recipient", label: "Add recipient", icon: UserPlus, href: "/dashboard/recipients?new=1", group: "Commands" },
    { id: "c-approvals", label: "Open approvals", icon: CheckSquare, href: "/dashboard/approvals", group: "Commands" },
    { id: "c-exceptions", label: "Open exceptions", icon: AlertTriangle, href: "/dashboard/exceptions", group: "Commands" },
    { id: "n-home", label: "Home", icon: Home, href: "/dashboard", group: "Go to" },
    { id: "n-payouts", label: "Payouts", icon: Send, href: "/dashboard/payouts", group: "Go to" },
    { id: "n-recipients", label: "Recipients", icon: UserRound, href: "/dashboard/recipients", group: "Go to" },
    { id: "n-recon", label: "Reconciliation", icon: Scale, href: "/dashboard/reconciliation", group: "Go to" },
    { id: "n-reports", label: "Reports", icon: BarChart3, href: "/dashboard/reports", group: "Go to" },
    { id: "n-activity", label: "Activity", icon: History, href: "/dashboard/activity", group: "Go to" },
    { id: "n-integrations", label: "Integrations, API keys and webhooks", icon: Plug, href: "/dashboard/integrations", group: "Go to" },
    { id: "n-team", label: "Team", icon: Users, href: "/dashboard/team", group: "Go to" },
    { id: "n-policy", label: "Approval policy", icon: Settings, href: "/dashboard/settings?tab=approvals", group: "Go to" },
    { id: "n-settings", label: "Settings", icon: Settings, href: "/dashboard/settings", group: "Go to" },
];

interface CommandPaletteProps { isOpen: boolean; onClose: () => void }

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
    const navigate = useNavigate();
    const [query, setQuery] = useState("");
    const [active, setActive] = useState(0);
    const term = query.trim();
    const searching = term.length >= 2;

    const recipients = useQuery({ queryKey: ["palette", "recipients", term], queryFn: () => payoutsApi.recipients({ q: term }), enabled: isOpen && searching, staleTime: 10_000 });
    const runs = useQuery({ queryKey: ["payouts", "runs", "all"], queryFn: () => payoutsApi.runs(), enabled: isOpen && searching, staleTime: 10_000 });
    const movements = useQuery({ queryKey: ["palette", "movements", term], queryFn: () => payoutsApi.movements({ q: term, limit: 6 }), enabled: isOpen && searching, staleTime: 10_000 });

    const items = useMemo<PaletteItem[]>(() => {
        const lower = term.toLowerCase();
        const commands = COMMANDS.filter((item) => !term || item.label.toLowerCase().includes(lower));
        if (!searching) return commands;
        const runMatches = (runs.data ?? []).filter((run) => `${run.name} ${run.reference}`.toLowerCase().includes(lower)).slice(0, 5).map((run) => ({ id: `run-${run.id}`, label: `${run.reference} · ${run.name}`, hint: `${RUN_STATES[run.status]?.label ?? run.status} · ${moneyList(run.totals, { compact: true })}`, icon: Send, href: `/dashboard/payouts/runs/${run.id}`, group: "Payout runs" }));
        const recipientMatches = (recipients.data ?? []).slice(0, 5).map((item) => ({ id: `rec-${item.id}`, label: item.name, hint: `${item.payoutMethodLabel ?? "No payout method"} · ${item.countryName ?? ""}`, icon: UserRound, href: `/dashboard/recipients/${item.id}`, group: "Recipients" }));
        const movementMatches = (movements.data ?? []).map((item) => ({ id: `mv-${item.id}`, label: `${item.reference} · ${item.recipientName}`, hint: `${MOVEMENT_STATES[item.state]?.label ?? item.state} · ${money(item.amountMinor, item.currency)}${item.providerReference ? ` · ${item.providerReference}` : ""}`, icon: Search, href: `/dashboard/payouts/movements/${item.id}`, group: "Payouts" }));
        return [...commands, ...runMatches, ...recipientMatches, ...movementMatches];
    }, [term, searching, runs.data, recipients.data, movements.data]);

    useEffect(() => { setActive(0); }, [term]);
    useEffect(() => { if (!isOpen) setQuery(""); }, [isOpen]);

    const go = (item: PaletteItem | undefined) => { if (!item) return; navigate(item.href); onClose(); };
    const groups = [...new Set(items.map((item) => item.group))];

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="top-[18%] max-w-xl translate-y-0 gap-0 overflow-hidden rounded-2xl border-[#e3e0d7] bg-white p-0 [&>button]:hidden">
                <DialogTitle className="sr-only">Search and commands</DialogTitle>
                <div className="flex items-center gap-3 border-b border-[#ece9e1] px-4">
                    <Search className="h-4 w-4 shrink-0 text-[#9a998f]" aria-hidden="true" />
                    <input
                        autoFocus value={query} onChange={(event) => setQuery(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "ArrowDown") { event.preventDefault(); setActive((value) => Math.min(value + 1, items.length - 1)); }
                            if (event.key === "ArrowUp") { event.preventDefault(); setActive((value) => Math.max(value - 1, 0)); }
                            if (event.key === "Enter") { event.preventDefault(); go(items[active]); }
                        }}
                        placeholder="Search recipients, runs, MV- or SBX- references, or type a command"
                        aria-label="Search" role="combobox" aria-expanded="true" aria-controls="palette-results" aria-activedescendant={items[active] ? `palette-${items[active].id}` : undefined}
                        className="h-14 w-full bg-transparent text-[14px] text-[#1b1c19] outline-none placeholder:text-[#9a998f]"
                    />
                    <kbd className="rounded border border-[#e3e0d7] px-1.5 py-0.5 font-mono text-[10px] text-[#8a897f]">Esc</kbd>
                </div>
                <div id="palette-results" role="listbox" className="max-h-[420px] overflow-y-auto p-2">
                    {items.length === 0 ? <p className="px-3 py-8 text-center text-[13px] text-[#74736b]">{searching && (recipients.isFetching || movements.isFetching) ? "Searching…" : "No matches. Try a recipient name, run name, or a reference like MV-… or SBX-…"}</p> : groups.map((group) => (
                        <div key={group} className="mb-1">
                            <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-[#9a998f]">{group}</p>
                            {items.filter((item) => item.group === group).map((item) => {
                                const index = items.indexOf(item);
                                return (
                                    <button key={item.id} id={`palette-${item.id}`} role="option" aria-selected={index === active} onMouseEnter={() => setActive(index)} onClick={() => go(item)} className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left", index === active ? "bg-[#f1efe9]" : "")}>
                                        <item.icon className="h-4 w-4 shrink-0 text-[#74736b]" />
                                        <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-medium text-[#1b1c19]">{item.label}</span>{item.hint && <span className="block truncate text-xs text-[#8a897f]">{item.hint}</span>}</span>
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
