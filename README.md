# Zapzive

Zapzive is a financial-operations workspace for modelling and operating global payment workflows. It brings payroll, remittance, treasury, escrow, compliance records, and wallet-approved crypto payments into one product experience with clear state, permissions, and audit history.

The repository is designed for local development and test-mode evaluation. Payroll, remittance, escrow, and compliance workflows remain evaluation records. Crypto balances and transfers are different: they are read from and signed against real EVM testnets through a connected wallet, with explicit production gates. Zapzive never takes custody of wallet keys.

## Product scope

Zapzive is organised around the operational work a finance team needs to complete:

- **Payroll:** manage workers, prepare batches, collect approvals, and execute test payouts with stateful records.
- **Remittance:** maintain recipients, request server-calculated test quotes, choose a delivery method, and trace a payout through its lifecycle.
- **Treasury:** inspect verified wallet holdings from the active EVM network and keep operational records separate from on-chain state.
- **Escrow:** create milestone contracts, collect bids, lock test funds, release milestones, and record disputes.
- **Crypto payments:** select a supported network and asset, verify wallet ownership, review an exact transfer, sign it in the user's wallet, and reconcile the resulting transaction record.
- **Compliance and operations:** review sandbox KYC/AML items, audit activity, operational analytics, agents, API keys, webhooks, and workspace settings.
- **Documentation:** follow a progressive set of guides, API reference pages, examples, and go-live material at `/docs`.

## What is implemented

### Product experience

- Public marketing pages, product explanations, pricing, use cases, legal pages, contact pages, and a responsive application shell.
- Authenticated dashboard navigation with role-aware actions and session-preserving route transitions.
- Guided workflows for workers, recipients, payment creation, approvals, quotes, escrow milestones, treasury movements, and operational records.
- On-chain balances that remain consistent across Overview, Treasury, Crypto payments, and Settings by reading the same verified wallet and network state.
- Currency and asset presentation using maintained token marks rather than generated icon art.
- Accessible controls, loading states, empty states, validation feedback, copy actions, and contextual error messages.

### Operational records and on-chain rail

New workspaces do not receive fabricated crypto balances. Workspace records are seeded only where they are needed to demonstrate non-custodial product workflows. Crypto holdings appear only after a user verifies an external wallet; the backend reads native and configured token balances from the selected EVM testnet or live network.

### Connected-wallet rail

The wallet rail is non-custodial. It works with compatible injected EVM wallets, including MetaMask, Rainbow, Coinbase Wallet, and Brave Wallet when they expose the standard browser provider interface.

- Wallet ownership is proven with an expiring, EIP-4361-style message. The message explicitly cannot approve tokens or transfer funds.
- The dashboard can request a wallet network switch or safely add a configured network before verification.
- A payment intent is created server-side with integer base units. The wallet is asked to sign and broadcast only after the transfer has been reviewed.
- The client saves a recovery record before opening the wallet and persists the returned transaction hash before it is indexed, preventing unsafe duplicate sends after an interrupted browser session.
- The backend validates the sender, chain, enabled token contract, calldata, amount, receipt, canonical block, nonce, and matching transfer event before settlement.
- Standard externally owned accounts are supported. Smart-contract and delegated wallets require a separate signing adapter and are not currently supported.

Bitcoin and Solana are not exposed as EVM token options. They require separate adapters for address validation, message signing, fee estimation, transaction construction, and confirmation; the UI does not show them as if they were supported.

## Architecture

```text
                         Zapzive web application

  Browser
  React + TypeScript + Vite
  React Query, React Hook Form, Zod, Tailwind and Radix primitives
        |
        | HTTPS API requests, HttpOnly session cookie, X-Requested-With
        v
  Express + TypeScript API
  authentication, validation, permission checks, idempotency and audit events
        |
        +-------------------------------+
        |                               |
        v                               v
  Prisma data layer                 Crypto rail service
  SQLite for local development     network and asset configuration
        |                               |
        v                               v
  Workspace records, payroll,       Public RPC providers and EVM receipts
  escrow, remittances, users,       (for the connected-wallet rail)
  remittances, users and audits

  Browser wallet extension
  The user owns keys and signs messages or transfers locally.
  Zapzive receives a signature or transaction hash, never a seed phrase or private key.
```

