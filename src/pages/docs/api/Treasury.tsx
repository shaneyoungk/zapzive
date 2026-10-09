import { CodeWindow } from "@/components/docs/CodeWindow";
import { DocCallout } from "@/components/docs/DocCallout";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft, Coins, Landmark, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export default function TreasuryAPI() {
    return (
        <div className="max-w-5xl space-y-16">
            <header><div className="mb-6 flex flex-wrap items-center gap-3"><h1 className="text-4xl font-bold tracking-tight text-[#20211e]">Treasury API</h1><Badge variant="outline" className="border-[#cdd8c8] text-[#087f5b]">Sandbox balance ledger</Badge></div><p className="max-w-3xl text-xl leading-relaxed text-[#575750]">Fund, inspect, swap, and reconcile the company’s sandbox asset ledger. No bank account, blockchain wallet, yield source, or live liquidity provider is connected.</p></header>

            <DocCallout type="info" title="Use the routes that exist">The working balance surface is <code>/api/treasury/assets</code>, <code>/api/treasury/portfolio</code>, <code>/api/treasury/deposit</code>, <code>/api/treasury/withdraw</code>, <code>/api/treasury/swap</code>, and <code>/api/treasury/history</code>. There is no <code>/balances</code> or <code>/refills</code> route in the current backend.</DocCallout>

            <Endpoint title="List assets" method="GET" path="/api/treasury/assets"><div className="space-y-5"><p className="leading-relaxed text-[#575750]">Returns company-scoped assets with balances and USD values. Use <code>limit</code> to keep the response bounded.</p><ResponseCode code="200" desc="Asset list" color="blue" /></div><CodeWindow language="bash" title="cURL" code={`curl "https://your-api.example.com/api/treasury/assets?limit=50" \\
  -H "Authorization: Bearer sk_test_..."`} /></Endpoint>

            <Endpoint title="Deposit sandbox funds" method="POST" path="/api/treasury/deposit"><div className="space-y-5"><p className="leading-relaxed text-[#575750]">Credits an existing sandbox asset and writes a settled ledger transaction. Every retry must reuse the same idempotency key.</p><ResponseCode code="201" desc="Deposit transaction created" color="emerald" /><ResponseCode code="409" desc="Conflicting key or invalid state" color="zinc" /></div><CodeWindow language="bash" title="cURL" code={`curl -X POST https://your-api.example.com/api/treasury/deposit \\
  -H "Authorization: Bearer sk_test_..." \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: deposit-demo-001" \\
  -d '{"asset":"USDC","amount":5000}'`} /></Endpoint>

            <Endpoint title="Swap sandbox assets" method="POST" path="/api/treasury/swap"><div className="space-y-5"><p className="leading-relaxed text-[#575750]">Debits one existing asset, credits another, and records the supplied sandbox rate and fee atomically.</p><ResponseCode code="201" desc="Swap completed" color="emerald" /><ResponseCode code="409" desc="Insufficient source balance" color="zinc" /></div><CodeWindow language="bash" title="cURL" code={`curl -X POST https://your-api.example.com/api/treasury/swap \\
  -H "Authorization: Bearer sk_test_..." \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: swap-demo-001" \\
  -d '{"fromAsset":"USDC","toAsset":"USDT","fromAmount":100,"toAmount":99,"rate":0.99,"fee":1}'`} /></Endpoint>

            <Endpoint title="Inspect the ledger" method="GET" path="/api/treasury/history"><div className="space-y-5"><p className="leading-relaxed text-[#575750]">Returns bounded company-scoped transactions for reconciliation. Combine it with the asset list when displaying available balances.</p><ResponseCode code="200" desc="Transaction history" color="blue" /></div><CodeWindow language="bash" title="cURL" code={`curl "https://your-api.example.com/api/treasury/history?limit=50" \\
  -H "Authorization: Bearer sk_test_..."`} /></Endpoint>

            <DocCallout type="mistake" title="Sandbox funds are not real money">Deposit, swap, and withdrawal operations update the local sandbox ledger only. Do not use these routes to represent customer funds until a durable production database, provider settlement, reconciliation, and authorization review have been implemented.</DocCallout>

            <section className="grid gap-6 border-t border-[#d9d6cd] pt-12 md:grid-cols-3"><Highlight icon={<Landmark />} title="One ledger" copy="Balances and transaction rows are updated in one database transaction." /><Highlight icon={<ArrowRightLeft />} title="Explicit movement" copy="Each debit, credit, fee, and sandbox reference is recorded." /><Highlight icon={<ShieldCheck />} title="Bounded access" copy="Company scoping, roles, API scopes, and idempotency protect writes." /></section>
        </div>
    );
}

function Endpoint({ title, method, path, children }: { title: string; method: string; path: string; children: ReactNode }) { const [details, code] = Array.isArray(children) ? children : [children, null]; return <section className="space-y-8 border-t border-[#d9d6cd] pt-12 first:border-t-0 first:pt-0"><div className="flex flex-wrap items-center gap-3"><Badge className={cn("border px-3 py-1 font-mono", method === "GET" ? "border-blue-500/20 bg-blue-500/10 text-[#087f5b]" : "border-emerald-500/20 bg-emerald-500/10 text-[#087f5b]")}>{method}</Badge><code className="text-xl text-[#20211e]">{path}</code></div><h2 className="text-2xl font-bold text-[#20211e]">{title}</h2><div className="grid gap-10 xl:grid-cols-2"><div>{details}</div><div>{code}</div></div></section>; }
function ResponseCode({ code, desc, color }: { code: string; desc: string; color: "emerald" | "blue" | "zinc" }) { const colors = { emerald: "border-emerald-500/20 bg-emerald-500/10 text-[#087f5b]", blue: "border-blue-500/20 bg-blue-500/10 text-[#087f5b]", zinc: "border-[#d9d6cd] bg-[#f5f3ee] text-[#575750]" }; return <div className={cn("flex items-center gap-4 rounded-xl border p-4", colors[color])}><span className="min-w-12 font-mono text-sm font-bold">{code}</span><span className="text-xs">{desc}</span></div>; }
function Highlight({ icon, title, copy }: { icon: ReactNode; title: string; copy: string }) { return <div className="space-y-4 rounded-2xl border border-[#d9d6cd] bg-[#fffdf8] p-6"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#cdd8c8] bg-[#e8eee4] text-[#087f5b]">{icon}</div><h3 className="font-bold text-[#20211e]">{title}</h3><p className="text-xs leading-relaxed text-[#77766e]">{copy}</p></div>; }
