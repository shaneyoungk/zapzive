import { CodeWindow } from "@/components/docs/CodeWindow";
import { DocCallout } from "@/components/docs/DocCallout";
import { Badge } from "@/components/ui/badge";
import { Gavel, LockKeyhole, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export default function EscrowAPI() {
    return <div className="max-w-5xl space-y-16">
        <header><div className="mb-6 flex flex-wrap items-center gap-3"><h1 className="text-4xl font-bold tracking-tight text-[#20211e]">Escrow API</h1><Badge variant="outline" className="border-[#cdd8c8] text-[#087f5b]">Sandbox workflow</Badge></div><p className="max-w-3xl text-xl leading-relaxed text-[#575750]">Create milestone contracts, collect public bids, accept a contractor, and release exact milestone amounts from the sandbox ledger. This is not a smart contract deployment.</p></header>

        <DocCallout type="info" title="State and authorization">Contract creation requires an operator-level user. Bid acceptance and milestone release require an approver-level user or an API key with the <code>approve</code> scope. All balances and records remain in the sandbox database.</DocCallout>

        <Endpoint title="Create a contract" method="POST" path="/api/escrow/contracts"><div className="space-y-5"><p className="leading-relaxed text-[#575750]">Create a draft contract. Milestone amounts must add up exactly to <code>totalAmount</code>.</p><ResponseCode code="201" desc="Draft contract with milestones" color="emerald" /><ResponseCode code="422" desc="Invalid dates or milestone total" color="zinc" /></div><CodeWindow language="bash" title="cURL" code={`curl -X POST https://your-api.example.com/api/escrow/contracts \\
  -H "Authorization: Bearer sk_test_..." \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: contract-demo-001" \\
  -d '{
    "title":"Website delivery",
    "description":"Milestone-based sandbox work",
    "client":"Acme Ltd",
    "contractor":"Studio North",
    "totalAmount":100,
    "startDate":"2026-01-01",
    "endDate":"2026-03-31",
    "isPublic":true,
    "milestones":[{"title":"Final delivery","description":"Review and accept final files","amount":100,"dueDate":"2026-03-31"}]
  }'`} /></Endpoint>

        <Endpoint title="Submit a public bid" method="POST" path="/api/escrow/public/:id/bid"><div className="space-y-5"><p className="leading-relaxed text-[#575750]">Public bids do not use an API key. The contract must be public and still in draft state.</p><ResponseCode code="201" desc="Pending bid created" color="emerald" /><ResponseCode code="404" desc="Contract is private or no longer accepting bids" color="zinc" /></div><CodeWindow language="bash" title="cURL" code={`curl -X POST https://your-api.example.com/api/escrow/public/contract_123/bid \\
  -H "Content-Type: application/json" \\
  -d '{"contractorName":"Studio North","contractorEmail":"ops@example.com","proposal":"We can deliver the scope.","amount":100}'`} /></Endpoint>

        <Endpoint title="Accept a bid" method="PUT" path="/api/escrow/contracts/:id/bids/:bidId/accept"><div className="space-y-5"><p className="leading-relaxed text-[#575750]">Accepting a bid rejects other pending bids and moves the contract into its funded workflow. The caller must have the <code>approve</code> permission.</p><ResponseCode code="200" desc="Bid accepted and contract funded" color="emerald" /><ResponseCode code="409" desc="Invalid contract or bid state" color="zinc" /></div><CodeWindow language="bash" title="cURL" code={`curl -X PUT https://your-api.example.com/api/escrow/contracts/contract_123/bids/bid_123/accept \\
  -H "Authorization: Bearer sk_test_..." \\
  -H "Idempotency-Key: accept-demo-001"`} /></Endpoint>

        <Endpoint title="Release a milestone" method="POST" path="/api/escrow/contracts/:contractId/release"><div className="space-y-5"><p className="leading-relaxed text-[#575750]">Release the exact amount assigned to one milestone. The release is atomic: the milestone changes state, the locked amount decreases, and a ledger transaction is recorded together.</p><ResponseCode code="200" desc="Milestone released" color="emerald" /><ResponseCode code="409" desc="Wrong state, amount, or locked balance" color="zinc" /></div><CodeWindow language="bash" title="cURL" code={`curl -X POST https://your-api.example.com/api/escrow/contracts/contract_123/release \\
  -H "Authorization: Bearer sk_test_..." \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: release-demo-001" \\
  -d '{"milestoneId":"milestone_123","amount":100}'`} /></Endpoint>

        <DocCallout type="mistake" title="Do not call this on-chain">The <code>chain</code> value is <code>Sandbox</code>, and <code>contractAddress</code> is null. A provider-backed escrow, wallet custody, dispute arbitration, and smart-contract audit are still required before production use.</DocCallout>

        <section className="grid gap-6 border-t border-[#d9d6cd] pt-12 md:grid-cols-3"><Highlight icon={<LockKeyhole />} title="Exact releases" copy="Release amounts must equal the milestone amount." /><Highlight icon={<Gavel />} title="Bid workflow" copy="Public proposals remain pending until an authorized user accepts one." /><Highlight icon={<ShieldCheck />} title="Auditable state" copy="Protected transitions create company-scoped ledger and audit records." /></section>
    </div>;
}

function Endpoint({ title, method, path, children }: { title: string; method: string; path: string; children: ReactNode }) { const [details, code] = Array.isArray(children) ? children : [children, null]; return <section className="space-y-8 border-t border-[#d9d6cd] pt-12 first:border-t-0 first:pt-0"><div className="flex flex-wrap items-center gap-3"><Badge className={cn("border px-3 py-1 font-mono", method === "GET" ? "border-blue-500/20 bg-blue-500/10 text-[#087f5b]" : "border-emerald-500/20 bg-emerald-500/10 text-[#087f5b]")}>{method}</Badge><code className="text-xl text-[#20211e]">{path}</code></div><h2 className="text-2xl font-bold text-[#20211e]">{title}</h2><div className="grid gap-10 xl:grid-cols-2"><div>{details}</div><div>{code}</div></div></section>; }
function ResponseCode({ code, desc, color }: { code: string; desc: string; color: "emerald" | "zinc" }) { const colors = { emerald: "border-emerald-500/20 bg-emerald-500/10 text-[#087f5b]", zinc: "border-[#d9d6cd] bg-[#f5f3ee] text-[#575750]" }; return <div className={cn("flex items-center gap-4 rounded-xl border p-4", colors[color])}><span className="min-w-12 font-mono text-sm font-bold">{code}</span><span className="text-xs">{desc}</span></div>; }
function Highlight({ icon, title, copy }: { icon: ReactNode; title: string; copy: string }) { return <div className="space-y-4 rounded-2xl border border-[#d9d6cd] bg-[#fffdf8] p-6"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#cdd8c8] bg-[#e8eee4] text-[#087f5b]">{icon}</div><h3 className="font-bold text-[#20211e]">{title}</h3><p className="text-xs leading-relaxed text-[#77766e]">{copy}</p></div>; }
