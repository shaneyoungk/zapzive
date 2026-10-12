import { forwardRef, memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode, type RefObject } from "react";
import { AnimatePresence, MotionConfig, motion, useInView, useReducedMotion } from "framer-motion";
import {
    AlertTriangle, ArrowLeft, BarChart3, Bell, Check, CheckCircle2, CheckSquare, ChevronDown, ChevronLeft, ChevronRight, Download, FileUp, FlaskConical,
    History, Home, Lock, LogOut, Menu, MousePointer2, Pause, Pencil, Play, Plug, Rocket, Scale, Search, Send, Settings, Trash2, UserRound, Users, X, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ZapziveLogo } from "@/components/ui/ZapziveLogo";
import { MethodTag, SampleTag, StateBadge } from "@/components/ops";
import { money, moneyList } from "@/lib/payout-format";
import { cn } from "@/lib/utils";
import "./product-demo.css";

// The real Zapzive app, replayed with the sandbox sample run (ACME Digital
// Services, PR-1003). Markup, labels and figures follow the dashboard pages
// (DashboardLayout, PayoutRunDetail, ops components); desktop renders at a
// true 1440px app width and is scaled to fit, phones get the app's own
// mobile layout. One clock drives every scene so pausing freezes it exactly.

type RunState = "draft" | "needs_correction" | "ready" | "awaiting_approval" | "approved" | "processing" | "completed";
type MovementState = "ready" | "needs_correction" | "awaiting_approval" | "approved" | "queued" | "processing" | "delivered";
type Method = "mpesa" | "mobile_money" | "bank" | "usdc_wallet";
type Issue = { severity: "error" | "warning"; message: string };

interface Line {
    key: string; name: string; ref: string; mv: string; method: Method; label: string; destination: string;
    currency: string; amountMinor: number; sourceMinor: number; feeMinor: number; deliveredAt: number;
    csvName?: string; issues?: Issue[];
}

// The October run from the sandbox sample scenario, quoted by the sandbox provider.
const LINES: Line[] = [
    { key: "amina", name: "Amina Wanjiru", ref: "OCT-2026-amina", mv: "MV-9C72D671", method: "mpesa", label: "M-Pesa", destination: "M-Pesa · +2547 ••• ••• 601", currency: "KES", amountMinor: 15_200_000, sourceMinor: 118_237, feeMinor: 589, deliveredAt: 4300 },
    { key: "brian", name: "Brian Otieno", ref: "OCT-2026-brian", mv: "MV-007FA34F", method: "mpesa", label: "M-Pesa", destination: "M-Pesa · +2547 ••• ••• 602", currency: "KES", amountMinor: 16_500_000, sourceMinor: 128_348, feeMinor: 639, deliveredAt: 4500, issues: [{ severity: "warning", message: "The same amount (KES 165,000.00) was delivered to this recipient on 2026-09-27. Confirm this is a new payment." }] },
    { key: "mercy", name: "Mercy Achieng", ref: "OCT-2026-mercy", mv: "MV-745AB400", method: "mpesa", label: "M-Pesa", destination: "M-Pesa · +2547 ••• ••• 344", currency: "KES", amountMinor: 9_550_000, sourceMinor: 74_287, feeMinor: 370, deliveredAt: 4700 },
    { key: "daniel", name: "Daniel Kiprop", csvName: "Daniel Kiprob", ref: "OCT-2026-daniel", mv: "MV-717880CD", method: "mpesa", label: "M-Pesa", destination: "M-Pesa · +2547 ••• ••• 455", currency: "KES", amountMinor: 13_100_000, sourceMinor: 101_901, feeMinor: 507, deliveredAt: 4900 },
    { key: "mary", name: "Mary Njeri", ref: "OCT-2026-mary", mv: "MV-E8E07640", method: "bank", label: "Bank account", destination: "NCBA Bank · ••••2109", currency: "KES", amountMinor: 8_200_000, sourceMinor: 63_976, feeMinor: 508, deliveredAt: 6400, issues: [{ severity: "warning", message: "The same amount (KES 82,000.00) was delivered to this recipient on 2026-09-27. Confirm this is a new payment." }, { severity: "warning", message: "Payout details changed since this recipient was last paid. Approval is required." }] },
    { key: "james", name: "James Kamau", ref: "OCT-2026-james", mv: "MV-3B91C2E5", method: "bank", label: "Bank account", destination: "KCB Bank · ••••3344", currency: "KES", amountMinor: 125_000_000, sourceMinor: 975_233, feeMinor: 7_740, deliveredAt: 6700, issues: [{ severity: "warning", message: "9.0× this recipient's usual amount (KES 139,000.00). Confirm the amount." }] },
    { key: "sarah", name: "Sarah Namuli", ref: "OCT-2026-sarah", mv: "MV-5D0A7F18", method: "mobile_money", label: "Mobile money", destination: "Mobile money · +2567 ••• ••• 456", currency: "UGX", amountMinor: 3_000_000, sourceMinor: 81_453, feeMinor: 807, deliveredAt: 5200 },
    { key: "joseph", name: "Joseph Okello", ref: "OCT-2026-joseph", mv: "MV-A41E9C02", method: "mobile_money", label: "Mobile money", destination: "Mobile money · +2567 ••• ••• 567", currency: "UGX", amountMinor: 1_100_000, sourceMinor: 29_866, feeMinor: 296, deliveredAt: 5400 },
    { key: "chinedu", name: "Chinedu Eze", ref: "OCT-2026-chinedu", mv: "MV-C7B2049D", method: "bank", label: "Bank account", destination: "GTBank · ••••6781", currency: "NGN", amountMinor: 170_000_000, sourceMinor: 108_115, feeMinor: 859, deliveredAt: 7000 },
    { key: "lena", name: "Lena Mwende", ref: "OCT-2026-lena", mv: "MV-2F6E8B31", method: "usdc_wallet", label: "USDC wallet", destination: "USDC on base · 0x71C7…976F", currency: "USDC", amountMinor: 95_000, sourceMinor: 95_050, feeMinor: 50, deliveredAt: 5000 },
    { key: "northwind", name: "Northwind Design LLC", ref: "OCT-2026-northwind", mv: "MV-8E15D7A9", method: "bank", label: "Bank account", destination: "Chase · ••••0117", currency: "USD", amountMinor: 240_000, sourceMinor: 241_920, feeMinor: 1_920, deliveredAt: 7300 },
];

const TOTALS = [{ currency: "KES", amountMinor: 187_550_000 }, { currency: "NGN", amountMinor: 170_000_000 }, { currency: "UGX", amountMinor: 4_100_000 }, { currency: "USD", amountMinor: 240_000 }, { currency: "USDC", amountMinor: 95_000 }];
const FUNDING_MINOR = 2_018_386;
const FEES_MINOR = 14_285;
const BALANCE_MINOR = 3_000_000;
const POLICY = "This run requires one approver. Total value of KES 2,589,291.98 exceeds KES 100,000.00, so one approver is required. 1 recipient has changed payout details since their last payout.";
const CSV_PREVIEW = [["Amina Wanjiru", "152000", "KES", "OCT-2026-amina"], ["Brian Otieno", "165000", "KES", "OCT-2026-brian"], ["Mercy Achieng", "95500", "KES", "OCT-2026-mercy"], ["Daniel Kiprob", "131000", "KES", "OCT-2026-daniel"], ["Mary Njeri", "82000", "KES", "OCT-2026-mary"]];
const MAPPING = [["Recipient name", "name"], ["Recipient email", "Not in file"], ["Amount *", "amount"], ["Currency", "currency"], ["Reference / invoice", "reference"]] as const;
const APPROVE_COMMENT = "Totals match September. Mary's new bank details confirmed by phone.";
const RECONCILE_NOTE = "Matched to the sandbox provider statement.";

