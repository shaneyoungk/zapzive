-- Wallet ownership is proven per workspace by a signed challenge, so the same
-- wallet may be linked to every workspace its owner operates. A global unique
-- key made the second workspace's verification fail after the user had signed.
DROP INDEX "CryptoWallet_chainId_address_key";
CREATE UNIQUE INDEX "CryptoWallet_companyId_chainId_address_key" ON "CryptoWallet"("companyId", "chainId", "address");
