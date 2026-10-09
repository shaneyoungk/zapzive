# Zapzive

![License](https://img.shields.io/badge/license-MIT-blue.svg) ![Status](https://img.shields.io/badge/status-Active-success.svg) ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white) ![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB) ![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white)

**Zapzive** is a financial operations sandbox for evaluating global liquidity workflows, payroll, milestone escrow, and cross-border remittances with a clear audit trail.

The current repository is designed to make the product behavior testable and honest: money movement is persisted as sandbox records, live providers are not connected, and production readiness requires the controls described in the documentation.

---

## 🚀 Key Capabilities

### 🌐 Unified Treasury Management
- **Sandbox Asset Control:** Inspect seeded test assets and company-scoped balances from one view.
- **Derived Analytics:** Reconcile persisted transactions, payroll, escrow, and remittance records.
- **Sandbox Swaps:** Exercise atomic balance and transaction updates with explicit test references.

### Global Payroll Engine
- **Batch Processing:** Create, approve, and execute USDC test batches with idempotent state transitions.
- **Worker Management:** Maintain company-scoped profiles, eligibility status, and payment history.
- **Provider boundary:** No live bank, wallet custody, tax, or payroll provider is connected.

### Secure Escrow Contracts
- **Milestone-Based Releases:** Test locked balances and exact milestone releases in the sandbox ledger.
- **Bid Workflow:** Collect public bids and accept one through an authorized role.
- **Provider boundary:** No smart contract, custody, arbitration, or multisignature provider is connected.

### Cross-Border Remittance
- **Sandbox corridors:** Test supported source assets, destination currencies, recipients, and delivery-method validation.
- **Explicit test rates:** Quotes return a short-lived sandbox calculation; the create route recalculates it server-side.
- **Reconciliation:** Remittance and treasury transaction records share a sandbox reference.

### Enterprise Compliance
- **Review records:** Create and inspect sandbox KYC/AML items without claiming provider verification.
- **Audit Trails:** Record money-moving and administrative actions with request context.
- **Role-Based Access:** Separate owner, admin, approver, operator, developer, and member capabilities.

---

## 🛠️ Technology Stack

### Frontend
- **Framework:** [React](https://reactjs.org/) with [Vite](https://vitejs.dev/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) & [Shadcn/UI](https://ui.shadcn.com/)
- **State Management:** React Context & [TanStack Query](https://tanstack.com/query/latest)
- **Visualization:** [Recharts](https://recharts.org/) for analytics & [Framer Motion](https://www.framer.com/motion/) for animations
- **Forms:** React Hook Form + Zod validation

### Backend
- **Runtime:** [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/)
- **Database:** SQLite with [Prisma ORM](https://www.prisma.io/) for the local sandbox
- **Authentication:** HttpOnly cookie sessions, scoped test API keys, CSRF protection, and server-side session revocation
- **Provider integration:** Persisted sandbox settlement only; no live bank, FX, blockchain, queue, or webhook provider is configured

---

## 🏁 Getting Started

### Prerequisites
- Node.js > v18.0.0
- npm or yarn or bun
- Node.js 18 or newer

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/shanekizito/zapzive.git
   cd zapzive
   ```

2. **Install Dependencies**
   ```bash
   # Install frontend dependencies
   npm install

   # Install backend dependencies
   cd backend
   npm install
   ```

3. **Environment Setup**
   - Copy `.env.example` to `.env` in both root and backend directories when available.
   - The local backend defaults to `DATABASE_URL="file:./dev.db"`; use a managed transactional database before production.

4. **Run the Application**
   ```bash
   # Start the backend server
   cd backend
   npm run dev

   # Start the frontend development server (in a new terminal)
   # from the root directory
   npm run dev
   ```

---

## 🤝 Contributing

We welcome contributions from the community! Whether it's reporting bugs, suggesting features, or submitting pull requests, your input is valuable.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<p align="center">
  Built with ❤️ by the zapzive Team
</p>

