import { CodeWindow } from "@/components/docs/CodeWindow";
import { DocCallout } from "@/components/docs/DocCallout";
import { Badge } from "@/components/ui/badge";
import { Globe, ShieldCheck, Timer, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export default function RemittanceAPI() {
    return (
        <div className="max-w-5xl space-y-16">
            <header>
                <div className="mb-6 flex flex-wrap items-center gap-3"><h1 className="text-4xl font-bold tracking-tight text-[#20211e]">Remittance API</h1><Badge variant="outline" className="border-[#cdd8c8] text-[#087f5b]">Sandbox route</Badge></div>
                <p className="max-w-3xl text-xl leading-relaxed text-[#575750]">Model a cross-border payout from a treasury balance to a saved recipient. The sandbox returns a deterministic settlement; live bank and mobile-money providers are not connected.</p>
            </header>

            <DocCallout type="info" title="Defined sandbox corridors">The sandbox accepts USDC, USDT, or ETH into NGN, KES, UGX, GHS, MXN, or BRL. Production coverage depends on reviewed providers and destination rails.</DocCallout>

            <Endpoint title="Create a remittance" method="POST" path="/api/remittance">
                <div className="space-y-6">
                    <p className="leading-relaxed text-[#575750]">Creates a completed sandbox transfer after the source balance, saved recipient, corridor, and delivery method are validated. The server recalculates the FX rate and fee.</p>
                    <ParamTable rows={[
                        ["sender", "Required", "Sender label stored on the remittance"],
                        ["recipientId", "Required", "Saved recipient belonging to the company"],
                        ["amount", "Required", "Positive source amount"],
                        ["currency", "Required", "USDC, USDT, or ETH"],
                        ["localCurrency", "Required", "NGN, KES, UGX, GHS, MXN, or BRL"],
                        ["deliveryMethod", "Required", "wallet, bank, mobile-money, or cash-agent"],
                    ]} />
                    <div className="space-y-3"><h3 className="mono-label text-[#77766e]">Response codes</h3><ResponseCode code="201" desc="Sandbox transfer created" color="emerald" /><ResponseCode code="409" desc="Insufficient balance or conflicting idempotency key" color="zinc" /><ResponseCode code="422" desc="Invalid corridor or delivery method" color="zinc" /></div>
                </div>
                <div className="space-y-4">
                    <CodeWindow language="bash" title="cURL" code={`curl https://your-api.example.com/api/remittance \\
  -H "Authorization: Bearer sk_test_..." \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: remittance-demo-001" \\
  -d '{"sender":"Acme Treasury","recipientId":"rcpt_123","amount":50,"currency":"USDC","localCurrency":"KES","deliveryMethod":"mobile-money"}'`} />
                    <CodeWindow language="json" title="Response" code={`{
  "id": "remittance_...",
  "amount": 50,
  "currency": "USDC",
  "localAmount": 6500,
  "localCurrency": "KES",
  "status": "completed",
  "chain": "Sandbox"
}`} />
                </div>
            </Endpoint>

            <Endpoint title="Request a quote" method="POST" path="/api/remittance/quote">
                <div className="space-y-5"><p className="leading-relaxed text-[#575750]">Returns a short-lived informational quote. It is not a reservation; the create endpoint recalculates authoritative values.</p><ResponseCode code="200" desc="Quote with rate, fee, destination amount, and expiresAt" color="emerald" /></div>
                <CodeWindow language="bash" title="cURL" code={`curl https://your-api.example.com/api/remittance/quote \\
  -H "Authorization: Bearer sk_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{"amount":50,"currency":"USDC","localCurrency":"KES"}'`} />
            </Endpoint>

            <Endpoint title="List and retrieve remittances" method="GET" path="/api/remittance">
                <div className="space-y-5"><p className="leading-relaxed text-[#575750]">List remittances with a bounded <code>limit</code>, or retrieve one by ID at <code>/api/remittance/:id</code>.</p><ResponseCode code="200" desc="Company-scoped remittance list or record" color="blue" /><ResponseCode code="404" desc="No matching company-scoped record" color="zinc" /></div>
                <CodeWindow language="bash" title="cURL" code={`curl "https://your-api.example.com/api/remittance?limit=20" \\
  -H "Authorization: Bearer sk_test_..."

curl https://your-api.example.com/api/remittance/remittance_123 \\
  -H "Authorization: Bearer sk_test_..."`} />
            </Endpoint>

            <Endpoint title="Cancel a remittance" method="POST" path="/api/remittance/:id/cancel">
                <div className="space-y-5"><p className="leading-relaxed text-[#575750]">Attempts cancellation only when the backend state allows it. The current sandbox creates completed transfers, so this route is primarily for future provider-backed pending states.</p><ResponseCode code="200" desc="Transfer cancelled" color="emerald" /><ResponseCode code="409" desc="Transfer cannot be cancelled in its current state" color="zinc" /></div>
                <CodeWindow language="bash" title="cURL" code={`curl -X POST https://your-api.example.com/api/remittance/remittance_123/cancel \\
  -H "Authorization: Bearer sk_test_..." \\
  -H "Idempotency-Key: cancel-demo-001"`} />
            </Endpoint>

            <DocCallout type="mistake" title="Protect against duplicate money movement">Always send an <code>Idempotency-Key</code> on every mutating request. If a network timeout occurs, retry the exact same request with the exact same key.</DocCallout>

            <section className="grid gap-6 border-t border-[#d9d6cd] pt-12 md:grid-cols-3">
                <APIHighlight icon={<Timer />} title="Short-lived quotes" desc="Quotes include an expiry timestamp and are not reservations." />
                <APIHighlight icon={<ShieldCheck />} title="Server validation" desc="Ownership, corridor, balance, and delivery method are checked together." />
                <APIHighlight icon={<Globe />} title="Provider boundary" desc="No live bank, mobile-money, or blockchain provider is connected here." />
            </section>
        </div>
    );
}

function Endpoint({ title, method, path, children }: { title: string; method: string; path: string; children: ReactNode }) {
    const [details, code] = Array.isArray(children) ? children : [children, null];
    return <section className="space-y-8 border-t border-[#d9d6cd] pt-12 first:border-t-0 first:pt-0"><div className="flex flex-wrap items-center gap-3"><Badge className={cn("border px-3 py-1 font-mono", method === "GET" ? "border-blue-500/20 bg-blue-500/10 text-[#087f5b]" : method === "POST" ? "border-emerald-500/20 bg-emerald-500/10 text-[#087f5b]" : "border-[#d9d6cd] bg-[#f5f3ee] text-[#575750]")}>{method}</Badge><code className="text-xl text-[#20211e]">{path}</code></div><h2 className="text-2xl font-bold text-[#20211e]">{title}</h2><div className="grid gap-10 xl:grid-cols-2"><div>{details}</div><div>{code}</div></div></section>;
}

function ParamTable({ rows }: { rows: string[][] }) { return <div className="overflow-hidden rounded-2xl border border-[#d9d6cd] bg-[#fffdf8]"><table className="w-full text-left text-sm"><thead className="bg-[#f5f3ee] text-[#575750]"><tr><th className="px-4 py-3">Field</th><th className="px-4 py-3">Required</th><th className="px-4 py-3">Description</th></tr></thead><tbody className="divide-y divide-[#d9d6cd]">{rows.map(([name, required, desc]) => <tr key={name}><td className="px-4 py-3 font-mono text-[#087f5b]">{name}</td><td className="px-4 py-3 text-xs text-[#77766e]">{required}</td><td className="px-4 py-3 text-[#575750]">{desc}</td></tr>)}</tbody></table></div>; }
function ResponseCode({ code, desc, color }: { code: string; desc: string; color: "emerald" | "blue" | "zinc" }) { const colors = { emerald: "border-emerald-500/20 bg-emerald-500/10 text-[#087f5b]", blue: "border-blue-500/20 bg-blue-500/10 text-[#087f5b]", zinc: "border-[#d9d6cd] bg-[#f5f3ee] text-[#575750]" }; return <div className={cn("flex items-center gap-4 rounded-xl border p-4", colors[color])}><span className="min-w-12 font-mono text-sm font-bold">{code}</span><span className="text-xs">{desc}</span></div>; }
function APIHighlight({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) { return <div className="space-y-4 rounded-2xl border border-[#d9d6cd] bg-[#fffdf8] p-6"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#cdd8c8] bg-[#e8eee4] text-[#087f5b]">{icon}</div><h3 className="font-bold text-[#20211e]">{title}</h3><p className="text-xs leading-relaxed text-[#77766e]">{desc}</p></div>; }
