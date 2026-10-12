import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, CalendarClock, Check, CheckSquare, ClipboardList, FlaskConical, Loader2, Plus, Scale, Send, UserPlus, Wallet, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageIntro from "@/components/dashboard/PageIntro";
import { EmptyState, ErrorNotice, LoadingRows, Panel, SampleTag, StateBadge, Timeline } from "@/components/ops";
import { useAuth } from "@/contexts/AuthContext";
import { useHome, usePayoutAction, useSampleStatus } from "@/hooks/use-payouts";
import { payoutsApi, type HomeData, type RunSummary } from "@/lib/payouts-api";
import { money, moneyList } from "@/lib/payout-format";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

const ATTENTION_ICONS: Record<string, { icon: LucideIcon; tone: string }> = {
    approval: { icon: CheckSquare, tone: "bg-[#fdf4e3] text-[#8a5a0b]" },
    failed: { icon: AlertTriangle, tone: "bg-[#fbecea] text-[#b2392f]" },
    details_changed: { icon: UserPlus, tone: "bg-[#fdf4e3] text-[#8a5a0b]" },
    correction: { icon: ClipboardList, tone: "bg-[#fbecea] text-[#b2392f]" },
    funding: { icon: Wallet, tone: "bg-[#fbecea] text-[#b2392f]" },
    reconcile: { icon: Scale, tone: "bg-[#eaf1fb] text-[#1f5fa8]" },
};

function greeting(name?: string) {
    const hour = new Date().getHours();
    const part = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    const first = name?.split(/\s+/)[0];
    return first ? `${part}, ${first}` : part;
}

function longDate(value: string | null) {
    if (!value) return "No date set";
    return new Date(value).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

function NeedsAttention({ items }: { items: HomeData["attention"] }) {
    if (!items.length) {
        return (
            <Panel title="Needs attention" id="attention-title">
                <div className="flex items-center gap-3 p-5 text-sm text-[#55544d]">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e7f3ed] text-primary"><Check className="h-4 w-4" /></span>
                    Nothing is waiting on you. Approvals, failed payouts and detail changes will appear here.
                </div>
            </Panel>
        );
    }
    return (
        <Panel title="Needs attention" subtitle="Resolve these before the next payout run" id="attention-title">
            <ul className="divide-y divide-[#ece9e1]">
                {items.map((item) => {
                    const meta = ATTENTION_ICONS[item.kind] ?? ATTENTION_ICONS.approval;
                    return (
                        <li key={item.kind} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                            <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", meta.tone)}><meta.icon className="h-[18px] w-[18px]" /></span>
                            <div className="min-w-0 flex-1">
                                <p className="text-[14px] font-semibold text-[#1b1c19]">{item.title}</p>
                                <p className="mt-0.5 text-[13px] text-[#74736b]">{item.detail}{item.since ? <span className="text-[#9a998f]"> · waiting {formatRelative(item.since).replace(" ago", "")}</span> : null}</p>
                            </div>
                            <Button asChild size="sm" variant={item.kind === "approval" || item.kind === "failed" ? "default" : "outline"} className="self-start sm:self-auto">
                                <Link to={item.href}>{item.action} <ArrowRight className="h-3.5 w-3.5" /></Link>
                            </Button>
                        </li>
                    );
                })}
            </ul>
        </Panel>
    );
}

function NextRun({ run, funding }: { run: RunSummary | null; funding: HomeData["funding"] }) {
    const navigate = useNavigate();
    if (!run) {
        return (
            <Panel title="Next payout run" id="next-run-title">
                <EmptyState icon={CalendarClock} title="No upcoming payout run" action={<Button size="sm" onClick={() => navigate("/dashboard/payouts/new")}><Plus className="h-3.5 w-3.5" /> Create payout run</Button>}>
                    Prepare the next run early so recipients, approvals and funding are ready on payday.
                </EmptyState>
            </Panel>
        );
    }
    const short = funding.shortfallMinor > 0;
    return (
        <Panel title="Next payout run" id="next-run-title" actions={run.isSample ? <SampleTag /> : undefined}>
            <div className="space-y-4 p-5">
                <div>
                    <p className="text-[17px] font-bold tracking-[-0.02em] text-[#1b1c19]">{run.name}</p>
                    <p className="mt-0.5 text-[13px] text-[#74736b]">{longDate(run.scheduledFor)} · {run.reference}</p>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-[13px]">
                    <div><dt className="text-[#8a897f]">Recipients</dt><dd className="mt-0.5 font-semibold text-[#1b1c19]">{run.recipientCount}</dd></div>
                    <div><dt className="text-[#8a897f]">State</dt><dd className="mt-0.5"><StateBadge kind="run" state={run.status} /></dd></div>
                    <div className="col-span-2"><dt className="text-[#8a897f]">Total</dt><dd className="mt-0.5 font-semibold tabular-nums text-[#1b1c19]">{moneyList(run.totals)}</dd></div>
                    <div className="col-span-2"><dt className="text-[#8a897f]">Funding</dt><dd className={cn("mt-0.5 font-medium", short ? "text-[#9a2f2f]" : "text-[#0b6b4f]")}>{short ? `Short by ${money(funding.shortfallMinor, funding.currency)}` : `${money(run.fundingRequiredMinor, run.fundingCurrency)} needed · covered`}</dd></div>
                </dl>
                <Button className="w-full" variant="outline" onClick={() => navigate(`/dashboard/payouts/runs/${run.id}`)}>Open payout run <ArrowRight className="h-4 w-4" /></Button>
            </div>
        </Panel>
    );
}