interface Scene { label: string; caption: string; duration: number }
const SCENES: Scene[] = [
    { label: "Import", duration: 7200, caption: "Import last month's CSV. Columns are mapped automatically and every row is matched to a recipient." },
    { label: "Validate", duration: 9400, caption: "Every payout is checked before it can be submitted: fix what is wrong, then review repeated amounts, changed bank details and unusual totals." },
    { label: "Approve", duration: 8600, caption: "The approver sees the total, the methods and why their sign-off is needed, and leaves a comment on the record." },
    { label: "Send", duration: 8800, caption: "Send to the sandbox provider. Each payout moves from processing to delivered, with its reference and fee." },
    { label: "Reconcile", duration: 8000, caption: "Close the run: expected versus delivered, provider fees and exports for your accounts." },
];

const TICK = 100;
const EASE = [0.16, 1, 0.3, 1] as const;
const MOVE = [0.45, 0, 0.2, 1] as const;

/* Primitives ------------------------------------------------------------------- */

type ButtonVariant = ComponentProps<typeof Button>["variant"];
type ButtonSize = ComponentProps<typeof Button>["size"];

/** The app's Button, rendered as a span: the demo is a picture, so nothing in it is focusable. */
const Btn = forwardRef<HTMLSpanElement, { children: ReactNode; variant?: ButtonVariant; size?: ButtonSize; className?: string; pressed?: boolean }>(function Btn({ children, variant, size, className, pressed = false }, ref) {
    return <Button asChild variant={variant} size={size} className={cn(className, "pd-press", pressed && "is-pressed")}><span ref={ref}>{children}</span></Button>;
});

const pressedAt = (t: number, at: number) => t >= at && t < at + 220;

