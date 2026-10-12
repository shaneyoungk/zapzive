// Shared building blocks for payout-operations screens.

import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Banknote, Building2, Loader2, Smartphone, Wallet, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatDateTime, formatRelative } from "@/lib/format";
import { MOVEMENT_STATES, RUN_STATES, TONE_CLASSES, VERIFICATION, describeEvent, type Tone } from "@/lib/payout-format";
import type { ActivityEvent } from "@/lib/payouts-api";
import { apiErrorMessage } from "@/lib/api-client";

export function ToneBadge({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
    return (
        <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-[3px] text-[11.5px] font-semibold leading-4 ring-1 ring-inset", TONE_CLASSES[tone].chip, className)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", TONE_CLASSES[tone].dot)} aria-hidden="true" />
            {children}
        </span>
    );
}

/** State badge with a text label (state is never conveyed by color alone). */
export function StateBadge({ kind, state, className }: { kind: "run" | "movement" | "verification"; state: string; className?: string }) {
    const table = kind === "run" ? RUN_STATES : kind === "movement" ? MOVEMENT_STATES : VERIFICATION;
    const entry = (table as Record<string, { label: string; tone: Tone; meaning?: string }>)[state] ?? { label: state.replace(/_/g, " "), tone: "neutral" as Tone };
    return <span title={entry.meaning}><ToneBadge tone={entry.tone} className={className}>{entry.label}</ToneBadge></span>;
}

export function SampleTag() {
    return <span className="rounded-md bg-[#f1efe9] px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a897f]" title="Sample sandbox data">Sample</span>;
}

