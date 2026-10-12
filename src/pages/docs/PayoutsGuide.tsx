import { DocCallout } from "@/components/docs/DocCallout";
import { MOVEMENT_STATES, RUN_STATES } from "@/lib/payout-format";

const ENDPOINTS: Array<[string, string, string]> = [
    ["POST", "/api/recipients", "Create a recipient with a payout method (mpesa, mobile_money, bank, usdc_wallet)."],
    ["PUT", "/api/recipients/:id", "Update a recipient. Changing payout details holds submitted payouts for re-approval."],
    ["POST", "/api/payouts/runs", "Create a draft payout run: { name, purpose?, scheduledFor? }."],
    ["POST", "/api/payouts/runs/:id/items", "Add payouts: { items: [{ recipientId, amount, currency?, externalReference? }] }."],
    ["POST", "/api/payouts/runs/:id/items/import", "Add rows matched by email or name: { rows: [{ name?, email?, amount, currency?, reference? }] }."],
    ["GET", "/api/payouts/runs/:id", "Run detail: payouts with validation issues, quotes, policy decision, approvals, reconciliation, events."],
    ["POST", "/api/payouts/runs/:id/items/:movementId/acknowledge", "Mark reviewed warnings: { codes: [\"amount_anomaly\"] }."],
    ["POST", "/api/payouts/runs/:id/submit", "Submit a ready run. It becomes awaiting_approval, or approved if the policy requires none."],
    ["POST", "/api/payouts/runs/:id/approve", "Approve (approver scope). Records actor, time, comment and request ID."],
    ["POST", "/api/payouts/runs/:id/reject", "Reject with a required comment. The run returns to editing."],
    ["POST", "/api/payouts/runs/:id/execute", "Reserve funding and submit approved payouts to the provider."],
    ["POST", "/api/payouts/movements/:id/retry", "Retry a failed payout."],
    ["POST", "/api/payouts/movements/:id/release", "Approve changed payout details for a held payout."],
    ["POST", "/api/payouts/runs/:id/reconcile", "Mark a finished run reconciled."],
    ["GET", "/api/payouts/runs/:id/export?format=ledger|journal|receipt", "CSV exports for accounting."],
];

export default function PayoutsGuide() {
    return (
        <div className="max-w-4xl space-y-12 pb-24">
            <section className="border-b border-[#d9d6cd] pb-10">
                <p className="mono-label mb-4 text-[#087f5b]">Guide · Sandbox</p>
                <h1 className="text-4xl font-semibold tracking-[-.06em] md:text-5xl">Payout operations API</h1>
                <p className="mt-5 text-lg leading-8 text-[#575750]">Create recipients and payout runs, validate them, route them through your approval policy, send them, and reconcile the result. The dashboard uses the same endpoints and states.</p>
            </section>

            <DocCallout type="info" title="What is simulated">In the sandbox, payouts execute through the Zapzive sandbox provider: quotes, fees, FX rates and provider references (SBX-…) are simulated, and settlement happens on the server a few seconds after sending. A phone or account number ending in 0000 fails on purpose, so you can test exception handling. No live funds move.</DocCallout>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold tracking-[-.04em]">Authentication and idempotency</h2>
                <p className="leading-7 text-[#575750]">Authenticate with a sandbox API key from Integrations → API keys (<code>Authorization: Bearer zk_test_…</code>). Every write must send an <code>Idempotency-Key</code> header; retrying with the same key returns the original response instead of repeating the action. Every response includes a request ID that appears in the audit trail.</p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold tracking-[-.04em]">Money</h2>
                <p className="leading-7 text-[#575750]">Send amounts as decimal strings in the recipient's currency (<code>"48200.00"</code> KES). Zapzive stores integer minor units and rejects excess precision (UGX and RWF have no decimals). Responses return <code>amountMinor</code> with its <code>currency</code>.</p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold tracking-[-.04em]">Endpoints</h2>
                <div className="overflow-x-auto rounded-xl border border-[#d9d6cd]">
                    <table className="min-w-[640px] text-sm">
                        <thead><tr><th className="px-4 py-2 text-left">Method</th><th className="px-4 py-2 text-left">Path</th><th className="px-4 py-2 text-left">Purpose</th></tr></thead>
                        <tbody>{ENDPOINTS.map(([method, path, purpose]) => <tr key={method + path} className="border-t border-[#e1dfd7]"><td className="px-4 py-2 font-mono text-xs">{method}</td><td className="px-4 py-2 font-mono text-xs">{path}</td><td className="px-4 py-2 text-[#575750]">{purpose}</td></tr>)}</tbody>
                    </table>
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold tracking-[-.04em]">Validation</h2>
                <p className="leading-7 text-[#575750]">Each payout carries <code>issues</code> with a <code>code</code>, <code>severity</code> and message. Errors block submission (<code>unknown_recipient</code>, <code>invalid_amount</code>, <code>unsupported_route</code>, <code>invalid_payout_details</code>, <code>method_limit</code>, <code>duplicate_reference</code>, <code>recipient_ineligible</code>). Warnings must be acknowledged (<code>duplicate_recipient</code>, <code>already_paid_reference</code>, <code>amount_anomaly</code>, <code>details_changed</code>). <code>new_recipient</code> is informational and can trigger approval.</p>
            </section>

            <section className="grid gap-8 md:grid-cols-2">
                {([["Run states", RUN_STATES], ["Payout (movement) states", MOVEMENT_STATES]] as const).map(([title, table]) => (
                    <div key={title}>
                        <h2 className="text-2xl font-semibold tracking-[-.04em]">{title}</h2>
                        <dl className="mt-4 space-y-2 text-sm">{Object.entries(table).map(([state, entry]) => <div key={state}><dt className="font-mono text-xs text-[#087f5b]">{state}</dt><dd className="text-[#575750]">{entry.meaning}</dd></div>)}</dl>
                    </div>
                ))}
            </section>

            <DocCallout type="warning" title="Not available yet">Live providers, production webhook delivery for payout events, and accounting integrations are not available in the MVP. Do not build production flows that assume them.</DocCallout>
        </div>
    );
}
