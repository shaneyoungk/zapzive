import { useState, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateRemittance, useRecipients, useAddRecipient } from "@/hooks/use-remittance";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Check, ChevronRight, Loader2, Globe, Wallet, Building2, Smartphone, MapPin, ArrowRight, Save, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import AssetIcon, { CurrencyFlag } from "@/components/dashboard/AssetIcon";

interface SendMoneyWizardProps {
    isOpen: boolean;
    onClose: () => void;
}

type DeliveryMethod = "wallet" | "bank" | "mobile-money" | "cash-agent";
type WalletNetwork = "evm" | "tron";

type RecipientRecord = {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    country?: string | null;
    walletAddress?: string | null;
    walletNetwork?: WalletNetwork | null;
    bankAccount?: string | null;
    mobileNumber?: string | null;
};

const deliveryMethods: { id: DeliveryMethod; label: string; icon: typeof Wallet; description: string }[] = [
    { id: "wallet", label: "Crypto Wallet", icon: Wallet, description: "Instant delivery, low fees" },
    { id: "bank", label: "Bank Transfer", icon: Building2, description: "1-2 business days" },
    { id: "mobile-money", label: "Mobile Money", icon: Smartphone, description: "Instant to phone wallet" },
    { id: "cash-agent", label: "Cash Pickup", icon: MapPin, description: "Pickup at agent location" },
];

function methodsForRecipient(recipient: RecipientRecord | undefined): typeof deliveryMethods {
    if (!recipient) return deliveryMethods;
    return deliveryMethods.filter((method) => {
        if (method.id === "cash-agent") return true;
        if (method.id === "wallet") return Boolean(recipient.walletAddress);
        if (method.id === "bank") return Boolean(recipient.bankAccount);
        return Boolean(recipient.mobileNumber || recipient.phone);
    });
}

function preferredMethod(recipient: RecipientRecord): DeliveryMethod {
    return methodsForRecipient(recipient)[0]?.id ?? "cash-agent";
}

function shortDestination(value?: string | null) {
    if (!value) return "No destination saved";
    return value.length > 16 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
}

function destinationSummary(recipient: RecipientRecord | undefined, deliveryMethod: DeliveryMethod) {
    if (!recipient) return "Choose a recipient";
    if (deliveryMethod === "wallet") return `${recipient.walletNetwork === "tron" ? "TRON" : "EVM"} wallet · ${shortDestination(recipient.walletAddress)}`;
    if (deliveryMethod === "bank") return `Bank account · ${shortDestination(recipient.bankAccount)}`;
    if (deliveryMethod === "mobile-money") return `Mobile money · ${recipient.mobileNumber || recipient.phone || "No mobile number"}`;
    return "Cash pickup at a supported agent";
}

