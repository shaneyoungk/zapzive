import { CodeWindow } from "@/components/docs/CodeWindow";
import { DocCallout } from "@/components/docs/DocCallout";
import { Badge } from "@/components/ui/badge";
import { FileCheck2, ListFilter, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export default function ComplianceAPI() {
    return <div className="max-w-5xl space-y-16">
        <header><div className="mb-6 flex flex-wrap items-center gap-3"><h1 className="text-4xl font-bold tracking-tight text-[#20211e]">Compliance API</h1><Badge variant="outline" className="border-[#cdd8c8] text-[#087f5b]">Sandbox records</Badge></div><p className="max-w-3xl text-xl leading-relaxed text-[#575750]">Create and inspect company-scoped KYC and AML review records. The sandbox stores review intent and status; it does not connect to identity, sanctions, document, or screening providers.</p></header>
        <DocCallout type="mistake" title="Do not treat a sandbox item as a real verification">A <code>pending</code> item is a local workflow record, not proof of identity, a sanctions decision, or regulatory approval. Provider integrations, document handling, retention controls, and human review are required for production.</DocCallout>
        <Endpoint title="Submit a KYC review" method="POST" path="/api/compliance/kyc"><div className="space-y-5"><p className="leading-relaxed text-[#575750]">Creates a pending KYC compliance item with an entity label and bounded details.</p><ResponseCode code="201" desc="Pending KYC item" color="emerald" /><ResponseCode code="422" desc="Missing or oversized input" color="zinc" /></div><CodeWindow language="bash" title="cURL" code={`curl -X POST https://your-api.example.com/api/compliance/kyc \\
  -H "Authorization: Bearer sk_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{"entity":"worker_123","details":"Review requested by operations"}'`} /></Endpoint>
        <Endpoint title="Submit an AML review" method="POST" path="/api/compliance/aml"><div className="space-y-5"><p className="leading-relaxed text-[#575750]">Creates a pending AML review record. No automated provider decision is performed.</p><ResponseCode code="201" desc="Pending AML item" color="emerald" /></div><CodeWindow language="bash" title="cURL" code={`curl -X POST https://your-api.example.com/api/compliance/aml \\
  -H "Authorization: Bearer sk_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{"entity":"recipient_123","details":"Manual review requested"}'`} /></Endpoint>
        <Endpoint title="List and report compliance items" method="GET" path="/api/compliance/items"><div className="space-y-5"><p className="leading-relaxed text-[#575750]">Filter by <code>type</code>, <code>status</code>, or <code>riskLevel</code>, and use <code>limit</code> to bound the response. The report route is <code>/api/compliance/reports</code>.</p><ResponseCode code="200" desc="Company-scoped items or report summary" color="blue" /></div><CodeWindow language="bash" title="cURL" code={`curl "https://your-api.example.com/api/compliance/items?status=pending&limit=50" \\
  -H "Authorization: Bearer sk_test_..."

curl "https://your-api.example.com/api/compliance/reports?limit=100" \\
  -H "Authorization: Bearer sk_test_..."`} /></Endpoint>
        <section className="grid gap-6 border-t border-[#d9d6cd] pt-12 md:grid-cols-3"><Highlight icon={<ShieldCheck />} title="Company scoped" copy="Every item is queried through the authenticated company." /><Highlight icon={<ListFilter />} title="Explicit filters" copy="Use bounded filters instead of loading an unbounded review queue." /><Highlight icon={<FileCheck2 />} title="Provider boundary" copy="Local status is not a KYC, AML, or sanctions attestation." /></section>
    </div>;
}
function Endpoint({ title, method, path, children }: { title: string; method: string; path: string; children: ReactNode }) { const [details, code] = Array.isArray(children) ? children : [children, null]; return <section className="space-y-8 border-t border-[#d9d6cd] pt-12 first:border-t-0 first:pt-0"><div className="flex flex-wrap items-center gap-3"><Badge className={cn("border px-3 py-1 font-mono", method === "GET" ? "border-blue-500/20 bg-blue-500/10 text-[#087f5b]" : "border-emerald-500/20 bg-emerald-500/10 text-[#087f5b]")}>{method}</Badge><code className="text-xl text-[#20211e]">{path}</code></div><h2 className="text-2xl font-bold text-[#20211e]">{title}</h2><div className="grid gap-10 xl:grid-cols-2"><div>{details}</div><div>{code}</div></div></section>; }
function ResponseCode({ code, desc, color }: { code: string; desc: string; color: "emerald" | "blue" | "zinc" }) { const colors = { emerald: "border-emerald-500/20 bg-emerald-500/10 text-[#087f5b]", blue: "border-blue-500/20 bg-blue-500/10 text-[#087f5b]", zinc: "border-[#d9d6cd] bg-[#f5f3ee] text-[#575750]" }; return <div className={cn("flex items-center gap-4 rounded-xl border p-4", colors[color])}><span className="min-w-12 font-mono text-sm font-bold">{code}</span><span className="text-xs">{desc}</span></div>; }
function Highlight({ icon, title, copy }: { icon: ReactNode; title: string; copy: string }) { return <div className="space-y-4 rounded-2xl border border-[#d9d6cd] bg-[#fffdf8] p-6"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#cdd8c8] bg-[#e8eee4] text-[#087f5b]">{icon}</div><h3 className="font-bold text-[#20211e]">{title}</h3><p className="text-xs leading-relaxed text-[#77766e]">{copy}</p></div>; }
