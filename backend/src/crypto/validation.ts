import { decodeEventLog, encodeFunctionData, erc20Abi, getAddress, isAddress, zeroAddress, type Address, type Hex } from 'viem';
import { ApiError } from '../lib/security';

export function address(value: unknown): Address {
    if (typeof value !== 'string' || !isAddress(value) || value.toLowerCase() === zeroAddress) {
        throw new ApiError(422, 'INVALID_ADDRESS', 'Use a complete, valid, nonzero Ethereum address.');
    }
    return getAddress(value).toLowerCase() as Address;
}

export function amountUnits(value: unknown, decimals = 6): string {
    // Reject JSON numbers, exponent notation, excess precision, signs and spaces.
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
        throw new ApiError(422, 'INVALID_AMOUNT', 'The selected asset has invalid decimal precision.');
    }
    const fractionPattern = decimals > 0 ? `(\\.\\d{1,${decimals}})?` : '';
    const pattern = new RegExp(`^(0|[1-9]\\d{0,18})${fractionPattern}$`);
    if (typeof value !== 'string' || !pattern.test(value)) {
        throw new ApiError(422, 'INVALID_AMOUNT', `Enter a decimal string with up to ${decimals} decimal places.`);
    }
    const [whole, fraction = ''] = value.split('.');
    const scale = 10n ** BigInt(decimals);
    const units = BigInt(whole) * scale + BigInt(fraction.padEnd(decimals, '0') || '0');
    const maximum = decimals === 6 ? 1_000_000_000_000n : 100n * scale;
    if (units <= 0n || units > maximum) {
        const limit = decimals === 6 ? '1,000,000 USDC' : `100 ${decimals === 18 ? 'native coins' : 'units'}`;
        throw new ApiError(422, 'AMOUNT_LIMIT', `Payments must be greater than zero and no more than ${limit}.`);
    }
    return units.toString();
}

export function transactionHash(value: unknown): Hex {
    if (typeof value !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(value) || /^0x0+$/.test(value)) {
        throw new ApiError(422, 'INVALID_TRANSACTION_HASH', 'Provide a complete transaction hash.');
    }
    return value.toLowerCase() as Hex;
}

// EIP-7702 delegated accounts expose a 0xef0100 designator followed by the
// 20-byte delegate address instead of contract bytecode.
export function isDelegatedAccountCode(code: string): boolean {
    return /^0xef0100[0-9a-f]{40}$/i.test(code);
}

// Exponential re-check delay for chain reads: 15s doubling to a 5 minute cap.
export function retryDelayMs(attempts: number): number {
    const exponent = Math.min(Math.max(0, Math.floor(attempts) || 0), 5);
    return Math.min(300_000, 15_000 * 2 ** exponent);
}

export interface TransferIntent {
    chainId: number; tokenAddress: string; fromAddress: string; toAddress: string; amountUnits: string;
    nonce: number | null; createdBlock: string;
}

export function transferData(payment: Pick<TransferIntent, 'toAddress' | 'amountUnits'>): Hex {
    return encodeFunctionData({ abi: erc20Abi, functionName: 'transfer', args: [payment.toAddress as Address, BigInt(payment.amountUnits)] });
}

export function assertMatchingTransaction(payment: TransferIntent, transaction: {
    chainId?: number; from: string; to: string | null; input: string; value: bigint; nonce: number; blockNumber: bigint | null;
}) {
    const native = payment.tokenAddress.toLowerCase() === zeroAddress;
    const matchesTransfer = native
        ? transaction.to?.toLowerCase() === payment.toAddress && transaction.value === BigInt(payment.amountUnits) && transaction.input.toLowerCase() === '0x'
        : transaction.to?.toLowerCase() === payment.tokenAddress && transaction.value === 0n && transaction.input.toLowerCase() === transferData(payment).toLowerCase();
    if (transaction.chainId !== payment.chainId || transaction.from.toLowerCase() !== payment.fromAddress || !matchesTransfer ||
        (payment.nonce !== null && transaction.nonce !== payment.nonce) ||
        (transaction.blockNumber !== null && transaction.blockNumber <= BigInt(payment.createdBlock))) {
        throw new ApiError(422, 'TRANSACTION_MISMATCH', 'The transaction does not match this payment, network, sender, amount, or nonce.');
    }
}

export function hasExactTransfer(payment: TransferIntent, logs: readonly { address: string; data: Hex; topics: readonly Hex[]; removed?: boolean }[]): boolean {
    // Native-coin settlement is proven by the exact transaction plus a
    // successful receipt; there is no ERC-20 Transfer event to inspect.
    if (payment.tokenAddress.toLowerCase() === zeroAddress) return true;
    let matches = 0;
    for (const log of logs) {
        if (log.removed || log.address.toLowerCase() !== payment.tokenAddress) continue;
        try {
            const event = decodeEventLog({ abi: erc20Abi, eventName: 'Transfer', data: log.data, topics: log.topics as [Hex, ...Hex[]], strict: true });
            if (event.args.from.toLowerCase() === payment.fromAddress && event.args.to.toLowerCase() === payment.toAddress && event.args.value === BigInt(payment.amountUnits)) matches += 1;
        } catch { /* Other events cannot prove a transfer. */ }
    }
    return matches === 1;
}
