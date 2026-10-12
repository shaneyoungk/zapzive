import crypto from 'crypto';
import { Prisma, type CryptoPayment } from '@prisma/client';
import { erc20Abi, formatUnits, verifyMessage, zeroAddress, type Address, type Hex } from 'viem';
import prisma from '../lib/prisma';
import { ApiError, optionalText, requestHash } from '../lib/security';
import { assertNetworkEnabled, assetFor, assetsFor, checkedClient, networkFor, railNetworks } from './config';
import { address, amountUnits, assertMatchingTransaction, hasExactTransfer, isDelegatedAccountCode, retryDelayMs, transactionHash, transferData } from './validation';

export interface RailActor { companyId: string; userId: string; requestId?: string }

async function railForCompany(companyId: string, chainId: unknown) {
    const network = networkFor(chainId);
    assertNetworkEnabled(network);
    const company = await prisma.company.findFirst({ where: { id: companyId, status: 'active' } });
    if (!company) throw new ApiError(403, 'ENVIRONMENT_MISMATCH', 'Use the network enabled for this workspace.');
    if (!company.isTestMode && !company.liveEnabledAt) {
        throw new ApiError(403, 'LIVE_MODE_NOT_ENABLED', 'Live networks have not been enabled for this workspace. Switch to Testnet in Settings, or enable live networks there.');
    }
    if (company.isTestMode !== Boolean(network.chain.testnet)) {
        const mode = company.isTestMode ? 'testnet' : 'live';
        throw new ApiError(403, 'ENVIRONMENT_MISMATCH', `${network.chain.name} is not available while this workspace is in ${mode} mode. Choose a ${mode} network.`);
    }
    return network;
}

function auditData(actor: RailActor, action: string, entityId: string, metadata?: Record<string, unknown>) {
    return {
        companyId: actor.companyId, actorId: actor.userId, requestId: actor.requestId, action, entityType: 'crypto_payment', entityId,
        ...(metadata ? { metadata: JSON.stringify(metadata) } : {}),
    };
}

function unsupportedAccount(code: string) {
    return new ApiError(422, 'SMART_WALLET_UNSUPPORTED', isDelegatedAccountCode(code)
        ? 'This account has been upgraded to a smart account (EIP-7702 delegation). This rail signs with standard accounts only: switch the account back to a standard account in your wallet settings, or use another account.'
        : 'This rail currently supports externally owned wallets. Contract and delegated wallets require a separate signing adapter.');
}

export function paymentView(payment: CryptoPayment) {
    // Payments outlive network configuration; an unconfigured chain must not
    // break the history view, it only loses its explorer link.
    const explorerBase = railNetworks().find((item) => item.chain.id === payment.chainId)?.chain.blockExplorers?.default.url;
    return {
        id: payment.id, chainId: payment.chainId, tokenAddress: payment.tokenAddress, symbol: payment.symbol, decimals: payment.decimals,
        fromAddress: payment.fromAddress, toAddress: payment.toAddress, amount: formatUnits(BigInt(payment.amountUnits), payment.decimals),
        amountUnits: payment.amountUnits, reference: payment.reference, status: payment.status, txHash: payment.txHash,
        nonce: payment.nonce, blockNumber: payment.blockNumber, confirmations: payment.confirmations, errorCode: payment.errorCode,
        createdAt: payment.createdAt, updatedAt: payment.updatedAt, expiresAt: payment.expiresAt,
        explorerUrl: payment.txHash && explorerBase ? `${explorerBase}/tx/${payment.txHash}` : null,
    };
}

export async function ownedPayment(companyId: string, id: string) {
    const payment = await prisma.cryptoPayment.findFirst({ where: { id, companyId } });
    if (!payment) throw new ApiError(404, 'PAYMENT_NOT_FOUND', 'Payment not found.');
    return payment;
}