function MoneyInMotion({ runs }: { runs: RunSummary[] }) {
    return (
        <Panel title="Money in motion" subtitle="Runs being delivered or recently finished" id="motion-title">
            {runs.length === 0 ? (
                <p className="p-5 text-[13px] text-[#74736b]">Nothing is with the provider right now. Sent runs show their delivery progress here.</p>
            ) : (
                <ul className="divide-y divide-[#ece9e1]">
                    {runs.map((run) => {
                        const r = run.reconciliation;
                        const pct = (n: number) => (r.requested ? (n / r.requested) * 100 : 0);
                        return (
                            <li key={run.id}>
                                <Link to={`/dashboard/payouts/runs/${run.id}`} className="block px-5 py-4 transition-colors hover:bg-[#faf9f6]">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-[14px] font-semibold text-[#1b1c19]">{run.name} <span className="font-normal text-[#8a897f]">{run.reference}</span></p>
                                        <StateBadge kind="run" state={run.status} />
                                    </div>
                                    <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-[#efede6]" role="img" aria-label={`${r.delivered} delivered, ${r.processing} processing, ${r.failed + r.onHold} need attention of ${r.requested}`}>
                                        <span className="bg-[#11a879]" style={{ width: `${pct(r.delivered)}%` }} />
                                        <span className="bg-[#3b82d6]" style={{ width: `${pct(r.processing)}%` }} />
                                        <span className="bg-[#cf4b3f]" style={{ width: `${pct(r.failed + r.onHold)}%` }} />
                                    </div>
                                    <p className="mt-2 text-[13px] text-[#55544d]">
                                        <span className="font-semibold text-[#1b1c19]">{r.delivered} / {r.requested} delivered</span>
                                        {r.processing ? ` · ${r.processing} processing` : ""}{r.failed ? ` · ${r.failed} failed` : ""}{r.onHold ? ` · ${r.onHold} on hold` : ""}
                                        {r.deliveredTotals.length ? <span className="text-[#74736b]"> · {moneyList(r.deliveredTotals, { compact: true })} delivered</span> : null}
                                    </p>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </Panel>
    );
}

function FundingCard({ funding }: { funding: HomeData["funding"] }) {
    return (
        <Panel title={funding.isSandbox ? "Sandbox funding" : "Funding"} id="funding-title" actions={<Link to="/dashboard/funding" className="text-xs font-semibold text-primary hover:underline">View funding</Link>}>
            <dl className="divide-y divide-[#ece9e1] text-[13px]">
                <div className="flex items-center justify-between px-5 py-3"><dt className="text-[#74736b]">Available</dt><dd className="font-semibold tabular-nums text-[#1b1c19]">{money(funding.availableMinor, funding.currency)}</dd></div>
                <div className="flex items-center justify-between px-5 py-3"><dt className="text-[#74736b]">Reserved for payouts in flight</dt><dd className="font-semibold tabular-nums text-[#1b1c19]">{money(funding.reservedMinor, funding.currency)}</dd></div>
                <div className="flex items-center justify-between px-5 py-3"><dt className="text-[#74736b]">Required for upcoming runs</dt><dd className="font-semibold tabular-nums text-[#1b1c19]">{money(funding.requiredForUpcomingMinor, funding.currency)}</dd></div>
            </dl>
            {funding.shortfallMinor > 0 && (
                <p className="mx-5 mb-5 rounded-xl bg-[#fbecea] px-3.5 py-2.5 text-[13px] font-medium text-[#9a2f2f]" role="alert">
                    You need {money(funding.shortfallMinor, funding.currency)} more before the upcoming runs can be sent.
                </p>
            )}
        </Panel>
    );
}

function Welcome({ data }: { data: HomeData }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const sample = useSampleStatus();
    const load = usePayoutAction(() => payoutsApi.loadSample(), { success: "Sample payout scenario loaded" });
    const canLoad = ["owner", "admin"].includes(user?.role ?? "");
    return (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <Panel title="Welcome to Zapzive" subtitle="Run your first sandbox payout in about ten minutes" id="welcome-title">
                <ol className="divide-y divide-[#ece9e1]">
                    {data.onboarding.steps.map((step, index) => (
                        <li key={step.key}>
                            <Link to={step.href} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[#faf9f6]">
                                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold", step.done ? "bg-primary text-[#ffffff]" : "border border-[#d6d3c9] bg-white text-[#74736b]")}>{step.done ? <Check className="h-4 w-4" strokeWidth={3} /> : index + 1}</span>
                                <span className={cn("flex-1 text-[14px] font-medium", step.done ? "text-[#8a897f] line-through decoration-[#c4c2b9]" : "text-[#1b1c19]")}>{step.label}</span>
                                {!step.done && <ArrowRight className="h-4 w-4 text-[#9a998f]" />}
                            </Link>
                        </li>
                    ))}
                </ol>
            </Panel>
            <Panel title="Explore with sample data" id="sample-title">
                <div className="space-y-3 p-5 text-[13px] leading-6 text-[#55544d]">
                    <p>Load a realistic sandbox scenario: a Nairobi company paying 12 contractors across Kenya, Uganda, Nigeria and the US by M-Pesa, bank, mobile money and USDC.</p>
                    <p className="text-[#74736b]">It includes a run awaiting approval, a recipient who changed bank details, and a failed payout to resolve. Everything is marked “Sample” and can be removed.</p>
                    {sample.data?.loaded ? <p className="font-medium text-primary">Sample scenario loaded.</p> : canLoad ? (
                        <Button className="w-full" onClick={() => load.mutate(undefined)} disabled={load.isPending}>{load.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />} Load sample scenario</Button>
                    ) : <p className="text-[#8a897f]">Ask a workspace owner to load the sample scenario.</p>}
                    <Button variant="outline" className="w-full" onClick={() => navigate("/dashboard/recipients?new=1")}><UserPlus className="h-4 w-4" /> Start with your own recipients</Button>
                </div>
            </Panel>
        </div>
    );
}

export default function Home() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const home = useHome();
    const data = home.data;
    const count = data?.attention.length ?? 0;

    return (
        <div className="space-y-6">
            <PageIntro
                title={greeting(user?.name)}
                description={!data ? "Loading your operations…" : data.onboarding.isNew ? "Set up recipients and your first payout run." : count ? `${count} item${count === 1 ? " needs" : "s need"} your attention before the next payout run.` : "Nothing needs your attention right now."}
                actions={<>
                    <Button variant="outline" onClick={() => navigate("/dashboard/recipients?new=1")}><UserPlus className="h-4 w-4" /> Add recipient</Button>
                    <Button onClick={() => navigate("/dashboard/payouts/new")}><Plus className="h-4 w-4" /> Create payout run</Button>
                </>}
            />

            {home.isPending ? <div className="premium-card"><LoadingRows rows={5} /></div> : home.isError || !data ? <div className="premium-card"><ErrorNotice error={home.error} onRetry={() => void home.refetch()} /></div> : data.onboarding.isNew ? <Welcome data={data} /> : (
                <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="min-w-0 space-y-5">
                        <NeedsAttention items={data.attention} />
                        <MoneyInMotion runs={data.moneyInMotion} />
                        <Panel title="Recent activity" id="activity-title" actions={<Link to="/dashboard/activity" className="text-xs font-semibold text-primary hover:underline">View all</Link>}>
                            <Timeline events={data.recentActivity} />
                        </Panel>
                    </div>
                    <div className="min-w-0 space-y-5">
                        <NextRun run={data.nextRun} funding={data.funding} />
                        <FundingCard funding={data.funding} />
                        {data.onboarding.steps.some((step) => !step.done) && (
                            <Panel title="Setup checklist" id="setup-title">
                                <ul className="space-y-2.5 p-5 text-[13px]">
                                    {data.onboarding.steps.map((step) => (
                                        <li key={step.key} className="flex items-center gap-2.5">
                                            <span className={cn("flex h-5 w-5 items-center justify-center rounded-full", step.done ? "bg-primary text-[#ffffff]" : "border border-[#d6d3c9]")}>{step.done && <Check className="h-3 w-3" strokeWidth={3} />}</span>
                                            {step.done ? <span className="text-[#8a897f]">{step.label}</span> : <Link to={step.href} className="font-medium text-[#1b1c19] hover:text-primary">{step.label}</Link>}
                                        </li>
                                    ))}
                                </ul>
                            </Panel>
                        )}
                        <p className="flex items-center gap-2 px-1 text-xs text-[#8a897f]"><Send className="h-3.5 w-3.5" /> Payouts execute through the sandbox provider. No live funds move.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
