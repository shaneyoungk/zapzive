import assert from 'node:assert/strict';
import test from 'node:test';
import { encodeAbiParameters, encodeEventTopics, erc20Abi, zeroAddress, type Address, type Hex } from 'viem';
import { ApiError } from '../src/lib/security';
import { LOCAL_DEVNET, LOCAL_DEVNET_CHAIN_ID, LOCAL_DEVNET_TOKENS, RAIL_NETWORKS, assetsFor, availability, describeNetwork, networkFor, railNetworks, rpcClient } from '../src/crypto/config';
import { amountUnits, assertMatchingTransaction, hasExactTransfer, isDelegatedAccountCode, retryDelayMs, transactionHash, transferData, type TransferIntent } from '../src/crypto/validation';

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

test('EIP-7702 delegation designators are told apart from contract code', () => {
    assert.equal(isDelegatedAccountCode(`0xef0100${'1'.repeat(40)}`), true);
    assert.equal(isDelegatedAccountCode(`0xEF0100${'A'.repeat(40)}`), true);
    assert.equal(isDelegatedAccountCode(`0xef0100${'1'.repeat(39)}`), false);
    assert.equal(isDelegatedAccountCode('0x6080604052'), false);
    assert.equal(isDelegatedAccountCode('0x'), false);
});

function withEnv(values: Record<string, string | undefined>, run: () => void) {
    const saved = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
    const apply = (entries: Record<string, string | undefined>) => {
        for (const [key, value] of Object.entries(entries)) {
            if (value === undefined) delete process.env[key]; else process.env[key] = value;
        }
    };
    apply(values);
    try { run(); } finally { apply(saved); }
}

test('the local devnet is offered only when explicitly enabled outside production', () => {
    const offered = () => railNetworks().some((network) => network.devnet);
    withEnv({ CRYPTO_ENABLE_LOCAL_DEVNET: undefined, NODE_ENV: 'development', VERCEL: undefined }, () => {
        assert.equal(offered(), false);
        assert.throws(() => networkFor(LOCAL_DEVNET_CHAIN_ID), sameCode('UNSUPPORTED_NETWORK'));
        assert.notEqual(availability(LOCAL_DEVNET), null);
    });
    withEnv({ CRYPTO_ENABLE_LOCAL_DEVNET: 'true', NODE_ENV: 'development', VERCEL: undefined }, () => {
        assert.equal(networkFor(LOCAL_DEVNET_CHAIN_ID).key, 'local-devnet');
        assert.equal(availability(LOCAL_DEVNET), null);
    });
    withEnv({ CRYPTO_ENABLE_LOCAL_DEVNET: 'true', NODE_ENV: 'production', VERCEL: undefined }, () => assert.equal(offered(), false));
    withEnv({ CRYPTO_ENABLE_LOCAL_DEVNET: 'true', NODE_ENV: 'development', VERCEL: '1' }, () => assert.equal(offered(), false));
});

test('the devnet uses its deterministic test tokens and may use a loopback HTTP RPC', () => {
    assert.deepEqual(assetsFor(LOCAL_DEVNET).map((item) => [item.symbol, item.tokenAddress.toLowerCase(), item.decimals]), [
        ['ETH', zeroAddress, 18], ['USDC', LOCAL_DEVNET_TOKENS.USDC, 6], ['USDT', LOCAL_DEVNET_TOKENS.USDT, 6], ['DAI', LOCAL_DEVNET_TOKENS.DAI, 18],
    ]);
    assert.ok(assetsFor(LOCAL_DEVNET).filter((item) => item.kind === 'erc20').every((item) => item.testToken));
    const params = describeNetwork(LOCAL_DEVNET).walletAddParams;
    assert.deepEqual(params?.rpcUrls, ['http://127.0.0.1:8545']);
    assert.equal(params && 'blockExplorerUrls' in params, false);

    const baseSepolia = RAIL_NETWORKS.find((item) => item.key === 'base-sepolia')!;
    withEnv({ NODE_ENV: 'development', CRYPTO_LOCAL_DEVNET_RPC_URL: undefined, CRYPTO_BASE_SEPOLIA_RPC_URL: 'http://127.0.0.1:8545' }, () => {
        assert.doesNotThrow(() => rpcClient(LOCAL_DEVNET));
        assert.throws(() => rpcClient(baseSepolia), sameCode('RPC_NOT_CONFIGURED'));
    });
    withEnv({ NODE_ENV: 'development', CRYPTO_LOCAL_DEVNET_RPC_URL: 'http://192.168.1.20:8545' }, () => {
        assert.throws(() => rpcClient(LOCAL_DEVNET), sameCode('RPC_NOT_CONFIGURED'));
    });
});

test('chain re-checks back off exponentially to a five minute cap', () => {
    assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 50].map((attempts) => retryDelayMs(attempts)), [15_000, 30_000, 60_000, 120_000, 240_000, 300_000, 300_000, 300_000]);
    assert.equal(retryDelayMs(-3), 15_000);
    assert.equal(retryDelayMs(Number.NaN), 15_000);
});
