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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useAddWorker } from "@/hooks/use-payroll";
import { CurrencyFlag } from "@/components/dashboard/AssetIcon";
import { Loader2 } from "lucide-react";

interface AddWorkerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AddWorkerModal({ isOpen, onClose }: AddWorkerModalProps) {
    const { mutate: addWorker, isPending } = useAddWorker();
    const [formData, setFormData] = useState({
        name: "",
        role: "",
        email: "",
        phone: "",
        country: "",
        wallet: "",
        bankAccount: "",
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addWorker(formData, {
            onSuccess: () => {
                onClose();
                setFormData({
                    name: "",
                    role: "",
                    email: "",
                    phone: "",
                    country: "",
                    wallet: "",
                    bankAccount: "",
                });
            },
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] bg-card border-border text-foreground shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-foreground">Add New Worker</DialogTitle>
                    <DialogDescription className="text-muted-foreground font-medium">
                        Enter the worker's details to add them to your payroll system.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-muted-foreground font-semibold">Full Name</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="John Doe"
                                className="bg-muted/50 border-border focus:border-emerald-500/50"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role" className="text-muted-foreground font-semibold">Role / Job Title</Label>
                            <Input
                                id="role"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                placeholder="Frontend Developer"
                                className="bg-muted/50 border-border focus:border-emerald-500/50"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-muted-foreground font-semibold">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="john@example.com"
                                className="bg-muted/50 border-border focus:border-emerald-500/50"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone" className="text-muted-foreground font-semibold">Phone Number</Label>
                            <Input
                                id="phone"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="+1 234 567 890"
                                className="bg-muted/50 border-border focus:border-emerald-500/50"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="country" className="text-muted-foreground font-semibold">Country</Label>
                        <Select
                            value={formData.country}
                            onValueChange={(value) => { if (value) setFormData({ ...formData, country: value }); }}
                        >
                            <SelectTrigger id="country">
                                <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="USA"><CurrencyFlag code="us" size="xs" />United States</SelectItem>
                                <SelectItem value="UK"><CurrencyFlag code="gb" size="xs" />United Kingdom</SelectItem>
                                <SelectItem value="Canada"><CurrencyFlag code="ca" size="xs" />Canada</SelectItem>
                                <SelectItem value="Nigeria"><CurrencyFlag code="ng" size="xs" />Nigeria</SelectItem>
                                <SelectItem value="Kenya"><CurrencyFlag code="ke" size="xs" />Kenya</SelectItem>
                                <SelectItem value="Brazil"><CurrencyFlag code="br" size="xs" />Brazil</SelectItem>
                                <SelectItem value="India"><CurrencyFlag code="in" size="xs" />India</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="wallet" className="text-muted-foreground font-semibold">Wallet Address (USDC/USDT)</Label>
                        <Input
                            id="wallet"
                            value={formData.wallet}
                            onChange={(e) => setFormData({ ...formData, wallet: e.target.value })}
                            placeholder="0x..."
                            className="bg-muted/50 border-border font-mono text-xs focus:border-emerald-500/50"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="bankAccount" className="text-muted-foreground font-semibold">Bank Account Details (Optional)</Label>
                        <Input
                            id="bankAccount"
                            value={formData.bankAccount}
                            onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                            placeholder="SWIFT/IBAN/Account Number"
                            className="bg-muted/50 border-border focus:border-emerald-500/50"
                        />
                    </div>

                    <DialogFooter className="pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                            className="bg-muted hover:bg-muted/80 text-foreground border-none font-bold"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isPending}
                            className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold min-w-[120px]"
                        >
                            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Add Worker"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