function Card({ title, subtitle, actions, children, className }: { title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
    return (
        <div className={cn("premium-card min-w-0 overflow-hidden", className)}>
            {(title || actions) && (
                <div className="card-header flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                        {title && <p className="pd-card-title">{title}</p>}
                        {subtitle && <p className="mt-0.5 text-xs text-[#8a897f]">{subtitle}</p>}
                    </div>
                    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
                </div>
            )}
            <div>{children}</div>
        </div>
    );
}

function RunIntro({ status, actions }: { status: RunState; actions?: ReactNode }) {
    return (
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
                <span className="mb-3 inline-flex items-center gap-1.5 rounded-md text-[13px] font-medium text-[#74736b]"><ArrowLeft className="h-3.5 w-3.5" /> Payouts</span>
                <p className="dash-title pd-h1">October contractors</p>
                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#74736b]">Monthly contractor payouts</p>
                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-[#74736b]">
                    <StateBadge kind="run" state={status} />
                    <span className="font-mono">PR-1003</span>
                    <span>Scheduled Oct 16, 2026</span>
                    <span>Requested by Grace Wambui</span>
                    <SampleTag />
                </div>
            </div>
            {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}

const CancelRun = () => <Btn variant="outline" className="text-[#9a2f2f]">Cancel run</Btn>;

const PREP_STEPS = ["Run details", "Add payouts", "Validate", "Review & submit"];

function Stepper({ step }: { step: number }) {
    return (
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PREP_STEPS.map((label, index) => (
                <li key={label} className={cn("flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-[13px] transition-colors duration-300", index === step ? "border-primary bg-white font-semibold text-[#1b1c19] ring-1 ring-primary" : index < step ? "border-[#d6e9df] bg-[#edf6f1] text-[#0b6b4f]" : "border-[#e7e4dc] bg-white text-[#74736b]")}>
                    <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold", index <= step ? "bg-primary text-[#ffffff]" : "bg-[#f1efe9] text-[#9a998f]")}>{index < step ? "✓" : index + 1}</span>{label}
                </li>
            ))}
        </ol>
    );
}

function Segments({ items, active }: { items: string[]; active: number }) {
    return <div className="dash-seg" role="group">{items.map((item, index) => <button key={item} type="button" tabIndex={-1} aria-pressed={index === active}>{item}</button>)}</div>;
}

function Summary({ ready, correction, review }: { ready: number; correction: number; review: number }) {
    const cells = [["Rows", 11, ""], ["Ready", ready, "text-[#0b6b4f]"], ["Need correction", correction, correction ? "text-[#9a2f2f]" : ""], ["Need review", review, review ? "text-[#8a5a0b]" : ""]] as const;
    return (
        <div className="premium-card grid grid-cols-2 gap-px overflow-hidden bg-[#ece9e1] sm:grid-cols-4">
            {cells.map(([label, value, tone]) => <div key={label} className="bg-[#fffefa] px-5 py-3.5"><p className="text-xs text-[#74736b]">{label}</p><p className={cn("text-[20px] font-bold tabular-nums text-[#1b1c19]", tone)}>{value}</p></div>)}
        </div>
    );
}

function LinesPanel({ editable, attention, children }: { editable: boolean; attention: number; children: ReactNode }) {
    return (
        <Card title="Payouts" subtitle={`11 payouts · ${moneyList(TOTALS)}`}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ece9e1] px-5 py-3">
                <Segments items={["All 11", `Needs attention ${attention}`]} active={0} />
                <p className="text-xs text-[#8a897f]">{editable ? "Amounts are what the recipient receives. Sandbox quotes refresh on every change." : "Funding cost includes provider fees."}</p>
            </div>
            <ul className="divide-y divide-[#ece9e1]">{children}</ul>
        </Card>
    );
}

interface RowProps {
    line: Line; state: MovementState; editable?: boolean; unmatched?: boolean; acked?: boolean;
    rowRef?: RefObject<HTMLLIElement>; editRef?: RefObject<HTMLSpanElement>; reviewRef?: RefObject<HTMLSpanElement>; editPressed?: boolean; reviewPressed?: boolean;
}

function LineRow({ line, state, editable = false, unmatched = false, acked = false, rowRef, editRef, reviewRef, editPressed, reviewPressed }: RowProps) {
    const issues: Issue[] = unmatched ? [{ severity: "error", message: `"${line.csvName}" does not match a recipient in this workspace. Add the recipient or correct the name.` }] : line.issues ?? [];
    const pending = !unmatched && !acked && issues.some((issue) => issue.severity === "warning");
    return (
        <li ref={rowRef} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto] md:items-start">
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><span className={cn("font-semibold", unmatched ? "text-[#9a2f2f]" : "text-[#1b1c19]")}>{unmatched ? line.csvName : line.name}</span></div>
                <p className="mt-0.5 text-xs text-[#8a897f]">Ref {line.ref} · <span className="font-mono">{line.mv}</span></p>
                {issues.length > 0 && (
                    <ul className="mt-2 space-y-1.5">
                        {issues.map((issue) => {
                            const reviewed = acked && issue.severity === "warning";
                            return (
                                <li key={issue.message} className={cn("flex items-start gap-1.5 text-xs leading-5", issue.severity === "error" ? "text-[#9a2f2f]" : reviewed ? "text-[#8a897f]" : "text-[#8a5a0b]")}>
                                    {issue.severity === "error" ? <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : reviewed ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                                    <span>{issue.message}{reviewed ? " Reviewed." : ""}</span>
                                </li>
                            );
                        })}
                        {editable && pending && <li><Btn ref={reviewRef} size="sm" variant="outline" className="h-7 rounded-lg px-2.5 text-xs" pressed={reviewPressed}>Mark as reviewed</Btn></li>}
                    </ul>
                )}
            </div>
            {unmatched ? <span className="text-[13px] text-[#9a998f]">Match a recipient to route</span> : <MethodTag method={line.method} label={line.label} destination={line.destination} />}
            <div className="md:text-right">
                <p className="font-semibold tabular-nums text-[#1b1c19]">{money(line.amountMinor, line.currency)}</p>
                {!unmatched && <p className="text-xs tabular-nums text-[#8a897f]">≈ {money(line.sourceMinor, "USD")} incl. {money(line.feeMinor, "USD")} fee</p>}
            </div>
            <div className="flex items-center gap-1 md:justify-end">
                <StateBadge kind="movement" state={state} />
                {editable && <>
                    <Btn ref={editRef} variant="ghost" size="sm" className="h-8 w-8 rounded-lg p-0" pressed={editPressed}><Pencil className="h-3.5 w-3.5" /></Btn>
                    <Btn variant="ghost" size="sm" className="h-8 w-8 rounded-lg p-0 text-[#9a2f2f]"><Trash2 className="h-3.5 w-3.5" /></Btn>
                </>}
            </div>
        </li>
    );
}

/** Radix AlertDialog / Dialog look: black overlay, centred card. */
function Modal({ open, children }: { open: boolean; children: ReactNode }) {
    return (
        <AnimatePresence>
            {open && (
                <motion.div key="modal" className="pd-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                    <div className="pd-modal__overlay" />
                    <motion.div className="pd-modal__content" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}>{children}</motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/** ConfirmAction's dialog. */
function Confirm({ title, lines, consequence, comment, typed, confirmLabel, confirmRef, pressed }: {
    title: string; lines: Array<[string, ReactNode]>; consequence: string; comment?: { label: string; placeholder: string }; typed?: string;
    confirmLabel: string; confirmRef: RefObject<HTMLSpanElement>; pressed: boolean;
}) {
    return (
        <>
            <div className="space-y-2 p-6 pb-0 text-left">
                <p className="text-lg font-semibold text-[#1b1c19]">{title}</p>
                <dl className="mt-2 divide-y divide-[#ece9e1] rounded-xl border border-[#ece9e1] bg-white">
                    {lines.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-4 px-3.5 py-2.5 text-[13px]"><dt className="text-[#74736b]">{label}</dt><dd className="text-right font-semibold tabular-nums text-[#1b1c19]">{value}</dd></div>)}
                </dl>
                <div className="pt-2 text-[13px] leading-6 text-[#55544d]">{consequence}</div>
            </div>
            {comment && (
                <div className="px-6 pt-3">
                    <p className="text-[13px] font-medium text-[#55544d]">{comment.label} (optional)</p>
                    <div className={cn("pd-textarea", typed && "is-focused")}>{typed ? <>{typed}<span className="pd-caret" /></> : <span className="text-[#92928a]">{comment.placeholder}</span>}</div>
                </div>
            )}
            <div className="flex flex-col-reverse gap-2 p-6 sm:flex-row sm:justify-end">
                <Btn variant="outline">Cancel</Btn>
                <Btn ref={confirmRef} pressed={pressed}>{confirmLabel}</Btn>
            </div>
        </>
    );
}

function Toast({ show, text }: { show: boolean; text: string }) {
    return (
        <AnimatePresence>
            {show && (
                <motion.div key={text} className="pd-toast" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.3, ease: EASE }}>
                    <CheckCircle2 className="pd-toast__icon" /> {text}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/* Scene frame: scrolls the page like a person would and moves the pointer to real targets. */

type ScrollStop = { at: number; target?: RefObject<HTMLElement>; align?: "start" | "center" | "end" };
type CursorStop = { at: number; point: [x: number, y: number] } | { at: number; target: RefObject<HTMLElement>; inPage?: boolean };

/** Position inside a positioned container, ignoring transforms, so mid-animation measurements stay stable. */
function offsetWithin(element: HTMLElement, container: HTMLElement) {
    let left = 0;
    let top = 0;
    let node: HTMLElement | null = element;
    while (node && node !== container) {
        left += node.offsetLeft;
        top += node.offsetTop;
        node = node.offsetParent as HTMLElement | null;
    }
    return { left, top };
}

const latest = <T extends { at: number }>(stops: T[], t: number) => stops.filter((stop) => t >= stop.at).pop() ?? stops[0];

function SceneFrame({ t, wide, scroll = [], cursor = [], clicks = [], cursorFrom = Infinity, cursorTo = Infinity, overlay, children }: {
    t: number; wide: boolean; scroll?: ScrollStop[]; cursor?: CursorStop[]; clicks?: number[]; cursorFrom?: number; cursorTo?: number; overlay?: ReactNode; children: ReactNode;
}) {
    const root = useRef<HTMLDivElement>(null);
    const viewport = useRef<HTMLDivElement>(null);
    const page = useRef<HTMLDivElement>(null);
    const [offset, setOffset] = useState(0);
    const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
    const scrollStop = scroll.length ? latest(scroll, t) : null;
    const cursorStop = cursor.length ? latest(cursor, t) : null;

    useLayoutEffect(() => {
        const box = viewport.current;
        const sheet = page.current;
        const frame = root.current;
        if (!box || !sheet || !frame) return;
        let nextOffset = 0;
        const target = scrollStop?.target?.current;
        if (target && target.offsetParent) {
            const top = offsetWithin(target, box).top;
            const height = target.offsetHeight;
            const view = box.clientHeight;
            const wanted = scrollStop?.align === "center" ? top + height / 2 - view / 2 : scrollStop?.align === "end" ? top + height - view + 32 : top - 24;
            nextOffset = Math.min(Math.max(0, sheet.offsetHeight - view), Math.max(0, wanted));
        }
        if (Math.abs(nextOffset - offset) > 0.5) setOffset(nextOffset);

        let next: { x: number; y: number } | null = null;
        if (cursorStop) {
            if ("point" in cursorStop) next = { x: (frame.clientWidth * cursorStop.point[0]) / 100, y: (frame.clientHeight * cursorStop.point[1]) / 100 };
            else if (cursorStop.target.current?.offsetParent) {
                const element = cursorStop.target.current;
                const position = offsetWithin(element, frame);
                next = { x: position.left + element.offsetWidth * 0.6, y: position.top + element.offsetHeight * 0.55 - (cursorStop.inPage ? nextOffset : 0) };
            }
        }
        if (next && (!point || Math.abs(point.x - next.x) > 0.5 || Math.abs(point.y - next.y) > 0.5)) setPoint(next);
    }, [t, scrollStop, cursorStop, offset, point]);

    const visible = point !== null && t >= cursorFrom && t < cursorTo;
    const pressed = clicks.some((click) => pressedAt(t, click));
    return (
        <div ref={root} className="pd-scene-frame">
            <div ref={viewport} className="pd-viewport">
                <motion.div ref={page} className="pd-page" initial={false} animate={{ y: -offset }} transition={{ duration: 0.9, ease: MOVE }}>
                    <div data-dashboard-content className="mx-auto w-full min-w-0 max-w-[1440px]">{children}</div>
                </motion.div>
            </div>
            {overlay}
            <motion.div
                className={wide ? "pd-cursor" : "pd-touch"}
                initial={false}
                animate={{ x: point?.x ?? 0, y: point?.y ?? 0, opacity: visible ? 1 : 0, scale: pressed ? (wide ? 0.82 : 0.7) : 1 }}
                transition={{ x: { duration: 0.85, ease: MOVE }, y: { duration: 0.85, ease: MOVE }, opacity: { duration: 0.2 }, scale: { duration: 0.12 } }}
            >
                {wide && <MousePointer2 size={26} fill="#ffffff" strokeWidth={1.6} />}
            </motion.div>
        </div>
    );
}

/* 1. Import ------------------------------------------------------------------------ */

const IMP = { toChoose: 600, choose: 1500, loaded: 2100, map: 2250, mapStep: 170, toImport: 3700, click: 4600, done: 4750, toastOut: 6700 };

function ImportScene({ t, wide }: { t: number; wide: boolean }) {
    const choose = useRef<HTMLSpanElement>(null);
    const importButton = useRef<HTMLSpanElement>(null);
    const cursor = useMemo<CursorStop[]>(() => [{ at: 0, point: [72, 90] }, { at: IMP.toChoose, target: choose, inPage: true }, { at: IMP.toImport, target: importButton, inPage: true }], []);
    const scroll = useMemo<ScrollStop[]>(() => [{ at: 0 }, { at: IMP.loaded + 400, target: importButton, align: "end" }, { at: IMP.done, target: undefined }], []);
    const loaded = t >= IMP.loaded;
    const done = t >= IMP.done;
    const mapped = MAPPING.filter((_, index) => t >= IMP.map + index * IMP.mapStep).length;

    return (
        <SceneFrame t={t} wide={wide} scroll={scroll} cursor={cursor} clicks={[IMP.choose, IMP.click]} cursorFrom={400} cursorTo={IMP.done + 400}
            overlay={<Toast show={done && t < IMP.toastOut} text="11 rows imported · 10 matched · 1 unknown" />}>
            <div className="space-y-6">
                <RunIntro status={done ? "needs_correction" : "draft"} actions={<CancelRun />} />
                <Stepper step={done ? 2 : 1} />
                <Card title="Add payouts" actions={<Segments items={["From recipients", "Import CSV"]} active={1} />}>
                    {done ? (
                        <div className="flex flex-wrap items-center justify-between gap-3 p-5 text-[13px] text-[#55544d]"><span>11 payouts in this run.</span><Btn variant="outline" size="sm">Add more</Btn></div>
                    ) : !loaded ? (
                        <div className="space-y-4 p-5">
                            <div className="rounded-xl border border-dashed border-[#d6d3c9] bg-[#faf9f6] p-6 text-center">
                                <FileUp className="mx-auto h-6 w-6 text-[#74736b]" />
                                <p className="mt-2 text-sm font-semibold text-[#1b1c19]">Upload a CSV of payouts</p>
                                <p className="mx-auto mt-1 max-w-md text-[13px] leading-6 text-[#74736b]">One row per payout. Include a recipient name or email and an amount; currency and reference are optional. Rows are matched to your recipients, and anything unknown is flagged for you to fix.</p>
                                <Btn ref={choose} variant="outline" className="mt-4" pressed={pressedAt(t, IMP.choose)}><FileUp className="h-4 w-4" /> Choose CSV file</Btn>
                                <p className="mt-3 text-xs text-[#9a998f]">Example header: <span className="font-mono">name,email,amount,currency,reference</span></p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 p-5">
                            <p className="text-[13px] text-[#55544d]"><span className="font-semibold text-[#1b1c19]">october-contractors.csv</span> · 11 rows detected. Map the columns, check the preview, then import.</p>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                                {MAPPING.map(([label, column], index) => (
                                    <div key={label} className="space-y-1.5">
                                        <p className="text-xs font-medium text-[#1b1c19]">{label}</p>
                                        <div className={cn("pd-select", index < mapped && column !== "Not in file" && "is-set")}><span className={index < mapped ? "" : "text-[#92928a]"}>{index < mapped ? column : "Not in file"}</span><ChevronDown className="h-4 w-4 opacity-50" /></div>
                                    </div>
                                ))}
                            </div>
                            <div className="overflow-x-auto rounded-xl border border-[#ece9e1]">
                                <table className="min-w-[520px] text-sm">
                                    <thead><tr>{MAPPING.map(([label]) => <th key={label} scope="col" className="px-3 text-left">{label.replace(" *", "")}</th>)}</tr></thead>
                                    <tbody className="divide-y divide-[#ece9e1]">
                                        {CSV_PREVIEW.map((row) => (
                                            <tr key={row[0]}>
                                                <td className="px-3 py-2 text-[13px]">{mapped > 0 ? row[0] : <span className="text-[#c4c2b9]">—</span>}</td>
                                                <td className="px-3 py-2 text-[13px]"><span className="text-[#c4c2b9]">—</span></td>
                                                <td className="px-3 py-2 text-[13px]">{mapped > 2 ? row[1] : <span className="text-[#c4c2b9]">—</span>}</td>
                                                <td className="px-3 py-2 text-[13px]">{mapped > 3 ? row[2] : <span className="text-[#c4c2b9]">—</span>}</td>
                                                <td className="px-3 py-2 text-[13px]">{mapped > 4 ? row[3] : <span className="text-[#c4c2b9]">—</span>}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex flex-wrap justify-end gap-2">
                                <Btn variant="outline">Choose another file</Btn>
                                <Btn ref={importButton} pressed={pressedAt(t, IMP.click)}>Import 11 rows</Btn>
                            </div>
                        </div>
                    )}
                </Card>
                {done && <Summary ready={7} correction={1} review={3} />}
            </div>
        </SceneFrame>
    );
}

/* 2. Validate ------------------------------------------------------------------------ */

const VAL = { toRows: 800, toEdit: 1500, clickEdit: 2300, open: 2450, toSelect: 2750, clickSelect: 3300, picked: 3600, toSave: 3800, clickSave: 4400, closed: 4550,
    toBrian: 4800, clickBrian: 5500, toMary: 5800, clickMary: 6500, scrollJames: 6650, toJames: 6900, clickJames: 7600, toTop: 8100, toastOut: 8800 };

function ValidateScene({ t, wide }: { t: number; wide: boolean }) {
    const brianRow = useRef<HTMLLIElement>(null);
    const jamesRow = useRef<HTMLLIElement>(null);
    const edit = useRef<HTMLSpanElement>(null);
    const select = useRef<HTMLDivElement>(null);
    const save = useRef<HTMLSpanElement>(null);
    const brian = useRef<HTMLSpanElement>(null);
    const mary = useRef<HTMLSpanElement>(null);
    const james = useRef<HTMLSpanElement>(null);
    const cursor = useMemo<CursorStop[]>(() => [
        { at: 0, point: [80, 92] }, { at: VAL.toEdit, target: edit, inPage: true }, { at: VAL.toSelect, target: select }, { at: VAL.toSave, target: save },
        { at: VAL.toBrian, target: brian, inPage: true }, { at: VAL.toMary, target: mary, inPage: true }, { at: VAL.toJames, target: james, inPage: true },
    ], []);
    const scroll = useMemo<ScrollStop[]>(() => [{ at: 0 }, { at: VAL.toRows, target: brianRow, align: "start" }, { at: VAL.scrollJames, target: jamesRow, align: "center" }, { at: VAL.toTop }], []);

    const fixed = t >= VAL.closed;
    const acked = { brian: t >= VAL.clickBrian + 150, mary: t >= VAL.clickMary + 150, james: t >= VAL.clickJames + 150 };
    const correction = fixed ? 0 : 1;
    const review = 3 - Object.values(acked).filter(Boolean).length;
    const status: RunState = correction ? "needs_correction" : "ready";
    const toast = t >= VAL.closed && t < VAL.toastOut ? (t < VAL.clickBrian + 150 ? "Payout updated and re-validated" : "Warning reviewed") : null;
    const dropdown = t >= VAL.clickSelect && t < VAL.picked;

    return (
        <SceneFrame t={t} wide={wide} scroll={scroll} cursor={cursor} clicks={[VAL.clickEdit, VAL.clickSelect, VAL.clickSave, VAL.clickBrian, VAL.clickMary, VAL.clickJames]} cursorFrom={1300} cursorTo={8000}
            overlay={<>
                <Modal open={t >= VAL.open && t < VAL.closed}>
                    <div className="grid gap-4 p-6">
                        <span className="pd-modal__close"><X className="h-4 w-4" /></span>
                        <div className="flex flex-col space-y-1.5 text-left">
                            <p className="text-lg font-semibold leading-none tracking-tight text-[#1b1c19]">Edit payout</p>
                            <p className="text-sm text-[#74736b]">“Daniel Kiprob” did not match a recipient. Choose the right one.</p>
                        </div>
                        <div className="space-y-4">
                            <div className="relative space-y-1.5">
                                <p className="text-sm font-medium text-[#1b1c19]">Recipient</p>
                                <div ref={select} className={cn("pd-select", dropdown && "is-open", t >= VAL.picked && "is-set")}><span className={t >= VAL.picked ? "" : "text-[#92928a]"}>{t >= VAL.picked ? "Daniel Kiprop" : "Choose a recipient"}</span><ChevronDown className="h-4 w-4 opacity-50" /></div>
                                {dropdown && (
                                    <div className="pd-options">
                                        {["Daniel Kiprop", "Mercy Achieng", "Mary Njeri", "James Kamau"].map((name, index) => <div key={name} className={cn("pd-option", index === 0 && "is-active")}>{name}</div>)}
                                    </div>
                                )}
                            </div>
                            <div className="space-y-1.5"><p className="text-sm font-medium text-[#1b1c19]">Amount (KES)</p><div className="pd-input tabular-nums">131000.00</div></div>
                            <div className="space-y-1.5"><p className="text-sm font-medium text-[#1b1c19]">Reference <span className="font-normal text-[#8a897f]">(optional)</span></p><div className="pd-input">OCT-2026-daniel</div></div>
                        </div>
                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Btn variant="outline">Cancel</Btn><Btn ref={save} pressed={pressedAt(t, VAL.clickSave)}>Save</Btn></div>
                    </div>
                </Modal>
                <Toast show={toast !== null} text={toast ?? ""} />
            </>}>
            <div className="space-y-6">
                <RunIntro status={status} actions={<CancelRun />} />
                <Stepper step={correction + review === 0 ? 3 : 2} />
                <Card title="Add payouts" actions={<Segments items={["From recipients", "Import CSV"]} active={1} />}>
                    <div className="flex flex-wrap items-center justify-between gap-3 p-5 text-[13px] text-[#55544d]"><span>11 payouts in this run.</span><Btn variant="outline" size="sm">Add more</Btn></div>
                </Card>
                <Summary ready={11 - correction - review} correction={correction} review={review} />
                <LinesPanel editable attention={correction + review}>
                    {LINES.map((line) => (
                        <LineRow
                            key={line.key}
                            line={line}
                            editable
                            state={line.key === "daniel" && !fixed ? "needs_correction" : "ready"}
                            unmatched={line.key === "daniel" && !fixed}
                            acked={line.key === "brian" ? acked.brian : line.key === "mary" ? acked.mary : line.key === "james" ? acked.james : false}
                            rowRef={line.key === "brian" ? brianRow : line.key === "james" ? jamesRow : undefined}
                            editRef={line.key === "daniel" ? edit : undefined}
                            editPressed={line.key === "daniel" && pressedAt(t, VAL.clickEdit)}
                            reviewRef={line.key === "brian" ? brian : line.key === "mary" ? mary : line.key === "james" ? james : undefined}
                            reviewPressed={(line.key === "brian" && pressedAt(t, VAL.clickBrian)) || (line.key === "mary" && pressedAt(t, VAL.clickMary)) || (line.key === "james" && pressedAt(t, VAL.clickJames))}
                        />
                    ))}
                </LinesPanel>
            </div>
        </SceneFrame>
    );
}

/* 3. Approve ------------------------------------------------------------------------- */

const APR = { toApprove: 600, clickApprove: 1500, open: 1650, type: 2100, toConfirm: 4400, clickConfirm: 5100, closed: 5250, toastOut: 7000 };

function ExecutePanel({ sendRef, pressed }: { sendRef?: RefObject<HTMLSpanElement>; pressed?: boolean }) {
    return (
        <Card title="Ready to send" subtitle="Approved just now">
            <div className="space-y-4 p-5">
                <dl className="grid gap-3 text-[13px] sm:grid-cols-3">
                    <div><dt className="text-[#8a897f]">Funding required</dt><dd className="mt-0.5 font-semibold tabular-nums text-[#1b1c19]">{money(FUNDING_MINOR, "USD")}</dd></div>
                    <div><dt className="text-[#8a897f]">Sandbox balance</dt><dd className="mt-0.5 font-semibold tabular-nums text-[#1b1c19]">{money(BALANCE_MINOR, "USD")}</dd></div>
                    <div><dt className="text-[#8a897f]">On hold</dt><dd className="mt-0.5 font-semibold text-[#1b1c19]">None</dd></div>
                </dl>
                <Btn ref={sendRef} pressed={pressed}><Send className="h-4 w-4" /> Send to provider</Btn>
            </div>
        </Card>
    );
}

function ApproveScene({ t, wide }: { t: number; wide: boolean }) {
    const approve = useRef<HTMLSpanElement>(null);
    const confirm = useRef<HTMLSpanElement>(null);
    const cursor = useMemo<CursorStop[]>(() => [{ at: 0, point: [78, 90] }, { at: APR.toApprove, target: approve, inPage: true }, { at: APR.toConfirm, target: confirm }], []);
    const approved = t >= APR.closed;
    const typed = APPROVE_COMMENT.slice(0, Math.max(0, Math.floor((t - APR.type) / 32)));

    return (
        <SceneFrame t={t} wide={wide} cursor={cursor} clicks={[APR.clickApprove, APR.clickConfirm]} cursorFrom={400} cursorTo={APR.closed + 300}
            overlay={<>
                <Modal open={t >= APR.open && t < APR.closed}>
                    <Confirm
                        title="Approve October contractors?"
                        lines={[["Payouts", 11], ["Total", moneyList(TOTALS)], ["Currencies", 5], ["Payout methods", "M-Pesa, Bank account, Mobile money, USDC wallet"]]}
                        consequence="This approval allows the run to proceed to execution. It is recorded with your name, the time and your comment."
                        comment={{ label: "Comment", placeholder: "What did you check?" }}
                        typed={typed}
                        confirmLabel="Approve run"
                        confirmRef={confirm}
                        pressed={pressedAt(t, APR.clickConfirm)}
                    />
                </Modal>
                <Toast show={approved && t < APR.toastOut} text="Approval recorded" />
            </>}>
            <div className="space-y-6">
                <RunIntro status={approved ? "approved" : "awaiting_approval"} actions={<CancelRun />} />
                {approved ? <ExecutePanel /> : (
                    <Card title="Approval" subtitle="0 of 1 approval received">
                        <div className="space-y-4 p-5">
                            <p className="rounded-xl bg-[#fdf4e3] p-3.5 text-[13px] leading-6 text-[#7a4f0a]">{POLICY}</p>
                            <div className="flex flex-wrap gap-2">
                                <Btn ref={approve} pressed={pressedAt(t, APR.clickApprove)}><CheckCircle2 className="h-4 w-4" /> Approve run</Btn>
                                <Btn variant="outline" className="text-[#9a2f2f]"><XCircle className="h-4 w-4" /> Reject</Btn>
                            </div>
                        </div>
                    </Card>
                )}
                <LinesPanel editable={false} attention={0}>
                    {LINES.map((line) => <LineRow key={line.key} line={line} state={approved ? "approved" : "awaiting_approval"} acked />)}
                </LinesPanel>
            </div>
        </SceneFrame>
    );
}

/* 4. Send ------------------------------------------------------------------------------ */

const SND = { toSend: 600, clickSend: 1400, open: 1550, toConfirm: 2300, clickConfirm: 3000, closed: 3150, toastOut: 4800, processing: 3500, scroll: 5600, complete: 7300 };

function SendScene({ t, wide }: { t: number; wide: boolean }) {
    const send = useRef<HTMLSpanElement>(null);
    const confirm = useRef<HTMLSpanElement>(null);
    const maryRow = useRef<HTMLLIElement>(null);
    const cursor = useMemo<CursorStop[]>(() => [{ at: 0, point: [78, 90] }, { at: SND.toSend, target: send, inPage: true }, { at: SND.toConfirm, target: confirm }], []);
    const scroll = useMemo<ScrollStop[]>(() => [{ at: 0 }, { at: SND.scroll, target: maryRow, align: "start" }], []);
    const sent = t >= SND.closed;
    const status: RunState = !sent ? "approved" : t >= SND.complete ? "completed" : "processing";
    const stateOf = (line: Line, index: number): MovementState => !sent ? "approved" : t >= line.deliveredAt ? "delivered" : t >= SND.processing + index * 60 ? "processing" : "queued";

    return (
        <SceneFrame t={t} wide={wide} scroll={scroll} cursor={cursor} clicks={[SND.clickSend, SND.clickConfirm]} cursorFrom={400} cursorTo={SND.closed + 300}
            overlay={<>
                <Modal open={t >= SND.open && t < SND.closed}>
                    <Confirm
                        title="Send October contractors?"
                        lines={[["Payouts to send", 11], ["Funding reserved", money(FUNDING_MINOR, "USD")], ["Provider", "Zapzive sandbox"]]}
                        consequence="Funds are reserved and each payout is submitted to the provider. Delivery is confirmed by the provider, not by this click."
                        confirmLabel="Send payouts"
                        confirmRef={confirm}
                        pressed={pressedAt(t, SND.clickConfirm)}
                    />
                </Modal>
                <Toast show={sent && t < SND.toastOut} text="Run sent to the provider" />
            </>}>
            <div className="space-y-6">
                <RunIntro status={status} actions={sent ? undefined : <CancelRun />} />
                {!sent && <ExecutePanel sendRef={send} pressed={pressedAt(t, SND.clickSend)} />}
                <LinesPanel editable={false} attention={0}>
                    {LINES.map((line, index) => <LineRow key={line.key} line={line} state={stateOf(line, index)} acked rowRef={line.key === "mary" ? maryRow : undefined} />)}
                </LinesPanel>
            </div>
        </SceneFrame>
    );
}

/* 5. Reconcile -------------------------------------------------------------------------- */

const REC = { scroll: 300, toMark: 1100, clickMark: 1900, open: 2050, type: 2500, toConfirm: 3900, clickConfirm: 4600, closed: 4750, toastOut: 6300, toLedger: 5200, clickLedger: 6000 };

const ACTIVITY: Array<[actor: string, text: string, when: string, done: boolean]> = [
    ["Zapzive sandbox provider", "PR-1003 · October contractors completed", "just now", true],
    ["Grace Wambui", "sent PR-1003 · October contractors to the provider (reserved USD 20,183.86)", "2 minutes ago", false],
    ["David Ouma", "approved PR-1003 · October contractors (1/1)", "6 minutes ago", true],
    ["Grace Wambui", "submitted PR-1003 · October contractors with 11 payouts", "14 minutes ago", false],
    ["Grace Wambui", "imported 11 rows into PR-1003 · October contractors (10 matched, 1 unknown)", "21 minutes ago", false],
];

function ReconcileScene({ t, wide }: { t: number; wide: boolean }) {
    const panel = useRef<HTMLDivElement>(null);
    const mark = useRef<HTMLSpanElement>(null);
    const confirm = useRef<HTMLSpanElement>(null);
    const ledger = useRef<HTMLSpanElement>(null);
    const cursor = useMemo<CursorStop[]>(() => [{ at: 0, point: [80, 90] }, { at: REC.toMark, target: mark, inPage: true }, { at: REC.toConfirm, target: confirm }, { at: REC.toLedger, target: ledger, inPage: true }], []);
    const scroll = useMemo<ScrollStop[]>(() => [{ at: 0 }, { at: REC.scroll, target: panel, align: "start" }], []);
    const reconciled = t >= REC.closed;
    const typed = RECONCILE_NOTE.slice(0, Math.max(0, Math.floor((t - REC.type) / 32)));
    const counts: Array<[string, number]> = [["Requested", 11], ["Delivered", 11], ["Processing", 0], ["Failed", 0], ["On hold", 0]];

    return (
        <SceneFrame t={t} wide={wide} scroll={scroll} cursor={cursor} clicks={[REC.clickMark, REC.clickConfirm, REC.clickLedger]} cursorFrom={900} cursorTo={6600}
            overlay={<>
                <Modal open={t >= REC.open && t < REC.closed}>
                    <Confirm
                        title="Reconcile October contractors?"
                        lines={[["Delivered", "11 of 11"], ["Outstanding", "—"]]}
                        consequence="Confirms that delivered amounts match your provider statement."
                        comment={{ label: "Note", placeholder: "e.g. Matched to provider statement" }}
                        typed={typed}
                        confirmLabel="Mark reconciled"
                        confirmRef={confirm}
                        pressed={pressedAt(t, REC.clickConfirm)}
                    />
                </Modal>
                <Toast show={reconciled && t < REC.toastOut} text="Run reconciled" />
            </>}>
            <div className="space-y-6">
                <RunIntro status="completed" />
                <LinesPanel editable={false} attention={0}>
                    {LINES.map((line) => <LineRow key={line.key} line={line} state="delivered" acked />)}
                </LinesPanel>
                <div ref={panel}>
                    <Card title="Reconciliation" subtitle={reconciled ? "Reconciled Oct 16, 2026" : "Expected versus delivered"} actions={reconciled ? <StateBadge kind="run" state="completed" /> : undefined}>
                        <div className="grid gap-5 p-5 lg:grid-cols-2">
                            <dl className="divide-y divide-[#ece9e1] rounded-xl border border-[#ece9e1] text-[13px]">
                                {counts.map(([label, value]) => <div key={label} className="flex justify-between px-3.5 py-2"><dt className="text-[#74736b]">{label}</dt><dd className="font-semibold tabular-nums text-[#1b1c19]">{value}</dd></div>)}
                            </dl>
                            <dl className="divide-y divide-[#ece9e1] rounded-xl border border-[#ece9e1] text-[13px]">
                                <div className="flex justify-between gap-3 px-3.5 py-2"><dt className="text-[#74736b]">Expected</dt><dd className="text-right font-semibold tabular-nums text-[#1b1c19]">{moneyList(TOTALS)}</dd></div>
                                <div className="flex justify-between gap-3 px-3.5 py-2"><dt className="text-[#74736b]">Delivered</dt><dd className="text-right font-semibold tabular-nums text-[#1b1c19]">{moneyList(TOTALS)}</dd></div>
                                <div className="flex justify-between gap-3 px-3.5 py-2"><dt className="text-[#74736b]">Outstanding</dt><dd className="text-right font-semibold tabular-nums text-[#1b1c19]">—</dd></div>
                                <div className="flex justify-between gap-3 px-3.5 py-2"><dt className="text-[#74736b]">Provider fees</dt><dd className="font-semibold tabular-nums text-[#1b1c19]">{money(FEES_MINOR, "USD")}</dd></div>
                                <div className="flex justify-between gap-3 px-3.5 py-2"><dt className="text-[#74736b]">Funding used</dt><dd className="font-semibold tabular-nums text-[#1b1c19]">{money(FUNDING_MINOR, "USD")}</dd></div>
                            </dl>
                        </div>
                        <div className="flex flex-col gap-3 border-t border-[#ece9e1] p-5 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-wrap gap-2">
                                <Btn ref={ledger} variant="outline" size="sm" pressed={pressedAt(t, REC.clickLedger)}><Download className="h-3.5 w-3.5" /> Ledger CSV</Btn>
                                <Btn variant="outline" size="sm"><Download className="h-3.5 w-3.5" /> Journal CSV</Btn>
                                <Btn variant="outline" size="sm"><Download className="h-3.5 w-3.5" /> Run receipt</Btn>
                            </div>
                            {!reconciled && <Btn ref={mark} size="sm" pressed={pressedAt(t, REC.clickMark)}><Check className="h-4 w-4" /> Mark reconciled</Btn>}
                        </div>
                    </Card>
                </div>
                <div className="grid gap-5 lg:grid-cols-2">
                    <Card title="Approval history">
                        <ul className="divide-y divide-[#ece9e1]">
                            <li className="px-5 py-3 text-[13px]">
                                <p className="text-[#1b1c19]"><span className="font-semibold">David Ouma</span> approved</p>
                                <p className="mt-0.5 text-[#55544d]">“{APPROVE_COMMENT}”</p>
                                <p className="mt-0.5 text-xs text-[#8a897f]">Oct 16, 2026, 10:42 · awaiting approval → approved</p>
                            </li>
                        </ul>
                    </Card>
                    <Card title="Activity">
                        <ol className="relative space-y-0 p-5">
                            {ACTIVITY.map(([actor, text, when, done], index) => (
                                <li key={text} className="relative flex gap-3 pb-4 last:pb-0">
                                    {index < ACTIVITY.length - 1 && <span className="absolute left-[7px] top-4 h-full w-px bg-[#e7e4dc]" />}
                                    <span className={cn("relative mt-1 h-[15px] w-[15px] shrink-0 rounded-full border-2 border-[#fffefa]", done ? "bg-[#11a879]" : "bg-[#c9c6bc]")} />
                                    <div className="min-w-0 text-[13px] leading-5"><p className="text-[#3c3c37]"><span className="font-semibold text-[#1b1c19]">{actor}</span> {text}</p><p className="mt-0.5 text-xs text-[#8a897f]">{when}</p></div>
                                </li>
                            ))}
                        </ol>
                    </Card>
                </div>
            </div>
        </SceneFrame>
    );
}

const SCENE_COMPONENTS = [ImportScene, ValidateScene, ApproveScene, SendScene, ReconcileScene];

/* App chrome: the dashboard's sidebar and top bar ------------------------------------------ */

const NAV = [
    { title: "Workspace", items: [{ icon: Home, label: "Home" }, { icon: Send, label: "Payouts" }, { icon: UserRound, label: "Recipients" }, { icon: CheckSquare, label: "Approvals" }, { icon: History, label: "Activity" }] },
    { title: "Operations", items: [{ icon: AlertTriangle, label: "Exceptions" }, { icon: Scale, label: "Reconciliation" }, { icon: BarChart3, label: "Reports" }] },
    { title: "Developer", items: [{ icon: Plug, label: "Integrations" }, { icon: FlaskConical, label: "Labs" }] },
    { title: "Organization", items: [{ icon: Users, label: "Team" }] },
];

const Sidebar = memo(function Sidebar({ approvals, user }: { approvals: number; user: { initials: string; name: string; email: string } }) {
    return (
        <aside className="absolute inset-y-0 left-0 z-10 hidden w-[256px] flex-col bg-[#123a2f] lg:flex">
            <div className="flex h-16 shrink-0 items-center border-b border-r border-[#ebe8e0] bg-white px-6"><ZapziveLogo size="md" /></div>
            <div className="flex h-[68px] w-full shrink-0 items-center gap-3 bg-[#0d2c23] px-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#1d5241] text-xs font-bold text-[#cdeee0]">AC</span>
                <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-[13px] font-semibold text-white">ACME Digital Services</span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-[#9fbcb1]"><span className="h-1.5 w-1.5 rounded-full bg-[#c9a35a]" />Sandbox</span>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-[#8fb0a4]" />
            </div>
            <div className="min-h-0 flex-1 overflow-hidden px-3 py-5">
                <nav className="space-y-5">
                    {NAV.map((group) => (
                        <div key={group.title}>
                            <p className="mb-2 px-3 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#7fa597]">{group.title}</p>
                            <div className="space-y-1">
                                {group.items.map((item) => {
                                    const active = item.label === "Payouts";
                                    const badge = item.label === "Approvals" ? approvals : item.label === "Exceptions" ? 1 : 0;
                                    return (
                                        <div key={item.label} className={cn("relative flex h-10 items-center gap-3 rounded-[10px] px-3 text-[13.5px] font-semibold", active ? "bg-[#ffffff] text-[#123a2f]" : "text-[#c7d9d1]")}>
                                            <item.icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-primary" : "text-[#8fb0a4]")} strokeWidth={2} />
                                            <span className="flex-1 truncate">{item.label}</span>
                                            {badge > 0 && <span className="min-w-[20px] rounded-md bg-[#e8a33a] px-1.5 text-center text-[10.5px] font-bold leading-[18px] text-[#2b1d03]">{badge}</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>
            </div>
            <div className="shrink-0 border-t border-[#24564a] px-3 py-3">
                <div className="flex h-10 w-full items-center gap-3 rounded-[10px] px-3 text-[13.5px] font-semibold text-[#c7d9d1]"><Rocket className="h-[18px] w-[18px] shrink-0 text-[#8fb0a4]" strokeWidth={2} /><span className="flex-1 truncate">Go-live checklist</span><ChevronRight className="h-4 w-4 shrink-0 text-[#8fb0a4]" /></div>
                <div className="flex h-10 items-center gap-3 rounded-[10px] px-3 text-[13.5px] font-semibold text-[#c7d9d1]"><Settings className="h-[18px] w-[18px] text-[#8fb0a4]" strokeWidth={2} />Settings</div>
            </div>
            <div className="flex shrink-0 items-center gap-3 bg-[#0d2c23] px-5 py-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f5f3ee] text-[11px] font-bold text-[#123a2f]">{user.initials}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold text-white">{user.name}</span><span className="block truncate text-[11px] text-[#8fb0a4]">{user.email}</span></span>
                <span className="rounded-lg p-1.5 text-[#8fb0a4]"><LogOut className="h-4 w-4" /></span>
                <span className="rounded-lg p-1.5 text-[#8fb0a4]"><ChevronLeft className="h-4 w-4" /></span>
            </div>
        </aside>
    );
});

const TopBar = memo(function TopBar({ initials }: { initials: string }) {
    return (
        <header className="absolute inset-x-0 top-0 z-10 flex h-16 items-center justify-between gap-4 border-b border-[#ebe8e0] bg-white/95 px-4 sm:px-6 lg:left-[256px] lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[#ebe8e0] bg-white text-[#55544d] lg:hidden"><Menu className="h-4 w-4" /></span>
                <ol className="flex min-w-0 items-center gap-1.5 text-[14px]">
                    <li className="min-w-0 truncate text-[#74736b]">Payouts</li>
                    <li className="text-[#c4c2b9]">/</li>
                    <li className="min-w-0 truncate font-semibold text-[#1b1c19]">PR-1003 · October contractors</li>
                </ol>
            </div>
            <div className="flex shrink-0 items-center gap-2">
                <span className="flex h-9 items-center gap-2 rounded-[10px] border border-[#ebe8e0] bg-[#faf9f6] px-2.5 text-xs text-[#8a897f] md:w-60 md:px-3"><Search className="h-3.5 w-3.5" /><span className="hidden flex-1 text-left md:inline">Search or jump to…</span><kbd className="hidden rounded-md border border-[#ebe8e0] bg-white px-1.5 py-0.5 font-mono text-[10px] text-[#8a897f] md:inline">Ctrl K</kbd></span>
                <span className="hidden h-9 items-center gap-2 rounded-full border border-[#f0dcb0] bg-[#fdf6e7] px-3 text-[#8a5a0b] sm:flex"><FlaskConical className="h-3.5 w-3.5" /><span className="text-xs font-semibold">Sandbox</span></span>
                <span className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[#ebe8e0] bg-white text-[#74736b]"><Bell className="h-4 w-4" /><span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#e8a33a] ring-2 ring-white" /></span>
                <span className="mx-1 hidden h-6 w-px bg-[#ebe8e0] sm:block" />
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#123a2f] text-[11px] font-semibold text-white">{initials}</span>
            </div>
        </header>
    );
});

const GRACE = { initials: "GW", name: "Grace Wambui", email: "grace.wambui@acme.example" };
const DAVID = { initials: "DO", name: "David Ouma", email: "david.ouma@acme.example" };

/* The demo ------------------------------------------------------------------------------- */

interface Size { width: number; height: number; scale: number; wide: boolean }

export function ProductDemo() {
    const ref = useRef<HTMLDivElement>(null);
    const frame = useRef<HTMLDivElement>(null);
    const app = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { amount: 0.3 });
    const reduceMotion = useReducedMotion();
    const [size, setSize] = useState<Size>({ width: 1440, height: 900, scale: 0.8, wide: true });
    const [step, setStep] = useState(0);
    const [elapsed, setElapsed] = useState(0);
    const [paused, setPaused] = useState(false);
    const [pageHidden, setPageHidden] = useState(false);
    const playing = inView && !paused && !pageHidden && !reduceMotion;

    // Desktop shows the app at a real laptop width, scaled to fit; smaller screens get the app's own responsive layout.
    useLayoutEffect(() => {
        const measure = () => {
            const box = frame.current;
            const available = box?.clientWidth ?? 0;
            if (available <= 0) return;
            const viewport = window.innerWidth;
            const wide = viewport >= 1024;
            const width = wide ? (viewport >= 1200 ? 1440 : 1280) : available;
            const height = wide ? Math.round(width * 0.625) : viewport >= 768 ? 780 : 740;
            setSize((current) => (current.width === width && current.height === height && current.wide === wide && Math.abs(current.scale - available / width) < 0.001 ? current : { width, height, scale: available / width, wide }));
        };
        measure();
        const observer = new ResizeObserver(measure);
        if (frame.current) observer.observe(frame.current);
        window.addEventListener("resize", measure);
        return () => { observer.disconnect(); window.removeEventListener("resize", measure); };
    }, []);

    // The replica is a picture: keep its buttons out of the tab order and away from assistive tech.
    useEffect(() => { app.current?.setAttribute("inert", ""); }, []);

    useEffect(() => {
        const update = () => setPageHidden(document.hidden);
        document.addEventListener("visibilitychange", update);
        return () => document.removeEventListener("visibilitychange", update);
    }, []);

    useEffect(() => {
        if (!playing) return;
        const timer = window.setInterval(() => setElapsed((value) => value + TICK), TICK);
        return () => window.clearInterval(timer);
    }, [playing]);

    useEffect(() => {
        if (elapsed < SCENES[step].duration) return;
        setStep((current) => (current + 1) % SCENES.length);
        setElapsed(0);
    }, [elapsed, step]);

    // With reduced motion there is no autoplay: each step shows its finished state.
    const t = reduceMotion ? Number.POSITIVE_INFINITY : elapsed;
    const scene = SCENES[step];
    const Scene = SCENE_COMPONENTS[step];
    const approver = step === 2;
    const approvals = step === 2 && t < APR.closed ? 1 : 0;

    return (
        <MotionConfig reducedMotion="user">
            <div ref={ref} className="pd">
                <div className="pd-window">
                    <div className="pd-browser">
                        <div className="pd-browser__dots" aria-hidden="true"><span /><span /><span /></div>
                        <div className="pd-browser__url"><Lock size={11} className="shrink-0" /><span>zapzive.vercel.app/dashboard/payouts/runs/PR-1003</span></div>
                        <div className="pd-browser__end">
                            <span className="pd-browser__tag">Sandbox example</span>
                            {!reduceMotion && (
                                <button type="button" className="pd-browser__play" onClick={() => setPaused((value) => !value)} aria-label={paused ? "Play the walkthrough" : "Pause the walkthrough"}>
                                    {paused ? <Play size={12} /> : <Pause size={12} />}
                                </button>
                            )}
                        </div>
                    </div>
                    <div ref={frame} className="pd-frame" role="img" aria-label={`Sandbox walkthrough of a payout run in Zapzive, step ${step + 1} of ${SCENES.length}: ${scene.label}. ${scene.caption}`} style={{ height: Math.round(size.height * size.scale) }}>
                        <div ref={app} className="pd-app" aria-hidden="true" style={{ width: size.width, height: size.height, transform: `scale(${size.scale})` }}>
                            <Sidebar approvals={approvals} user={approver ? DAVID : GRACE} />
                            <TopBar initials={approver ? DAVID.initials : GRACE.initials} />
                            {/* Scenes are absolutely positioned, so they crossfade without a blank frame. */}
                            <AnimatePresence initial={false}>
                                <motion.div key={step} className="pd-scene" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.45, ease: EASE }}>
                                    <Scene t={t} wide={size.wide} />
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </MotionConfig>
    );
}