export async function walletChallenge(actor: RailActor, input: { chainId?: unknown; address?: unknown }) {
    const network = await railForCompany(actor.companyId, input.chainId);
    const walletAddress = address(input.address);
    const recent = await prisma.cryptoWalletChallenge.count({ where: { companyId: actor.companyId, userId: actor.userId, createdAt: { gte: new Date(Date.now() - 900_000) } } });
    if (recent >= 10) throw new ApiError(429, 'CHALLENGE_RATE_LIMIT', 'Too many wallet challenges. Try again later.');
    const origin = new URL(process.env.FRONTEND_URL || 'http://localhost:5173');
    const expiresAt = new Date(Date.now() + 300_000);
    const message = [
        `${origin.host} requests proof of wallet ownership for Zapzive.`, walletAddress, '',
        'Link this wallet to your workspace. This does not authorize a transaction or token approval.', '',
        `URI: ${origin.origin}`, 'Version: 1', `Chain ID: ${network.chain.id}`, `Workspace: ${actor.companyId}`,
        `User: ${actor.userId}`, `Nonce: ${crypto.randomBytes(24).toString('hex')}`,
        `Issued At: ${new Date().toISOString()}`, `Expiration Time: ${expiresAt.toISOString()}`,
    ].join('\n');
    return prisma.cryptoWalletChallenge.create({
        data: { companyId: actor.companyId, userId: actor.userId, chainId: network.chain.id, address: walletAddress, message, expiresAt },
        select: { id: true, message: true, expiresAt: true },
    });
}