### Application boundaries

| Area | Responsibility | Boundary |
| --- | --- | --- |
| Frontend | Product UI, guarded routes, form validation, wallet discovery, transfer review | Does not hold credentials, private keys, or authoritative ledger state. |
| Backend API | Authentication, authorization, server validation, workflow state, audit events, reconciliation | Is authoritative for operational records and payment-intent state; it does not invent wallet balances. |
| Database | Workspace-scoped operational data, transactions, audit records, wallet links, and crypto recovery state | Local SQLite is for development and must not be used as durable serverless production storage. |
| Browser wallet | Account connection, ownership signature, network confirmation, transaction broadcast | User-controlled; Zapzive cannot send from the wallet without user approval. |
| RPC providers | Chain reads and independent receipt verification | Required only for the connected-wallet rail. |

## Repository layout

```text
.
|-- src/                    React application, public pages, dashboard, docs and UI primitives
|-- public/                 Static brand assets, favicons and asset marks
|-- backend/
|   |-- src/                Express API, workflows, authentication and crypto services
|   |-- prisma/             Prisma schema, seed data and local database configuration
|   |-- tests/              Focused crypto rail validation tests
|   |-- api/                Vercel serverless entry point
|   `-- vercel.json         Backend deployment configuration
|-- vercel.json             Frontend static deployment configuration
`-- package.json            Frontend development and build scripts
```

## Local development

### Prerequisites

- Node.js 18 through 23 for the backend (the backend package enforces `>=18 <24`).
- npm 9 or later.
- A modern browser. An injected EVM wallet is optional and is needed only for connected-wallet testing.

### 1. Clone and install

```bash
git clone https://github.com/shaneyoungk/zapzive.git
cd zapzive

npm install

cd backend
npm install
```

### 2. Configure the backend

Create `backend/.env` from [`backend/.env.example`](backend/.env.example). For local use, configure at least:

```dotenv
PORT=3001
DATABASE_URL="file:./dev.db"
JWT_SECRET="replace-with-a-long-unique-local-secret"
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

`JWT_SECRET` must be a unique secret in every environment. Do not commit `.env` files, production secrets, RPC credentials, or scheduler credentials.

The default testnet rail uses the configured USDC deployment and the network's native asset. Add a verified per-network `*_USDT_ADDRESS` or `*_DAI_ADDRESS` only when the contract is deployed on that exact network and its decimals have been independently checked. BTC and SOL cannot be enabled by adding an EVM contract address.

### 3. Initialise the local database

From `backend/`:

```bash
npm run prisma:generate
npm exec prisma db push -- --skip-generate --accept-data-loss
npm run prisma:seed
```

The seed command creates a local workspace and test data. `db push --accept-data-loss` is appropriate for a disposable local database; use reviewed Prisma migrations for a durable environment.

### 4. Point the frontend to the API

Create a root `.env` file with:

```dotenv
VITE_API_URL=http://localhost:3001
```

Only variables prefixed with `VITE_` are exposed to the browser. Never place backend secrets in this file.

### 5. Start both services

Open two terminals.

```bash
# Terminal 1: from backend/
npm run dev
```

```bash
# Terminal 2: from the repository root
npm run dev
```

The application is normally available at `http://localhost:5173`; the API health check is available at `http://localhost:3001/health`.

## Quality checks

Run checks from the relevant directory before opening a pull request or deploying.

```bash
# Repository root
npm run lint
npm run build
npm exec tsc -- --noEmit
```

```bash
# backend/
npm run test:crypto
npm run build
```

For crypto operational checks:

```bash
# backend/ - reconciles due wallet transaction hashes once
npm run crypto:reconcile

# backend/ - long-running worker for a protected non-serverless environment
npm run crypto:worker
```

## Security model

The application includes practical safeguards for local and staged use. These controls are not a substitute for an independent security assessment before handling real customer funds.

