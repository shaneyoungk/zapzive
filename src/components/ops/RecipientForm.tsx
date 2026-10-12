import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyFlag } from "@/components/dashboard/AssetIcon";
import { usePayoutAction, usePayoutConfig } from "@/hooks/use-payouts";
import { payoutsApi, type Recipient } from "@/lib/payouts-api";
import { METHOD_LABELS } from "@/lib/payout-format";

const TYPES = [["contractor", "Contractor"], ["vendor", "Vendor"], ["creator", "Creator"], ["freelancer", "Freelancer"], ["supplier", "Supplier"], ["business", "Business"]] as const;
const NETWORKS = ["base", "ethereum", "polygon", "arbitrum", "optimism"];

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    recipient?: Recipient | null;
    onSaved?: (recipient: Recipient) => void;
}

const field = "h-11";

/** Add or edit a recipient. Payout methods are limited to the corridors Zapzive supports. */
export default function RecipientForm({ open, onOpenChange, recipient, onSaved }: Props) {
    const config = usePayoutConfig();
    const editing = Boolean(recipient);
    const [form, setForm] = useState({ name: "", email: "", type: "contractor", title: "", country: "KE", payoutMethod: "", payoutCurrency: "", phone: "", bankName: "", accountNumber: "", bankCode: "", walletAddress: "", network: "base" });
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setError(null);
        setForm({
            name: recipient?.name ?? "", email: recipient?.email ?? "", type: recipient?.type ?? "contractor", title: recipient?.title ?? "", country: recipient?.country ?? "KE",
            payoutMethod: recipient?.payoutMethod ?? "", payoutCurrency: recipient?.payoutCurrency ?? "", phone: "", bankName: "", accountNumber: "", bankCode: "", walletAddress: "", network: "base",
        });
    }, [open, recipient]);

    const corridor = config.data?.corridors.find((item) => item.country === form.country);
    const methodOptions = useMemo(() => {
        const methods = new Set<string>(corridor?.currencies.flatMap((item) => item.methods) ?? []);
        methods.add("usdc_wallet");
        return [...methods];
    }, [corridor]);
    const currencyOptions = form.payoutMethod === "usdc_wallet" ? ["USDC"] : (corridor?.currencies.filter((item) => item.methods.includes(form.payoutMethod)).map((item) => item.currency) ?? []);

    useEffect(() => {
        if (form.payoutMethod && !currencyOptions.includes(form.payoutCurrency)) setForm((previous) => ({ ...previous, payoutCurrency: currencyOptions[0] ?? "" }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.payoutMethod, form.country]);

    const set = (key: keyof typeof form) => (value: string) => setForm((previous) => ({ ...previous, [key]: value }));
    const changingDetails = editing && Boolean(form.payoutMethod) && Boolean(form.phone || form.accountNumber || form.walletAddress || form.payoutMethod !== recipient?.payoutMethod);

    const save = usePayoutAction(async () => {
        const details = form.payoutMethod === "mpesa" || form.payoutMethod === "mobile_money" ? { phone: form.phone }
            : form.payoutMethod === "bank" ? { bankName: form.bankName, accountNumber: form.accountNumber, bankCode: form.bankCode || undefined }
            : form.payoutMethod === "usdc_wallet" ? { walletAddress: form.walletAddress, network: form.network } : undefined;
        const body: Record<string, unknown> = { name: form.name, email: form.email, type: form.type, title: form.title, country: form.country };
        if (!editing || changingDetails) Object.assign(body, { payoutMethod: form.payoutMethod, payoutCurrency: form.payoutCurrency, payoutDetails: details });
        if (editing) {
            const result = await payoutsApi.updateRecipient(recipient!.id, body);
            return { recipient: result.recipient, held: result.paymentsHeld, changed: result.detailsChanged };
        }
        return { recipient: await payoutsApi.createRecipient(body), held: 0, changed: false };
    }, { success: (result) => result.held ? `Saved. ${result.held} payout${result.held === 1 ? " was" : "s were"} put on hold for re-approval.` : editing ? "Recipient updated" : "Recipient added" });

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        try {
            const result = await save.mutateAsync(undefined);
            onSaved?.(result.recipient);
            onOpenChange(false);
        } catch (caught) {
            const response = (caught as { response?: { data?: { error?: string } } }).response;
            setError(response?.data?.error ?? "The recipient could not be saved.");
        }
    };

    const needsDetails = !editing || changingDetails;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto rounded-2xl border-[#e3e0d7] bg-[#fffefa] p-0">
                <form onSubmit={submit}>
                    <DialogHeader className="space-y-1 border-b border-[#ece9e1] p-6 text-left">
                        <DialogTitle className="text-lg font-semibold text-[#1b1c19]">{editing ? `Edit ${recipient?.name}` : "Add recipient"}</DialogTitle>
                        <DialogDescription className="text-[13px] text-[#74736b]">{editing ? "Changing payout details is recorded and puts any submitted payouts on hold until an approver confirms them." : "Contractors, vendors and other payees you pay regularly."}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-5 p-6">
                        {error && <p role="alert" className="rounded-xl border border-[#efc9c4] bg-[#fbecea] px-3.5 py-2.5 text-[13px] text-[#9a2f2f]">{error}</p>}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="r-name">Name</Label><Input id="r-name" className={field} value={form.name} onChange={(e) => set("name")(e.target.value)} required maxLength={120} autoComplete="off" /></div>
                            <div className="space-y-1.5"><Label htmlFor="r-email">Email</Label><Input id="r-email" className={field} type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} required autoComplete="off" /></div>
                            <div className="space-y-1.5"><Label htmlFor="r-type">Type</Label>
                                <Select value={form.type} onValueChange={(v) => v && set("type")(v)}><SelectTrigger id="r-type"><SelectValue /></SelectTrigger><SelectContent>{TYPES.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
                            </div>
                            <div className="space-y-1.5"><Label htmlFor="r-title">Role or description <span className="font-normal text-[#8a897f]">(optional)</span></Label><Input id="r-title" className={field} value={form.title} onChange={(e) => set("title")(e.target.value)} maxLength={80} /></div>
                            <div className="space-y-1.5"><Label htmlFor="r-country">Country</Label>
                                <Select value={form.country} onValueChange={(v) => v && setForm((p) => ({ ...p, country: v, payoutMethod: "" }))}>
                                    <SelectTrigger id="r-country"><SelectValue /></SelectTrigger>
                                    <SelectContent>{(config.data?.corridors ?? []).map((item) => <SelectItem key={item.country} value={item.country}><CurrencyFlag code={item.country.toLowerCase()} size="xs" />{item.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>

                        <fieldset className="rounded-xl border border-[#ece9e1] p-4">
                            <legend className="px-1 text-[13px] font-semibold text-[#1b1c19]">Payout details</legend>
                            {editing && !changingDetails && recipient?.destination && <p className="mb-3 text-[13px] text-[#55544d]">Current: <span className="font-medium">{recipient.payoutMethodLabel} · {recipient.destination}</span>. Enter new details below only if they changed.</p>}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5"><Label htmlFor="r-method">Payout method</Label>
                                    <Select value={form.payoutMethod} onValueChange={(v) => v && set("payoutMethod")(v)}>
                                        <SelectTrigger id="r-method"><SelectValue placeholder="Choose a method" /></SelectTrigger>
                                        <SelectContent>{methodOptions.map((method) => <SelectItem key={method} value={method}>{METHOD_LABELS[method] ?? method}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5"><Label htmlFor="r-currency">Currency</Label>
                                    <Select value={form.payoutCurrency} onValueChange={(v) => v && set("payoutCurrency")(v)} disabled={!form.payoutMethod}>
                                        <SelectTrigger id="r-currency"><SelectValue placeholder="—" /></SelectTrigger>
                                        <SelectContent>{currencyOptions.map((currency) => <SelectItem key={currency} value={currency}>{currency}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                {(form.payoutMethod === "mpesa" || form.payoutMethod === "mobile_money") && (
                                    <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="r-phone">{form.payoutMethod === "mpesa" ? "M-Pesa number" : "Mobile money number"}</Label><Input id="r-phone" className={field} inputMode="tel" placeholder={form.payoutMethod === "mpesa" ? "+254 712 345 678" : "+256 772 123 456"} value={form.phone} onChange={(e) => set("phone")(e.target.value)} required={needsDetails} autoComplete="off" /></div>
                                )}
                                {form.payoutMethod === "bank" && (<>
                                    <div className="space-y-1.5"><Label htmlFor="r-bank">Bank name</Label><Input id="r-bank" className={field} value={form.bankName} onChange={(e) => set("bankName")(e.target.value)} required={needsDetails} /></div>
                                    <div className="space-y-1.5"><Label htmlFor="r-account">Account number</Label><Input id="r-account" className={field} inputMode="numeric" value={form.accountNumber} onChange={(e) => set("accountNumber")(e.target.value)} required={needsDetails} autoComplete="off" /></div>
                                    <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="r-code">Bank or SWIFT code <span className="font-normal text-[#8a897f]">(optional)</span></Label><Input id="r-code" className={field} value={form.bankCode} onChange={(e) => set("bankCode")(e.target.value)} /></div>
                                </>)}
                                {form.payoutMethod === "usdc_wallet" && (<>
                                    <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="r-wallet">Wallet address</Label><Input id="r-wallet" className={`${field} font-mono text-sm`} placeholder="0x…" value={form.walletAddress} onChange={(e) => set("walletAddress")(e.target.value)} required={needsDetails} spellCheck={false} autoComplete="off" /></div>
                                    <div className="space-y-1.5"><Label htmlFor="r-network">Network</Label>
                                        <Select value={form.network} onValueChange={(v) => v && set("network")(v)}><SelectTrigger id="r-network"><SelectValue /></SelectTrigger><SelectContent>{NETWORKS.map((network) => <SelectItem key={network} value={network}>{network[0].toUpperCase() + network.slice(1)}</SelectItem>)}</SelectContent></Select>
                                    </div>
                                    <p className="text-xs leading-5 text-[#8a897f] sm:col-span-2">Only use this when the recipient has asked to be paid in USDC and confirmed the network.</p>
                                </>)}
                            </div>
                        </fieldset>
                    </div>
                    <DialogFooter className="gap-2 border-t border-[#ece9e1] p-6">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={save.isPending}>{save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} {editing ? "Save changes" : "Add recipient"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
