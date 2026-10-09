import { CodeWindow } from "@/components/docs/CodeWindow";
import { DocCallout } from "@/components/docs/DocCallout";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Monitor, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

export default function ReactSDK() {
    return (
        <div className="max-w-5xl space-y-12">
            <header className="border-b border-[#d9d6cd] pb-10">
                <div className="flex flex-wrap items-center gap-3"><p className="mono-label text-[#087f5b]">Browser integration</p><Badge variant="outline" className="border-[#cdd8c8] text-[#087f5b]">Use your backend</Badge></div>
                <h1 className="mt-5 text-5xl">React integration</h1>
                <p className="mt-5 max-w-3xl text-lg leading-8 text-[#575750]">There is no published browser SDK and secret API keys must never enter a React bundle. Put Zapzive calls behind your server, then let the browser call your application’s authenticated endpoints.</p>
            </header>

            <DocCallout type="mistake" title="Never put sk_test or sk_live in client code">
                A publishable-key card flow is not implemented in this project. A React app should call your own server, which authenticates to Zapzive and enforces the user’s authorization, amount limits, and idempotency policy.
            </DocCallout>

            <section className="grid gap-8 lg:grid-cols-[.75fr_1.25fr] lg:items-start">
                <div><div className="flex items-center gap-3"><Monitor size={18} className="text-[#087f5b]" /><h2 className="text-2xl">Call your application API</h2></div><p className="mt-4 text-sm leading-7 text-[#575750]">The frontend sends intent to your own route. The server validates the session and forwards a controlled request with the secret key.</p></div>
                <CodeWindow language="tsx" title="SendMoneyButton.tsx" showLineNumbers code={`export function SendMoneyButton({ recipientId }: { recipientId: string }) {
  async function send() {
    const response = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ recipientId, amount: 50, currency: "USDC" }),
    });
    if (!response.ok) throw new Error("Payment could not be submitted");
  }

  return <button onClick={send}>Send payment</button>;
}`} />
            </section>

            <section className="grid gap-4 sm:grid-cols-3">
                <Rule icon={ShieldCheck} title="Server-side secrets" copy="Only your backend talks to the Zapzive API." />
                <Rule icon={Monitor} title="Session-aware UI" copy="Use your app session and CSRF protection." />
                <Rule icon={ShieldCheck} title="Explicit state" copy="Show pending, completed, and failed states from your server." />
            </section>

            <Link to="/docs/quickstart" className="inline-flex items-center gap-2 text-sm font-semibold text-[#087f5b]">Start with the REST quickstart <ArrowRight size={15} /></Link>
        </div>
    );
}

function Rule({ icon: Icon, title, copy }: { icon: typeof ShieldCheck; title: string; copy: string }) {
    return <div className="rounded-2xl border border-[#d9d6cd] bg-[#fffdf8] p-5"><Icon size={17} className="text-[#087f5b]" /><h3 className="mt-4 text-sm font-semibold text-[#20211e]">{title}</h3><p className="mt-2 text-xs leading-6 text-[#77766e]">{copy}</p></div>;
}
