import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateContract } from "@/hooks/use-escrow";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, ChevronRight, Loader2, Shield, Calendar, DollarSign, Link, Copy, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator, SelectLabel } from "@/components/ui/select";
import { useWorkers } from "@/hooks/use-payroll";
import { useAuth } from "@/contexts/AuthContext";

interface NewContractWizardProps {
    isOpen: boolean;
    onClose: () => void;
}

interface Milestone {
    title: string;
    description: string;
    amount: string;
    dueDate: string;
}

export function NewContractWizard({ isOpen, onClose }: NewContractWizardProps) {
    const { company } = useAuth();
    const [step, setStep] = useState(1);
    const { mutate: createContract, isPending } = useCreateContract();
    const { data: workers } = useWorkers();

    // Success/Share state
    const [createdContractId, setCreatedContractId] = useState<string | null>(null);

    const [contractData, setContractData] = useState({
        title: "",
        description: "",
        client: company?.name || "",
        contractor: "",
        startDate: "",
        endDate: "",
        isPublic: false
    });

    // Update client if company name loads later
    useEffect(() => {
        if (company?.name && !contractData.client) {
            setContractData(prev => ({ ...prev, client: company.name }));
        }
    }, [company]);

    const [milestones, setMilestones] = useState<Milestone[]>([
        { title: "Initial Milestone", description: "", amount: "", dueDate: "" }
    ]);

    const addMilestone = () => {
        setMilestones([...milestones, { title: "", description: "", amount: "", dueDate: "" }]);
    };

    const removeMilestone = (index: number) => {
        if (milestones.length > 1) {
            setMilestones(milestones.filter((_, i) => i !== index));
        }
    };

    const updateMilestone = (index: number, field: keyof Milestone, value: string) => {
        const newMilestones = [...milestones];
        newMilestones[index] = { ...newMilestones[index], [field]: value };
        setMilestones(newMilestones);
    };

    const totalAmount = milestones.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0);
    const hasValidContractBasics = Boolean(
        contractData.title.trim() &&
        contractData.description.trim() &&
        contractData.client.trim() &&
        contractData.contractor.trim() &&
        contractData.startDate &&
        contractData.endDate &&
        new Date(contractData.endDate) >= new Date(contractData.startDate)
    );
    const hasValidMilestones = milestones.every((milestone) => Boolean(
        milestone.title.trim() &&
        milestone.description.trim() &&
        milestone.dueDate &&
        Number.isFinite(Number(milestone.amount)) &&
        Number(milestone.amount) > 0
    ));
    const canReview = hasValidMilestones && totalAmount > 0;

    const handleCreate = () => {
        if (!hasValidContractBasics || !canReview) return;
        createContract({
            ...contractData,
            totalAmount,
            milestones: milestones.map(m => ({
                ...m,
                amount: parseFloat(m.amount) || 0
            }))
        }, {
            onSuccess: (data: any) => {
                if (contractData.isPublic) {
                    setCreatedContractId(data.id);
                    setStep(4); // Move to Share step
                } else {
                    onClose();
                    resetForm();
                }
            }
        });
    };

    const resetForm = () => {
        setStep(1);
        setCreatedContractId(null);
        setContractData({
            title: "",
            description: "",
            client: company?.name || "",
            contractor: "",
            startDate: "",
            endDate: "",
            isPublic: false
        });
        setMilestones([{ title: "Initial Milestone", description: "", amount: "", dueDate: "" }]);
    };

    const copyLink = () => {
        const link = `${window.location.origin}/p/contract/${createdContractId}`;
        navigator.clipboard.writeText(link);
        // You might want to add a toast here
    };

    return (
        <Dialog open={isOpen} onOpenChange={() => { onClose(); resetForm(); }}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] bg-card border-border text-foreground flex flex-col p-0 overflow-hidden shadow-2xl">
                {/* Fixed Header */}
                <div className="p-6 border-b border-border bg-muted/30">
                    <DialogHeader>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex gap-1.5">
                                {[1, 2, 3].map((s) => (
                                    <div
                                        key={s}
                                        className={cn(
                                            "h-1.5 w-8 rounded-full transition-all duration-300",
                                            step === s ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" : s < step ? "bg-emerald-500/30" : "bg-muted shadow-inner"
                                        )}
                                    />
                                ))}
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                {step === 4 ? "Complete" : `Step ${step} of 3`}
                            </span>
                        </div>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
                            {step === 4 ? (
                                <>
                                    <Link className="w-5 h-5 text-emerald-500" />
                                    Share Contract
                                </>
                            ) : (
                                <>
                                    <Shield className="w-5 h-5 text-emerald-500" />
                                    {step === 1 && "Contract Basics"}
                                    {step === 2 && "Milestone Planning"}
                                    {step === 3 && "Security Review"}
                                </>
                            )}
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
                                className="space-y-6"
                            >
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="title" className="text-muted-foreground font-semibold">Contract Title</Label>
                                        <Input
                                            id="title"
                                            value={contractData.title}
                                            onChange={(e) => setContractData({ ...contractData, title: e.target.value })}
                                            placeholder="e.g. Design System Overhaul"
                                            className="bg-muted/50 border-border h-11 focus:border-emerald-500/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="description" className="text-muted-foreground font-semibold">Description (Requirements)</Label>
                                        <Textarea
                                            id="description"
                                            value={contractData.description}
                                            onChange={(e) => setContractData({ ...contractData, description: e.target.value })}
                                            placeholder="Detailed description of the contract requirements..."
                                            className="bg-muted/50 border-border focus:border-emerald-500/50 min-h-[100px]"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="client" className="text-muted-foreground font-semibold">Client (Payer)</Label>
                                            <Input
                                                id="client"
                                                value={contractData.client}
                                                onChange={(e) => setContractData({ ...contractData, client: e.target.value })}
                                                placeholder="Company Name"
                                                className="bg-muted/50 border-border h-11 focus:border-emerald-500/50"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="contractor" className="text-muted-foreground font-semibold">Contractor (Payee)</Label>
                                            <Select
                                                value={contractData.contractor}
                                                onValueChange={(value) => {
                                                    if (!value) return;
                                                    const isExternal = value === "External / Open Bid";
                                                    setContractData({
                                                        ...contractData,
                                                        contractor: value,
                                                        isPublic: isExternal
                                                    });
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select contractor" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="External / Open Bid">
                                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e7f3ed] text-[11px] font-bold text-[#0b6b4f]">↗</span>
                                                        Open bid · share a public link
                                                    </SelectItem>
                                                    {workers && workers.length > 0 && <SelectSeparator />}
                                                    {workers && workers.length > 0 && <SelectLabel>Your workers</SelectLabel>}
                                                    {workers?.map(worker => (
                                                        <SelectItem key={worker.id} value={worker.name}>
                                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f1efe9] text-[10px] font-bold text-[#55544d]">{worker.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span>
                                                            {worker.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="startDate" className="text-muted-foreground font-semibold">Start Date</Label>
                                            <Input
                                                id="startDate"
                                                type="date"
                                                value={contractData.startDate}
                                                onChange={(e) => setContractData({ ...contractData, startDate: e.target.value })}
                                                className="bg-muted/50 border-border h-11 focus:border-emerald-500/50"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="endDate" className="text-muted-foreground font-semibold">End Date (Estimated)</Label>
                                            <Input
                                                id="endDate"
                                                type="date"
                                                value={contractData.endDate}
                                                onChange={(e) => setContractData({ ...contractData, endDate: e.target.value })}
                                                className="bg-muted/50 border-border h-11 focus:border-emerald-500/50"
                                            />
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
                                <div className="space-y-4">
                                    {milestones.map((milestone, index) => (
                                        <div key={index} className="p-4 bg-muted/20 border border-border/60 rounded-2xl relative group/milestone">
                                            {milestones.length > 1 && (
                                                <button
                                                    onClick={() => removeMilestone(index)}
                                                    className="absolute -top-2 -right-2 p-1.5 bg-card border border-border rounded-full text-muted-foreground hover:text-red-500 opacity-0 group-hover/milestone:opacity-100 transition-opacity shadow-sm"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-3 gap-3">
                                                    <div className="col-span-2 space-y-1.5">
                                                        <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Title</Label>
                                                        <Input
                                                            value={milestone.title}
                                                            onChange={(e) => updateMilestone(index, "title", e.target.value)}
                                                            placeholder="e.g. Initial Wireframes"
                                                            className="bg-card border-border h-9 text-sm"
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Amount ($)</Label>
                                                        <Input
                                                            type="number"
                                                            value={milestone.amount}
                                                            onChange={(e) => updateMilestone(index, "amount", e.target.value)}
                                                            placeholder="0.00"
                                                            className="bg-card border-border h-9 text-sm text-right font-mono"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-3">
                                                    <div className="col-span-2 space-y-1.5">
                                                        <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Description</Label>
                                                        <Textarea
                                                            value={milestone.description}
                                                            onChange={(e) => updateMilestone(index, "description", e.target.value)}
                                                            placeholder="Deliverables summary..."
                                                            className="bg-card border-border min-h-[60px] text-sm"
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Due Date</Label>
                                                        <Input
                                                            type="date"
                                                            value={milestone.dueDate}
                                                            onChange={(e) => updateMilestone(index, "dueDate", e.target.value)}
                                                            className="bg-card border-border h-9 text-xs"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <Button
                                        variant="outline"
                                        onClick={addMilestone}
                                        className="w-full border-dashed border-border hover:border-emerald-500/50 hover:bg-emerald-500/5 text-muted-foreground hover:text-emerald-500 py-6"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Another Milestone
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="p-4 bg-muted/30 border border-border rounded-2xl">
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1 font-bold">Total Value</p>
                                        <div className="flex items-center gap-2">
                                            <DollarSign className="w-4 h-4 text-emerald-500" />
                                            <span className="text-xl font-bold text-foreground">${totalAmount.toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-muted/30 border border-border rounded-2xl">
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1 font-bold">Milestones</p>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-blue-500" />
                                            <span className="text-xl font-bold">{milestones.length}</span>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-muted/30 border border-border rounded-2xl">
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1 font-bold">Escrow</p>
                                        <div className="flex items-center gap-2 text-emerald-500">
                                            <Shield className="w-4 h-4" />
                                            <span className="text-xl font-bold">Secured</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="bg-muted/20 border border-border rounded-2xl p-4">
                                        <h4 className="text-sm font-bold text-foreground mb-2">{contractData.title}</h4>
                                        <div className="grid grid-cols-2 gap-4 text-xs">
                                            <div>
                                                <p className="text-muted-foreground mb-0.5">Payer</p>
                                                <p className="text-foreground font-medium">{contractData.client}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground mb-0.5">Payee</p>
                                                <p className="text-foreground font-medium">{contractData.contractor}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Planned Payouts</p>
                                        <div className="bg-muted/20 border border-border rounded-2xl overflow-hidden divide-y divide-border">
                                            {milestones.map((m, i) => (
                                                <div key={i} className="flex items-center justify-between p-3 px-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs text-foreground font-medium">{m.title || "Untitled Milestone"}</span>
                                                        <span className="text-[10px] text-muted-foreground italic">Due {m.dueDate || "N/A"}</span>
                                                    </div>
                                                    <span className="text-sm font-mono text-emerald-500 font-bold">${(parseFloat(m.amount) || 0).toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 4 && (
                            <motion.div
                                key="step4"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center justify-center py-10 space-y-6 text-center"
                            >
                                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                    <Check className="w-8 h-8 text-emerald-500" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold text-foreground">Contract Ready for Bids</h3>
                                    <p className="text-muted-foreground max-w-sm mx-auto font-medium">
                                        Your contract has been created. Share this public link with external contractors to receive bids.
                                    </p>
                                </div>

                                <div className="w-full max-w-md bg-muted border border-border rounded-xl p-3 flex items-center gap-2">
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-sm text-muted-foreground truncate text-left font-mono">
                                            {window.location.origin}/p/contract/{createdContractId}
                                        </p>
                                    </div>
                                    <Button size="sm" onClick={copyLink} variant="outline" className="h-8 w-8 p-0 bg-card border-border hover:bg-muted">
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </div>

                                <Button
                                    onClick={resetForm}
                                    variant="outline"
                                    className="border-border hover:bg-muted text-muted-foreground h-11 px-8 rounded-xl font-bold"
                                >
                                    Done
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Fixed Footer (Hidden for Step 4) */}
                {step < 4 && (
                    <div className="p-6 border-t border-border flex items-center justify-between bg-card">
                        <Button
                            variant="ghost"
                            onClick={step === 1 ? onClose : () => setStep(step - 1)}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            {step === 1 ? "Cancel" : "Back"}
                        </Button>

                        <div className="flex items-center gap-3">
                            {step < 3 ? (
                                <Button
                                    onClick={() => setStep(step + 1)}
                                    disabled={step === 1 ? !hasValidContractBasics : !canReview}
                                    className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold h-11 px-6 rounded-xl group"
                                >
                                    {step === 1 ? "Continue to milestones" : "Review and secure"}
                                    <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleCreate}
                                    disabled={isPending || !canReview}
                                    className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold h-11 px-8 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                                >
                                    {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
                                    {contractData.isPublic ? "Create & Get Link" : "Launch Escrow Contract"}
                                </Button>
                            )}
                        </div>
                    </div>
                )}
                {step < 4 && ((step === 1 && !hasValidContractBasics) || (step === 2 && !canReview)) && (
                    <div className="flex items-center gap-2 border-t border-border/60 bg-amber-500/5 px-6 py-3 text-xs text-muted-foreground" role="status">
                        <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                        {step === 1
                            ? "Complete the contract details, dates, and requirements before continuing."
                            : "Add a title, description, due date, and positive amount for every milestone."
                        }
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