export function SendMoneyWizard({ isOpen, onClose }: SendMoneyWizardProps) {
    const [step, setStep] = useState(1);
    const { data: recipients = [] } = useRecipients();
    const { company } = useAuth();
    const { mutate: createRemittance, isPending: isCreating } = useCreateRemittance();
    const { mutate: addRecipient, isPending: isAddingRecipient } = useAddRecipient();

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
    const [newRecipient, setNewRecipient] = useState({
        name: "",
        email: "",
        country: "",
        destinationType: "wallet" as DeliveryMethod,
        walletNetwork: "evm" as WalletNetwork,
        walletAddress: "",
        bankAccount: "",
        phone: "",
        mobileNumber: "",
    });

    const [transferData, setTransferData] = useState({
        amount: "",
        currency: "USDC",
        localCurrency: "NGN",
        deliveryMethod: "wallet" as DeliveryMethod,
        note: "",
    });

    const filteredRecipients = (recipients as RecipientRecord[]).filter((r) =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.email || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedRecipient = useMemo(() =>
        (recipients as RecipientRecord[]).find((r) => r.id === selectedRecipientId),
        [recipients, selectedRecipientId]
    );
    const availableDeliveryMethods = useMemo(() => methodsForRecipient(selectedRecipient), [selectedRecipient]);

    const sandboxRates: Record<string, number> = { NGN: 1200, KES: 130, GHS: 15, BRL: 5 };
    const fxRate = sandboxRates[transferData.localCurrency] || 1200;
    const fee = (parseFloat(transferData.amount) || 0) * 0.01 + 2;

    const chooseRecipient = (recipient: RecipientRecord) => {
        setSelectedRecipientId(recipient.id);
        setTransferData((current) => ({ ...current, deliveryMethod: methodsForRecipient(recipient).some((method) => method.id === current.deliveryMethod) ? current.deliveryMethod : preferredMethod(recipient) }));
        setStep(2);
    };

    const handleAddRecipient = () => {
        const name = newRecipient.name.trim();
        const country = newRecipient.country.trim();
        const destinationType = newRecipient.destinationType;
        const walletAddress = newRecipient.walletAddress.trim();
        const bankAccount = newRecipient.bankAccount.trim();
        const mobileNumber = newRecipient.mobileNumber.trim() || newRecipient.phone.trim();

        if (!name || !country) {
            toast.error("Add the recipient's name and country.");
            return;
        }
        if (destinationType === "wallet" && !walletAddress) {
            toast.error(`Enter the recipient's ${newRecipient.walletNetwork === "tron" ? "TRON" : "EVM"} wallet address.`);
            return;
        }
        if (destinationType === "bank" && !bankAccount) {
            toast.error("Enter the recipient's bank account or account identifier.");
            return;
        }
        if (destinationType === "mobile-money" && !mobileNumber) {
            toast.error("Enter the mobile-money number.");
            return;
        }

        addRecipient({
            name,
            country,
            ...(newRecipient.email.trim() ? { email: newRecipient.email.trim() } : {}),
            destinationType,
            ...(destinationType === "wallet" ? { walletAddress, walletNetwork: newRecipient.walletNetwork } : {}),
            ...(destinationType === "bank" ? { bankAccount } : {}),
            ...(destinationType === "mobile-money" ? { phone: mobileNumber, mobileNumber } : {}),
        }, {
            onSuccess: (data: RecipientRecord) => chooseRecipient(data),
        });
    };

    const handleCreateRemittance = () => {
        if (!selectedRecipientId || !selectedRecipient) {
            toast.error("Choose a saved recipient before sending money.");
            setStep(1);
            return;
        }
        if (!availableDeliveryMethods.some((method) => method.id === transferData.deliveryMethod)) {
            toast.error("Choose a delivery method saved for this recipient.");
            setStep(2);
            return;
        }
        const payload = {
            sender: company?.name || "Your organization",
            recipientId: selectedRecipientId,
            recipientCountry: selectedRecipient.country || "",
            amount: parseFloat(transferData.amount) || 0,
            currency: transferData.currency,
            localAmount: (parseFloat(transferData.amount) || 0) * fxRate,
            localCurrency: transferData.localCurrency,
            fxRate,
            fee: parseFloat(fee.toFixed(2)),
            deliveryMethod: transferData.deliveryMethod,
            note: transferData.note,
        };

        createRemittance(payload, {
            onSuccess: () => {
                onClose();
                resetForm();
            }
        });
    };

    const resetForm = () => {
        setStep(1);
        setSelectedRecipientId(null);
        setNewRecipient({ name: "", email: "", country: "", destinationType: "wallet", walletNetwork: "evm", walletAddress: "", bankAccount: "", phone: "", mobileNumber: "" });
        setTransferData({ amount: "", currency: "USDC", localCurrency: "NGN", deliveryMethod: "wallet", note: "" });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[550px] h-[650px] bg-card border-border text-foreground flex flex-col p-0 overflow-hidden shadow-2xl">
                {/* Fixed Header */}
                <div className="p-6 border-b border-border bg-muted/30">
                    <DialogHeader>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex gap-1.5">
                                {[1, 2, 3, 4].map((s) => (
                                    <div
                                        key={s}
                                        className={cn(
                                            "h-1.5 w-6 rounded-full transition-all duration-300",
                                            step === s ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" : s < step ? "bg-emerald-500/30" : "bg-muted shadow-inner"
                                        )}
                                    />
                                ))}
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                Step {step} of 4
                            </span>
                        </div>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
                            <Globe className="w-5 h-5 text-emerald-500" />
                            {step === 1 && "Choose Recipient"}
                            {step === 2 && "Delivery Method"}
                            {step === 3 && "Transfer Amount"}
                            {step === 4 && "Review & Send"}
                        </DialogTitle>
                    </DialogHeader>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-4"
                            >
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search recipients..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10 bg-muted/50 border-border focus:border-emerald-500/50"
                                    />
                                </div>

                                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 no-scrollbar">
                                    {filteredRecipients.map((recipient) => (
                                        <div
                                            key={recipient.id}
                                            className={cn(
                                                "p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between",
                                                selectedRecipientId === recipient.id
                                                    ? "bg-emerald-500/5 border-emerald-500/30 ring-1 ring-emerald-500/20"
                                                    : "bg-muted/30 border-border hover:border-emerald-500/30"
                                            )}
                                            onClick={() => chooseRecipient(recipient)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center font-bold text-muted-foreground shadow-sm">
                                                    {recipient.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-foreground">{recipient.name}</p>
                                                    <p className="text-[10px] text-muted-foreground font-medium">{recipient.country || "Global"} · {destinationSummary(recipient, preferredMethod(recipient))}</p>
                                                </div>
                                            </div>
                                            {selectedRecipientId === recipient.id && <Check className="w-4 h-4 text-emerald-500" />}
                                        </div>
                                    ))}

                                    {/* New Recipient Section */}
                                    <div className="pt-2">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">Add New</p>
                                        <div className="space-y-3 p-4 bg-muted/20 border border-border rounded-xl">
                                            <div className="grid grid-cols-2 gap-3">
                                                <Input
                                                    placeholder="Full name"
                                                    value={newRecipient.name}
                                                    onChange={e => setNewRecipient({ ...newRecipient, name: e.target.value })}
                                                    className="h-9 text-xs bg-card border-border focus:border-emerald-500/50"
                                                />
                                                <Input
                                                    placeholder="Country"
                                                    value={newRecipient.country}
                                                    onChange={e => setNewRecipient({ ...newRecipient, country: e.target.value })}
                                                    className="h-9 text-xs bg-card border-border focus:border-emerald-500/50"
                                                />
                                            </div>
                                            <Input
                                                type="email"
                                                placeholder="Email (optional)"
                                                value={newRecipient.email}
                                                onChange={e => setNewRecipient({ ...newRecipient, email: e.target.value })}
                                                className="h-9 text-xs bg-card border-border focus:border-emerald-500/50"
                                            />
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Payout destination</p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {deliveryMethods.map((method) => {
                                                        const Icon = method.icon;
                                                        const active = newRecipient.destinationType === method.id;
                                                        return <button
                                                            key={method.id}
                                                            type="button"
                                                            aria-pressed={active}
                                                            onClick={() => setNewRecipient((current) => ({ ...current, destinationType: method.id }))}
                                                            className={cn("flex min-h-10 items-center gap-2 rounded-lg border px-2.5 text-left text-xs font-semibold transition-colors", active ? "border-emerald-500/40 bg-emerald-500/10 text-foreground" : "border-border bg-card text-muted-foreground hover:border-emerald-500/30")}
                                                        >
                                                            <Icon className={cn("h-3.5 w-3.5 shrink-0", active ? "text-emerald-500" : "text-muted-foreground")} />
                                                            <span className="truncate">{method.label}</span>
                                                        </button>;
                                                    })}
                                                </div>
                                            </div>
                                            {newRecipient.destinationType === "wallet" && <div className="space-y-2">
                                                <div className="grid grid-cols-2 gap-2">
                                                    {(["evm", "tron"] as const).map((walletNetwork) => <button
                                                        key={walletNetwork}
                                                        type="button"
                                                        aria-pressed={newRecipient.walletNetwork === walletNetwork}
                                                        onClick={() => setNewRecipient((current) => ({ ...current, walletNetwork }))}
                                                        className={cn("h-8 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-colors", newRecipient.walletNetwork === walletNetwork ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600" : "border-border bg-card text-muted-foreground hover:border-emerald-500/30")}
                                                    >{walletNetwork === "evm" ? "EVM" : "TRON"}</button>)}
                                                </div>
                                                <Input
                                                    placeholder={newRecipient.walletNetwork === "tron" ? "TRON address (T…)" : "EVM address (0x…)"}
                                                    value={newRecipient.walletAddress}
                                                    onChange={e => setNewRecipient({ ...newRecipient, walletAddress: e.target.value })}
                                                    className="h-9 text-xs bg-card border-border font-mono focus:border-emerald-500/50"
                                                />
                                                <p className="text-[10px] leading-4 text-muted-foreground">{newRecipient.walletNetwork === "tron" ? "TRON addresses are checked with their Base58 checksum before saving." : "Use a complete, nonzero EVM address. The network family is saved with the recipient."}</p>
                                            </div>}
                                            {newRecipient.destinationType === "bank" && <Input
                                                placeholder="Bank account or IBAN"
                                                value={newRecipient.bankAccount}
                                                onChange={e => setNewRecipient({ ...newRecipient, bankAccount: e.target.value })}
                                                className="h-9 text-xs bg-card border-border font-mono focus:border-emerald-500/50"
                                            />}
                                            {newRecipient.destinationType === "mobile-money" && <Input
                                                type="tel"
                                                placeholder="Mobile-money number"
                                                value={newRecipient.mobileNumber}
                                                onChange={e => setNewRecipient({ ...newRecipient, mobileNumber: e.target.value, phone: e.target.value })}
                                                className="h-9 text-xs bg-card border-border focus:border-emerald-500/50"
                                            />}
                                            {newRecipient.destinationType === "cash-agent" && <p className="rounded-lg border border-dashed border-border bg-card/70 px-3 py-2 text-[10px] leading-4 text-muted-foreground">No account is needed for cash pickup. Delivery location is confirmed during the final payout step.</p>}
                                            <Button
                                                variant="outline"
                                                className="w-full h-8 text-xs border-border hover:bg-muted font-bold"
                                                onClick={handleAddRecipient}
                                                disabled={isAddingRecipient}
                                            >
                                                {isAddingRecipient ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-2" />}
                                                Save & Continue
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-4"
                            >
                                {selectedRecipient && <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.035] p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Sending to {selectedRecipient.name}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">Choose one of the payout methods saved for this recipient.</p>
                                </div>}
                                <div className="space-y-3">
                                    {availableDeliveryMethods.map((method) => (
                                        <div
                                            key={method.id}
                                            className={cn(
                                                "p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4",
                                                transferData.deliveryMethod === method.id
                                                    ? "bg-emerald-500/5 border-emerald-500/30"
                                                    : "bg-muted/10 border-border hover:border-emerald-500/30"
                                            )}
                                            onClick={() => setTransferData({ ...transferData, deliveryMethod: method.id })}
                                        >
                                            <div className={cn(
                                                "w-12 h-12 rounded-xl flex items-center justify-center transition-colors shadow-sm",
                                                transferData.deliveryMethod === method.id ? "bg-emerald-500/20 text-emerald-500" : "bg-muted text-muted-foreground"
                                            )}>
                                                <method.icon className="w-6 h-6" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-foreground">{method.label}</p>
                                                <p className="text-xs text-muted-foreground font-medium">{method.description}</p>
                                                {transferData.deliveryMethod === method.id && <p className="mt-1 truncate font-mono text-[10px] text-emerald-600">{destinationSummary(selectedRecipient, method.id)}</p>}
                                            </div>
                                            <div className={cn(
                                                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                                                transferData.deliveryMethod === method.id ? "border-emerald-500" : "border-border"
                                            )}>
                                                {transferData.deliveryMethod === method.id && <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8 py-4"
                            >
                                <div className="space-y-4">
                                    <div className="relative">
                                        <Label className="text-muted-foreground text-xs mb-1.5 block font-bold">You Send</Label>
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                                                <Input
                                                    type="number"
                                                    value={transferData.amount}
                                                    onChange={e => setTransferData({ ...transferData, amount: e.target.value })}
                                                    className="h-14 pl-8 text-2xl font-bold bg-muted/50 border-border focus:border-emerald-500/50 tabular-nums text-foreground"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <div className="w-36 shrink-0">
                                                <Select value={transferData.currency} onValueChange={v => { if (v) setTransferData({ ...transferData, currency: v }); }}>
                                                    <SelectTrigger className="h-14 font-semibold">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="USDC"><AssetIcon symbol="USDC" size="xs" />USDC</SelectItem>
                                                        <SelectItem value="USDT"><AssetIcon symbol="USDT" size="xs" />USDT</SelectItem>
                                                        <SelectItem value="ETH"><AssetIcon symbol="ETH" size="xs" />ETH</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-center -my-3 relative z-10">
                                        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)] border-2 border-background">
                                            <ArrowRight className="w-4 h-4 text-white rotate-90" />
                                        </div>
                                    </div>

                                    <div className="relative">
                                        <Label className="text-muted-foreground text-xs mb-1.5 block font-bold">Recipient Receives</Label>
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 relative">
                                                <Input
                                                    readOnly
                                                    value={((parseFloat(transferData.amount) || 0) * fxRate).toLocaleString()}
                                                    className="h-14 text-2xl font-bold bg-muted/20 border-border text-foreground/60 tabular-nums cursor-default"
                                                />
                                            </div>
                                            <div className="w-36 shrink-0">
                                                <Select value={transferData.localCurrency} onValueChange={v => { if (v) setTransferData({ ...transferData, localCurrency: v }); }}>
                                                    <SelectTrigger className="h-14 font-semibold">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="NGN"><CurrencyFlag code="NGN" size="xs" />NGN</SelectItem>
                                                        <SelectItem value="KES"><CurrencyFlag code="KES" size="xs" />KES</SelectItem>
                                                        <SelectItem value="GHS"><CurrencyFlag code="GHS" size="xs" />GHS</SelectItem>
                                                        <SelectItem value="BRL"><CurrencyFlag code="BRL" size="xs" />BRL</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-emerald-500/[0.03] border border-emerald-500/20 rounded-2xl space-y-3">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground font-medium">Exchange Rate</span>
                                        <span className="text-foreground font-bold">1 USDC ≈ {fxRate} {transferData.localCurrency}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground font-medium">Fee (1% + $2)</span>
                                        <span className="text-foreground font-bold">${fee.toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm font-bold pt-2 border-t border-emerald-500/10">
                                        <span className="text-emerald-500">Total to Charge</span>
                                        <span className="text-foreground">${((parseFloat(transferData.amount) || 0) + fee).toFixed(2)}</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 4 && (
                            <motion.div
                                key="step4"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-muted/20 border border-border rounded-2xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold shadow-sm">
                                                {selectedRecipient?.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-foreground">{selectedRecipient?.name}</p>
                                                <p className="text-[10px] text-muted-foreground font-medium">{selectedRecipient?.country} · {destinationSummary(selectedRecipient, transferData.deliveryMethod)}</p>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{transferData.deliveryMethod}</p>
                                    </div>
                                </div>

                                {transferData.note && (
                                    <div className="p-4 bg-muted/10 border border-border rounded-2xl">
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1 font-bold">Note</p>
                                        <p className="text-sm font-medium text-foreground">"{transferData.note}"</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-muted/20 border border-border rounded-2xl">
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1 font-bold">Sending</p>
                                        <p className="text-xl font-bold text-foreground">${parseFloat(transferData.amount).toLocaleString()}</p>
                                        <p className="text-[10px] text-muted-foreground font-medium">{transferData.currency}</p>
                                    </div>
                                    <div className="p-4 bg-emerald-500/[0.03] border border-emerald-500/10 rounded-2xl">
                                        <p className="text-[10px] text-emerald-500 uppercase tracking-widest mb-1 font-bold">Receiving</p>
                                        <p className="text-xl font-bold text-emerald-500">NGN {(parseFloat(transferData.amount) * fxRate).toLocaleString()}</p>
                                        <p className="text-[10px] text-emerald-600 font-medium">{transferData.localCurrency}</p>
                                    </div>
                                </div>

                                <div className="p-4 bg-muted/20 border border-border rounded-2xl space-y-2 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground font-medium">Service Fee</span>
                                        <span className="text-foreground font-bold">${fee.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground font-medium">Delivery Speed</span>
                                        <span className="text-foreground font-bold">Under 10 minutes</span>
                                    </div>
                                    <div className="flex justify-between font-bold pt-2 border-t border-border">
                                        <span className="text-foreground">Total Deducted</span>
                                        <span className="text-foreground">${((parseFloat(transferData.amount) || 0) + fee).toFixed(2)}</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Fixed Footer */}
                <div className="p-6 border-t border-border flex items-center justify-between bg-card">
                    <Button
                        variant="ghost"
                        onClick={step === 1 ? onClose : () => setStep(step - 1)}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        {step === 1 ? "Cancel" : "Back"}
                    </Button>

                    <div className="flex items-center gap-3">
                        {step < 4 ? (
                            <Button
                                onClick={() => setStep(step + 1)}
                                disabled={(step === 1 && !selectedRecipientId) || (step === 2 && !availableDeliveryMethods.some((method) => method.id === transferData.deliveryMethod)) || (step === 3 && !(parseFloat(transferData.amount) > 0))}
                                className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold h-11 px-6 rounded-xl group transition-all"
                            >
                                Next Step
                                <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                            </Button>
                        ) : (
                            <Button
                                onClick={handleCreateRemittance}
                                disabled={isCreating || !transferData.amount}
                                className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold h-11 px-8 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                            >
                                {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                                Send Money Now
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog >
    );
}
