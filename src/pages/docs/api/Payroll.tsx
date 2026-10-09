import { CodeWindow } from "@/components/docs/CodeWindow";
import { DocCallout } from "@/components/docs/DocCallout";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ClipboardList, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export default function PayrollAPI() {
    return <div className="max-w-5xl space-y-16">
        <header><div className="mb-6 flex flex-wrap items-center gap-3"><h1 className="text-4xl font-bold tracking-tight text-[#20211e]">Payroll API</h1><Badge variant="outline" className="border-[#cdd8c8] text-[#087f5b]">Sandbox batch flow</Badge></div><p className="max-w-3xl text-xl leading-relaxed text-[#575750]">Register workers, create a USDC payroll batch, approve it through an authorized role, and execute it once against the sandbox treasury balance.</p></header>
        <DocCallout type="info" title="Eligibility and authorization">Workers must have <code>kycStatus=verified</code> before they can be added to a batch. Creating a batch needs write access; approval and execution require an owner, admin, approver, or an API key with <code>approve</code>.</DocCallout>
        <Endpoint title="Add a worker" method="POST" path="/api/payroll/workers"><div className="space-y-5"><p className="leading-relaxed text-[#575750]">Creates a worker record. The current route stores operational contact and payout fields; it does not call a KYC provider.</p><ResponseCode code="201" desc="Worker created with pending KYC status" color="emerald" /></div><CodeWindow language="bash" title="cURL" code={`curl -X POST https://your-api.example.com/api/payroll/workers \\
  -H "Authorization: Bearer sk_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{"name":"John Doe","role":"Contractor","email":"john@example.com","phone":"+254700000000","country":"KE","wallet":"sandbox-wallet-001"}'`} /></Endpoint>
        <Endpoint title="Create a batch" method="POST" path="/api/payroll/batches"><div className="space-y-5"><p className="leading-relaxed text-[#575750]">Send equal-length <code>workerIds</code> and <code>amounts</code> arrays. This creates a draft and does not debit funds.</p><ResponseCode code="201" desc="Draft batch with payment rows" color="emerald" /><ResponseCode code="409" desc="Worker is not verified" color="zinc" /></div><CodeWindow language="bash" title="cURL" code={`curl -X POST https://your-api.example.com/api/payroll/batches \\
  -H "Authorization: Bearer sk_test_..." \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: payroll-demo-001" \\
  -d '{"name":"October payroll","workerIds":["worker_1","worker_2"],"amounts":[420,650]}'`} /></Endpoint>
        <Endpoint title="Approve and execute" method="POST" path="/api/payroll/batches/:id/approve → /execute"><div className="space-y-5"><p className="leading-relaxed text-[#575750]">Approval and execution are separate transitions. Execution atomically claims the approved batch, checks USDC balance, completes payment rows, updates workers, and writes a sandbox transaction.</p><ResponseCode code="200" desc="Approved or completed batch" color="emerald" /><ResponseCode code="409" desc="Invalid state or insufficient balance" color="zinc" /></div><CodeWindow language="bash" title="cURL" code={`curl -X POST https://your-api.example.com/api/payroll/batches/batch_123/approve \\
  -H "Authorization: Bearer sk_test_approver..."

curl -X POST https://your-api.example.com/api/payroll/batches/batch_123/execute \\
  -H "Authorization: Bearer sk_test_approver..." \\
  -H "Idempotency-Key: payroll-execute-batch_123"`} /></Endpoint>
        <Endpoint title="Read the final batch" method="GET" path="/api/payroll/batches/:id"><div className="space-y-5"><p className="leading-relaxed text-[#575750]">Read the batch and nested payments after execution. Reconcile from persisted payment status and transaction references rather than a client-side optimistic state.</p><ResponseCode code="200" desc="Company-scoped batch and payments" color="blue" /></div><CodeWindow language="bash" title="cURL" code={`curl https://your-api.example.com/api/payroll/batches/batch_123 \\
  -H "Authorization: Bearer sk_test_..."`} /></Endpoint>
        <section className="grid gap-6 border-t border-[#d9d6cd] pt-12 md:grid-cols-3"><Highlight icon={<UsersRound />} title="Worker ownership" copy="Workers and batch payments are always scoped to the authenticated company." /><Highlight icon={<ClipboardList />} title="State machine" copy="Draft, approved, processing, and completed states are explicit." /><Highlight icon={<CheckCircle2 />} title="Atomic execution" copy="Balance debit and payment completion commit together." /></section>
    </div>;
}
function Endpoint({ title, method, path, children }: { title: string; method: string; path: string; children: ReactNode }) { const [details, code] = Array.isArray(children) ? children : [children, null]; return <section className="space-y-8 border-t border-[#d9d6cd] pt-12 first:border-t-0 first:pt-0"><div className="flex flex-wrap items-center gap-3"><Badge className={cn("border px-3 py-1 font-mono", method === "GET" ? "border-blue-500/20 bg-blue-500/10 text-[#087f5b]" : "border-emerald-500/20 bg-emerald-500/10 text-[#087f5b]")}>{method}</Badge><code className="text-xl text-[#20211e]">{path}</code></div><h2 className="text-2xl font-bold text-[#20211e]">{title}</h2><div className="grid gap-10 xl:grid-cols-2"><div>{details}</div><div>{code}</div></div></section>; }
function ResponseCode({ code, desc, color }: { code: string; desc: string; color: "emerald" | "blue" | "zinc" }) { const colors = { emerald: "border-emerald-500/20 bg-emerald-500/10 text-[#087f5b]", blue: "border-blue-500/20 bg-blue-500/10 text-[#087f5b]", zinc: "border-[#d9d6cd] bg-[#f5f3ee] text-[#575750]" }; return <div className={cn("flex items-center gap-4 rounded-xl border p-4", colors[color])}><span className="min-w-12 font-mono text-sm font-bold">{code}</span><span className="text-xs">{desc}</span></div>; }
function Highlight({ icon, title, copy }: { icon: ReactNode; title: string; copy: string }) { return <div className="space-y-4 rounded-2xl border border-[#d9d6cd] bg-[#fffdf8] p-6"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#cdd8c8] bg-[#e8eee4] text-[#087f5b]">{icon}</div><h3 className="font-bold text-[#20211e]">{title}</h3><p className="text-xs leading-relaxed text-[#77766e]">{copy}</p></div>; }
