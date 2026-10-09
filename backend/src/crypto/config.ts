import { createPublicClient, http, zeroAddress, type Address, type Chain } from 'viem';
import { arbitrum, arbitrumSepolia, base, baseSepolia, mainnet, optimism, optimismSepolia, polygon, polygonAmoy, sepolia } from 'viem/chains';
import { ApiError } from '../lib/security';

export interface RailNetwork {
    chain: Chain;
    tokenAddress: Address;
    rpcEnv: string;
    minimumConfirmations: number;
    kind?: 'onchain' | 'sandbox';
}

export type RailAssetKind = 'erc20' | 'native' | 'sandbox';

export interface RailAsset {
    symbol: string;
    kind: RailAssetKind;
    tokenAddress: Address;
    decimals: number;
}

const sandboxChain: Chain = {
    id: 31_337,
    name: 'Zapzive Sandbox',
    nativeCurrency: { name: 'Sandbox Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: ['http://127.0.0.1:8545'] }, public: { http: ['http://127.0.0.1:8545'] } },
    testnet: true,
};

export const SANDBOX_CHAIN_ID = sandboxChain.id;
const sandboxToken = (symbol: string, decimals: number): RailAsset => ({ symbol, kind: 'sandbox', tokenAddress: zeroAddress, decimals });
export const SANDBOX_ASSETS: RailAsset[] = [
    sandboxToken('USDC', 6), sandboxToken('USDT', 6), sandboxToken('ETH', 18),
    sandboxToken('MATIC', 18), sandboxToken('DAI', 18), sandboxToken('BTC', 8), sandboxToken('SOL', 9),
];

// Native USDC only. Source: Circle's USDC contract registry, reviewed 2026-09-14.
export const RAIL_NETWORKS: RailNetwork[] = [
    { chain: sandboxChain, tokenAddress: zeroAddress, rpcEnv: '', minimumConfirmations: 0, kind: 'sandbox' },
    { chain: sepolia, tokenAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', rpcEnv: 'CRYPTO_ETHEREUM_SEPOLIA_RPC_URL', minimumConfirmations: 12 },
    { chain: arbitrumSepolia, tokenAddress: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', rpcEnv: 'CRYPTO_ARBITRUM_SEPOLIA_RPC_URL', minimumConfirmations: 12 },
    { chain: optimismSepolia, tokenAddress: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7', rpcEnv: 'CRYPTO_OPTIMISM_SEPOLIA_RPC_URL', minimumConfirmations: 12 },
    { chain: baseSepolia, tokenAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', rpcEnv: 'CRYPTO_BASE_SEPOLIA_RPC_URL', minimumConfirmations: 12 },
    { chain: polygonAmoy, tokenAddress: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582', rpcEnv: 'CRYPTO_POLYGON_AMOY_RPC_URL', minimumConfirmations: 64 },
    { chain: mainnet, tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', rpcEnv: 'CRYPTO_ETHEREUM_RPC_URL', minimumConfirmations: 12 },
    { chain: arbitrum, tokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', rpcEnv: 'CRYPTO_ARBITRUM_RPC_URL', minimumConfirmations: 12 },
    { chain: optimism, tokenAddress: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', rpcEnv: 'CRYPTO_OPTIMISM_RPC_URL', minimumConfirmations: 12 },
    { chain: base, tokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', rpcEnv: 'CRYPTO_BASE_RPC_URL', minimumConfirmations: 12 },
    { chain: polygon, tokenAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', rpcEnv: 'CRYPTO_POLYGON_RPC_URL', minimumConfirmations: 64 },
];

export function networkFor(chainId: unknown): RailNetwork {
    const network = RAIL_NETWORKS.find(item => item.chain.id === chainId);
    if (!network) throw new ApiError(422, 'UNSUPPORTED_NETWORK', 'Select a supported crypto network.');
    return network;
}

export function assetsFor(network: RailNetwork): RailAsset[] {
    if (network.kind === 'sandbox') return SANDBOX_ASSETS.map(asset => ({ ...asset }));
    return [
        { symbol: 'USDC', kind: 'erc20', tokenAddress: network.tokenAddress, decimals: 6 },
        { symbol: network.chain.nativeCurrency.symbol, kind: 'native', tokenAddress: zeroAddress, decimals: network.chain.nativeCurrency.decimals },
    ];
}

export function assetFor(network: RailNetwork, symbol: unknown): RailAsset {
    const normalized = typeof symbol === 'string' ? symbol.trim().toUpperCase() : 'USDC';
    const asset = assetsFor(network).find(item => item.symbol.toUpperCase() === normalized);
    if (!asset) throw new ApiError(422, 'UNSUPPORTED_ASSET', `${normalized || 'That asset'} is not enabled on ${network.chain.name}. Select USDC or ${network.chain.nativeCurrency.symbol}.`);
    return asset;
}

export function availability(network: RailNetwork): string | null {
    if (network.kind === 'sandbox') return null;
    if (process.env.VERCEL && process.env.DATABASE_URL?.startsWith('file:')) {
        return 'Crypto payments require persistent storage; this deployment uses temporary SQLite.';
    }
    if (!network.chain.testnet && (process.env.CRYPTO_ENABLE_MAINNET !== 'true' || process.env.CRYPTO_PERSISTENT_STORAGE !== 'true')) {
        return 'Mainnet payments have not been enabled by the operator.';
    }
    if (!network.chain.testnet && !process.env[network.rpcEnv]) return 'A dedicated mainnet RPC provider is required.';
    if (!network.chain.testnet && !process.env[network.rpcEnv + '_SECONDARY']) return 'An independent secondary RPC provider is required for mainnet verification.';
    return null;
}

export function assertNetworkEnabled(network: RailNetwork) {
    const reason = availability(network);
    if (reason) throw new ApiError(503, 'RAIL_NOT_CONFIGURED', reason);
}

export function rpcClient(network: RailNetwork, secondary = false) {
    if (network.kind === 'sandbox') throw new ApiError(503, 'SANDBOX_RPC_UNAVAILABLE', 'The sandbox uses the simulated asset ledger and does not use an RPC provider.');
    const url = process.env[network.rpcEnv + (secondary ? '_SECONDARY' : '')] || (!secondary ? network.chain.rpcUrls.default.http[0] : '');
    if (!url) throw new ApiError(503, 'RPC_NOT_CONFIGURED', 'The RPC provider is not configured.');
    const parsed = new URL(url);
    const localTest = process.env.NODE_ENV === 'test' && parsed.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(parsed.hostname);
    if (!url || (parsed.protocol !== 'https:' && !localTest)) {
        throw new ApiError(503, 'RPC_NOT_CONFIGURED', 'The network requires a trusted HTTPS RPC endpoint.');
    }
    return createPublicClient({ chain: network.chain, transport: http(url, { timeout: 12_000, retryCount: 1 }), batch: { multicall: false } });
}

export async function checkedClient(network: RailNetwork, secondary = false) {
    const client = rpcClient(network, secondary);
    if (await client.getChainId() !== network.chain.id) throw new ApiError(503, 'RPC_CHAIN_MISMATCH', 'The RPC provider returned the wrong network.');
    return client;
}

export function describeNetwork(network: RailNetwork) {
    const reason = availability(network);
    const rpcUrls = network.chain.rpcUrls.default.http.filter((url) => url.startsWith('https://'));
    const explorerUrl = network.chain.blockExplorers?.default.url;
    return {
        chainId: network.chain.id, name: network.chain.name, testnet: Boolean(network.chain.testnet),
        tokenAddress: network.tokenAddress.toLowerCase(), symbol: 'USDC', decimals: 6,
        explorerUrl: explorerUrl || '', nativeSymbol: network.chain.nativeCurrency.symbol,
        kind: network.kind || 'onchain',
        assets: assetsFor(network).map(asset => ({ ...asset, tokenAddress: asset.tokenAddress.toLowerCase(), enabled: !reason, reason })),
        enabled: !reason, reason,
        // The browser validates this trusted server-provided object before using
        // it with wallet_addEthereumChain. It makes a first-time L2 switch a
        // clear wallet approval rather than an opaque manual configuration step.
        walletAddParams: rpcUrls.length && explorerUrl?.startsWith('https://') ? {
            chainId: `0x${network.chain.id.toString(16)}`,
            chainName: network.chain.name,
            nativeCurrency: network.chain.nativeCurrency,
            rpcUrls,
            blockExplorerUrls: [explorerUrl],
        } : null,
    };
}