export async function verifyWallet(actor: RailActor, challengeId: string, signature: unknown) {
    const challenge = await prisma.cryptoWalletChallenge.findFirst({ where: { id: challengeId, companyId: actor.companyId, userId: actor.userId, usedAt: null, expiresAt: { gt: new Date() } } });
    if (!challenge || typeof signature !== 'string' || !/^0x[0-9a-fA-F]{130}$/.test(signature)) throw new ApiError(422, 'INVALID_WALLET_PROOF', 'The wallet proof is invalid or expired.');
    const network = await railForCompany(actor.companyId, challenge.chainId);
    let valid = false;
    try { valid = await verifyMessage({ address: challenge.address as Address, message: challenge.message, signature: signature as Hex }); } catch { /* Invalid signatures fail closed. */ }
    if (!valid) throw new ApiError(422, 'INVALID_WALLET_PROOF', 'The signature does not match this wallet challenge.');
    const client = await checkedClient(network);
    const code = await client.getCode({ address: challenge.address as Address });
    if (code && code !== '0x') throw unsupportedAccount(code);
    return prisma.$transaction(async tx => {
        const consumed = await tx.cryptoWalletChallenge.updateMany({ where: { id: challenge.id, companyId: actor.companyId, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
        if (consumed.count !== 1) throw new ApiError(409, 'PROOF_ALREADY_USED', 'This proof has already been used.');
        // Ownership is proven per workspace by the signature itself, so the same
        // wallet may be linked to every workspace its owner operates. Funds still
        // move only when the wallet signs a specific transfer.
        const wallet = await tx.cryptoWallet.upsert({
            where: { companyId_chainId_address: { companyId: actor.companyId, chainId: challenge.chainId, address: challenge.address } },
            update: {},
            create: { companyId: actor.companyId, createdBy: actor.userId, chainId: challenge.chainId, address: challenge.address },
        });
        await tx.auditEvent.create({ data: auditData(actor, 'crypto.wallet_linked', wallet.id) });
        return { id: wallet.id, chainId: wallet.chainId, address: wallet.address, createdAt: wallet.createdAt };
    });
}

export async function createPayment(actor: RailActor, key: string, input: { walletId?: unknown; to?: unknown; amount?: unknown; asset?: unknown; reference?: unknown }) {
    if (typeof input.walletId !== 'string') throw new ApiError(422, 'WALLET_REQUIRED', 'Select a verified wallet.');
    const to = address(input.to);
    const reference = optionalText(input.reference, 'reference', 120) || null;
    const wallet = await prisma.cryptoWallet.findFirst({ where: { id: input.walletId, companyId: actor.companyId } });
    if (!wallet) throw new ApiError(404, 'WALLET_NOT_FOUND', 'Verified wallet not found.');
    const network = await railForCompany(actor.companyId, wallet.chainId);
    const asset = assetFor(network, input.asset);
    const units = amountUnits(input.amount, asset.decimals);
    // The request fingerprint must exist before a retried key is compared with it.
    const hash = requestHash({ walletId: input.walletId, to, asset: asset.symbol, tokenAddress: asset.tokenAddress, decimals: asset.decimals, units, reference });
    const findExisting = () => prisma.cryptoPayment.findUnique({ where: { companyId_idempotencyKey: { companyId: actor.companyId, idempotencyKey: key } } });
    const replay = (payment: CryptoPayment) => {
        if (payment.payloadHash !== hash) throw new ApiError(409, 'IDEMPOTENCY_KEY_REUSED', 'This key belongs to a different payment request.');
        return payment;
    };
    const existing = await findExisting();
    if (existing) return replay(existing);
    if (to === wallet.address || (asset.kind === 'erc20' && to === asset.tokenAddress.toLowerCase())) throw new ApiError(422, 'INVALID_RECIPIENT', 'Use a recipient other than the sender or asset contract.');
    const client = await checkedClient(network);
    const block = await client.getBlockNumber({ cacheTime: 0 });
    try {
        return await prisma.$transaction(async tx => {
            const payment = await tx.cryptoPayment.create({ data: {
                companyId: actor.companyId, walletId: wallet.id, createdBy: actor.userId, chainId: wallet.chainId,
                tokenAddress: asset.tokenAddress.toLowerCase(), symbol: asset.symbol, decimals: asset.decimals,
                fromAddress: wallet.address, toAddress: to,
                amountUnits: units, reference, idempotencyKey: key, payloadHash: hash, createdBlock: block.toString(),
                expiresAt: new Date(Date.now() + 900_000),
            } });
            await tx.auditEvent.create({ data: auditData(actor, 'crypto.payment_created', payment.id) });
            return payment;
        });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            const concurrent = await findExisting();
            if (concurrent) return replay(concurrent);
        }
        throw error;
    }
}

export async function preparePayment(actor: RailActor, id: string) {
    const payment = await ownedPayment(actor.companyId, id);
    if (payment.status !== 'awaiting_signature' || payment.txHash) throw new ApiError(409, 'PAYMENT_ALREADY_SUBMITTED', 'This payment has already been submitted. Track its existing transaction.');
    if (payment.expiresAt <= new Date()) throw new ApiError(409, 'PAYMENT_EXPIRED', 'This unsigned payment has expired. Create a new payment after checking your wallet history.');
    const network = await railForCompany(actor.companyId, payment.chainId);
    const client = await checkedClient(network);
    const account = payment.fromAddress as Address;
    const token = payment.tokenAddress as Address;
    const native = payment.tokenAddress.toLowerCase() === zeroAddress;
    const code = await client.getCode({ address: account });
    if (code && code !== '0x') throw unsupportedAccount(code);

    if (native) {
        if (payment.decimals !== network.chain.nativeCurrency.decimals || payment.symbol.toUpperCase() !== network.chain.nativeCurrency.symbol.toUpperCase()) {
            throw new ApiError(503, 'TOKEN_CONFIGURATION_MISMATCH', 'The native asset configuration could not be verified.');
        }
        const amount = BigInt(payment.amountUnits);
        const nativeBalance = await client.getBalance({ address: account });
        if (nativeBalance < amount) throw new ApiError(409, 'INSUFFICIENT_BALANCE', `This wallet has ${formatUnits(nativeBalance, payment.decimals)} ${payment.symbol}; ${formatUnits(amount, payment.decimals)} ${payment.symbol} is required.`);
        const [gas, fees] = await Promise.all([
            client.estimateGas({ account, to: payment.toAddress as Address, value: amount }),
            client.estimateFeesPerGas(),
        ]);
        const feeReserve = gas * fees.maxFeePerGas * 12n / 10n;
        if (nativeBalance < amount + feeReserve) throw new ApiError(409, 'INSUFFICIENT_GAS', `This payment needs ${formatUnits(feeReserve, payment.decimals)} ${payment.symbol} for network fees in addition to the payment. Available: ${formatUnits(nativeBalance, payment.decimals)} ${payment.symbol}.`);
        return { payment: paymentView(payment), transaction: { from: account, to: payment.toAddress, data: '0x', value: `0x${amount.toString(16)}`, chainId: `0x${payment.chainId.toString(16)}` } };
    }

    const [balance, decimals] = await Promise.all([
        client.readContract({ address: token, abi: erc20Abi, functionName: 'balanceOf', args: [account] }),
        client.readContract({ address: token, abi: erc20Abi, functionName: 'decimals' }),
    ]);
    if (decimals !== payment.decimals) throw new ApiError(503, 'TOKEN_CONFIGURATION_MISMATCH', 'The token configuration could not be verified.');
    if (!assetsFor(network).some(asset => asset.kind === 'erc20' && asset.tokenAddress.toLowerCase() === token.toLowerCase() && asset.symbol === payment.symbol)) throw new ApiError(503, 'TOKEN_CONFIGURATION_MISMATCH', 'The selected token is not enabled on this network.');
    if (balance < BigInt(payment.amountUnits)) throw new ApiError(409, 'INSUFFICIENT_BALANCE', `This wallet has ${formatUnits(balance, payment.decimals)} ${payment.symbol}; ${formatUnits(BigInt(payment.amountUnits), payment.decimals)} ${payment.symbol} is required.`);
    const args = [payment.toAddress as Address, BigInt(payment.amountUnits)] as const;
    const simulation = await client.simulateContract({ address: token, abi: erc20Abi, functionName: 'transfer', args, account });
    if (simulation.result !== true) throw new ApiError(409, 'SIMULATION_FAILED', 'The token transfer simulation did not succeed.');
    const [gas, nativeBalance, fees] = await Promise.all([
        client.estimateContractGas({ address: token, abi: erc20Abi, functionName: 'transfer', args, account }),
        client.getBalance({ address: account }), client.estimateFeesPerGas(),
    ]);
    if (nativeBalance < gas * fees.maxFeePerGas * 12n / 10n) throw new ApiError(409, 'INSUFFICIENT_GAS', `Add ${network.chain.nativeCurrency.symbol} to this wallet to pay the network fee.`);
    return { payment: paymentView(payment), transaction: { from: account, to: token, data: transferData(payment), value: '0x0', chainId: `0x${payment.chainId.toString(16)}` } };
}

export async function walletBalances(actor: RailActor, chainIdInput: unknown, walletAddressInput: unknown, symbolInput: unknown) {
    const network = await railForCompany(actor.companyId, chainIdInput);
    const walletAddress = address(walletAddressInput);
    const asset = assetFor(network, symbolInput);
    const client = await checkedClient(network);
    const nativeUnits = await client.getBalance({ address: walletAddress });
    let assetUnits = nativeUnits;
    if (asset.kind === 'erc20') {
        const [balance, decimals] = await Promise.all([
            client.readContract({ address: asset.tokenAddress, abi: erc20Abi, functionName: 'balanceOf', args: [walletAddress] }),
            client.readContract({ address: asset.tokenAddress, abi: erc20Abi, functionName: 'decimals' }),
        ]);
        if (decimals !== asset.decimals) throw new ApiError(503, 'TOKEN_CONFIGURATION_MISMATCH', `The ${asset.symbol} token configuration could not be verified.`);
        assetUnits = balance;
    }
    return {
        chainId: network.chain.id,
        address: walletAddress,
        asset: { symbol: asset.symbol, kind: asset.kind, decimals: asset.decimals, amount: formatUnits(assetUnits, asset.decimals), amountUnits: assetUnits.toString() },
        feeAsset: { symbol: network.chain.nativeCurrency.symbol, decimals: network.chain.nativeCurrency.decimals, amount: formatUnits(nativeUnits, network.chain.nativeCurrency.decimals), amountUnits: nativeUnits.toString() },
        simulated: false,
        asOf: new Date().toISOString(),
    };
}

export async function submitPayment(actor: RailActor, id: string, hashInput: unknown) {
    const hash = transactionHash(hashInput);
    const payment = await ownedPayment(actor.companyId, id);
    if (payment.txHash === hash) return payment;
    if (['settled', 'failed', 'reorged'].includes(payment.status)) throw new ApiError(409, 'PAYMENT_FINAL', 'The payment is already final or requires investigation.');
    const network = await railForCompany(actor.companyId, payment.chainId);
    const client = await checkedClient(network);
    let transaction: Awaited<ReturnType<typeof client.getTransaction>> | null = null;
    try {
        transaction = await client.getTransaction({ hash });
    } catch (error: unknown) {
        // Wallet extensions can return a hash before an RPC has indexed it. Store
        // that hash once, then let the durable worker verify it without asking the
        // user to sign or send again. Network outages are not treated as absence.
        if (!(error && typeof error === 'object' && 'name' in error && error.name === 'TransactionNotFoundError')) {
            throw new ApiError(503, 'RPC_UNAVAILABLE', 'The network could not be reached to record this transaction. Keep the hash and retry; do not send again.');
        }
        // A hash received from a wallet is an important recovery artifact. A
        // second hash that the network cannot see never replaces it.
        if (payment.txHash) {
            throw new ApiError(409, 'PAYMENT_HASH_LOCKED', payment.nonce === null
                ? 'A saved transaction hash is still being located on the network. Another hash can replace it only once the network shows a transaction that exactly matches this payment. Do not send again.'
                : 'This payment already has a verified transaction. A replacement can be recorded only once it is visible on the network.');
        }
        try {
            return await prisma.$transaction(async tx => {
                const updated = await tx.cryptoPayment.updateMany({ where: { id, companyId: actor.companyId, version: payment.version, txHash: null }, data: {
                    txHash: hash, nonce: null, status: 'submitted', errorCode: 'TX_NOT_VISIBLE', nextCheckAt: new Date(),
                    blockNumber: null, blockHash: null, confirmations: 0, version: { increment: 1 },
                } });
                if (updated.count !== 1) throw new ApiError(409, 'PAYMENT_CHANGED', 'This payment changed. Refresh it before continuing.');
                await tx.auditEvent.create({ data: auditData(actor, 'crypto.transaction_hash_recorded', id) });
                return tx.cryptoPayment.findUniqueOrThrow({ where: { id } });
            });
        } catch (persistError) {
            if (persistError instanceof Prisma.PrismaClientKnownRequestError && persistError.code === 'P2002') {
                throw new ApiError(409, 'TRANSACTION_ALREADY_RECORDED', 'This transaction hash is already assigned to a payment.');
            }
            throw persistError;
        }
    }
    if (!transaction) throw new ApiError(503, 'RPC_UNAVAILABLE', 'The network could not return this transaction. Keep the hash and retry; do not send again.');
    // A visible transaction must match the immutable intent exactly. Once it
    // does, it may also correct a saved hash that never appeared on the network
    // (a mistyped or dropped hash would otherwise strand the payment forever).
    assertMatchingTransaction(payment, transaction);
    const action = !payment.txHash ? 'crypto.transaction_submitted' : payment.nonce === null ? 'crypto.transaction_hash_corrected' : 'crypto.transaction_replaced';
    try {
        return await prisma.$transaction(async tx => {
            const updated = await tx.cryptoPayment.updateMany({ where: { id, companyId: actor.companyId, version: payment.version }, data: {
                txHash: hash, nonce: transaction.nonce, status: 'submitted', errorCode: null, nextCheckAt: new Date(), attempts: 0,
                blockNumber: null, blockHash: null, confirmations: 0, version: { increment: 1 },
            } });
            if (updated.count !== 1) throw new ApiError(409, 'PAYMENT_CHANGED', 'This payment changed. Refresh it before continuing.');
            await tx.cryptoSubmission.create({ data: { paymentId: id, chainId: payment.chainId, txHash: hash, nonce: transaction.nonce } });
            await tx.auditEvent.create({ data: auditData(actor, action, id, payment.txHash ? { previousTxHash: payment.txHash } : undefined) });
            return tx.cryptoPayment.findUniqueOrThrow({ where: { id } });
        });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ApiError(409, 'TRANSACTION_ALREADY_RECORDED', 'This transaction or wallet nonce is already assigned to a payment.');
        throw error;
    }
}

export interface ChainObservation {
    status: 'submitted' | 'confirming' | 'settled' | 'failed' | 'reorged';
    confirmations: number; blockNumber: string | null; blockHash: string | null; errorCode: string | null;
}

// A settled payment whose transaction or receipt is no longer served is judged
// by its recorded block: a different canonical block means the transaction was
// reorganized out, the same block means the provider no longer indexes it.
async function recheckSettledBlock(client: Awaited<ReturnType<typeof checkedClient>>, payment: CryptoPayment): Promise<ChainObservation> {
    const recorded = { blockNumber: payment.blockNumber, blockHash: payment.blockHash };
    const canonical = await client.getBlock({ blockNumber: BigInt(payment.blockNumber!) });
    if (canonical.hash && canonical.hash !== payment.blockHash) {
        return { status: 'reorged', confirmations: 0, ...recorded, errorCode: 'CHAIN_REORGANIZATION' };
    }
    return { status: 'settled', confirmations: payment.confirmations, ...recorded, errorCode: 'RECEIPT_UNAVAILABLE' };
}

export async function observePayment(payment: CryptoPayment): Promise<ChainObservation> {
    const network = networkFor(payment.chainId);
    const client = await checkedClient(network);
    const pending: ChainObservation = { status: 'submitted', confirmations: 0, blockNumber: null, blockHash: null, errorCode: null };
    if (!payment.txHash) return pending;
    const settledRecord = payment.status === 'settled' && Boolean(payment.blockNumber);
    // Fetch and validate the transaction before looking for its receipt. This
    // safely turns a wallet-returned, not-yet-indexed hash into a durable pending
    // state, while rejecting any visible transaction that differs from the intent.
    const transaction = await client.getTransaction({ hash: payment.txHash as Hex }).catch(error => {
        if (error?.name === 'TransactionNotFoundError') return null;
        throw error;
    });
    if (!transaction) return settledRecord ? recheckSettledBlock(client, payment) : { ...pending, errorCode: 'TX_NOT_VISIBLE' };
    assertMatchingTransaction(payment, transaction);

    // An RPC failure is not evidence of a failed or reorganized transaction.
    const receipt = await client.getTransactionReceipt({ hash: payment.txHash as Hex }).catch(error => {
        if (error?.name === 'TransactionReceiptNotFoundError') return null;
        throw error;
    });
    if (!receipt) return settledRecord ? recheckSettledBlock(client, payment) : pending;
    // The transaction can be mined between the two reads above. Compare block
    // evidence only once both reads describe the same mined transaction.
    if (transaction.blockHash === null) return pending;
    const [canonical, head, finalized] = await Promise.all([
        client.getBlock({ blockNumber: receipt.blockNumber }),
        client.getBlockNumber({ cacheTime: 0 }), client.getBlock({ blockTag: 'finalized' }),
    ]);
    if (receipt.transactionHash.toLowerCase() !== payment.txHash || canonical.hash !== receipt.blockHash ||
        transaction.blockHash !== receipt.blockHash || transaction.blockNumber !== receipt.blockNumber ||
        (payment.status === 'settled' && payment.blockHash !== receipt.blockHash)) {
        return payment.status === 'settled'
            ? { ...pending, status: 'reorged', blockNumber: payment.blockNumber, blockHash: payment.blockHash, errorCode: 'CHAIN_REORGANIZATION' }
            : { ...pending, errorCode: 'CHAIN_REORGANIZATION' };
    }
    const confirmations = Math.max(0, Number(head - receipt.blockNumber + 1n));
    const observation = { ...pending, confirmations, blockNumber: receipt.blockNumber.toString(), blockHash: receipt.blockHash };
    if (finalized.number === null || finalized.number < receipt.blockNumber || confirmations < network.minimumConfirmations) return { ...observation, status: 'confirming' };
    if (!network.chain.testnet) {
        const secondary = await checkedClient(network, true);
        const [witness, witnessBlock, witnessFinalized] = await Promise.all([
            secondary.getTransactionReceipt({ hash: payment.txHash as Hex }),
            secondary.getBlock({ blockNumber: receipt.blockNumber }), secondary.getBlock({ blockTag: 'finalized' }),
        ]);
        if (witness.blockHash !== receipt.blockHash || witness.status !== receipt.status || witnessBlock.hash !== receipt.blockHash ||
            witnessFinalized.number === null || witnessFinalized.number < receipt.blockNumber ||
            (receipt.status === 'success' && !hasExactTransfer(payment, witness.logs))) {
            throw new ApiError(503, 'RPC_DISAGREEMENT', 'Independent providers have not agreed on settlement yet.');
        }
    }
    if (receipt.status !== 'success') return { ...observation, status: 'failed', errorCode: 'TRANSACTION_REVERTED' };
    if (!hasExactTransfer(payment, receipt.logs)) return { ...observation, status: 'failed', errorCode: 'TRANSFER_EVIDENCE_MISMATCH' };
    return { ...observation, status: 'settled' };
}

export async function applyObservation(payment: CryptoPayment, observation: ChainObservation) {
    if (['failed', 'reorged'].includes(payment.status)) return payment;
    // Once recorded as final, a stale provider response cannot demote a payment.
    if (payment.status === 'settled' && !['settled', 'reorged'].includes(observation.status)) return payment;
    // A hash the network still cannot see is re-checked with backoff rather than
    // every 15 seconds indefinitely; any visible progress resets the schedule.
    const unseen = observation.errorCode === 'TX_NOT_VISIBLE';
    return prisma.$transaction(async tx => {
        const updated = await tx.cryptoPayment.updateMany({ where: { id: payment.id, companyId: payment.companyId, version: payment.version, txHash: payment.txHash }, data: {
            ...observation, version: { increment: 1 }, attempts: unseen ? { increment: 1 } : 0,
            nextCheckAt: new Date(Date.now() + (observation.status === 'settled' ? 3_600_000 : unseen ? retryDelayMs(payment.attempts) : 15_000)),
            settledAt: observation.status === 'settled' && !payment.settledAt ? new Date() : payment.settledAt,
        } });
        if (updated.count !== 1) return tx.cryptoPayment.findUniqueOrThrow({ where: { id: payment.id } });
        const journalKind = observation.status === 'settled' && payment.status !== 'settled' ? 'settlement' : observation.status === 'reorged' && payment.status === 'settled' ? 'reversal' : null;
        if (journalKind) {
            const units = BigInt(payment.amountUnits) * (journalKind === 'reversal' ? -1n : 1n);
            await tx.cryptoJournal.create({ data: { paymentId: payment.id, kind: journalKind, entries: { create: [
                { account: `wallet:${payment.chainId}:${payment.fromAddress}`, amountUnits: (-units).toString() },
                { account: `recipient:${payment.chainId}:${payment.toAddress}`, amountUnits: units.toString() },
            ] } } });
        }
        if (payment.status !== observation.status) await tx.auditEvent.create({ data: { companyId: payment.companyId, action: `crypto.payment_${observation.status}`, entityType: 'crypto_payment', entityId: payment.id } });
        return tx.cryptoPayment.findUniqueOrThrow({ where: { id: payment.id } });
    });
}

export async function reconcilePayment(payment: CryptoPayment) {
    if (!payment.txHash || ['failed', 'reorged'].includes(payment.status)) return payment;
    try { return await applyObservation(payment, await observePayment(payment)); }
    catch (error) {
        const apiError = error instanceof ApiError ? error : null;
        // A visible transaction that cannot match the immutable intent is a
        // terminal verification failure, not an RPC outage. Never keep polling it
        // as if it could become a valid payment later.
        if (apiError?.code === 'TRANSACTION_MISMATCH') {
            return prisma.$transaction(async tx => {
                const updated = await tx.cryptoPayment.updateMany({ where: { id: payment.id, version: payment.version }, data: {
                    status: 'failed', errorCode: apiError.code, attempts: { increment: 1 },
                    nextCheckAt: new Date(Date.now() + 86_400_000), version: { increment: 1 },
                } });
                if (updated.count !== 1) return tx.cryptoPayment.findUniqueOrThrow({ where: { id: payment.id } });
                await tx.auditEvent.create({ data: { companyId: payment.companyId, action: 'crypto.payment_failed', entityType: 'crypto_payment', entityId: payment.id } });
                return tx.cryptoPayment.findUniqueOrThrow({ where: { id: payment.id } });
            });
        }

        // Preserve financial state and schedule another attempt after an outage or
        // an independent-provider disagreement. Keep the precise safe error code
        // for operators rather than relabelling every problem as an RPC failure.
        await prisma.cryptoPayment.updateMany({ where: { id: payment.id, version: payment.version }, data: {
            errorCode: apiError?.code || 'RPC_UNAVAILABLE', attempts: { increment: 1 }, version: { increment: 1 },
            nextCheckAt: new Date(Date.now() + retryDelayMs(payment.attempts)),
        } });
        if (error instanceof ApiError) throw error;
        throw new ApiError(503, 'RPC_UNAVAILABLE', 'Chain verification is temporarily unavailable. This payment remains recorded and will be checked again.');
    }
}
