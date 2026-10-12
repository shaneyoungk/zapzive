import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Wallet,
    ArrowUpRight,
    ArrowDownLeft,
    CheckCircle2,
    Copy,
    QrCode,
    ChevronRight,
    AlertCircle,
    Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAssets, useDeposit, useWithdraw } from "@/hooks/use-treasury";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import AssetIcon from "@/components/dashboard/AssetIcon";

type TransferStep = "select" | "details" | "confirm" | "success";
type TransferType = "deposit" | "withdraw";

export default function TreasuryTransfer() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [step, setStep] = useState<TransferStep>("select");
    const [type, setType] = useState<TransferType>((searchParams.get("type") as TransferType) || "deposit");
    const [selectedAsset, setSelectedAsset] = useState<any>(null);
    const [amount, setAmount] = useState("");
    const [address, setAddress] = useState("");

    const { data: assets = [], isLoading: assetsLoading } = useAssets();
    const depositMutation = useDeposit();
    const withdrawMutation = useWithdraw();

    useEffect(() => {
        if (assets.length > 0 && !selectedAsset) {
            setSelectedAsset(assets[0]);
        }
    }, [assets, selectedAsset]);

    const handleNext = () => {
        if (step === "select") setStep("details");
        else if (step === "details") setStep("confirm");
    };

    const handleBack = () => {
        if (step === "select") navigate("/dashboard/treasury");
        else if (step === "details") setStep("select");
        else if (step === "confirm") setStep("details");
    };

    const handleSubmit = () => {
        const payload = {
            asset: selectedAsset.symbol,
            amount: parseFloat(amount),
            address: address || "Internal Wallet"
        };

        if (type === "deposit") {
            depositMutation.mutate(payload, {
                onSuccess: () => setStep("success")
            });
        } else {
            withdrawMutation.mutate(payload, {
                onSuccess: () => setStep("success")
            });
        }
    };

    const isAmountValid = parseFloat(amount) > 0 && (type === "deposit" || parseFloat(amount) <= selectedAsset?.balance);

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBack}
                    className="rounded-full hover:bg-white/5"
                >
                    <ArrowLeft className="w-5 h-5 text-zinc-400" />
                </Button>
                <div>
                    <h1 className="text-2xl font-semibold text-white capitalize">{type} Funds</h1>
                    <p className="text-sm text-zinc-500">Step {getStepNumber(step)} of 3</p>
                </div>
            </div>

            {/* Stepper Progress */}
            <div className="flex items-center gap-2 mb-10 px-4">
                {["select", "details", "confirm"].map((s, i) => (
                    <div key={s} className="flex-1 flex items-center gap-2">
                        <div className={cn(
                            "h-1 rounded-full flex-1 transition-all duration-500",
                            getStepIndex(step) >= i ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "bg-white/5"
                        )} />
                    </div>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {step === "select" && (
                    <motion.div
                        key="select"
                        initial={false}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div className="premium-card p-6">
                            <h3 className="text-lg font-bold text-white mb-6">Select Asset</h3>
                            <div className="grid grid-cols-1 gap-3">
                                {assetsLoading ? (
                                    <div className="py-10 text-center text-zinc-500">Loading assets...</div>
                                ) : assets.map((asset: any) => (
                                    <button
                                        key={asset.symbol}
                                        onClick={() => setSelectedAsset(asset)}
                                        className={cn(
                                            "flex items-center justify-between p-4 rounded-xl border transition-all",
                                            selectedAsset?.symbol === asset.symbol
                                                ? "bg-emerald-500/10 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                                                : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <AssetIcon
                                                src={asset.icon}
                                                symbol={asset.symbol}
                                                size="md"
                                            />
                                            <div className="text-left">
                                                <p className="text-sm font-bold text-white tracking-tight">{asset.symbol}</p>
                                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{asset.name}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-white tabular-nums tracking-tight">
                                                {asset.balance.toLocaleString()} {asset.symbol}
                                            </p>
                                            <p className="text-[10px] text-zinc-500 tracking-tight">
                                                ≈ ${asset.usdValue.toLocaleString()}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <Button
                            className="btn-primary w-full h-12 rounded-xl text-lg font-bold"
                            onClick={handleNext}
                            disabled={!selectedAsset}
                        >
                            Continue
                        </Button>
                    </motion.div>
                )}

                {step === "details" && (
                    <motion.div
                        key="details"
                        initial={false}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div className="premium-card p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-lg font-bold text-white">Transfer Details</h3>
                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/5 border border-emerald-500/10">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Network: {selectedAsset?.chain}</span>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div>
                                    <label className="text-xs text-zinc-500 mb-3 block uppercase tracking-widest font-bold">Amount to {type}</label>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="h-16 text-3xl font-bold bg-white/5 border-white/10 rounded-2xl px-6 focus:ring-emerald-500/20 tabular-nums placeholder:text-zinc-800"
                                        />
                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-end">
                                            <span className="text-zinc-400 font-bold text-sm tracking-tight">{selectedAsset?.symbol}</span>
                                            <button
                                                onClick={() => setAmount(selectedAsset?.balance.toString())}
                                                className="text-[10px] text-emerald-500 hover:text-emerald-400 font-bold uppercase tracking-widest mt-1"
                                            >
                                                Use Max
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex items-center justify-between px-2">
                                        <p className="text-[11px] text-zinc-500">Available: <span className="text-zinc-300 font-bold tabular-nums">{selectedAsset?.balance} {selectedAsset?.symbol}</span></p>
                                        {amount && (
                                            <p className="text-[11px] text-zinc-500 font-medium">≈ ${(parseFloat(amount) * (selectedAsset?.usdValue / selectedAsset?.balance)).toLocaleString()} USD</p>
                                        )}
                                    </div>
                                </div>

                                {type === "withdraw" && (
                                    <div>
                                        <label className="text-xs text-zinc-500 mb-3 block uppercase tracking-widest font-bold">Destination Address</label>
                                        <div className="relative">
                                            <Input
                                                value={address}
                                                onChange={(e) => setAddress(e.target.value)}
                                                placeholder="Enter wallet address..."
                                                className="h-14 bg-white/5 border-white/10 rounded-xl px-6 font-mono text-sm placeholder:text-zinc-700"
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                <button className="p-2 text-zinc-500 hover:text-white transition-colors">
                                                    <QrCode className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="mt-3 text-[10px] text-amber-500 flex items-center gap-1.5 font-medium px-2">
                                            <AlertCircle className="w-3 h-3" /> Please double check the address. Transactions cannot be reversed.
                                        </p>
                                    </div>
                                )}

                                {type === "deposit" && (
                                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-6 text-center space-y-4">
                                        <div className="w-20 h-20 bg-white rounded-xl mx-auto flex items-center justify-center p-2">
                                            <QrCode className="w-full h-full text-black" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Deposit to this Address</p>
                                            <div className="flex items-center justify-center gap-2 group cursor-pointer" onClick={() => {
                                                navigator.clipboard.writeText("0x71C7656EC7ab88b098defB751B7401B5f6d8976F");
                                                toast.success("Address copied");
                                            }}>
                                                <code className="text-xs text-emerald-400 font-mono break-all group-hover:text-emerald-300 transition-colors">0x71C7656E...f6d8976F</code>
                                                <Copy className="w-3.5 h-3.5 text-zinc-600 self-center" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <Button
                                variant="outline"
                                className="h-14 flex-1 rounded-xl border-white/10 bg-white/5 text-zinc-400 hover:text-white"
                                onClick={handleBack}
                            >
                                Back
                            </Button>
                            <Button
                                className="btn-primary h-14 flex-[2] rounded-xl text-lg font-bold"
                                onClick={handleNext}
                                disabled={!amount || !isAmountValid || (type === "withdraw" && !address)}
                            >
                                Review {type}
                            </Button>
                        </div>
                    </motion.div>
                )}

                {step === "confirm" && (
                    <motion.div
                        key="confirm"
                        initial={false}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div className="premium-card p-8">
                            <h3 className="text-xl font-bold text-white mb-8 text-center">Confirm Transfer</h3>

                            <div className="flex flex-col items-center mb-10">
                                <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 mb-4 shadow-[0_0_30px_-5px_rgba(16,185,129,0.2)]">
                                    {type === "deposit" ? (
                                        <ArrowDownLeft className="w-7 h-7 text-emerald-500" />
                                    ) : (
                                        <ArrowUpRight className="w-7 h-7 text-emerald-500" />
                                    )}
                                </div>
                                <h4 className="text-3xl font-bold text-white tabular-nums tracking-tighter">
                                    {amount} {selectedAsset?.symbol}
                                </h4>
                                <p className="text-zinc-500 text-sm mt-1 uppercase tracking-widest font-bold">Total {type}</p>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="flex justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                                    <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Asset</span>
                                    <div className="flex items-center gap-2">
                                        <AssetIcon
                                            src={selectedAsset?.icon}
                                            symbol={selectedAsset?.symbol}
                                            size="xs"
                                        />
                                        <span className="text-xs text-white font-bold">{selectedAsset?.name} ({selectedAsset?.symbol})</span>
                                    </div>
                                </div>
                                <div className="flex justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                                    <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Network</span>
                                    <span className="text-xs text-zinc-300 font-bold">{selectedAsset?.chain}</span>
                                </div>
                                {type === "withdraw" && (
                                    <div className="flex justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl gap-6">
                                        <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider flex-shrink-0">Destination</span>
                                        <span className="text-xs text-zinc-400 font-mono text-right break-all leading-relaxed">{address}</span>
                                    </div>
                                )}
                                <div className="flex justify-between p-4 bg-white/[0.02] border border-emerald-500/20 rounded-xl">
                                    <span className="text-xs text-emerald-500 font-bold uppercase tracking-wider">Trading Fee</span>
                                    <span className="text-xs text-emerald-500 font-bold">$0.00 (Promo)</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Button
                                    className="btn-primary w-full h-14 rounded-xl text-lg font-bold"
                                    onClick={handleSubmit}
                                    disabled={depositMutation.isPending || withdrawMutation.isPending}
                                >
                                    {(depositMutation.isPending || withdrawMutation.isPending) ? (
                                        <div className="flex items-center gap-3">
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Processing...
                                        </div>
                                    ) : (
                                        `Confirm ${type}`
                                    )}
                                </Button>
                                <p className="text-[10px] text-zinc-600 text-center font-medium leading-relaxed px-10">
                                    By confirming, you agree to our Terms of Service and acknowledge the asset risks on {selectedAsset?.chain}.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === "success" && (
                    <motion.div
                        key="success"
                        initial={false}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-6"
                    >
                        <div className="premium-card p-12 text-center overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
                            <div className="absolute -top-24 -left-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px]" />
                            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]" />

                            <div className="relative z-10 space-y-8">
                                <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_-10px_rgba(16,185,129,0.3)]">
                                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-3xl font-bold text-white tracking-tight capitalize">{type} Successful!</h2>
                                    <p className="text-zinc-500 font-medium">Your transaction has been broadcasted to the {selectedAsset?.chain} network.</p>
                                </div>

                                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-left max-w-sm mx-auto space-y-4">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-zinc-500">Amount</span>
                                        <span className="text-white font-bold">{amount} {selectedAsset?.symbol}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-zinc-500">Status</span>
                                        <span className="text-emerald-500 font-bold uppercase tracking-wider">Confirmed</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-zinc-500">TX Hash</span>
                                        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => toast.success("Hash copied")}>
                                            <span className="text-zinc-400 font-mono">0x4a...3d2f</span>
                                            <Copy className="w-3 h-3 text-zinc-600 group-hover:text-emerald-400" />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 pt-4">
                                    <Button
                                        onClick={() => navigate("/dashboard/treasury")}
                                        className="btn-primary h-12 rounded-xl font-bold"
                                    >
                                        Return to Treasury
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="h-10 text-zinc-500 hover:text-white"
                                        onClick={() => window.open(`https://etherscan.io`, "_blank")}
                                    >
                                        View on Explorer
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function getStepNumber(step: TransferStep) {
    switch (step) {
        case "select": return 1;
        case "details": return 2;
        case "confirm": return 3;
        default: return 3;
    }
}

function getStepIndex(step: TransferStep) {
    switch (step) {
        case "select": return 0;
        case "details": return 1;
        case "confirm": return 2;
        case "success": return 3;
        default: return 0;
    }
}
