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

Authenticated writes require an `Idempotency-Key`. Dashboard requests use an HttpOnly session cookie and `X-Requested-With`; server-to-server requests use a scoped test API key. Operational workflows remain evaluation records, while the separate connected-wallet EVM rail reads real networks and requires an explicit environment configuration.

## Wallet-approved EVM rail

The dashboard includes a non-custodial EVM rail for connected browser wallets such as MetaMask and Rainbow. It is deliberately isolated from the operational `Asset` records: every displayed holding is read from the selected network RPC, and a verified chain receipt is an **observational record**, never a claim that Zapzive holds the user's wallet funds.

### What it does

- Supports native EVM assets and USDC on Ethereum Sepolia, Arbitrum Sepolia, Optimism Sepolia, Base Sepolia, and Polygon Amoy. Optional USDT and DAI contracts are configured per network through protected backend environment variables. Ethereum, Arbitrum, Optimism, Base, and Polygon mainnets are compiled in but disabled by default.
- Uses an EIP-4361-style, expiring ownership message to link an externally owned wallet. The message cannot authorize a transfer or token approval.
- Creates a server-side payment intent with exact integer token units, checks live RPC balances and transfer simulation, then asks the connected wallet to sign and broadcast.
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

### Local devnet for hands-on testing

Try the full wallet flow in MetaMask without faucets on a private Hardhat chain (chain ID 31337) with test USDC, USDT and DAI.

1. In `backend/.env`, set `CRYPTO_ENABLE_LOCAL_DEVNET=true` and restart the backend.
2. In a separate terminal, start the chain and fund your wallet. Keep it running while you test:

   ```bash
   npm run devnet -- 0xYourMetaMaskAddress
   ```

3. In Crypto payments, choose **Local devnet**. MetaMask asks to add the network (RPC `http://127.0.0.1:8545`, chain ID 31337). Verify the wallet and send a payment; it settles within seconds.

Fund more wallets with `npm run devnet:fund -- 0xAddress`. Stopping the chain erases it: after a restart, fund again and clear MetaMask's activity for the network (Settings → Advanced → Clear activity tab data). The devnet is never offered when `NODE_ENV=production` or on Vercel.

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
- `POST /api/treasury/swap` - Returns a not-configured response until an on-chain swap provider is integrated
- `POST /api/treasury/deposit` - Reads balances from connected wallets; no local balance mutation
- `POST /api/treasury/withdraw` - Requires the signed crypto payment flow

### Crypto payments
- `GET /api/crypto/networks` - List enabled testnet or live EVM networks and configured assets
- `GET /api/crypto/portfolio` - Read verified wallet holdings from network RPCs
- `GET /api/crypto/wallets` - List wallets linked to the workspace
- `POST /api/crypto/wallets/challenge` - Create an expiring wallet ownership challenge
- `POST /api/crypto/wallets/verify` - Verify the wallet signature and link the address
- `GET /api/crypto/balances` - Read a selected asset and native fee balance
- `POST /api/crypto/payments` - Create an immutable payment intent
- `POST /api/crypto/payments/:id/prepare` - Re-check balance and prepare the exact wallet transaction
- `POST /api/crypto/payments/:id/submit` - Record a wallet-broadcast transaction hash
- `POST /api/crypto/payments/:id/reconcile` - Verify receipt and settlement evidence

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