export function Panel({ title, subtitle, actions, children, className, bodyClassName, id }: { title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string; id?: string }) {
    return (
        <section className={cn("premium-card min-w-0 overflow-hidden", className)} aria-labelledby={id}>
            {(title || actions) && (
                <div className="card-header flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                        {title && <h2 id={id} className="text-[15px] font-semibold text-[#1b1c19]">{title}</h2>}
                        {subtitle && <p className="mt-0.5 text-xs text-[#8a897f]">{subtitle}</p>}
                    </div>
                    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
                </div>
            )}
            <div className={bodyClassName}>{children}</div>
        </section>
    );
}

export function EmptyState({ icon: Icon, title, children, action }: { icon: LucideIcon; title: string; children?: ReactNode; action?: ReactNode }) {
    return (
        <div className="flex flex-col items-center px-6 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f1efe9] text-[#74736b]"><Icon className="h-5 w-5" /></span>
            <p className="mt-3 text-sm font-semibold text-[#1b1c19]">{title}</p>
            {children && <div className="mt-1.5 max-w-md text-[13px] leading-6 text-[#74736b]">{children}</div>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

export function LoadingRows({ rows = 4 }: { rows?: number }) {
    return <div className="space-y-3 p-5" aria-busy="true" aria-label="Loading">{Array.from({ length: rows }, (_, index) => <div key={index} className="dash-skeleton h-10 w-full" />)}</div>;
}

export function ErrorNotice({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
    // Prefer the server's plain-language message (e.g. "Payout run not found.") over transport errors.
    const message = apiErrorMessage(error, "Something went wrong.");
    const status = (error as { response?: { status?: number } })?.response?.status;
    return (
        <div role="alert" className="m-5 rounded-xl border border-[#efc9c4] bg-[#fbecea] p-4 text-sm text-[#9a2f2f]">
            <p className="font-semibold">{status === 404 ? "Not found" : status === 403 ? "You do not have access to this" : "This could not be loaded."}</p>
            <p className="mt-1 text-xs">{message}</p>
            <div className="mt-2 flex gap-4 text-xs font-semibold">
                {onRetry && status !== 404 && status !== 403 && <button onClick={onRetry} className="underline underline-offset-4">Try again</button>}
                {(status === 404 || status === 403) && <Link to="/dashboard" className="underline underline-offset-4">Go to Home</Link>}
            </div>
        </div>
    );
}

const METHOD_ICONS: Record<string, LucideIcon> = { mpesa: Smartphone, mobile_money: Smartphone, bank: Building2, usdc_wallet: Wallet };

export function MethodTag({ method, label, destination, className }: { method: string | null; label?: string | null; destination?: string | null; className?: string }) {
    const Icon = (method && METHOD_ICONS[method]) || Banknote;
    const base = label?.split(" · ")[0];
    const detail = destination && base && destination.startsWith(`${base} · `) ? destination.slice(base.length + 3) : destination;
    return (
        <span className={cn("inline-flex min-w-0 items-center gap-2 text-[13px] text-[#3c3c37]", className)}>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#f1efe9] text-[#55544d]"><Icon className="h-3.5 w-3.5" /></span>
            <span className="min-w-0">
                <span className="block truncate font-medium">{label ?? "No payout method"}</span>
                {detail && <span className="block truncate text-xs text-[#8a897f]">{detail}</span>}
            </span>
        </span>
    );
}

export function Initials({ name, className }: { name: string; className?: string }) {
    const initials = name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
    return <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#edf6f1] text-[12px] font-bold text-primary", className)} aria-hidden="true">{initials}</span>;
}

export function Timeline({ events, empty = "No activity yet." }: { events: ActivityEvent[]; empty?: string }) {
    if (!events.length) return <p className="p-5 text-[13px] text-[#8a897f]">{empty}</p>;
    return (
        <ol className="relative space-y-0 p-5">
            {events.map((event, index) => (
                <li key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
                    {index < events.length - 1 && <span className="absolute left-[7px] top-4 h-full w-px bg-[#e7e4dc]" aria-hidden="true" />}
                    <span className={cn("relative mt-1 h-[15px] w-[15px] shrink-0 rounded-full border-2 border-[#fffefa]", /failed|rejected|held/.test(event.action) ? "bg-[#cf4b3f]" : /delivered|approved|reconciled|completed$/.test(event.action) ? "bg-[#11a879]" : "bg-[#c9c6bc]")} aria-hidden="true" />
                    <div className="min-w-0 text-[13px] leading-5">
                        <p className="text-[#3c3c37]"><span className="font-semibold text-[#1b1c19]">{event.actorName ?? "Zapzive"}</span> {describeEvent(event)}</p>
                        <p className="mt-0.5 text-xs text-[#8a897f]" title={formatDateTime(event.createdAt)}>{formatRelative(event.createdAt)}{event.requestId ? <span className="ml-2 font-mono text-[10.5px]" title="Request ID">{event.requestId.slice(0, 8)}</span> : null}</p>
                    </div>
                </li>
            ))}
        </ol>
    );
}

export interface ConfirmLine { label: string; value: ReactNode }

/**
 * Consequence-first confirmation for material actions (approve, send, retry,
 * cancel). Optionally collects a comment, which can be required.
 */
export function ConfirmAction({ trigger, title, lines, consequence, confirmLabel, destructive, comment, onConfirm, pending, disabled }: {
    trigger: ReactNode; title: string; lines?: ConfirmLine[]; consequence: ReactNode; confirmLabel: string; destructive?: boolean;
    comment?: { label: string; required?: boolean; placeholder?: string }; onConfirm: (comment: string) => Promise<unknown> | void; pending?: boolean; disabled?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [text, setText] = useState("");
    const blocked = Boolean(comment?.required && !text.trim());
    return (
        <>
            <span onClick={() => !disabled && setOpen(true)} className={cn(disabled && "pointer-events-none opacity-50")}>{trigger}</span>
            <AlertDialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) setText(""); }}>
                <AlertDialogContent className="max-w-md rounded-2xl border-[#e3e0d7] bg-[#fffefa] p-0">
                    <AlertDialogHeader className="space-y-2 p-6 pb-0 text-left">
                        <AlertDialogTitle className="text-lg font-semibold text-[#1b1c19]">{title}</AlertDialogTitle>
                        {lines?.length ? (
                            <dl className="mt-2 divide-y divide-[#ece9e1] rounded-xl border border-[#ece9e1] bg-white">
                                {lines.map((line) => <div key={line.label} className="flex items-center justify-between gap-4 px-3.5 py-2.5 text-[13px]"><dt className="text-[#74736b]">{line.label}</dt><dd className="text-right font-semibold tabular-nums text-[#1b1c19]">{line.value}</dd></div>)}
                            </dl>
                        ) : null}
                        <AlertDialogDescription asChild><div className="pt-2 text-[13px] leading-6 text-[#55544d]">{consequence}</div></AlertDialogDescription>
                    </AlertDialogHeader>
                    {comment && (
                        <div className="px-6 pt-3">
                            <label htmlFor="confirm-comment" className="text-[13px] font-medium text-[#55544d]">{comment.label}{comment.required ? "" : " (optional)"}</label>
                            <Textarea id="confirm-comment" value={text} onChange={(event) => setText(event.target.value)} placeholder={comment.placeholder} maxLength={500} className="mt-1.5 min-h-[80px]" />
                        </div>
                    )}
                    <AlertDialogFooter className="gap-2 p-6">
                        <AlertDialogCancel className="mt-0 rounded-full">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={blocked || pending}
                            onClick={async (event) => { event.preventDefault(); try { await onConfirm(text.trim()); setOpen(false); setText(""); } catch { /* error toast already shown */ } }}
                            className={cn("rounded-full", destructive && "bg-[#b33a3a] hover:bg-[#9a2f2f]")}
                        >
                            {pending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} {confirmLabel}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

export function RowLink({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
    return <Link to={to} className={cn("font-semibold text-[#1b1c19] underline-offset-4 hover:text-primary hover:underline", className)}>{children}</Link>;
}

export function StatTile({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "negative" | "waiting" }) {
    return (
        <div className="min-w-0 px-5 py-4">
            <p className="text-[12.5px] font-medium text-[#74736b]">{label}</p>
            <p className={cn("mt-1 truncate text-[22px] font-bold tracking-[-0.03em] tabular-nums", tone === "negative" ? "text-[#9a2f2f]" : tone === "waiting" ? "text-[#8a5a0b]" : "text-[#1b1c19]")}>{value}</p>
            {hint && <p className="mt-0.5 truncate text-xs text-[#8a897f]">{hint}</p>}
        </div>
    );
}

export function StatStrip({ children }: { children: ReactNode }) {
    return <div className="premium-card grid grid-cols-2 divide-[#ece9e1] lg:grid-cols-4 lg:divide-x [&>*:nth-child(odd)]:border-r [&>*:nth-child(odd)]:border-[#ece9e1] lg:[&>*:nth-child(odd)]:border-r-0 [&>*:nth-child(-n+2)]:border-b [&>*:nth-child(-n+2)]:border-[#ece9e1] lg:[&>*:nth-child(-n+2)]:border-b-0">{children}</div>;
}

export function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
}

export { Button };
