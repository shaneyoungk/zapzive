import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, CheckCircle2, Info, KeyRound, Package, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { CodeWindow } from "@/components/docs/CodeWindow";
import { DocCallout } from "@/components/docs/DocCallout";

const steps = [
  { number: "01", label: "Get test keys" },
  { number: "02", label: "Choose your transport" },
  { number: "03", label: "Set the API base URL" },
  { number: "04", label: "Send a sandbox remittance" },
];

export default function Quickstart() {
  return (
    <div className="pb-24">
      <header className="border-b border-[#d9d6cd] pb-12">
        <p className="mono-label text-[#087f5b]">Get started · About 5 minutes</p>
        <h1 className="mt-5 text-5xl sm:text-6xl">Make your first test payout.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-[#575750]">
          Follow these four steps in order. You will create a test key, prepare an HTTP client, create a recipient, and confirm a persisted sandbox remittance without moving real funds.
        </p>
      </header>

      <ol className="mt-8 grid overflow-hidden rounded-2xl border border-[#d9d6cd] bg-[#d9d6cd] sm:grid-cols-2 lg:grid-cols-4" aria-label="Quickstart progress">
        {steps.map((step) => (
          <li key={step.number} className="bg-[#fffdf8] p-4">
            <span className="font-mono text-[9px] font-semibold text-[#087f5b]">{step.number}</span>
            <p className="mt-1 text-sm font-semibold">{step.label}</p>
          </li>
        ))}
      </ol>

      <div className="mt-16 space-y-20">
        <GuideStep number="01" icon={KeyRound} title="Get your test keys">
          <p>Open Dashboard Settings and create a sandbox secret key. Test keys begin with <code>sk_test_</code> and cannot move live funds.</p>
          <div className="mt-6 flex flex-col gap-5 rounded-2xl border border-[#cdd8c8] bg-[#e8eee4] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <Info size={17} className="mt-0.5 shrink-0 text-[#087f5b]" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-[#20211e]">Keep the secret key server-side</p>
                <p className="mt-1 text-sm text-[#575750]">Store it in an environment variable and never commit it to source control.</p>
              </div>
            </div>
            <Link to="/dashboard/settings" className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-[#20211e] px-5 text-xs font-semibold text-[#f5f3ee] hover:bg-[#11a879] hover:text-[#20211e]">
              Open settings <ArrowRight size={14} />
            </Link>
          </div>
        </GuideStep>

        <GuideStep number="02" icon={Package} title="Choose your transport">
          <p>The current sandbox is REST-first. Use the HTTP client already available in your server, or install a small client library that lets you set headers and inspect JSON responses.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <CodeWindow language="bash" title="Node.js" code="npm install axios" />
            <CodeWindow language="bash" title="Python" code="pip install requests" />
          </div>
        </GuideStep>

        <GuideStep number="03" icon={CheckCircle2} title="Set the API base URL">
          <p>Read the key from your environment and keep the API base URL in configuration. Never place secret keys in browser code or committed source.</p>
          <div className="mt-6">
            <CodeWindow
              showLineNumbers
              language="typescript"
              title="config.ts"
              code={`const API_BASE_URL = process.env.ZAPZIVE_API_URL;
const API_KEY = process.env.ZAPZIVE_SECRET_KEY;

export const headers = {
  Authorization: "Bearer " + API_KEY,
  "Content-Type": "application/json",
};`}
            />
          </div>
          <DocCallout type="info" title="Environment selection">
            Sandbox and production use separate credentials. Keep the environment explicit so a test deployment cannot accidentally use a live key.
          </DocCallout>
        </GuideStep>

        <GuideStep number="04" icon={Send} title="Send a sandbox remittance" last>
          <p>Create a recipient, fund the test balance from the sandbox faucet, then create a remittance with an idempotency key. Reusing that key safely returns the original operation instead of creating a duplicate movement.</p>
          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            <CodeWindow
              showLineNumbers
              language="typescript"
              title="create-remittance.ts"
              code={`const recipient = await fetch(API_BASE_URL + "/api/remittance/recipients/add", {
  method: "POST",
  headers,
  body: JSON.stringify({
    name: "Kijani Supply Co.",
    phone: "+254700000000",
    country: "Kenya",
    mobileNumber: "+254700000000",
  }),
}).then((response) => response.json());

const response = await fetch(API_BASE_URL + "/api/remittance", {
  method: "POST",
  headers: { ...headers, "Idempotency-Key": "supplier-payout-001" },
  body: JSON.stringify({
    sender: "QA Sandbox",
    recipientId: recipient.id,
    amount: 25,
    currency: "USDC",
    localCurrency: "KES",
    deliveryMethod: "mobile-money",
  }),
});
const remittance = await response.json();`}
            />
            <CodeWindow
              showLineNumbers
              language="json"
              title="201 response"
              code={`{
  "id": "sandbox-remittance-id",
  "status": "completed",
  "amount": 25,
  "currency": "USDC",
  "localAmount": 3250,
  "localCurrency": "KES",
  "chain": "Sandbox"
}`}
            />
          </div>
          <DocCallout type="success" title="Request accepted">
            In the current sandbox, the remittance is settled synchronously and the response includes the persisted transaction reference. Provider-backed asynchronous webhooks are a production integration step, not simulated here.
          </DocCallout>
        </GuideStep>
      </div>

      <section className="mt-20 border-t border-[#d9d6cd] pt-12">
        <p className="mono-label text-[#087f5b]">Continue building</p>
        <h2 className="mt-3 text-3xl">Complete the integration.</h2>
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          <NextStep title="Verify webhooks" copy="Authenticate events and handle delivery retries." href="/docs/webhooks" />
          <NextStep title="Test failure states" copy="Simulate declines, timeouts, and compliance holds." href="/docs/testing" />
          <NextStep title="Prepare for live mode" copy="Complete the production-readiness checklist." href="/docs/go-live" />
        </div>
      </section>
    </div>
  );
}

function GuideStep({ number, icon: Icon, title, children, last = false }: { number: string; icon: LucideIcon; title: string; children: ReactNode; last?: boolean }) {
  return (
    <section className="relative grid gap-6 md:grid-cols-[72px_minmax(0,1fr)]">
      <div className="relative hidden md:block">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#cdd8c8] bg-[#e8eee4] text-[#087f5b]"><Icon size={19} strokeWidth={1.8} /></span>
        {!last && <span className="absolute bottom-[-80px] left-6 top-14 w-px bg-[#d9d6cd]" />}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[.1em] text-[#087f5b]">Step {number}</span>
          <span className="h-px w-8 bg-[#cdd8c8]" />
        </div>
        <h2 className="mt-3 text-3xl">{title}</h2>
        <div className="mt-4 text-base leading-7 text-[#575750]">{children}</div>
      </div>
    </section>
  );
}

function NextStep({ title, copy, href }: { title: string; copy: string; href: string }) {
  return (
    <Link to={href} className="group rounded-2xl border border-[#d9d6cd] bg-[#fffdf8] p-5 transition hover:border-[#11a879]">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-base">{title}</h3>
        <ArrowRight size={15} className="text-[#087f5b] transition group-hover:translate-x-1" />
      </div>
      <p className="mt-2 text-sm leading-6 text-[#77766e]">{copy}</p>
    </Link>
  );
}