- HttpOnly session cookies, server-side session revocation, and scoped `sk_test_` API keys.
- CSRF-aware authenticated writes using the application's request header convention.
- Role-based authorization for privileged financial operations.
- Server-side validation, rate limiting, controlled CORS, request-size limits, and production security headers.
- Idempotency keys for financial writes, workflow state checks, and workspace-scoped data access.
- Immutable-style audit events for operational and administrative actions.
- Wallet ownership verification that never requests a seed phrase, private key, approval transaction, or token allowance.
- Transaction recovery, optimistic versions, durable processing leases, backoff, and double-entry observational journal records for the connected-wallet rail.

### Mainnet safeguards

Mainnet is disabled by default. It cannot be enabled simply by changing the frontend. The API requires all of the following before a live wallet network is available:

1. The workspace is explicitly marked live and has a `liveEnabledAt` timestamp.
2. `CRYPTO_ENABLE_MAINNET=true` and `CRYPTO_PERSISTENT_STORAGE=true` are set on the backend.
3. The API uses durable storage; ephemeral Vercel SQLite storage is rejected.
4. Every enabled mainnet has a primary HTTPS RPC provider and an independent secondary provider that can witness finalized receipts.
5. A protected reconciliation worker or scheduled endpoint is running with `CRYPTO_WORKER_SECRET` or `CRON_SECRET`.

Production also requires custody and regulatory review, transaction monitoring, alerting, incident response, secure secret management, database backup and restore testing, change control, and a reviewed migration baseline. Do not use the sandbox as a substitute for these controls.

## Supported wallet networks

The testnet wallet rail is configured for Ethereum Sepolia, Arbitrum Sepolia, Optimism Sepolia, Base Sepolia, and Polygon Amoy. Mainnet configuration for Ethereum, Arbitrum, Optimism, Base, and Polygon is compiled into the backend but remains disabled until the safeguards above are satisfied.

For hands-on testing without faucets, a private local devnet with test USDC, USDT and DAI can be enabled for local development; see [`backend/README.md`](backend/README.md#local-devnet-for-hands-on-testing).

Public testnet RPC defaults can be overridden in `backend/.env`. Production RPC URLs and secondary witness endpoints belong only in protected backend environment variables. Never expose them through `VITE_*` variables.

## Deployment

The frontend and API are deployed independently.

- **Frontend:** a Vite static build deployed with the root [`vercel.json`](vercel.json). Production is served at [zapzive.vercel.app](https://zapzive.vercel.app/).
- **Backend:** deploy the `backend/` directory as a separate Vercel project using [`backend/vercel.json`](backend/vercel.json), or deploy it to a persistent Node environment for worker-backed processing.

Before deployment, configure:

| Location | Required configuration |
| --- | --- |
| Frontend build environment | `VITE_API_URL` set to the deployed backend base URL. |
| Backend environment | `DATABASE_URL`, a unique `JWT_SECRET`, `FRONTEND_URL` set to the frontend origin, and an appropriate `NODE_ENV`. |
| Wallet mainnet rollout | Durable database, production RPC and witness providers, worker secret, scheduler or worker, and all mainnet safeguards enabled intentionally. |

After any environment change, verify sign-in, an authenticated dashboard request, a CORS-protected write, and the deployed `/health` endpoint. Treat redirect URLs, callback origins, API base URLs, and CORS origins as a single deployment checklist.

## Documentation and examples

The in-product documentation is available at `/docs` and is structured from quick start through authentication, test workflows, errors, webhooks, API reference, go-live guidance, and end-to-end examples. Start with the examples when evaluating a complete flow; use the API reference for endpoint-level integration details.

## Contributing

1. Create a focused branch from `main`.
2. Keep user-facing changes accessible, role-aware, and explicit about test versus live behaviour.
3. Run the applicable frontend and backend checks.
4. Include migration, environment, and security impact notes when a change affects persisted data, authentication, payments, or wallet flows.
5. Open a pull request with a concise description and verification steps.

## License

This repository does not currently include a root license file. Do not assume permission to redistribute or reuse the code beyond the permissions granted by its owner until a license is added.

