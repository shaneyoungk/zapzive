# Zapzive Backend API

Backend API server for the Zapzive application, providing RESTful endpoints for all dashboard functionality.

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: SQLite with Prisma ORM for the local sandbox
- **Authentication**: HttpOnly cookie sessions plus scoped `sk_test_...` API keys

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Set Up Database

```bash
# Generate Prisma client
npm run prisma:generate

# Synchronize the local sandbox schema
npm exec prisma db push -- --skip-generate --accept-data-loss

# Seed database with sample data
npm run prisma:seed
```

### 3. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3001`

Authenticated writes require an `Idempotency-Key`. Dashboard requests use an HttpOnly session cookie and `X-Requested-With`; server-to-server requests use a scoped test API key. This repository does not connect to live payment providers.

## Wallet-approved USDC rail

The dashboard includes a separate, non-custodial USDC rail for connected browser wallets such as Rainbow. It is deliberately isolated from the sandbox `Asset` balances: a verified chain receipt is an **observational record**, never a claim that Zapzive holds the user's wallet funds.

### What it does

- Supports native USDC on Ethereum Sepolia, Arbitrum Sepolia, Optimism Sepolia, Base Sepolia, and Polygon Amoy for test work. Ethereum, Arbitrum, Optimism, Base, and Polygon mainnets are compiled in but disabled by default.
- Uses an EIP-4361-style, expiring ownership message to link an externally owned wallet. The message cannot authorize a transfer or token approval.
- Creates a server-side payment intent with exact integer USDC base units, then simulates the same ERC-20 `transfer` before the user sees a wallet send request.
- The wallet, not Zapzive, sends the transaction. Zapzive never receives a seed phrase, private key, or signing credential.
- Persists a wallet-returned transaction hash before it is necessarily indexed by an RPC, so an interrupted tab does not lead to an unsafe second send.
- Validates the mined transaction's chain, sender, USDC contract, calldata, zero native value, nonce, receipt, canonical block, and exactly one matching `Transfer` event before calling it settled.
- Uses optimistic state versions, durable leases, backoff, audit events, and a balanced two-entry observational journal for settlement/reversal state.

### Mainnet activation gate

Mainnet stays unavailable unless all of the following are true:

1. The workspace is live and has `liveEnabledAt` set.
2. `CRYPTO_ENABLE_MAINNET=true` and `CRYPTO_PERSISTENT_STORAGE=true` are set on the backend.
3. The database is durable. Ephemeral Vercel SQLite storage is rejected automatically.
4. Each mainnet has both a primary HTTPS RPC and an independent secondary HTTPS RPC. The secondary provider witnesses finalized receipts before settlement.
5. A protected worker is running. Use `npm run crypto:worker` for a long-running deployment, or call `GET /api/internal/crypto/reconcile` from a scheduler with `Authorization: Bearer $CRYPTO_WORKER_SECRET` (Vercel's `CRON_SECRET` is also accepted).

Do not bypass these gates by changing the frontend. Production rollout also needs custody/compliance review, transaction monitoring, incident response, durable database backups, and a migration baseline for the production database.

### Developer checks

```bash
# Pure validation tests; no wallet or public RPC needed.
npm run test:crypto

# One safe reconciliation pass for due hashes.
npm run crypto:reconcile

# Continuous worker for a non-serverless deployment.
npm run crypto:worker
```

## API Endpoints

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/balance` - Get balance breakdown
- `GET /api/dashboard/transactions` - Get recent transactions
- `GET /api/dashboard/activity` - Get activity feed

### Remittance
- `GET /api/remittance` - List remittances
- `POST /api/remittance` - Create remittance
- `POST /api/remittance/quote` - Create a short-lived sandbox quote
- `GET /api/remittance/:id` - Get remittance details
- `POST /api/remittance/:id/cancel` - Cancel remittance
- `GET /api/remittance/recipients/list` - List recipients
- `POST /api/remittance/recipients/add` - Add recipient

### Payroll
- `GET /api/payroll/batches` - List payroll batches
- `POST /api/payroll/batches` - Create batch
- `POST /api/payroll/batches/:id/approve` - Approve batch
- `POST /api/payroll/batches/:id/execute` - Execute batch
- `GET /api/payroll/workers` - List workers
- `POST /api/payroll/workers` - Add worker
- `PUT /api/payroll/workers/:id` - Update worker
- `DELETE /api/payroll/workers/:id` - Remove worker

### Treasury
- `GET /api/treasury/assets` - List assets
- `GET /api/treasury/portfolio` - Portfolio summary
- `POST /api/treasury/swap` - Execute swap
- `POST /api/treasury/deposit` - Deposit funds
- `POST /api/treasury/withdraw` - Withdraw funds

### Escrow
- `GET /api/escrow/contracts` - List contracts
- `POST /api/escrow/contracts` - Create contract
- `POST /api/escrow/contracts/:contractId/release` - Release funds
- `POST /api/escrow/contracts/:id/dispute` - Raise dispute

### Analytics
- `GET /api/analytics/overview` - Analytics overview
- `GET /api/analytics/transactions` - Transaction analytics
- `GET /api/analytics/revenue` - Revenue data
- `GET /api/analytics/geography` - Geographic distribution
- `GET /api/analytics/export` - Export data

### Compliance
- `GET /api/compliance/items` - List compliance items
- `POST /api/compliance/kyc` - Submit KYC
- `POST /api/compliance/aml` - Run AML check
- `GET /api/compliance/reports` - Compliance reports

### Agents
- `GET /api/agents` - List agents
- `POST /api/agents` - Register agent
- `POST /api/agents/:id/activate` - Activate agent
- `POST /api/agents/:id/deactivate` - Deactivate agent

### Settings
- `GET /api/settings/profile` - Get company profile
- `PUT /api/settings/profile` - Update profile
- `GET /api/settings/api-keys` - List API keys
- `POST /api/settings/api-keys` - Generate API key
- `DELETE /api/settings/api-keys/:id` - Revoke API key
- `GET /api/settings/webhooks` - List webhooks
- `POST /api/settings/webhooks` - Create webhook
- `PUT /api/settings/webhooks/:id` - Update webhook
- `DELETE /api/settings/webhooks/:id` - Delete webhook

## Development Tools

### Prisma Studio
View and edit database data in a GUI:
```bash
npm run prisma:studio
```

### Build for Production
```bash
npm run build
npm start
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
PORT=3001
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key"
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```
