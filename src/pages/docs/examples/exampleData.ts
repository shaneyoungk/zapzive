import type { LucideIcon } from "lucide-react";
import { Landmark, LockKeyhole, Send, UsersRound } from "lucide-react";

const lines = (...values: string[]) => values.join("\n");

export type ExampleStep = {
  title: string;
  description: string;
  file: string;
  language: string;
  code: string;
  result: string;
};

export type Example = {
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  outcome: string;
  time: string;
  icon: LucideIcon;
  prerequisites: string[];
  architecture: string[];
  steps: ExampleStep[];
  checklist: string[];
  nextTitle: string;
  nextHref: string;
};

const authHeaders = [
  'const API_BASE_URL = process.env.ZAPZIVE_API_URL;',
  'const headers = {',
  '  Authorization: "Bearer " + process.env.ZAPZIVE_SECRET_KEY,',
  '  "Content-Type": "application/json",',
  '};',
  '// Use a key with approve scope for approval, acceptance, and release steps.',
];

export const examples: Example[] = [
  {
    slug: "global-payroll",
    eyebrow: "Payroll operations",
    title: "Run a global payroll batch.",
    description: "Build a controlled payroll flow that verifies workers, creates one batch, approves it, and executes it once with an idempotent request.",
    outcome: "A completed sandbox payroll batch with a payment record for every verified worker.",
    time: "15–20 minutes",
    icon: UsersRound,
    prerequisites: ["Sandbox API key", "A funded USDC test balance", "Verified worker IDs"],
    architecture: ["Worker records", "Payroll batch", "Settlement record"],
    steps: [
      {
        title: "Create the batch",
        description: "Send worker IDs and exact USDC amounts. The API checks organization ownership and worker verification before creating the draft batch.",
        file: "create-batch.ts",
        language: "typescript",
        code: lines(...authHeaders, "", "const batch = await fetch(API_BASE_URL + \"/api/payroll/batches\", {", "  method: \"POST\",", "  headers: { ...headers, \"Idempotency-Key\": \"payroll-october-2026\" },", "  body: JSON.stringify({", "    name: \"October 2026 payroll\",", "    workerIds: [\"worker_id_001\", \"worker_id_002\"],", "    amounts: [420, 650],", "  }),", "}).then((response) => response.json());"),
        result: "The response is a draft batch. No balance is debited until approval and execution.",
      },
      {
        title: "Approve and execute once",
        description: "Approval is a separate state transition. Execute only after the batch is approved; the server atomically claims the batch and checks the USDC balance.",
        file: "approve-and-execute.ts",
        language: "typescript",
        code: lines("await fetch(API_BASE_URL + \"/api/payroll/batches/\" + batch.id + \"/approve\", {", "  method: \"POST\",", "  headers,", "});", "", "const completed = await fetch(API_BASE_URL + \"/api/payroll/batches/\" + batch.id + \"/execute\", {", "  method: \"POST\",", "  headers: { ...headers, \"Idempotency-Key\": \"payroll-execute-\" + batch.id },", "}).then((response) => response.json());"),
        result: "The batch becomes completed, each payment receives a sandbox reference, and treasury balance is debited once.",
      },
      {
        title: "Reconcile the final batch",
        description: "Read the completed batch and persist the worker-level payment results in your own ledger. Do not infer completion from the approval response.",
        file: "reconcile.ts",
        language: "typescript",
        code: lines("const finalBatch = await fetch(API_BASE_URL + \"/api/payroll/batches/\" + batch.id, {", "  headers,", "}).then((response) => response.json());", "", "for (const payment of finalBatch.payments) {", "  await ledger.record({", "    workerId: payment.workerId,", "    amount: payment.amount,", "    status: payment.status,", "    reference: payment.txHash,", "  });", "}"),
        result: "Your ledger mirrors the persisted payment status and sandbox transaction reference for every worker.",
      },
    ],
    checklist: ["Validate the total before approval", "Use one idempotency key per execution", "Handle completed, failed, and held states"],
    nextTitle: "Read the payroll API",
    nextHref: "/docs/api/payroll",
  },
  {
    slug: "supplier-payouts",
    eyebrow: "Cross-border payments",
    title: "Pay suppliers across borders.",
    description: "Create a recipient, request an FX quote, settle a local-currency remittance, and retain the source amount, fee, and delivery reference together.",
    outcome: "A completed sandbox supplier payout with an authoritative server-side FX calculation.",
    time: "10–15 minutes",
    icon: Send,
    prerequisites: ["Sandbox API key", "A funded USDC test balance", "Supplier contact and payout destination"],
    architecture: ["Recipient profile", "Quote", "Remittance record"],
    steps: [
      {
        title: "Create the recipient",
        description: "Save the supplier destination before creating the money movement. The remittance endpoint will only accept a recipient owned by the same organization.",
        file: "recipient.ts",
        language: "typescript",
        code: lines(...authHeaders, "", "const recipient = await fetch(API_BASE_URL + \"/api/remittance/recipients/add\", {", "  method: \"POST\",", "  headers: { ...headers, \"Idempotency-Key\": \"supplier-recipient-kijani\" },", "  body: JSON.stringify({", "    name: \"Kijani Supply Co.\",", "    email: \"accounts@kijani.example\",", "    phone: \"+254700000000\",", "    country: \"Kenya\",", "    mobileNumber: \"+254700000000\",", "  }),", "}).then((response) => response.json());"),
        result: "The recipient gets a stable ID and a verified destination record for later payout requests.",
      },
      {
        title: "Review the quote",
        description: "Ask the server for the current sandbox corridor calculation. The quote is short-lived and the create endpoint recalculates authoritative values.",
        file: "quote.ts",
        language: "typescript",
        code: lines("const quote = await fetch(API_BASE_URL + \"/api/remittance/quote\", {", "  method: \"POST\",", "  headers,", "  body: JSON.stringify({ amount: 125, currency: \"USDC\", localCurrency: \"KES\" }),", "}).then((response) => response.json());", "", "console.log(quote.destinationAmount, quote.fxRate, quote.fee, quote.expiresAt);"),
        result: "Finance can review the source amount, destination amount, fee, rate, and expiry before submitting.",
      },
      {
        title: "Create and reconcile the remittance",
        description: "Submit the payout with an idempotency key, then store the returned sandbox reference. The source balance is debited atomically with the remittance record.",
        file: "settle.ts",
        language: "typescript",
        code: lines("const payout = await fetch(API_BASE_URL + \"/api/remittance\", {", "  method: \"POST\",", "  headers: { ...headers, \"Idempotency-Key\": \"supplier-invoice-2048\" },", "  body: JSON.stringify({", "    sender: \"QA Sandbox\",", "    recipientId: recipient.id,", "    amount: 125,", "    currency: \"USDC\",", "    localCurrency: \"KES\",", "    deliveryMethod: \"mobile-money\",", "    note: \"Invoice INV-2048\",", "  }),", "}).then((response) => response.json());", "", "console.log(payout.status, payout.localAmount, payout.txHash);"),
        result: "The payout is completed in sandbox with local amount, fee, FX rate, and a linked transaction reference.",
      },
    ],
    checklist: ["Verify recipient ownership and destination", "Never trust client-supplied FX values", "Persist the final transaction reference"],
    nextTitle: "Explore remittance endpoints",
    nextHref: "/docs/api/remittance",
  },
  {
    slug: "marketplace-escrow",
    eyebrow: "Marketplace protection",
    title: "Release marketplace funds by milestone.",
    description: "Publish a contract, collect a public bid, fund the accepted bid, and release only the milestone that has been approved.",
    outcome: "A sandbox escrow contract with controlled funding, milestone release, and dispute audit context.",
    time: "15–20 minutes",
    icon: LockKeyhole,
    prerequisites: ["Sandbox API key", "Funded USDC test balance", "Milestone definitions"],
    architecture: ["Public contract", "Bid decision", "Milestone release"],
    steps: [
      {
        title: "Create the public contract",
        description: "Milestone amounts must add up exactly to the contract total. Keep the contract ID as the source of truth for the marketplace order.",
        file: "create-contract.ts",
        language: "typescript",
        code: lines(...authHeaders, "", "const contract = await fetch(API_BASE_URL + \"/api/escrow/contracts\", {", "  method: \"POST\",", "  headers: { ...headers, \"Idempotency-Key\": \"escrow-order-2048\" },", "  body: JSON.stringify({", "    title: \"Marketplace design package\",", "    description: \"Design and deliver the marketplace launch package.\",", "    client: \"QA Sandbox\",", "    contractor: \"External / Open Bid\",", "    totalAmount: 1000,", "    startDate: \"2026-10-01T00:00:00.000Z\",", "    endDate: \"2026-10-31T00:00:00.000Z\",", "    isPublic: true,", "    milestones: [", "      { title: \"Design approved\", description: \"Approved design system.\", amount: 400, dueDate: \"2026-10-15T00:00:00.000Z\" },", "      { title: \"Final delivery\", description: \"Final production package.\", amount: 600, dueDate: \"2026-10-31T00:00:00.000Z\" },", "    ],", "  }),", "}).then((response) => response.json());"),
        result: "The contract is visible through the public contract route and remains draft until a bid is accepted.",
      },
      {
        title: "Receive and accept a bid",
        description: "The public bidder submits contact details and a proposal without receiving dashboard access. An authorized organization user accepts the bid.",
        file: "accept-bid.ts",
        language: "typescript",
        code: lines("const bid = await fetch(API_BASE_URL + \"/api/escrow/public/\" + contract.id + \"/bid\", {", "  method: \"POST\",", "  headers: { \"Content-Type\": \"application/json\" },", "  body: JSON.stringify({", "    contractorName: \"Amina Studio\",", "    contractorEmail: \"hello@amina.example\",", "    proposal: \"We can deliver the package in two milestones.\",", "    amount: 1000,", "  }),", "}).then((response) => response.json());", "", "const funded = await fetch(API_BASE_URL + \"/api/escrow/contracts/\" + contract.id + \"/bids/\" + bid.id + \"/accept\", {", "  method: \"PUT\",", "  headers: { ...headers, \"Idempotency-Key\": \"escrow-accept-\" + bid.id },", "}).then((response) => response.json());"),
        result: "The accepted bid funds the contract from USDC, rejects other pending bids, and moves the contract to active.",
      },
      {
        title: "Release the approved milestone",
        description: "Release only the exact milestone amount. The server checks contract ownership, locked funds, milestone state, and idempotency before updating balances.",
        file: "release.ts",
        language: "typescript",
        code: lines("const released = await fetch(API_BASE_URL + \"/api/escrow/contracts/\" + funded.id + \"/release\", {", "  method: \"POST\",", "  headers: { ...headers, \"Idempotency-Key\": \"escrow-release-ms-1\" },", "  body: JSON.stringify({", "    milestoneId: funded.milestones[0].id,", "    amount: 400,", "  }),", "}).then((response) => response.json());", "", "console.log(released.milestones[0].status);"),
        result: "The first milestone becomes released, locked balance decreases, and a sandbox escrow transaction is recorded.",
      },
    ],
    checklist: ["Require exact milestone totals", "Keep public bidding separate from dashboard access", "Record release and dispute reasons in audit history"],
    nextTitle: "Read the escrow model",
    nextHref: "/docs/concepts/escrow",
  },
  {
    slug: "treasury-settlement",
    eyebrow: "Treasury operations",
    title: "Move treasury liquidity into local settlement.",
    description: "Fund a sandbox balance, inspect available assets, and move liquidity into a controlled local payout while keeping every operation traceable.",
    outcome: "A repeatable USDC-to-KES sandbox settlement with balance and transaction records.",
    time: "10–15 minutes",
    icon: Landmark,
    prerequisites: ["Sandbox API key", "A test workspace", "A saved recipient ID", "An approved payout policy"],
    architecture: ["Treasury balance", "FX quote", "Local settlement"],
    steps: [
      {
        title: "Fund and inspect liquidity",
        description: "Use the sandbox faucet only for testing. Read the balance after funding instead of assuming the write succeeded.",
        file: "balance.ts",
        language: "typescript",
        code: lines(...authHeaders, "", "await fetch(API_BASE_URL + \"/api/treasury/deposit\", {", "  method: \"POST\",", "  headers: { ...headers, \"Idempotency-Key\": \"treasury-faucet-001\" },", "  body: JSON.stringify({ asset: \"USDC\", amount: 2500 }),", "});", "", "const assets = await fetch(API_BASE_URL + \"/api/treasury/assets\", { headers }).then((response) => response.json());", "const usdc = assets.find((asset) => asset.symbol === \"USDC\");", "if (!usdc || usdc.balance < 2500) throw new Error(\"Insufficient sandbox liquidity\");"),
        result: "The persisted asset balance is the input to the next operation; no client-side balance is treated as authoritative.",
      },
      {
        title: "Review the corridor quote",
        description: "Request a short-lived server-side FX calculation before creating the payout. In production, replace sandbox rates with a reviewed provider quote.",
        file: "quote.ts",
        language: "typescript",
        code: lines("const quote = await fetch(API_BASE_URL + \"/api/remittance/quote\", {", "  method: \"POST\",", "  headers,", "  body: JSON.stringify({ amount: 250, currency: \"USDC\", localCurrency: \"KES\" }),", "}).then((response) => response.json());", "", "console.log({ source: quote.sourceAmount, destination: quote.destinationAmount, rate: quote.fxRate, expires: quote.expiresAt });"),
        result: "The operator can review source, destination, fee, rate, and expiry before submitting local settlement.",
      },
      {
        title: "Settle and verify the record",
        description: "Create the remittance with the approved destination and a unique idempotency key, then read the treasury history to reconcile the debit.",
        file: "settle.ts",
        language: "typescript",
        code: lines("const recipientId = process.env.SANDBOX_RECIPIENT_ID;", "if (!recipientId) throw new Error(\"Set SANDBOX_RECIPIENT_ID first\");", "", "const payout = await fetch(API_BASE_URL + \"/api/remittance\", {", "  method: \"POST\",", "  headers: { ...headers, \"Idempotency-Key\": \"treasury-settlement-001\" },", "  body: JSON.stringify({", "    sender: \"QA Sandbox\",", "    recipientId,", "    amount: 250,", "    currency: \"USDC\",", "    localCurrency: \"KES\",", "    deliveryMethod: \"bank\",", "  }),", "}).then((response) => response.json());", "", "const history = await fetch(API_BASE_URL + \"/api/treasury/history?limit=20\", { headers }).then((response) => response.json());", "console.log(payout.txHash, history[0].status);"),
        result: "The remittance and treasury history share a sandbox settlement reference that can be reconciled by finance.",
      },
    ],
    checklist: ["Treat persisted balances as authoritative", "Expire unused quotes", "Reconcile the source debit and destination delivery"],
    nextTitle: "Explore treasury endpoints",
    nextHref: "/docs/api/treasury",
  },
];

export function getExample(slug: string | undefined) {
  return examples.find((example) => example.slug === slug);
}
