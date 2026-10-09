import { ArrowRight, Check, FlaskConical, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { CodeWindow } from "@/components/docs/CodeWindow";
import { DocCallout } from "@/components/docs/DocCallout";

const testCode = [
  "const response = await fetch(API_BASE_URL + \"/api/remittance\", {",
  "  method: \"POST\",",
  "  headers: {",
  "    ...headers,",
  "    \"Idempotency-Key\": \"test-remittance-001\",",
  "  },",
  "  body: JSON.stringify({",
  "    sender: \"QA Sandbox\",",
  "    recipientId: process.env.SANDBOX_RECIPIENT_ID,",
  "    amount: 25,",
  "    currency: \"USDC\",",
  "    localCurrency: \"KES\",",
  "    deliveryMethod: \"mobile-money\",",
  "  }),",
  "});",
  "const result = await response.json();",
].join("\n");

const scenarios = [
  ["Happy path", "Deposit test balance, create a quote, then submit a remittance.", "201 completed"],
  ["Duplicate retry", "Repeat the same write with the same Idempotency-Key.", "Original response"],
  ["Insufficient funds", "Submit more than the persisted asset balance.", "409 insufficient balance"],
  ["Unauthorized access", "Use no session, an expired session, or another organization ID.", "401 or scoped 404"],
  ["Invalid transition", "Execute a draft payroll batch or release an unfunded escrow.", "409 invalid state"],
  ["Input abuse", "Send invalid amount precision, unsupported corridors, or oversized lists.", "422 validation error"],
];

export default function Testing() {
  return (
    <div className="pb-24">
      <header className="border-b border-[#d9d6cd] pb-12">
        <p className="mono-label text-[#087f5b]">Testing · Sandbox discipline</p>
        <h1 className="mt-5 max-w-4xl text-5xl sm:text-6xl">Test the state machine, not just the happy path.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-[#575750]">
          The sandbox stores real application records and exercises validation, organization isolation, idempotency, and balance safeguards without connecting to live providers.
        </p>
      </header>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <DocCallout type="info" title="Environment">
          Use a separate test workspace, <code>sk_test_...</code> credentials, and dummy identities. The API base URL is the deployment URL with the <code>/api</code> route prefix.
        </DocCallout>
        <DocCallout type="warning" title="No real money">
          Sandbox balances and settlement references are test records. Do not upload passports, bank statements, private keys, or production customer data.
        </DocCallout>
      </div>

      <section className="mt-14" aria-labelledby="scenarios">
        <div className="flex items-end justify-between gap-5">
          <div>
            <p className="mono-label text-[#087f5b]">Scenario matrix</p>
            <h2 id="scenarios" className="mt-3 text-3xl">Prove every boundary.</h2>
          </div>
          <ShieldAlert className="hidden h-7 w-7 text-[#087f5b] sm:block" />
        </div>
        <div className="mt-7 overflow-hidden rounded-2xl border border-[#d9d6cd] bg-[#fffdf8]">
          <div className="hidden grid-cols-[.8fr_1.5fr_.8fr] border-b border-[#d9d6cd] bg-[#f5f3ee] px-5 py-3 font-mono text-[9px] font-semibold uppercase tracking-[.1em] text-[#77766e] sm:grid">
            <span>Scenario</span><span>Test action</span><span>Expected result</span>
          </div>
          {scenarios.map(([scenario, trigger, result]) => (
            <div key={scenario} className="grid gap-2 border-b border-[#e1dfd7] px-5 py-4 last:border-0 sm:grid-cols-[.8fr_1.5fr_.8fr] sm:gap-5">
              <p className="text-sm font-semibold text-[#20211e]">{scenario}</p>
              <p className="text-sm leading-6 text-[#575750]">{trigger}</p>
              <p className="font-mono text-xs text-[#087f5b]">{result}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16 grid gap-10 border-t border-[#d9d6cd] pt-12 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
        <div>
          <p className="mono-label text-[#087f5b]">Integration test</p>
          <h2 className="mt-3 text-3xl">Assert the response and the record.</h2>
          <p className="mt-4 text-base leading-7 text-[#575750]">
            A 201 response is not enough for a financial workflow. Follow it with a balance, detail, or history read and assert that the linked records agree.
          </p>
        </div>
        <CodeWindow showLineNumbers language="typescript" title="sandbox-remittance.test.ts" code={testCode} />
      </section>

      <section className="mt-16 rounded-2xl border border-[#cdd8c8] bg-[#e8eee4] p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#b9d9cc] bg-[#fffdf8] text-[#087f5b]"><FlaskConical size={19} /></span>
          <div>
            <p className="mono-label text-[#087f5b]">Next step</p>
            <h2 className="mt-3 text-2xl">Move only after the production gate is complete.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#575750]">Provider-backed settlement, durable workers, signed webhook delivery, MFA, managed database, and operational monitoring must be reviewed separately.</p>
            <Link to="/docs/go-live" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#087f5b]">Open the go-live checklist <ArrowRight size={15} /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
