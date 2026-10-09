-- Preserve the address family selected during recipient onboarding. An EVM
-- address and a TRON base58 address cannot safely be treated as interchangeable.
ALTER TABLE "Recipient" ADD COLUMN "walletNetwork" TEXT;
