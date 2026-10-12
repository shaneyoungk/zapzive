import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Bell, CheckCircle2, CheckSquare, Scale, UserPlus, Wallet, type LucideIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { useActivity, useHome } from "@/hooks/use-payouts";
import { describeEvent } from "@/lib/payout-format";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

const ACTIONABLE_EVENTS = ["payout.failed", "payout.held", "payout_run.submitted", "payout_run.rejected", "payout_run.completed", "payout_run.completed_with_failures", "payout_run.approved", "recipient.payout_details_changed"];
const KIND_ICONS: Record<string, { icon: LucideIcon; tone: string }> = {
    approval: { icon: CheckSquare, tone: "bg-[#fdf4e3] text-[#8a5a0b]" },
    failed: { icon: AlertTriangle, tone: "bg-[#fbecea] text-[#b2392f]" },
    details_changed: { icon: UserPlus, tone: "bg-[#fdf4e3] text-[#8a5a0b]" },
    correction: { icon: AlertTriangle, tone: "bg-[#fbecea] text-[#b2392f]" },
    funding: { icon: Wallet, tone: "bg-[#fbecea] text-[#b2392f]" },
    reconcile: { icon: Scale, tone: "bg-[#eaf1fb] text-[#1f5fa8]" },
};

/**
 * Actionable notifications derived from live workspace state. Technical
 * provider and chain alerts are not shown here; they live in Integrations.
 */
export default function NotificationsCenter() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const home = useHome();
    const activity = useActivity({ limit: 30 });
    const seenKey = `zapzive:notificationsSeen:${user?.id ?? "anon"}`;
    const [seenAt, setSeenAt] = useState<number>(() => { try { return Number(localStorage.getItem(seenKey) ?? 0); } catch { return 0; } });

    const attention = home.data?.attention ?? [];
    const events = useMemo(() => (activity.data?.items ?? []).filter((event) => ACTIONABLE_EVENTS.includes(event.action)).slice(0, 8), [activity.data]);
    const unread = events.filter((event) => new Date(event.createdAt).getTime() > seenAt).length;
    const markSeen = () => { const now = Date.now(); setSeenAt(now); try { localStorage.setItem(seenKey, String(now)); } catch { /* storage unavailable */ } };

    return (
        <Popover open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) markSeen(); }}>
            <PopoverTrigger asChild>
                <button className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[#ebe8e0] bg-white text-[#74736b] transition-colors hover:border-[#d6d3c9] hover:text-[#1b1c19]" aria-label={`Notifications${attention.length + unread ? `, ${attention.length} need action, ${unread} new` : ""}`}>
                    <Bell className="h-4 w-4" />
                    {(attention.length > 0 || unread > 0) && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#e8a33a] ring-2 ring-white" aria-hidden="true" />}
                </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[min(400px,calc(100vw-24px))] overflow-hidden rounded-2xl border-[#e3e0d7] bg-white p-0 text-[#1b1c19] shadow-xl">
                <div className="border-b border-[#ece9e1] px-4 py-3.5"><h3 className="text-sm font-semibold">Notifications</h3></div>
                <div className="max-h-[440px] overflow-y-auto">
                    {attention.length > 0 && (
                        <section aria-label="Needs action">
                            <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-[#9a998f]">Needs action</p>
                            <ul>
                                {attention.map((item) => {
                                    const meta = KIND_ICONS[item.kind] ?? KIND_ICONS.approval;
                                    return (
                                        <li key={item.kind}>
                                            <Link to={item.href} onClick={() => setIsOpen(false)} className="flex items-start gap-3 px-4 py-2.5 hover:bg-[#faf9f6]">
                                                <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", meta.tone)}><meta.icon className="h-4 w-4" /></span>
                                                <span className="min-w-0"><span className="block text-[13px] font-semibold">{item.title}</span><span className="block truncate text-xs text-[#74736b]">{item.detail}</span></span>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    )}
                    <section aria-label="Recent">
                        <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-[#9a998f]">Recent</p>
                        {events.length === 0 ? <p className="px-4 pb-4 pt-1 text-[13px] text-[#74736b]">No payout events yet.</p> : (
                            <ul className="pb-2">
                                {events.map((event) => (
                                    <li key={event.id} className="flex items-start gap-3 px-4 py-2.5">
                                        <span className={cn("mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full", /failed|held|rejected|failures/.test(event.action) ? "bg-[#fbecea] text-[#b2392f]" : "bg-[#e7f3ed] text-[#0b6b4f]")}>{/failed|held|rejected|failures/.test(event.action) ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}</span>
                                        <span className="min-w-0 text-[13px] leading-5">
                                            <span className="text-[#3c3c37]"><span className="font-semibold text-[#1b1c19]">{event.actorName ?? "Zapzive"}</span> {describeEvent(event)}</span>
                                            <span className="flex items-center gap-1.5 text-xs text-[#8a897f]">{new Date(event.createdAt).getTime() > seenAt && <span className="h-1.5 w-1.5 rounded-full bg-[#e8a33a]" aria-label="New" />}{formatRelative(event.createdAt)}</span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
                <div className="border-t border-[#ece9e1] bg-[#faf9f6] px-4 py-2.5 text-xs"><Link to="/dashboard/activity" onClick={() => setIsOpen(false)} className="font-semibold text-primary hover:underline">View all activity</Link></div>
            </PopoverContent>
        </Popover>
    );
}
