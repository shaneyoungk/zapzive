import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { AlertTriangle, Check, CheckCircle2, Download, FileUp, Info, Loader2, Pencil, Plus, Search, Send, Trash2, UserPlus, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageIntro from "@/components/dashboard/PageIntro";
import { ConfirmAction, EmptyState, ErrorNotice, LoadingRows, MethodTag, Panel, SampleTag, StateBadge, Timeline, ToneBadge, downloadBlob } from "@/components/ops";
import RecipientForm from "@/components/ops/RecipientForm";
import { useAuth } from "@/contexts/AuthContext";
import { usePageHeader } from "@/contexts/PageHeaderContext";
import { usePayoutAction, useRecipients, useRun } from "@/hooks/use-payouts";
import { IMPORT_FIELDS, guessMapping, parseCsv, readCsvFile, type ImportField } from "@/lib/csv";
import { payoutsApi, type Movement, type RunDetail } from "@/lib/payouts-api";
import { METHOD_LABELS, minorToDecimal, money, moneyList } from "@/lib/payout-format";
import { formatDate, formatDateTime, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

const PREPARING = ["draft", "needs_correction", "ready", "rejected"];
const PREPARE_ROLES = ["owner", "admin", "operator", "treasury"];
const APPROVE_ROLES = ["owner", "admin", "approver"];

// ---------------------------------------------------------------- add payouts

function AddFromRecipients({ run, onDone }: { run: RunDetail; onDone: () => void }) {
    const recipients = useRecipients({ status: "active" });
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState<Record<string, { amount: string; reference: string }>>({});
    const [adding, setAdding] = useState(false);
    const inRun = new Set(run.movements.filter((item) => item.state !== "cancelled").map((item) => item.recipientId));
    const add = usePayoutAction((items: Array<{ recipientId: string; amount: string; externalReference?: string }>) => payoutsApi.addItems(run.id, items), { success: (_, ) => "Payouts added and validated" });
    const list = (recipients.data ?? []).filter((item) => !query.trim() || item.name.toLowerCase().includes(query.trim().toLowerCase()));
    const chosen = Object.entries(selected);
    const recipientById = new Map((recipients.data ?? []).map((item) => [item.id, item]));
    const amountProblem = (recipientId: string, amount: string): string | null => {
        const text = amount.replace(/[,\s]/g, "");
        if (!text) return "Enter an amount";
        if (!/^\d+(\.\d+)?$/.test(text) || Number(text) <= 0) return "Enter a positive number";
        const currency = recipientById.get(recipientId)?.payoutCurrency ?? "";
        const decimals = ["UGX", "RWF"].includes(currency) ? 0 : 2;
        if ((text.split(".")[1] ?? "").length > decimals) return decimals ? `${currency} allows 2 decimals` : `${currency} has no decimals`;
        return null;
    };
    const ready = chosen.length > 0 && chosen.every(([id, value]) => !amountProblem(id, value.amount));

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ece9e1] px-5 py-3">
                <div className="relative w-full sm:w-72">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a998f]" aria-hidden="true" />
                    <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search recipients" aria-label="Search recipients" className="h-10 pl-9" />
                </div>
                <Button variant="outline" size="sm" onClick={() => setAdding(true)}><UserPlus className="h-3.5 w-3.5" /> New recipient</Button>
            </div>
            {recipients.isPending ? <LoadingRows rows={3} /> : list.length === 0 ? <EmptyState icon={UserPlus} title="No recipients yet" action={<Button size="sm" onClick={() => setAdding(true)}><Plus className="h-3.5 w-3.5" /> Add recipient</Button>}>Add a recipient or import a CSV.</EmptyState> : (
                <ul className="max-h-[420px] divide-y divide-[#ece9e1] overflow-y-auto">
                    {list.map((item) => {
                        const value = selected[item.id];
                        const disabled = !item.payoutMethod;
                        return (
                            <li key={item.id} className={cn("flex flex-wrap items-center gap-3 px-5 py-3", value && "bg-[#faf9f6]")}>
                                <Checkbox id={`pick-${item.id}`} checked={Boolean(value)} disabled={disabled} onCheckedChange={(checked) => setSelected((previous) => { const next = { ...previous }; if (checked) next[item.id] = { amount: item.lastPayout ? minorToDecimal(item.lastPayout.amountMinor, item.lastPayout.currency) : "", reference: "" }; else delete next[item.id]; return next; })} aria-label={`Select ${item.name}`} />
                                <label htmlFor={`pick-${item.id}`} className="min-w-[160px] flex-1 cursor-pointer">
                                    <span className="block text-[14px] font-semibold text-[#1b1c19]">{item.name} {inRun.has(item.id) && <span className="ml-1 text-xs font-normal text-[#8a5a0b]">already in this run</span>}</span>
                                    <span className="block text-xs text-[#8a897f]">{disabled ? "No payout method — add details first" : `${item.payoutMethodLabel} · ${item.payoutCurrency}${item.lastPayout ? ` · last ${money(item.lastPayout.amountMinor, item.lastPayout.currency)}` : ""}`}</span>
                                </label>
                                {value && (
                                    <div className="flex w-full gap-2 sm:w-auto">
                                        <div className="relative w-full sm:w-40"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#8a897f]">{item.payoutCurrency}</span><Input aria-label={`Amount for ${item.name}`} inputMode="decimal" className="h-10 pl-12 text-right tabular-nums" value={value.amount} onChange={(event) => setSelected((previous) => ({ ...previous, [item.id]: { ...previous[item.id], amount: event.target.value } }))} placeholder="0.00" /></div>
                                        {amountProblem(item.id, value.amount) && value.amount && <span role="alert" className="self-center text-xs text-[#9a2f2f]">{amountProblem(item.id, value.amount)}</span>}
                                        <Input aria-label={`Reference for ${item.name}`} className="h-10 w-full sm:w-36" value={value.reference} onChange={(event) => setSelected((previous) => ({ ...previous, [item.id]: { ...previous[item.id], reference: event.target.value } }))} placeholder="Invoice / ref" />
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ece9e1] px-5 py-3">
                <p className="text-xs text-[#74736b]">{chosen.length ? `${chosen.length} selected · amounts are in each recipient's currency` : "Select recipients and enter amounts"}</p>
                <Button size="sm" disabled={!ready || add.isPending} onClick={async () => { await add.mutateAsync(chosen.map(([recipientId, value]) => ({ recipientId, amount: value.amount.replace(/,/g, ""), externalReference: value.reference || undefined }))); setSelected({}); onDone(); }}>{add.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Add {chosen.length || ""} payout{chosen.length === 1 ? "" : "s"}</Button>
            </div>
            <RecipientForm open={adding} onOpenChange={setAdding} />
        </div>
    );
}

const MAPPING_KEY = "zapzive:csvMapping";

function ImportCsv({ run, onDone }: { run: RunDetail; onDone: () => void }) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [rows, setRows] = useState<string[][]>([]);
    const [mapping, setMapping] = useState<Record<ImportField, number | null>>({ name: null, email: null, amount: null, currency: null, reference: null });
    const [error, setError] = useState<string | null>(null);
    const importRows = usePayoutAction((payload: Array<Record<string, string | undefined>>) => payoutsApi.importItems(run.id, payload), { success: (result) => `${result.rows} rows imported · ${result.matched} matched${result.unknown ? ` · ${result.unknown} unknown` : ""}${result.ambiguous ? ` · ${result.ambiguous} ambiguous` : ""}${result.invalidAmounts ? ` · ${result.invalidAmounts} invalid amounts` : ""}` });
    const headers = rows[0] ?? [];
    const body = rows.slice(1);

    const readFile = async (file: File) => {
        setError(null);
        if (file.size > 2_000_000) { setError("The file is larger than 2 MB. Split it into smaller runs."); return; }
        let parsed: string[][];
        try { parsed = parseCsv(await readCsvFile(file)); } catch { setError("The file could not be read. Save it as CSV (comma or semicolon separated) and try again."); return; }
        if (parsed.length < 2) { setError("The file needs a header row and at least one payout row."); return; }
        if (parsed.length > 1001) { setError("Import at most 1,000 rows at a time."); return; }
        setFileName(file.name);
        setRows(parsed);
        let saved: Record<string, number | null> | null = null;
        try { saved = JSON.parse(localStorage.getItem(MAPPING_KEY) ?? "null"); } catch { saved = null; }
        const guessed = guessMapping(parsed[0]);
        setMapping(saved && Object.values(saved).every((index) => index === null || (typeof index === "number" && index < parsed[0].length)) ? { ...guessed, ...saved } as Record<ImportField, number | null> : guessed);
    };

    const valid = mapping.amount !== null && (mapping.name !== null || mapping.email !== null);
    const runImport = async () => {
        const payload = body.map((row) => Object.fromEntries(IMPORT_FIELDS.map((field) => [field.key, mapping[field.key] === null ? undefined : row[mapping[field.key]!]])));
        try { localStorage.setItem(MAPPING_KEY, JSON.stringify(mapping)); } catch { /* storage unavailable */ }
        await importRows.mutateAsync(payload);
        setRows([]); setFileName(null);
        onDone();
    };

    return (
        <div className="space-y-4 p-5">
            {!rows.length ? (
                <div className="rounded-xl border border-dashed border-[#d6d3c9] bg-[#faf9f6] p-6 text-center">
                    <FileUp className="mx-auto h-6 w-6 text-[#74736b]" />
                    <p className="mt-2 text-sm font-semibold text-[#1b1c19]">Upload a CSV of payouts</p>
                    <p className="mx-auto mt-1 max-w-md text-[13px] leading-6 text-[#74736b]">One row per payout. Include a recipient name or email and an amount; currency and reference are optional. Rows are matched to your recipients, and anything unknown is flagged for you to fix.</p>
                    <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" id="csv-file" onChange={(event) => { const file = event.target.files?.[0]; if (file) void readFile(file); event.target.value = ""; }} />
                    <Button className="mt-4" variant="outline" onClick={() => fileRef.current?.click()}><FileUp className="h-4 w-4" /> Choose CSV file</Button>
                    <p className="mt-3 text-xs text-[#9a998f]">Example header: <span className="font-mono">name,email,amount,currency,reference</span></p>
                </div>
            ) : (
                <>
                    <p className="text-[13px] text-[#55544d]"><span className="font-semibold text-[#1b1c19]">{fileName}</span> · {body.length} row{body.length === 1 ? "" : "s"} detected. Map the columns, check the preview, then import.</p>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        {IMPORT_FIELDS.map((field) => (
                            <div key={field.key} className="space-y-1.5">
                                <Label htmlFor={`map-${field.key}`} className="text-xs">{field.label}{field.key === "amount" ? " *" : ""}</Label>
                                <Select value={mapping[field.key] === null ? "none" : String(mapping[field.key])} onValueChange={(value) => { if (!value) return; setMapping((previous) => ({ ...previous, [field.key]: value === "none" ? null : Number(value) })); }}>
                                    <SelectTrigger id={`map-${field.key}`} className="h-10"><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="none">Not in file</SelectItem>{headers.map((header, index) => <SelectItem key={index} value={String(index)}>{header || `Column ${index + 1}`}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        ))}
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-[#ece9e1]">
                        <table className="min-w-[520px] text-sm">
                            <caption className="sr-only">Import preview (first five rows)</caption>
                            <thead><tr>{IMPORT_FIELDS.map((field) => <th key={field.key} scope="col" className="px-3 text-left">{field.label}</th>)}</tr></thead>
                            <tbody className="divide-y divide-[#ece9e1]">
                                {body.slice(0, 5).map((row, index) => <tr key={index}>{IMPORT_FIELDS.map((field) => <td key={field.key} className="px-3 py-2 text-[13px]">{mapping[field.key] === null ? <span className="text-[#c4c2b9]">—</span> : row[mapping[field.key]!] || <span className="text-[#c4c2b9]">empty</span>}</td>)}</tr>)}
                            </tbody>
                        </table>
                    </div>
                    {!valid && <p className="text-[13px] text-[#9a2f2f]">Map an amount column and either a name or email column.</p>}
                    <div className="flex flex-wrap justify-end gap-2">
                        <Button variant="outline" onClick={() => { setRows([]); setFileName(null); }}>Choose another file</Button>
                        <Button disabled={!valid || importRows.isPending} onClick={() => void runImport()}>{importRows.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Import {body.length} row{body.length === 1 ? "" : "s"}</Button>
                    </div>
                </>
            )}
            {error && <p role="alert" className="text-[13px] text-[#9a2f2f]">{error}</p>}
        </div>
    );
}

// ---------------------------------------------------------------- lines

function EditLine({ run, line, open, onOpenChange }: { run: RunDetail; line: Movement | null; open: boolean; onOpenChange: (open: boolean) => void }) {
    const [amount, setAmount] = useState("");
    const [reference, setReference] = useState("");
    const [recipientId, setRecipientId] = useState("");
    const recipients = useRecipients({ status: "active" });
    useEffect(() => { if (line) { setAmount(line.amountMinor ? minorToDecimal(line.amountMinor, line.currency) : ""); setReference(line.externalReference ?? ""); setRecipientId(line.recipientId ?? ""); } }, [line]);
    const save = usePayoutAction(() => payoutsApi.updateItem(run.id, line!.id, { amount: amount.replace(/,/g, ""), externalReference: reference || null, ...(recipientId && recipientId !== line?.recipientId ? { recipientId } : {}) }), { success: "Payout updated and re-validated" });
    if (!line) return null;
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md rounded-2xl border-[#e3e0d7] bg-[#fffefa]">
                <DialogHeader><DialogTitle>Edit payout</DialogTitle><DialogDescription>{line.recipientId ? line.recipientName : `“${line.recipientName}” did not match a recipient. Choose the right one.`}</DialogDescription></DialogHeader>
                <div className="space-y-4">
                    {!line.recipientId && (
                        <div className="space-y-1.5"><Label htmlFor="line-recipient">Recipient</Label>
                            <Select value={recipientId} onValueChange={(value) => value && setRecipientId(value)}><SelectTrigger id="line-recipient"><SelectValue placeholder="Choose a recipient" /></SelectTrigger><SelectContent>{(recipients.data ?? []).map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select>
                        </div>
                    )}
                    <div className="space-y-1.5"><Label htmlFor="line-amount">Amount ({line.currency})</Label><Input id="line-amount" className="h-11 tabular-nums" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></div>
                    <div className="space-y-1.5"><Label htmlFor="line-ref">Reference <span className="font-normal text-[#8a897f]">(optional)</span></Label><Input id="line-ref" className="h-11" value={reference} onChange={(event) => setReference(event.target.value)} maxLength={80} /></div>
                </div>
                <DialogFooter className="gap-2"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={save.isPending || !amount} onClick={async () => { await save.mutateAsync(undefined); onOpenChange(false); }}>{save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function IssueList({ line, run, editable }: { line: Movement; run: RunDetail; editable: boolean }) {
    const acknowledge = usePayoutAction((codes: string[]) => payoutsApi.acknowledge(run.id, line.id, codes), { success: "Warning reviewed" });
    const issues = line.issues.filter((issue) => issue.severity !== "info");
    const pendingWarnings = issues.filter((issue) => issue.severity === "warning" && !line.acknowledgedIssues.includes(issue.code));
    if (!issues.length) return null;
    return (
        <ul className="mt-2 space-y-1.5">
            {issues.map((issue) => {
                const acked = line.acknowledgedIssues.includes(issue.code);
                return (
                    <li key={issue.code + issue.message} className={cn("flex items-start gap-1.5 text-xs leading-5", issue.severity === "error" ? "text-[#9a2f2f]" : acked ? "text-[#8a897f]" : "text-[#8a5a0b]")}>
                        {issue.severity === "error" ? <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : acked ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                        <span>{issue.message}{acked ? " Reviewed." : ""}</span>
                    </li>
                );
            })}
            {editable && pendingWarnings.length > 0 && <li><Button size="sm" variant="outline" className="h-7 rounded-lg px-2.5 text-xs" disabled={acknowledge.isPending} onClick={() => acknowledge.mutate(pendingWarnings.map((issue) => issue.code))}>Mark as reviewed</Button></li>}
        </ul>
    );
}

function LinesTable({ run, editable }: { run: RunDetail; editable: boolean }) {
    const [editing, setEditing] = useState<Movement | null>(null);
    const [filter, setFilter] = useState<"all" | "problems">("all");
    const remove = usePayoutAction((id: string) => payoutsApi.removeItem(run.id, id), { success: "Payout removed" });
    const lines = run.movements.filter((item) => item.state !== "cancelled");
    const problems = (line: Movement) => line.issues.some((issue) => issue.severity === "error" || (issue.severity === "warning" && !line.acknowledgedIssues.includes(issue.code))) || ["failed", "on_hold"].includes(line.state);
    const shown = filter === "problems" ? lines.filter(problems) : lines;
    const problemCount = lines.filter(problems).length;
    if (!lines.length) return <EmptyState icon={Send} title="No payouts in this run yet">Add recipients or import a CSV above.</EmptyState>;
    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ece9e1] px-5 py-3">
                <div className="dash-seg" role="group" aria-label="Filter payouts">
                    <button aria-pressed={filter === "all"} onClick={() => setFilter("all")}>All {lines.length}</button>
                    <button aria-pressed={filter === "problems"} onClick={() => setFilter("problems")}>Needs attention {problemCount}</button>
                </div>
                <p className="text-xs text-[#8a897f]">{editable ? "Amounts are what the recipient receives. Sandbox quotes refresh on every change." : "Funding cost includes provider fees."}</p>
            </div>
            <ul className="divide-y divide-[#ece9e1]">
                {shown.map((line) => (
                    <li key={line.id} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto] md:items-start">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                {line.recipientId ? <Link to={`/dashboard/recipients/${line.recipientId}`} className="font-semibold text-[#1b1c19] hover:text-primary">{line.recipientName}</Link> : <span className="font-semibold text-[#9a2f2f]">{line.recipientName}</span>}
                                {line.issues.some((issue) => issue.code === "new_recipient") && <ToneBadge tone="progress">First payout</ToneBadge>}
                            </div>
                            <p className="mt-0.5 text-xs text-[#8a897f]">{line.externalReference ? `Ref ${line.externalReference} · ` : ""}<Link to={`/dashboard/payouts/movements/${line.id}`} className="font-mono hover:text-primary">{line.reference}</Link></p>
                            <IssueList line={line} run={run} editable={editable} />
                            {(line.failureReason || line.holdReason) && <p className="mt-2 text-xs leading-5 text-[#9a2f2f]">{line.failureReason ?? line.holdReason}</p>}
                        </div>
                        {line.recipientId ? <MethodTag method={line.payoutMethod} label={line.payoutMethodLabel} destination={line.destination} /> : <span className="text-[13px] text-[#9a998f]">Match a recipient to route</span>}
                        <div className="md:text-right">
                            <p className="font-semibold tabular-nums text-[#1b1c19]">{line.amountMinor ? money(line.amountMinor, line.currency) : <span className="text-[#9a2f2f]">No amount</span>}</p>
                            {line.sourceAmountMinor !== null && <p className="text-xs tabular-nums text-[#8a897f]">≈ {money(line.sourceAmountMinor, line.sourceCurrency)} incl. {money(line.feeMinor, line.sourceCurrency)} fee</p>}
                        </div>
                        <div className="flex items-center gap-1 md:justify-end">
                            <StateBadge kind="movement" state={line.state} />
                            {editable && <>
                                <Button variant="ghost" size="sm" className="h-8 w-8 rounded-lg p-0" aria-label={`Edit ${line.recipientName}`} onClick={() => setEditing(line)}><Pencil className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="sm" className="h-8 w-8 rounded-lg p-0 text-[#9a2f2f]" aria-label={`Remove ${line.recipientName}`} disabled={remove.isPending} onClick={() => remove.mutate(line.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </>}
                        </div>
                    </li>
                ))}
            </ul>
            <EditLine run={run} line={editing} open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)} />
        </>
    );
}

// ---------------------------------------------------------------- review, approval, execution, reconciliation

function ReviewSubmit({ run, canPrepare }: { run: RunDetail; canPrepare: boolean }) {
    const submit = usePayoutAction(() => payoutsApi.submit(run.id), { success: run.requiredApprovals ? "Submitted for approval" : "Submitted and approved by policy" });
    const lines = run.movements.filter((item) => item.state !== "cancelled");
    const byMethod = useMemo(() => {
        const map = new Map<string, { count: number; totals: Map<string, number> }>();
        for (const line of lines.filter((item) => item.recipientId && !item.issues.some((issue) => issue.severity === "error"))) {
            const entry = map.get(line.payoutMethod) ?? { count: 0, totals: new Map() };
            entry.count++;
            entry.totals.set(line.currency, (entry.totals.get(line.currency) ?? 0) + line.amountMinor);
            map.set(line.payoutMethod, entry);
        }
        return [...map.entries()];
    }, [lines]);
    const blocked = run.status !== "ready" || run.validation.needsReview > 0;
    const quotedAt = lines.map((line) => line.quotedAt).filter(Boolean).sort().at(-1) ?? null;
    const expiresAt = lines.map((line) => line.quoteExpiresAt).filter(Boolean).sort()[0] ?? null;

    return (
        <Panel title="Review and submit" subtitle="Check routing, cost and approvals before submitting" id="review-title">
            <div className="grid gap-5 p-5 lg:grid-cols-2">
                <div>
                    <p className="text-[13px] font-semibold text-[#1b1c19]">Routing</p>
                    <ul className="mt-2 divide-y divide-[#ece9e1] rounded-xl border border-[#ece9e1]">
                        {byMethod.map(([method, entry]) => (
                            <li key={method} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-[13px]">
                                <span className="text-[#3c3c37]">{METHOD_LABELS[method] ?? method} · {entry.count} payout{entry.count === 1 ? "" : "s"}</span>
                                <span className="font-semibold tabular-nums text-[#1b1c19]">{moneyList([...entry.totals.entries()].map(([currency, amountMinor]) => ({ currency, amountMinor })))}</span>
                            </li>
                        ))}
                    </ul>
                    <p className="mt-2 text-xs text-[#8a897f]">Provider: Zapzive sandbox provider. You never choose networks or rails; routing follows each recipient's payout method.</p>
                </div>
                <div>
                    <p className="flex items-center gap-2 text-[13px] font-semibold text-[#1b1c19]">Cost <ToneBadge tone="neutral">Sandbox quote</ToneBadge></p>
                    <dl className="mt-2 divide-y divide-[#ece9e1] rounded-xl border border-[#ece9e1] text-[13px]">
                        <div className="flex justify-between gap-3 px-3.5 py-2.5"><dt className="text-[#74736b]">Recipients receive</dt><dd className="text-right font-semibold tabular-nums text-[#1b1c19]">{moneyList(run.totals)}</dd></div>
                        <div className="flex justify-between gap-3 px-3.5 py-2.5"><dt className="text-[#74736b]">Provider fees</dt><dd className="font-semibold tabular-nums text-[#1b1c19]">{money(run.feesMinor, run.fundingCurrency)}</dd></div>
                        <div className="flex justify-between gap-3 px-3.5 py-2.5"><dt className="text-[#74736b]">Funding required</dt><dd className="font-semibold tabular-nums text-[#1b1c19]">{money(run.fundingRequiredMinor, run.fundingCurrency)}</dd></div>
                        <div className="flex justify-between gap-3 px-3.5 py-2.5"><dt className="text-[#74736b]">Quoted</dt><dd className="text-right text-[#3c3c37]">{quotedAt ? `${formatDateTime(quotedAt)} · valid until ${new Date(expiresAt!).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "—"}</dd></div>
                    </dl>
                    <p className="mt-2 text-xs text-[#8a897f]">Expired quotes are refreshed automatically when the run is sent.</p>
                </div>
            </div>
            <div className="mx-5 mb-5 flex items-start gap-3 rounded-xl bg-[#edf6f1] p-4 text-[13px] leading-6 text-[#245843]">
                <Info className="mt-1 h-4 w-4 shrink-0" />
                <p><span className="font-semibold">Approval policy.</span> {run.policySummary ?? "Add payouts to evaluate the policy."}</p>
            </div>
            {run.requiredApprovals > run.approverCapacity && (
                <div role="alert" className="mx-5 mb-5 flex items-start gap-3 rounded-xl border border-[#f0dcb0] bg-[#fdf6e7] p-4 text-[13px] leading-6 text-[#7a4f0a]">
                    <AlertTriangle className="mt-1 h-4 w-4 shrink-0" />
                    <p>This run needs {run.requiredApprovals} approvers, but only {run.approverCapacity} {run.approverCapacity === 1 ? "person" : "people"} in this workspace can approve it. It would stay waiting. <Link to="/dashboard/team" className="font-semibold underline">Add an approver in Team</Link>, <Link to="/dashboard/settings?tab=approvals" className="font-semibold underline">adjust the policy</Link>, or split the run.</p>
                </div>
            )}
            <div className="flex flex-col gap-3 border-t border-[#ece9e1] p-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[13px] text-[#55544d]">{run.validation.needsCorrection ? <span className="text-[#9a2f2f]">{run.validation.needsCorrection} payout{run.validation.needsCorrection === 1 ? "" : "s"} must be corrected first.</span> : run.validation.needsReview ? <span className="text-[#8a5a0b]">Review the warnings on {run.validation.needsReview} payout{run.validation.needsReview === 1 ? "" : "s"} before submitting.</span> : `Requested by ${run.createdByName}. Submitting locks the run for approval.`}</p>
                {canPrepare && (
                    <ConfirmAction
                        trigger={<Button disabled={blocked}><Send className="h-4 w-4" /> Submit run</Button>}
                        disabled={blocked}
                        title={`Submit ${run.name}?`}
                        lines={[{ label: "Payouts", value: run.payoutCount }, { label: "Recipients receive", value: moneyList(run.totals) }, { label: "Funding required", value: money(run.fundingRequiredMinor, run.fundingCurrency) }, { label: "Approvals required", value: run.requiredApprovals || "None" }]}
                        consequence={run.requiredApprovals ? "The run will be locked and sent to approvers. Nothing is paid until it is approved and sent." : "Your policy does not require approval for this run, so it will be approved immediately. You still choose when to send it."}
                        confirmLabel="Submit run"
                        pending={submit.isPending}
                        onConfirm={() => submit.mutateAsync(undefined)}
                    />
                )}
            </div>
        </Panel>
    );
}

function ApprovalPanel({ run }: { run: RunDetail }) {
    const { user } = useAuth();
    const approve = usePayoutAction((comment: string) => payoutsApi.approve(run.id, comment || undefined), { success: "Approval recorded" });
    const reject = usePayoutAction((comment: string) => payoutsApi.reject(run.id, comment), { success: "Run rejected and returned for editing" });
    const canApprove = APPROVE_ROLES.includes(user?.role ?? "") && !run.viewer.hasApproved && (run.viewer.selfApprovalAllowed || !run.viewer.isSubmitter);
    const reason = !APPROVE_ROLES.includes(user?.role ?? "") ? "Only owners, admins and approvers can approve." : run.viewer.hasApproved ? "You already approved this run. Another approver is needed." : !canApprove ? "Your policy requires someone other than the submitter to approve." : null;
    return (
        <Panel title="Approval" subtitle={`${run.approvalsReceived} of ${run.requiredApprovals} approval${run.requiredApprovals === 1 ? "" : "s"} received`} id="approval-title">
            <div className="space-y-4 p-5">
                <p className="rounded-xl bg-[#fdf4e3] p-3.5 text-[13px] leading-6 text-[#7a4f0a]">{run.policySummary}</p>
                {run.viewer.isSubmitter && run.viewer.selfApprovalAllowed && <p className="text-xs leading-5 text-[#8a897f]">Your policy allows self-approval, so you can approve your own run. It will be marked as a self-approval. Add a teammate in Team to separate duties.</p>}
                {reason && <p className="text-[13px] text-[#74736b]">{reason}</p>}
                {run.requiredApprovals - run.approvalsReceived > run.approverCapacity - run.approvalsReceived && <p role="alert" className="rounded-xl border border-[#f0dcb0] bg-[#fdf6e7] p-3 text-[13px] text-[#7a4f0a]">Not enough people can approve this run to reach {run.requiredApprovals} approvals. <Link to="/dashboard/team" className="font-semibold underline">Add an approver</Link> or reject it so it can be split.</p>}
                <div className="flex flex-wrap gap-2">
                    <ConfirmAction
                        trigger={<Button disabled={!canApprove}><CheckCircle2 className="h-4 w-4" /> Approve run</Button>} disabled={!canApprove}
                        title={`Approve ${run.name}?`}
                        lines={[{ label: "Payouts", value: run.payoutCount }, { label: "Total", value: moneyList(run.totals) }, { label: "Currencies", value: run.totals.length }, { label: "Payout methods", value: run.methods.map((method) => METHOD_LABELS[method] ?? method).join(", ") }]}
                        consequence="This approval allows the run to proceed to execution. It is recorded with your name, the time and your comment."
                        confirmLabel="Approve run" comment={{ label: "Comment", placeholder: "What did you check?" }} pending={approve.isPending} onConfirm={(comment) => approve.mutateAsync(comment)}
                    />
                    <ConfirmAction
                        trigger={<Button variant="outline" className="text-[#9a2f2f]" disabled={!APPROVE_ROLES.includes(user?.role ?? "")}><XCircle className="h-4 w-4" /> Reject</Button>} disabled={!APPROVE_ROLES.includes(user?.role ?? "")}
                        title={`Reject ${run.name}?`} destructive
                        consequence="The run returns to the operator for editing. No money moves."
                        confirmLabel="Reject run" comment={{ label: "Reason", required: true, placeholder: "Tell the operator what to fix" }} pending={reject.isPending} onConfirm={(comment) => reject.mutateAsync(comment)}
                    />
                </div>
            </div>
        </Panel>
    );
}

function ExecutePanel({ run, canPrepare }: { run: RunDetail; canPrepare: boolean }) {
    const execute = usePayoutAction(() => payoutsApi.execute(run.id), { success: "Run sent to the provider" });
    const cost = run.movements.filter((item) => item.state === "approved").reduce((sum, item) => sum + (item.sourceAmountMinor ?? 0), 0);
    const held = run.movements.filter((item) => item.state === "on_hold").length;
    const short = cost > run.funding.availableMinor;
    return (
        <Panel title="Ready to send" subtitle={run.approvedAt ? `Approved ${formatRelative(run.approvedAt)}` : undefined} id="execute-title">
            <div className="space-y-4 p-5">
                <dl className="grid gap-3 text-[13px] sm:grid-cols-3">
                    <div><dt className="text-[#8a897f]">Funding required</dt><dd className="mt-0.5 font-semibold tabular-nums text-[#1b1c19]">{money(cost, run.fundingCurrency)}</dd></div>
                    <div><dt className="text-[#8a897f]">{run.funding.isSandbox ? "Sandbox balance" : "Available"}</dt><dd className={cn("mt-0.5 font-semibold tabular-nums", short ? "text-[#9a2f2f]" : "text-[#1b1c19]")}>{money(run.funding.availableMinor, run.funding.currency)}</dd></div>
                    <div><dt className="text-[#8a897f]">On hold</dt><dd className="mt-0.5 font-semibold text-[#1b1c19]">{held ? `${held} (not sent)` : "None"}</dd></div>
                </dl>
                {short && <p role="alert" className="rounded-xl bg-[#fbecea] px-3.5 py-2.5 text-[13px] text-[#9a2f2f]">Add {money(cost - run.funding.availableMinor, run.fundingCurrency)} of funding before sending. <Link to="/dashboard/funding" className="font-semibold underline">Go to funding</Link></p>}
                {canPrepare && (
                    <ConfirmAction
                        trigger={<Button disabled={short || cost === 0}><Send className="h-4 w-4" /> Send to provider</Button>} disabled={short || cost === 0}
                        title={`Send ${run.name}?`}
                        lines={[{ label: "Payouts to send", value: run.movements.filter((item) => item.state === "approved").length }, { label: "Funding reserved", value: money(cost, run.fundingCurrency) }, { label: "Provider", value: "Zapzive sandbox" }]}
                        consequence={<>Funds are reserved and each payout is submitted to the provider. Delivery is confirmed by the provider, not by this click. {held ? `${held} payout${held === 1 ? " is" : "s are"} on hold and will not be sent until approved.` : ""}</>}
                        confirmLabel="Send payouts" pending={execute.isPending} onConfirm={() => execute.mutateAsync(undefined)}
                    />
                )}
            </div>
        </Panel>
    );
}

function ReconciliationPanel({ run, canAct }: { run: RunDetail; canAct: boolean }) {
    const reconcile = usePayoutAction((note: string) => payoutsApi.reconcile(run.id, note || undefined), { success: "Run reconciled" });
    const r = run.reconciliation;
    const exportFile = async (format: "ledger" | "journal" | "receipt") => downloadBlob(await payoutsApi.runExport(run.id, format), `${run.reference}-${format}.csv`);
    return (
        <Panel title="Reconciliation" subtitle={r.reconciledAt ? `Reconciled ${formatDate(r.reconciledAt)}` : "Expected versus delivered"} id="recon-title" actions={r.reconciledAt ? <StateBadge kind="run" state="completed" /> : undefined}>
            <div className="grid gap-5 p-5 lg:grid-cols-2">
                <dl className="divide-y divide-[#ece9e1] rounded-xl border border-[#ece9e1] text-[13px]">
                    {([["Requested", r.requested], ["Delivered", r.delivered], ["Processing", r.processing], ["Failed", r.failed], ["On hold", r.onHold]] as const).map(([label, value]) => (
                        <div key={label} className="flex justify-between px-3.5 py-2"><dt className="text-[#74736b]">{label}</dt><dd className={cn("font-semibold tabular-nums", label === "Failed" && value ? "text-[#9a2f2f]" : "text-[#1b1c19]")}>{value}</dd></div>
                    ))}
                </dl>
                <dl className="divide-y divide-[#ece9e1] rounded-xl border border-[#ece9e1] text-[13px]">
                    <div className="flex justify-between gap-3 px-3.5 py-2"><dt className="text-[#74736b]">Expected</dt><dd className="text-right font-semibold tabular-nums text-[#1b1c19]">{moneyList(r.expected)}</dd></div>
                    <div className="flex justify-between gap-3 px-3.5 py-2"><dt className="text-[#74736b]">Delivered</dt><dd className="text-right font-semibold tabular-nums text-[#1b1c19]">{moneyList(r.deliveredTotals)}</dd></div>
                    <div className="flex justify-between gap-3 px-3.5 py-2"><dt className="text-[#74736b]">Outstanding</dt><dd className={cn("text-right font-semibold tabular-nums", r.outstandingTotals.length ? "text-[#9a2f2f]" : "text-[#1b1c19]")}>{moneyList(r.outstandingTotals)}</dd></div>
                    <div className="flex justify-between gap-3 px-3.5 py-2"><dt className="text-[#74736b]">Provider fees</dt><dd className="font-semibold tabular-nums text-[#1b1c19]">{money(r.feesMinor, r.fundingCurrency)}</dd></div>
                    <div className="flex justify-between gap-3 px-3.5 py-2"><dt className="text-[#74736b]">Funding used</dt><dd className="font-semibold tabular-nums text-[#1b1c19]">{money(r.fundingCostMinor, r.fundingCurrency)}</dd></div>
                </dl>
            </div>
            <div className="flex flex-col gap-3 border-t border-[#ece9e1] p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => void exportFile("ledger")}><Download className="h-3.5 w-3.5" /> Ledger CSV</Button>
                    <Button variant="outline" size="sm" onClick={() => void exportFile("journal")}><Download className="h-3.5 w-3.5" /> Journal CSV</Button>
                    <Button variant="outline" size="sm" onClick={() => void exportFile("receipt")}><Download className="h-3.5 w-3.5" /> Run receipt</Button>
                </div>
                {canAct && r.canReconcile && (
                    <ConfirmAction
                        trigger={<Button size="sm"><Check className="h-4 w-4" /> Mark reconciled</Button>}
                        title={`Reconcile ${run.name}?`}
                        lines={[{ label: "Delivered", value: `${r.delivered} of ${r.requested}` }, { label: "Outstanding", value: moneyList(r.outstandingTotals) }]}
                        consequence={r.failed || r.onHold ? "Failed or held payouts are recorded as outstanding in the reconciliation record." : "Confirms that delivered amounts match your provider statement."}
                        confirmLabel="Mark reconciled" comment={{ label: "Note", placeholder: "e.g. Matched to provider statement" }} pending={reconcile.isPending} onConfirm={(note) => reconcile.mutateAsync(note)}
                    />
                )}
            </div>
        </Panel>
    );
}

// ---------------------------------------------------------------- page

export default function PayoutRunDetail() {
    const { id } = useParams();
    const [params, setParams] = useSearchParams();
    const { user } = useAuth();
    const { setTitle } = usePageHeader();
    const run = useRun(id);
    const data = run.data;
    useEffect(() => { setTitle(data ? `${data.reference} · ${data.name}` : null); return () => setTitle(null); }, [data, setTitle]);
    const cancel = usePayoutAction((reason: string) => payoutsApi.cancel(id!, reason || undefined), { success: "Run cancelled" });
    const addMode = params.get("add");

    if (run.isPending) return <div className="premium-card"><LoadingRows rows={6} /></div>;
    if (run.isError || !data) return <div className="premium-card"><ErrorNotice error={run.error} onRetry={() => void run.refetch()} /></div>;

    const preparing = PREPARING.includes(data.status);
    const canPrepare = PREPARE_ROLES.includes(user?.role ?? "");
    const lines = data.movements.filter((item) => item.state !== "cancelled");
    const step = !lines.length ? 1 : data.status === "ready" && !data.validation.needsReview ? 3 : 2;
    const cancellable = ["draft", "needs_correction", "ready", "rejected", "awaiting_approval", "approved"].includes(data.status);

    return (
        <div className="space-y-6">
            <PageIntro
                back={{ to: "/dashboard/payouts", label: "Payouts" }}
                title={data.name}
                description={data.purpose ?? undefined}
                meta={<>
                    <StateBadge kind="run" state={data.status} />
                    <span className="font-mono">{data.reference}</span>
                    <span>{data.scheduledFor ? `Scheduled ${formatDate(data.scheduledFor)}` : "No date"}</span>
                    <span>Requested by {data.createdByName}</span>
                    {data.isSample && <SampleTag />}
                </>}
                actions={canPrepare && cancellable ? (
                    <ConfirmAction trigger={<Button variant="outline" className="text-[#9a2f2f]">Cancel run</Button>} title={`Cancel ${data.name}?`} destructive consequence="No payouts in this run have been sent. Cancelling stops the run permanently; the record and its history are kept." confirmLabel="Cancel run" comment={{ label: "Reason" }} pending={cancel.isPending} onConfirm={(reason) => cancel.mutateAsync(reason)} />
                ) : undefined}
            />

            {data.status === "rejected" && (() => {
                const rejection = [...data.approvals].reverse().find((item) => item.decision === "rejected");
                return <div role="alert" className="rounded-2xl border border-[#efc9c4] bg-[#fbecea] p-4 text-[13px] leading-6 text-[#9a2f2f]"><span className="font-semibold">Rejected by {rejection?.actorName}.</span> {rejection?.comment} Edit the payouts and submit again.</div>;
            })()}

            {preparing && (
                <>
                    {(() => {
                        const steps = ["Run details", "Add payouts", "Validate", "Review & submit"];
                        return (
                            <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Preparation steps">
                                {steps.map((label, index) => (
                                    <li key={label} aria-current={index === step ? "step" : undefined} className={cn("flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-[13px]", index === step ? "border-primary bg-white font-semibold text-[#1b1c19] ring-1 ring-primary" : index < step ? "border-[#d6e9df] bg-[#edf6f1] text-[#0b6b4f]" : "border-[#e7e4dc] bg-white text-[#74736b]")}>
                                        <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold", index <= step ? "bg-primary text-[#ffffff]" : "bg-[#f1efe9] text-[#9a998f]")}>{index < step ? "✓" : index + 1}</span>{label}
                                    </li>
                                ))}
                            </ol>
                        );
                    })()}
                    {canPrepare && (
                        <Panel title="Add payouts" id="add-title" actions={
                            <div className="dash-seg" role="group" aria-label="How to add payouts">
                                <button aria-pressed={addMode !== "import"} onClick={() => setParams({ add: "recipients" })}>From recipients</button>
                                <button aria-pressed={addMode === "import"} onClick={() => setParams({ add: "import" })}>Import CSV</button>
                            </div>
                        }>
                            {addMode === "import" ? <ImportCsv run={data} onDone={() => setParams({})} /> : addMode === "recipients" || !lines.length ? <AddFromRecipients run={data} onDone={() => setParams({})} /> : (
                                <div className="flex flex-wrap items-center justify-between gap-3 p-5 text-[13px] text-[#55544d]">
                                    <span>{lines.length} payout{lines.length === 1 ? "" : "s"} in this run.</span>
                                    <Button variant="outline" size="sm" onClick={() => setParams({ add: "recipients" })}><Plus className="h-3.5 w-3.5" /> Add more</Button>
                                </div>
                            )}
                        </Panel>
                    )}
                    {lines.length > 0 && (
                        <div className="premium-card grid grid-cols-2 gap-px overflow-hidden bg-[#ece9e1] sm:grid-cols-4" aria-label="Validation summary">
                            {([["Rows", data.validation.total, ""], ["Ready", data.validation.ready, "text-[#0b6b4f]"], ["Need correction", data.validation.needsCorrection, data.validation.needsCorrection ? "text-[#9a2f2f]" : ""], ["Need review", data.validation.needsReview, data.validation.needsReview ? "text-[#8a5a0b]" : ""]] as const).map(([label, value, tone]) => (
                                <div key={label} className="bg-[#fffefa] px-5 py-3.5"><p className="text-xs text-[#74736b]">{label}</p><p className={cn("text-[20px] font-bold tabular-nums text-[#1b1c19]", tone)}>{value}</p></div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {data.status === "awaiting_approval" && <ApprovalPanel run={data} />}
            {data.status === "approved" && <ExecutePanel run={data} canPrepare={canPrepare || APPROVE_ROLES.includes(user?.role ?? "")} />}

            <Panel title="Payouts" subtitle={`${data.payoutCount} payout${data.payoutCount === 1 ? "" : "s"} · ${moneyList(data.totals)}`} id="lines-title">
                <LinesTable run={data} editable={preparing && canPrepare} />
            </Panel>

            {preparing && lines.length > 0 && <ReviewSubmit run={data} canPrepare={canPrepare} />}
            {["processing", "completed", "completed_with_failures"].includes(data.status) && <ReconciliationPanel run={data} canAct={canPrepare || APPROVE_ROLES.includes(user?.role ?? "")} />}

            <div className="grid gap-5 lg:grid-cols-2">
                <Panel title="Approval history" id="approvals-title">
                    {data.approvals.length === 0 ? <p className="p-5 text-[13px] text-[#74736b]">No approval decisions yet.</p> : (
                        <ul className="divide-y divide-[#ece9e1]">
                            {data.approvals.map((item) => (
                                <li key={item.id} className="px-5 py-3 text-[13px]">
                                    <p className="text-[#1b1c19]"><span className="font-semibold">{item.actorName}</span> {item.decision === "approved" ? "approved" : "rejected"}{item.selfApproval ? <span className="ml-1.5 text-xs text-[#8a5a0b]">self-approval</span> : null}</p>
                                    {item.comment && <p className="mt-0.5 text-[#55544d]">“{item.comment}”</p>}
                                    <p className="mt-0.5 text-xs text-[#8a897f]">{formatDateTime(item.createdAt)} · {item.beforeStatus.replace(/_/g, " ")} → {item.afterStatus.replace(/_/g, " ")}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>
                <Panel title="Activity" id="run-activity-title"><Timeline events={data.events.slice(0, 15)} /></Panel>
            </div>
        </div>
    );
}
