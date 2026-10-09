import { useState } from "react";
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
import { useWorkers, useCreatePayrollBatch } from "@/hooks/use-payroll";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Check, ChevronRight, ChevronLeft, Loader2, Users, DollarSign, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
interface NewBatchWizardProps {
    isOpen: boolean;
    onClose: () => void;
}
export function NewBatchWizard({ isOpen, onClose }: NewBatchWizardProps) {
    const [step, setStep] = useState(1);
    const { data: workers = [] } = useWorkers();
    const { mutate: createBatch, isPending } = useCreatePayrollBatch();

    const [batchData, setBatchData] = useState({
        name: "",
        description: "",
        startDate: new Date().toISOString().split('T')[0],
    });
    const [selectedWorkers, setSelectedWorkers] = useState<Record<string, { selected: boolean; amount: string }>>({});
    const [searchQuery, setSearchQuery] = useState("");

    const filteredWorkers = workers.filter((w: any) =>
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleWorker = (workerId: string) => {
        setSelectedWorkers(prev => ({
            ...prev,
            [workerId]: {
                selected: !prev[workerId]?.selected,
                amount: prev[workerId]?.amount || "0"
            }
        }));
    };

    const updateAmount = (workerId: string, amount: string) => {
        setSelectedWorkers(prev => ({
            ...prev,
            [workerId]: {
                ...prev[workerId],
                amount
            }
        }));
    };

    const selectedCount = Object.values(selectedWorkers).filter(v => v.selected).length;
    const totalAmount = Object.values(selectedWorkers)
        .filter(v => v.selected)
        .reduce((sum, v) => sum + (parseFloat(v.amount) || 0), 0);

    const handleCreate = () => {
        const workerIds = Object.entries(selectedWorkers)
            .filter(([_, v]) => v.selected)
            .map(([id]) => id);

        const amounts = Object.entries(selectedWorkers)
            .filter(([_, v]) => v.selected)
            .map(([_, v]) => parseFloat(v.amount) || 0);

        createBatch({
            name: batchData.name || `Payroll Batch - ${new Date().toLocaleDateString()}`,
            description: batchData.description,
            startDate: batchData.startDate,
            workerIds,
            amounts
        }, {
            onSuccess: () => {
                onClose();
                setStep(1);
                setBatchData({
                    name: "",
                    description: "",
                    startDate: new Date().toISOString().split('T')[0],
                });
                setSelectedWorkers({});
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[85vh] bg-card border-border text-foreground flex flex-col p-0 overflow-hidden shadow-2xl">
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
                                Step {step} of 3
                            </span>
                        </div>
                        <DialogTitle className="text-xl font-bold text-foreground">
                            {step === 1 && "Basic Information"}
                            {step === 2 && "Select Recipients"}
                            {step === 3 && "Review & Confirm"}
                        </DialogTitle>
                    </DialogHeader>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6">
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
                                        <Label htmlFor="batchName" className="text-muted-foreground font-semibold">Batch Name</Label>
                                        <Input
                                            id="batchName"
                                            value={batchData.name}
                                            onChange={(e) => setBatchData({ ...batchData, name: e.target.value })}
                                            placeholder="e.g. Monthly Salaries - Oct 2023"
                                            className="bg-muted/50 border-border h-11 focus:border-emerald-500/50"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="startDate" className="text-muted-foreground font-semibold">Payment Date</Label>
                                            <Input
                                                id="startDate"
                                                type="date"
                                                value={batchData.startDate}
                                                onChange={(e) => setBatchData({ ...batchData, startDate: e.target.value })}
                                                className="bg-muted/50 border-border h-11 focus:border-emerald-500/50"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-muted-foreground font-semibold">Total Count</Label>
                                            <div className="h-11 flex items-center px-4 bg-muted/20 border border-border rounded-md text-foreground font-bold">
                                                {selectedCount} Workers
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="description" className="text-muted-foreground font-semibold">Description (Optional)</Label>
                                        <Input
                                            id="description"
                                            value={batchData.description}
                                            onChange={(e) => setBatchData({ ...batchData, description: e.target.value })}
                                            placeholder="Add a note or reference for this batch"
                                            className="bg-muted/50 border-border h-11 focus:border-emerald-500/50"
                                        />
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
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by name or email..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10 bg-muted/50 border-border"
                                    />
                                </div>

                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                                    {filteredWorkers.map((worker: any) => (
                                        <div
                                            key={worker.id}
                                            className={cn(
                                                "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer",
                                                selectedWorkers[worker.id]?.selected
                                                    ? "bg-emerald-500/5 border-emerald-500/30"
                                                    : "bg-muted/30 border-border hover:border-emerald-500/30"
                                            )}
                                            onClick={() => toggleWorker(worker.id)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Checkbox
                                                    checked={selectedWorkers[worker.id]?.selected}
                                                    onCheckedChange={() => toggleWorker(worker.id)}
                                                    className="border-border data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                                />
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        aria-hidden="true"
                                                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#cdd8c8] bg-[#e8eee4] text-[10px] font-semibold tracking-wide text-[#087f5b]"
                                                    >
                                                        {worker.name.split(" ").map((part: string) => part[0]).slice(0, 2).join("")}
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-xs font-bold text-foreground">{worker.name}</p>
                                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{worker.country}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {selectedWorkers[worker.id]?.selected && (
                                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                    <span className="text-xs text-muted-foreground font-bold">$</span>
                                                    <Input
                                                        type="number"
                                                        value={selectedWorkers[worker.id]?.amount}
                                                        onChange={(e) => updateAmount(worker.id, e.target.value)}
                                                        className="w-24 h-8 bg-card border-border text-xs text-right tabular-nums focus:border-emerald-500/50 text-foreground font-bold"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            )}
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
                                className="space-y-6"
                            >
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-muted/20 border border-border rounded-2xl">
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1 font-bold">Recipients</p>
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-emerald-500" />
                                            <span className="text-xl font-bold text-foreground">{selectedCount} Workers</span>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-muted/20 border border-border rounded-2xl">
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1 font-bold">Total Amount</p>
                                        <div className="flex items-center gap-2">
                                            <DollarSign className="w-4 h-4 text-emerald-500" />
                                            <span className="text-xl font-bold text-foreground">${totalAmount.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Breakdown</p>
                                    <div className="bg-muted/10 border border-border rounded-2xl overflow-hidden divide-y divide-border">
                                        {Object.entries(selectedWorkers)
                                            .filter(([_, v]) => v.selected && parseFloat(v.amount) > 0)
                                            .map(([workerId, v]) => {
                                                const worker = workers.find((w: any) => w.id === workerId);
                                                return (
                                                    <div key={workerId} className="flex items-center justify-between p-3 px-4">
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                aria-hidden="true"
                                                                className="flex h-6 w-6 items-center justify-center rounded-md border border-[#cdd8c8] bg-[#e8eee4] text-[8px] font-semibold tracking-wide text-[#087f5b]"
                                                            >
                                                                {worker?.name?.split(" ").map((part: string) => part[0]).slice(0, 2).join("") || "--"}
                                                            </div>
                                                            <span className="text-xs text-foreground font-medium">{worker?.name}</span>
                                                        </div>
                                                        <span className="text-xs font-bold text-foreground tracking-tight">${parseFloat(v.amount).toLocaleString()}</span>
                                                    </div>
                                                );
                                            })}
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
                        className="text-muted-foreground hover:text-foreground font-bold"
                    >
                        {step === 1 ? "Cancel" : "Back"}
                    </Button>

                    <div className="flex items-center gap-3">
                        {step < 3 ? (
                            <Button
                                onClick={() => setStep(step + 1)}
                                disabled={step === 1 && !batchData.name}
                                className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold h-11 px-6 rounded-xl group"
                            >
                                Continue
                                <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                            </Button>
                        ) : (
                            <Button
                                onClick={handleCreate}
                                disabled={isPending || selectedCount === 0 || totalAmount === 0}
                                className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold h-11 px-8 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                            >
                                {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                                Create & Schedule Batch
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
