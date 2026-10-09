import { CodeWindow } from "@/components/docs/CodeWindow";
import { DocCallout } from "@/components/docs/DocCallout";
import { Badge } from "@/components/ui/badge";
import { Bell, KeyRound, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export default function SettingsAPI() {
    return <div className="max-w-5xl space-y-16">
        <header><div className="mb-6 flex flex-wrap items-center gap-3"><h1 className="text-4xl font-bold tracking-tight text-[#20211e]">Settings API</h1><Badge variant="outline" className="border-[#cdd8c8] text-[#087f5b]">Access and delivery</Badge></div><p className="max-w-3xl text-xl leading-relaxed text-[#575750]">Read the company profile, create scoped sandbox API keys, register webhook destinations, and inspect usage metrics.</p></header>
        <DocCallout type="mistake" title="Secrets are returned once">API key and webhook signing secrets are shown only in the creation response. Store them in a secret manager immediately; subsequent list responses are masked.</DocCallout>
        <Endpoint title="Read or update the profile" method="GET / PUT" path="/api/settings/profile"><div className="space-y-5"><p className="leading-relaxed text-[#575750]">Read company metadata with GET. Owners and admins may update name, email, phone, country, and address with PUT. Sandbox/live mode cannot be toggled through this route.</p><ResponseCode code="200" desc="Company profile" color="blue" /></div><CodeWindow language="bash" title="cURL" code={`curl https://your-api.example.com/api/settings/profile \\
  -H "Authorization: Bearer sk_test_..."

curl -X PUT https://your-api.example.com/api/settings/profile \\
  -H "Authorization: Bearer sk_test_..." \\
  -H "Content-Type: application/json" \\
   -d '{"name":"Acme Treasury"}'`} /></Endpoint>
        <Endpoint title="Create a scoped test key" method="POST" path="/api/settings/api-keys"><div className="space-y-5"><p className="leading-relaxed text-[#575750]">Create a <code>sk_test_</code> key with one or more of <code>read</code>, <code>write</code>, and <code>approve</code>. Live keys remain blocked pending production review.</p><ResponseCode code="201" desc="Raw key returned once" color="emerald" /><ResponseCode code="422" desc="Unknown or empty scope set" color="zinc" /></div><CodeWindow language="bash" title="cURL" code={`curl -X POST https://your-api.example.com/api/settings/api-keys \\
  -H "Authorization: Bearer owner-or-admin-session" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Payroll approver","environment":"test","scopes":["read","write","approve"]}'`} /></Endpoint>
        <Endpoint title="Register a webhook destination" method="POST" path="/api/settings/webhooks"><div className="space-y-5"><p className="leading-relaxed text-[#575750]">Store an active URL and selected event names. The current backend encrypts the secret at rest, but does not yet run a delivery worker.</p><ResponseCode code="201" desc="Endpoint and one-time secret" color="emerald" /><ResponseCode code="422" desc="Invalid URL or empty events" color="zinc" /></div><CodeWindow language="bash" title="cURL" code={`curl -X POST https://your-api.example.com/api/settings/webhooks \\
  -H "Authorization: Bearer session-or-admin-key" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://example.com/zapzive","events":["remittance.completed"]}'`} /></Endpoint>
        <Endpoint title="Read usage metrics" method="GET" path="/api/settings/metrics"><div className="space-y-5"><p className="leading-relaxed text-[#575750]">Returns the latest bounded usage metric rows for the authenticated company.</p><ResponseCode code="200" desc="Usage metric list" color="blue" /></div><CodeWindow language="bash" title="cURL" code={`curl https://your-api.example.com/api/settings/metrics \\
  -H "Authorization: Bearer sk_test_..."`} /></Endpoint>
        <section className="grid gap-6 border-t border-[#d9d6cd] pt-12 md:grid-cols-3"><Highlight icon={<UserRound />} title="Role gates" copy="Owners, admins, developers, and approvers have separate write permissions." /><Highlight icon={<KeyRound />} title="Least privilege" copy="Choose read, write, and approve scopes per integration." /><Highlight icon={<Bell />} title="Honest webhooks" copy="Configuration exists now; delivery requires a worker before production." /></section>
    </div>;
}
function Endpoint({ title, method, path, children }: { title: string; method: string; path: string; children: ReactNode }) { const [details, code] = Array.isArray(children) ? children : [children, null]; return <section className="space-y-8 border-t border-[#d9d6cd] pt-12 first:border-t-0 first:pt-0"><div className="flex flex-wrap items-center gap-3"><Badge className={cn("border px-3 py-1 font-mono", method.startsWith("GET") ? "border-blue-500/20 bg-blue-500/10 text-[#087f5b]" : "border-emerald-500/20 bg-emerald-500/10 text-[#087f5b]")}>{method}</Badge><code className="text-xl text-[#20211e]">{path}</code></div><h2 className="text-2xl font-bold text-[#20211e]">{title}</h2><div className="grid gap-10 xl:grid-cols-2"><div>{details}</div><div>{code}</div></div></section>; }
function ResponseCode({ code, desc, color }: { code: string; desc: string; color: "emerald" | "blue" | "zinc" }) { const colors = { emerald: "border-emerald-500/20 bg-emerald-500/10 text-[#087f5b]", blue: "border-blue-500/20 bg-blue-500/10 text-[#087f5b]", zinc: "border-[#d9d6cd] bg-[#f5f3ee] text-[#575750]" }; return <div className={cn("flex items-center gap-4 rounded-xl border p-4", colors[color])}><span className="min-w-12 font-mono text-sm font-bold">{code}</span><span className="text-xs">{desc}</span></div>; }
function Highlight({ icon, title, copy }: { icon: ReactNode; title: string; copy: string }) { return <div className="space-y-4 rounded-2xl border border-[#d9d6cd] bg-[#fffdf8] p-6"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#cdd8c8] bg-[#e8eee4] text-[#087f5b]">{icon}</div><h3 className="font-bold text-[#20211e]">{title}</h3><p className="text-xs leading-relaxed text-[#77766e]">{copy}</p></div>; }
