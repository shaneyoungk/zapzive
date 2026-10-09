import { Check, LockKeyhole, RefreshCcw, ShieldCheck } from "lucide-react";
import { CodeWindow } from "@/components/docs/CodeWindow";
import { DocCallout } from "@/components/docs/DocCallout";

const verificationCode = [
  "import crypto from \"node:crypto\";",
  "",
  "function verify(rawBody, signature, secret) {",
  "  const expected = crypto.createHmac(\"sha256\", secret)",
  "    .update(rawBody)",
  "    .digest(\"hex\");",
  "  return crypto.timingSafeEqual(",
  "    Buffer.from(expected),",
  "    Buffer.from(signature || \"\"),",
  "  );",
  "}",
].join("\n");

export default function Webhooks() {
  return (
    <div className="pb-24">
      <header className="border-b border-[#d9d6cd] pb-12">
        <p className="mono-label text-[#087f5b]">Events · Provider integration</p>
        <h1 className="mt-5 max-w-4xl text-5xl sm:text-6xl">Receive events without trusting the network.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-[#575750]">
          Verify the raw request, deduplicate the event, acknowledge quickly, and process the business action from a durable queue.
        </p>
      </header>

      <DocCallout type="warning" title="Sandbox availability">
        The current sandbox persists webhook configuration and encrypts signing secrets, but it does not yet run a provider-backed delivery worker. Treat the examples below as the production receiver contract to implement and test before enabling live events.
      </DocCallout>

      <section className="mt-14 grid gap-4 md:grid-cols-3" aria-label="Webhook handling sequence">
        <Step number="01" icon={LockKeyhole} title="Verify" copy="Use the raw body and constant-time HMAC comparison." />
        <Step number="02" icon={RefreshCcw} title="Deduplicate" copy="Store the event ID with a unique constraint before work." />
        <Step number="03" icon={ShieldCheck} title="Acknowledge" copy="Return 2xx quickly, then process through a durable worker." />
      </section>

      <section className="mt-16 grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
        <div>
          <p className="mono-label text-[#087f5b]">Signature verification</p>
          <h2 className="mt-3 text-3xl">Verify the raw body first.</h2>
          <p className="mt-4 text-base leading-7 text-[#575750]">
            Never parse and re-serialize JSON before checking the signature. Keep the secret outside source control, reject stale timestamps, and fail closed when the header is missing.
          </p>
        </div>
        <CodeWindow showLineNumbers language="typescript" title="verify-webhook.ts" code={verificationCode} />
      </section>

      <section className="mt-16 border-t border-[#d9d6cd] pt-12">
        <p className="mono-label text-[#087f5b]">Receiver checklist</p>
        <h2 className="mt-3 text-3xl">Make retries safe.</h2>
        <div className="mt-7 grid gap-3 md:grid-cols-2">
          {[
            "Persist event ID, type, received time, and processing state.",
            "Return 2xx only after the event is durably accepted.",
            "Retry failed work with bounded exponential backoff.",
            "Keep provider references and request IDs in reconciliation records.",
            "Do not release escrow or mark payroll paid from an unverified event.",
            "Alert when delivery attempts exhaust or signatures fail.",
          ].map((item) => (
            <div key={item} className="flex items-start gap-3 rounded-xl border border-[#d9d6cd] bg-[#fffdf8] p-4 text-sm leading-6 text-[#575750]">
              <Check size={15} className="mt-1 shrink-0 text-[#087f5b]" />
              {item}
            </div>
          ))}
        </div>
      </section>

      <DocCallout type="info" title="Planned event families">
        When the delivery adapter is enabled, event names should remain resource-oriented: <code>remittance.completed</code>, <code>remittance.failed</code>, <code>payroll.batch.completed</code>, <code>escrow.milestone.released</code>, and <code>compliance.review.updated</code>. Pin the contract before shipping consumers.
      </DocCallout>
    </div>
  );
}

function Step({ number, icon: Icon, title, copy }: { number: string; icon: typeof LockKeyhole; title: string; copy: string }) {
  return (
    <article className="rounded-2xl border border-[#d9d6cd] bg-[#fffdf8] p-5">
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#cdd8c8] bg-[#e8eee4] text-[#087f5b]"><Icon size={17} /></span>
        <span className="font-mono text-[10px] font-semibold text-[#087f5b]">{number}</span>
      </div>
      <h3 className="mt-6 text-lg">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#575750]">{copy}</p>
    </article>
  );
}
