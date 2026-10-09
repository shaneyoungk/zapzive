import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useUpdateWorker } from "@/hooks/use-payroll";

type Worker = { id: string; name: string; role: string; email: string; phone: string; country: string; wallet: string; bankAccount?: string };
const fields = [["name", "Full name"], ["role", "Role"], ["email", "Email"], ["phone", "Phone"], ["country", "Country"], ["wallet", "Wallet address"], ["bankAccount", "Bank account"]] as const;

export function EditWorkerModal({ worker, isOpen, onClose }: { worker: Worker | null; isOpen: boolean; onClose: () => void }) {
    const updateWorker = useUpdateWorker();
    const [form, setForm] = useState<Record<string, string>>({});
    useEffect(() => { if (worker) setForm({ ...worker, bankAccount: worker.bankAccount || "" }); }, [worker]);
    const submit = (event: React.FormEvent) => { event.preventDefault(); if (!worker || !form.name?.trim() || !form.email?.trim()) return; updateWorker.mutate({ id: worker.id, data: form }, { onSuccess: onClose }); };
    return <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}><DialogContent className="sm:max-w-[560px] bg-card border-border text-foreground"><DialogHeader><DialogTitle>Edit worker details</DialogTitle><DialogDescription>Update this worker’s payment and contact information.</DialogDescription></DialogHeader><form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">{fields.map(([field, label]) => <div key={field} className={field === "wallet" || field === "bankAccount" ? "sm:col-span-2" : ""}><Label htmlFor={`edit-worker-${field}`} className="text-muted-foreground">{label}</Label><Input id={`edit-worker-${field}`} value={form[field] || ""} onChange={(e) => setForm({ ...form, [field]: e.target.value })} className="mt-1.5 bg-background border-border text-foreground" required={field === "name" || field === "email"} /></div>)}<DialogFooter className="sm:col-span-2 pt-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={updateWorker.isPending || !form.name?.trim() || !form.email?.trim()}>{updateWorker.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save changes</Button></DialogFooter></form></DialogContent></Dialog>;
}
