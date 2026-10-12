import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Search, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageIntro from "@/components/dashboard/PageIntro";
import { CurrencyFlag } from "@/components/dashboard/AssetIcon";
import { EmptyState, ErrorNotice, Initials, LoadingRows, MethodTag, SampleTag, StateBadge } from "@/components/ops";
import RecipientForm from "@/components/ops/RecipientForm";
import { useRecipients } from "@/hooks/use-payouts";
import { money } from "@/lib/payout-format";
import { formatDate } from "@/lib/format";

const FILTERS = [["active", "Active"], ["attention", "Needs action"], ["archived", "Archived"]] as const;

export default function Recipients() {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("active");
    const recipients = useRecipients({ status: filter === "archived" ? "archived" : "active" });
    const formOpen = params.get("new") === "1";

    const rows = useMemo(() => {
        const list = recipients.data ?? [];
        const q = query.trim().toLowerCase();
        return list
            .filter((item) => (filter === "attention" ? Boolean(item.nextAction) : true))
            .filter((item) => !q || item.name.toLowerCase().includes(q) || item.email.toLowerCase().includes(q) || (item.countryName ?? "").toLowerCase().includes(q));
    }, [recipients.data, query, filter]);

    return (
        <div className="space-y-6">
            <PageIntro
                title="Recipients"
                description="Contractors, vendors and other payees, with their payout methods and history."
                actions={<Button onClick={() => setParams({ new: "1" })}><Plus className="h-4 w-4" /> Add recipient</Button>}
            />

            <section className="premium-card overflow-hidden" aria-label="Recipient list">
                <div className="card-header flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="dash-seg" role="group" aria-label="Filter recipients">
                        {FILTERS.map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}
                    </div>
                    <div className="relative w-full md:w-72">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a998f]" aria-hidden="true" />
                        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email or country" aria-label="Search recipients" className="h-10 pl-9" />
                    </div>
                </div>

                {recipients.isPending ? <LoadingRows /> : recipients.isError ? <ErrorNotice error={recipients.error} onRetry={() => void recipients.refetch()} /> : rows.length === 0 ? (
                    <EmptyState icon={UserRound} title={query || filter !== "active" ? "No recipients match" : "No recipients yet"} action={!query && filter === "active" ? <Button onClick={() => setParams({ new: "1" })}><Plus className="h-4 w-4" /> Add recipient</Button> : undefined}>
                        {query || filter !== "active" ? "Try a different search or filter." : "Add the people and businesses you pay. You can also add them while importing a payout run from CSV."}
                    </EmptyState>
                ) : (
                    <>
                        {/* Desktop: table */}
                        <div className="hidden overflow-x-auto md:block">
                            <table className="text-sm">
                                <caption className="sr-only">Recipients</caption>
                                <thead><tr>
                                    <th scope="col" className="px-5 text-left">Recipient</th>
                                    <th scope="col" className="px-3 text-left">Country</th>
                                    <th scope="col" className="px-3 text-left">Payout method</th>
                                    <th scope="col" className="px-3 text-left">Details check</th>
                                    <th scope="col" className="px-3 text-right">Last payout</th>
                                    <th scope="col" className="px-5 text-left">Next action</th>
                                </tr></thead>
                                <tbody className="divide-y divide-[#ece9e1]">
                                    {rows.map((item) => (
                                        <tr key={item.id} className="cursor-pointer" onClick={() => navigate(`/dashboard/recipients/${item.id}`)}>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3">
                                                    <Initials name={item.name} />
                                                    <div className="min-w-0">
                                                        <Link to={`/dashboard/recipients/${item.id}`} onClick={(event) => event.stopPropagation()} className="block truncate font-semibold text-[#1b1c19] hover:text-primary">{item.name}</Link>
                                                        <p className="flex items-center gap-1.5 truncate text-xs text-[#8a897f]">{item.title || item.type}{item.isSample && <SampleTag />}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3"><span className="inline-flex items-center gap-2 text-[13px] text-[#3c3c37]">{item.country && <CurrencyFlag code={item.country.toLowerCase()} size="xs" />}{item.countryName ?? "—"}</span></td>
                                            <td className="px-3 py-3"><MethodTag method={item.payoutMethod} label={item.payoutMethodLabel ? `${item.payoutMethodLabel} · ${item.payoutCurrency}` : null} destination={item.destination} /></td>
                                            <td className="px-3 py-3"><StateBadge kind="verification" state={item.verification} /></td>
                                            <td className="px-3 py-3 text-right">{item.lastPayout ? <><p className="font-semibold tabular-nums text-[#1b1c19]">{money(item.lastPayout.amountMinor, item.lastPayout.currency)}</p><p className="text-xs text-[#8a897f]">{formatDate(item.lastPayout.deliveredAt)}</p></> : <span className="text-xs text-[#9a998f]">Not paid yet</span>}</td>
                                            <td className="px-5 py-3 text-[13px]">{item.nextAction ? <span className="font-medium text-[#8a5a0b]">{item.nextAction}</span> : <span className="text-[#9a998f]">—</span>}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Mobile: stacked records */}
                        <ul className="divide-y divide-[#ece9e1] md:hidden">
                            {rows.map((item) => (
                                <li key={item.id}>
                                    <Link to={`/dashboard/recipients/${item.id}`} className="flex gap-3 px-4 py-3.5">
                                        <Initials name={item.name} />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="truncate font-semibold text-[#1b1c19]">{item.name}</p>
                                                <StateBadge kind="verification" state={item.verification} />
                                            </div>
                                            <p className="mt-0.5 truncate text-xs text-[#74736b]">{item.payoutMethodLabel ? `${item.payoutMethodLabel} · ${item.payoutCurrency}` : "No payout method"} · {item.countryName ?? "—"}</p>
                                            {item.nextAction && <p className="mt-1 text-xs font-medium text-[#8a5a0b]">{item.nextAction}</p>}
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                        <p className="border-t border-[#ece9e1] px-5 py-3 text-xs text-[#8a897f]">{rows.length} recipient{rows.length === 1 ? "" : "s"}. “Details check” is a sandbox format check of payout details, not identity verification.</p>
                    </>
                )}
            </section>

            <RecipientForm open={formOpen} onOpenChange={(open) => { if (!open) { params.delete("new"); setParams(params); } }} onSaved={(recipient) => navigate(`/dashboard/recipients/${recipient.id}`)} />
        </div>
    );
}
