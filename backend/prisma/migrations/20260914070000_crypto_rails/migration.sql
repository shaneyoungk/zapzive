-- Additive only: existing sandbox balances are never converted or credited.
CREATE TABLE "CryptoWallet" (
 "id" TEXT NOT NULL PRIMARY KEY, "companyId" TEXT NOT NULL, "chainId" INTEGER NOT NULL,
 "address" TEXT NOT NULL, "createdBy" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CryptoWallet_chainId_address_key" ON "CryptoWallet"("chainId", "address");
CREATE INDEX "CryptoWallet_companyId_idx" ON "CryptoWallet"("companyId");
CREATE TABLE "CryptoWalletChallenge" (
 "id" TEXT NOT NULL PRIMARY KEY, "companyId" TEXT NOT NULL, "userId" TEXT NOT NULL,
 "chainId" INTEGER NOT NULL, "address" TEXT NOT NULL, "message" TEXT NOT NULL,
 "expiresAt" DATETIME NOT NULL, "usedAt" DATETIME, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "CryptoWalletChallenge_companyId_userId_createdAt_idx" ON "CryptoWalletChallenge"("companyId", "userId", "createdAt");
CREATE TABLE "CryptoPayment" (
 "id" TEXT NOT NULL PRIMARY KEY, "companyId" TEXT NOT NULL, "walletId" TEXT NOT NULL,
 "createdBy" TEXT NOT NULL, "chainId" INTEGER NOT NULL, "tokenAddress" TEXT NOT NULL,
 "symbol" TEXT NOT NULL DEFAULT 'USDC', "decimals" INTEGER NOT NULL DEFAULT 6,
 "fromAddress" TEXT NOT NULL, "toAddress" TEXT NOT NULL, "amountUnits" TEXT NOT NULL,
 "reference" TEXT, "idempotencyKey" TEXT NOT NULL, "payloadHash" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'awaiting_signature', "txHash" TEXT, "nonce" INTEGER,
 "createdBlock" TEXT NOT NULL, "blockNumber" TEXT, "blockHash" TEXT, "confirmations" INTEGER NOT NULL DEFAULT 0,
 "errorCode" TEXT, "version" INTEGER NOT NULL DEFAULT 0, "attempts" INTEGER NOT NULL DEFAULT 0,
 "nextCheckAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "leaseUntil" DATETIME, "leaseOwner" TEXT,
 "expiresAt" DATETIME NOT NULL, "settledAt" DATETIME,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL,
 FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 FOREIGN KEY ("walletId") REFERENCES "CryptoWallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CryptoPayment_companyId_idempotencyKey_key" ON "CryptoPayment"("companyId", "idempotencyKey");
CREATE UNIQUE INDEX "CryptoPayment_chainId_txHash_key" ON "CryptoPayment"("chainId", "txHash");
CREATE UNIQUE INDEX "CryptoPayment_chainId_fromAddress_nonce_key" ON "CryptoPayment"("chainId", "fromAddress", "nonce");
CREATE INDEX "CryptoPayment_companyId_createdAt_id_idx" ON "CryptoPayment"("companyId", "createdAt", "id");
CREATE INDEX "CryptoPayment_status_nextCheckAt_leaseUntil_idx" ON "CryptoPayment"("status", "nextCheckAt", "leaseUntil");
CREATE TABLE "CryptoSubmission" (
 "id" TEXT NOT NULL PRIMARY KEY, "paymentId" TEXT NOT NULL, "chainId" INTEGER NOT NULL,
 "txHash" TEXT NOT NULL, "nonce" INTEGER NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY ("paymentId") REFERENCES "CryptoPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CryptoSubmission_chainId_txHash_key" ON "CryptoSubmission"("chainId", "txHash");
CREATE TABLE "CryptoJournal" (
 "id" TEXT NOT NULL PRIMARY KEY, "paymentId" TEXT NOT NULL, "kind" TEXT NOT NULL,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY ("paymentId") REFERENCES "CryptoPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CryptoJournal_paymentId_kind_key" ON "CryptoJournal"("paymentId", "kind");
CREATE TABLE "CryptoJournalEntry" (
 "id" TEXT NOT NULL PRIMARY KEY, "journalId" TEXT NOT NULL, "account" TEXT NOT NULL, "amountUnits" TEXT NOT NULL,
 FOREIGN KEY ("journalId") REFERENCES "CryptoJournal"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
