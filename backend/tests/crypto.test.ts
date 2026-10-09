import assert from 'node:assert/strict';
import test from 'node:test';
import { encodeAbiParameters, encodeEventTopics, erc20Abi, zeroAddress, type Address, type Hex } from 'viem';
import { ApiError } from '../src/lib/security';
import { amountUnits, assertMatchingTransaction, hasExactTransfer, transactionHash, transferData, type TransferIntent } from '../src/crypto/validation';

const intent: TransferIntent = {
    chainId: 84532,
    tokenAddress: '0x036cbd53842c5426634e7929541ec2318f3dcf7e',
    fromAddress: '0x1111111111111111111111111111111111111111',
    toAddress: '0x2222222222222222222222222222222222222222',
    amountUnits: '1234500',
    nonce: null,
    createdBlock: '100',
};

const sameCode = (code: string) => (error: unknown) => error instanceof ApiError && error.code === code;

test('USDC amounts accept only exact decimal strings in the configured range', () => {
    assert.equal(amountUnits('1'), '1000000');
    assert.equal(amountUnits('1.2345'), '1234500');
    assert.equal(amountUnits('999999.999999'), '999999999999');

    for (const invalid of [0, '0', '01', '1e3', '-1', '+1', ' 1', '1 ', '1.0000001', '1000000.0000011']) {
        assert.throws(() => amountUnits(invalid), sameCode(invalid === '1000000.0000011' ? 'INVALID_AMOUNT' : invalid === '0' ? 'AMOUNT_LIMIT' : 'INVALID_AMOUNT'));
    }
    assert.throws(() => amountUnits('1000000.000001'), sameCode('AMOUNT_LIMIT'));
});

test('native asset amounts and transactions use the recipient as the target', () => {
    assert.equal(amountUnits('1.25', 18), '1250000000000000000');
    const nativeIntent: TransferIntent = {
        ...intent,
        tokenAddress: zeroAddress,
        amountUnits: '1250000000000000000',
    };
    const transaction = {
        chainId: nativeIntent.chainId,
        from: nativeIntent.fromAddress,
        to: nativeIntent.toAddress,
        input: '0x',
        value: BigInt(nativeIntent.amountUnits),
        nonce: 7,
        blockNumber: null,
    };
    assert.doesNotThrow(() => assertMatchingTransaction(nativeIntent, transaction));
    assert.throws(() => assertMatchingTransaction(nativeIntent, { ...transaction, value: 0n }), sameCode('TRANSACTION_MISMATCH'));
    assert.throws(() => assertMatchingTransaction(nativeIntent, { ...transaction, to: nativeIntent.tokenAddress }), sameCode('TRANSACTION_MISMATCH'));
    assert.equal(hasExactTransfer(nativeIntent, []), true);
});

test('transaction hashes are exact nonzero 32-byte values', () => {
    const valid = `0x${'a'.repeat(64)}`;
    assert.equal(transactionHash(valid), valid);
    for (const invalid of ['', '0x1234', `0x${'0'.repeat(64)}`, `0x${'g'.repeat(64)}`]) {
        assert.throws(() => transactionHash(invalid), sameCode('INVALID_TRANSACTION_HASH'));
    }
});

test('a submitted transaction must exactly match the immutable USDC transfer', () => {
    const transaction = {
        chainId: intent.chainId,
        from: intent.fromAddress,
        to: intent.tokenAddress,
        input: transferData(intent),
        value: 0n,
        nonce: 7,
        blockNumber: null,
    };
    assert.doesNotThrow(() => assertMatchingTransaction(intent, transaction));

    assert.throws(() => assertMatchingTransaction(intent, { ...transaction, chainId: 137 }), sameCode('TRANSACTION_MISMATCH'));
    assert.throws(() => assertMatchingTransaction(intent, { ...transaction, from: intent.toAddress }), sameCode('TRANSACTION_MISMATCH'));
    assert.throws(() => assertMatchingTransaction(intent, { ...transaction, to: intent.toAddress }), sameCode('TRANSACTION_MISMATCH'));
    assert.throws(() => assertMatchingTransaction(intent, { ...transaction, value: 1n }), sameCode('TRANSACTION_MISMATCH'));
    assert.throws(() => assertMatchingTransaction(intent, { ...transaction, input: '0x' }), sameCode('TRANSACTION_MISMATCH'));
    assert.throws(() => assertMatchingTransaction(intent, { ...transaction, blockNumber: 100n }), sameCode('TRANSACTION_MISMATCH'));
    assert.throws(() => assertMatchingTransaction({ ...intent, nonce: 6 }, transaction), sameCode('TRANSACTION_MISMATCH'));
});

test('only one exact native-USDC Transfer event can prove a payment', () => {
    const topics = encodeEventTopics({
        abi: erc20Abi,
        eventName: 'Transfer',
        args: { from: intent.fromAddress as Address, to: intent.toAddress as Address },
    }) as Hex[];
    const data = encodeAbiParameters([{ type: 'uint256' }], [BigInt(intent.amountUnits)]);
    const exactLog = { address: intent.tokenAddress, data, topics };

    assert.equal(hasExactTransfer(intent, [exactLog]), true);
    assert.equal(hasExactTransfer(intent, [{ ...exactLog, data: encodeAbiParameters([{ type: 'uint256' }], [1n]) }]), false);
    assert.equal(hasExactTransfer(intent, [{ ...exactLog, address: intent.toAddress }]), false);
    assert.equal(hasExactTransfer(intent, [exactLog, exactLog]), false);
    assert.equal(hasExactTransfer(intent, [{ ...exactLog, removed: true }]), false);
});
