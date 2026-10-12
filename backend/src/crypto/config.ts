import { createPublicClient, erc20Abi, http, zeroAddress, type Address, type Chain } from 'viem';
import { arbitrum, arbitrumSepolia, base, baseSepolia, mainnet, optimism, optimismSepolia, polygon, polygonAmoy, sepolia } from 'viem/chains';
import { ApiError } from '../lib/security';
import { LOCAL_DEVNET_CHAIN_ID, LOCAL_DEVNET_TOKENS, localDevnetChain } from './devnet';

export interface RailNetwork {
    key: string;
    chain: Chain;
    tokenAddress: Address;
    rpcEnv: string;
    minimumConfirmations: number;
    // A private development chain: test tokens only and a loopback RPC.
    devnet?: boolean;
    // Token contracts used when no *_USDT_ADDRESS or *_DAI_ADDRESS is configured.
    defaultTokens?: Partial<Record<'USDT' | 'DAI', Address>>;
}

export type RailAssetKind = 'erc20' | 'native';

export interface RailAsset {
    symbol: string;
    kind: RailAssetKind;
    tokenAddress: Address;
    decimals: number;
    name: string;
    icon: string;
    color: string;
    testToken?: boolean;
}

export interface RailReadiness {
    key: string;
    chainId: number;
    name: string;
    testnet: boolean;
    ready: boolean;
    reason: string | null;
    primaryBlock: string | null;
    secondaryBlock: string | null;
    assets: string[];
}

const assetMetadata: Record<string, Omit<RailAsset, 'symbol' | 'tokenAddress' | 'decimals' | 'kind'>> = {
    USDC: { name: 'USD Coin', icon: '/icons/usdc.png', color: '#2775CA' },
    USDT: { name: 'Tether USD', icon: '/icons/tether.png', color: '#26A17B' },
    DAI: { name: 'Dai', icon: '/icons/dai.svg', color: '#F5AC37' },
    ETH: { name: 'Ether', icon: '/icons/ethereum.png', color: '#627EEA' },
    MATIC: { name: 'Polygon', icon: '/icons/polygon.png', color: '#8247E5' },
    POL: { name: 'POL', icon: '/icons/polygon.png', color: '#8247E5' },
    BTC: { name: 'Bitcoin', icon: '/icons/bitcoin.svg', color: '#F7931A' },
    SOL: { name: 'Solana', icon: '/icons/solana.svg', color: '#14F195' },
};

const network = (
    key: string,
    chain: Chain,
    tokenAddress: Address,
    rpcEnv: string,
    minimumConfirmations: number,
): RailNetwork => ({ key, chain, tokenAddress, rpcEnv, minimumConfirmations });

// USDC addresses are the issuer's published deployments. USDT and DAI are
// loaded from the environment so every chain can use its own deployment.
export const RAIL_NETWORKS: RailNetwork[] = [
    network('ethereum-sepolia', sepolia, '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', 'CRYPTO_ETHEREUM_SEPOLIA_RPC_URL', 12),
    network('arbitrum-sepolia', arbitrumSepolia, '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', 'CRYPTO_ARBITRUM_SEPOLIA_RPC_URL', 12),
    network('optimism-sepolia', optimismSepolia, '0x5fd84259d66Cd46123540766Be93DFE6D43130D7', 'CRYPTO_OPTIMISM_SEPOLIA_RPC_URL', 12),
    network('base-sepolia', baseSepolia, '0x036CbD53842c5426634e7929541eC2318f3dCF7e', 'CRYPTO_BASE_SEPOLIA_RPC_URL', 12),
    network('polygon-amoy', polygonAmoy, '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582', 'CRYPTO_POLYGON_AMOY_RPC_URL', 64),
    network('ethereum', mainnet, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 'CRYPTO_ETHEREUM_RPC_URL', 12),
    network('arbitrum', arbitrum, '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', 'CRYPTO_ARBITRUM_RPC_URL', 12),
    network('optimism', optimism, '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', 'CRYPTO_OPTIMISM_RPC_URL', 12),
    network('base', base, '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', 'CRYPTO_BASE_RPC_URL', 12),
    network('polygon', polygon, '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', 'CRYPTO_POLYGON_RPC_URL', 64),
];

export { LOCAL_DEVNET_CHAIN_ID, LOCAL_DEVNET_TOKENS };

// A private Hardhat chain on this machine for hands-on wallet testing. It is
// offered only when CRYPTO_ENABLE_LOCAL_DEVNET=true outside production, so a
// deployment can never list it.
export const LOCAL_DEVNET: RailNetwork = {
    ...network('local-devnet', localDevnetChain, LOCAL_DEVNET_TOKENS.USDC, 'CRYPTO_LOCAL_DEVNET_RPC_URL', 2),
    devnet: true,
    defaultTokens: { USDT: LOCAL_DEVNET_TOKENS.USDT, DAI: LOCAL_DEVNET_TOKENS.DAI },
};

export function localDevnetEnabled(): boolean {
    return process.env.CRYPTO_ENABLE_LOCAL_DEVNET === 'true' && process.env.NODE_ENV !== 'production' && !process.env.VERCEL;
}

// Every network offered right now. The environment is read at call time so
// module load order can neither hide nor expose the local devnet.
export function railNetworks(): RailNetwork[] {
    return localDevnetEnabled() ? [LOCAL_DEVNET, ...RAIL_NETWORKS] : RAIL_NETWORKS;
}

function configuredAddress(network: RailNetwork, symbol: string): Address | null {
    const envName = 'CRYPTO_' + network.key.replace(/-/g, '_').toUpperCase() + '_' + symbol + '_ADDRESS';
    const candidate = process.env[envName]?.trim();
    if (!candidate) return null;
    if (!/^0x[0-9a-fA-F]{40}$/.test(candidate) || candidate.toLowerCase() === zeroAddress) {
        throw new ApiError(503, 'TOKEN_CONFIGURATION_MISMATCH', envName + ' is not a valid token contract address.');
    }
    // Environment files often contain mixed-case addresses copied from an
    // explorer. Normalising prevents a non-checksummed mixed-case spelling
    // from reaching viem as an invalid runtime address.
    return candidate.toLowerCase() as Address;
}

function asset(symbol: string, kind: RailAssetKind, tokenAddress: Address, decimals: number, testToken = false): RailAsset {
    const metadata = assetMetadata[symbol] || { name: symbol, icon: '', color: '#087f5b' };
    return { symbol, kind, tokenAddress, decimals, ...metadata, ...(testToken ? { testToken: true, name: metadata.name + ' (test token)' } : {}) };
}

export function networkFor(chainId: unknown): RailNetwork {
    const selected = railNetworks().find(item => item.chain.id === chainId);
    if (!selected) throw new ApiError(422, 'UNSUPPORTED_NETWORK', 'Select a supported EVM network.');
    return selected;
}

export function assetsFor(network: RailNetwork): RailAsset[] {
    const nativeSymbol = network.chain.nativeCurrency.symbol.toUpperCase();
    const native = asset(nativeSymbol, 'native', zeroAddress, network.chain.nativeCurrency.decimals);
    const usdc = asset('USDC', 'erc20', network.tokenAddress, 6, Boolean(network.devnet));
    const optional = (['USDT', 'DAI'] as const).flatMap((symbol) => {
        const tokenAddress = configuredAddress(network, symbol) ?? network.defaultTokens?.[symbol] ?? null;
        const decimals = symbol === 'USDT' ? 6 : 18;
        return tokenAddress ? [asset(symbol, 'erc20', tokenAddress, decimals, Boolean(network.chain.testnet))] : [];
    });
    return [native, usdc, ...optional];
}

export function assetFor(network: RailNetwork, symbol: unknown): RailAsset {
    const normalized = typeof symbol === 'string' ? symbol.trim().toUpperCase() : 'USDC';
    const selected = assetsFor(network).find(item => item.symbol.toUpperCase() === normalized);
    if (!selected) {
        const available = assetsFor(network).map(item => item.symbol).join(', ');
        throw new ApiError(422, 'UNSUPPORTED_ASSET', (normalized || 'That asset') + ' is not configured on ' + network.chain.name + '. Available assets: ' + available + '.');
    }
    return selected;
}

export function availability(network: RailNetwork): string | null {
    if (process.env.VERCEL && process.env.DATABASE_URL?.startsWith('file:')) {
        return 'Crypto payments require persistent storage; this deployment uses temporary SQLite.';
    }
    if (network.devnet && !localDevnetEnabled()) return 'The local development chain is not enabled on this backend.';
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
    const suffix = secondary ? '_SECONDARY' : '';
    const configured = process.env[network.rpcEnv + suffix]?.trim();
    const fallback = !secondary ? network.chain.rpcUrls.default.http[0] : '';
    const url = configured || fallback;
    if (!url) throw new ApiError(503, 'RPC_NOT_CONFIGURED', 'The RPC provider is not configured.');
    const parsed = new URL(url);
    // Plain HTTP is accepted only for a loopback RPC: the local devnet or tests.
    const loopback = parsed.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(parsed.hostname);
    if (parsed.protocol !== 'https:' && !(loopback && (network.devnet || process.env.NODE_ENV === 'test'))) {
        throw new ApiError(503, 'RPC_NOT_CONFIGURED', 'The network requires a trusted HTTPS RPC endpoint.');
    }
    return createPublicClient({ chain: network.chain, transport: http(url, { timeout: 12_000, retryCount: 1 }), batch: { multicall: false } });
}

export async function checkedClient(network: RailNetwork, secondary = false) {
    const client = rpcClient(network, secondary);
    if (await client.getChainId() !== network.chain.id) throw new ApiError(503, 'RPC_CHAIN_MISMATCH', 'The RPC provider returned the wrong network.');
    return client;
}

/**
 * Confirm that a rail can actually service payments without ever disclosing
 * RPC URLs or credentials to the browser. Mainnet rails must also pass an
 * independent secondary-provider read before they can be enabled.
 */
export async function inspectRail(network: RailNetwork): Promise<RailReadiness> {
    const unavailable = availability(network);
    const base = {
        key: network.key,
        chainId: network.chain.id,
        name: network.chain.name,
        testnet: Boolean(network.chain.testnet),
    };
    if (unavailable) return { ...base, ready: false, reason: unavailable, primaryBlock: null, secondaryBlock: null, assets: [] };

    try {
        const client = await checkedClient(network);
        const assets = assetsFor(network);
        const [primaryBlock, enabledAssets] = await Promise.all([
            client.getBlockNumber({ cacheTime: 0 }),
            Promise.all(assets.map(async (item) => {
                if (item.kind === 'native') return item.symbol;
                const [code, decimals] = await Promise.all([
                    client.getCode({ address: item.tokenAddress }),
                    client.readContract({ address: item.tokenAddress, abi: erc20Abi, functionName: 'decimals' }),
                ]);
                if (!code || code === '0x') throw new ApiError(503, 'TOKEN_UNAVAILABLE', `${item.symbol} is not deployed at its configured contract address.`);
                if (decimals !== item.decimals) throw new ApiError(503, 'TOKEN_CONFIGURATION_MISMATCH', `${item.symbol} has an unexpected decimal precision on ${network.chain.name}.`);
                return item.symbol;
            })),
        ]);

        let secondaryBlock: bigint | null = null;
        if (!network.chain.testnet) {
            const secondary = await checkedClient(network, true);
            secondaryBlock = await secondary.getBlockNumber({ cacheTime: 0 });
        }
        return {
            ...base,
            ready: true,
            reason: null,
            primaryBlock: primaryBlock.toString(),
            secondaryBlock: secondaryBlock?.toString() || null,
            assets: enabledAssets,
        };
    } catch (error) {
        const reason = error instanceof ApiError
            ? error.message
            : 'The network provider could not be reached. Check the configured RPC provider and try again.';
        return { ...base, ready: false, reason, primaryBlock: null, secondaryBlock: null, assets: [] };
    }
}

export async function inspectRails(testnet: boolean): Promise<RailReadiness[]> {
    return Promise.all(railNetworks().filter((network) => Boolean(network.chain.testnet) === testnet).map(inspectRail));
}

export async function assertRailsReady(testnet: boolean): Promise<RailReadiness[]> {
    const rails = await inspectRails(testnet);
    const unavailable = rails.filter((rail) => !rail.ready);
    if (unavailable.length) {
        throw new ApiError(
            503,
            'RAILS_UNAVAILABLE',
            `${unavailable.map((rail) => rail.name).join(', ')} ${unavailable.length === 1 ? 'is' : 'are'} unavailable. Review the rail status and try again.`,
            { rails: unavailable.map((rail) => ({ name: rail.name, reason: rail.reason })) },
        );
    }
    return rails;
}

export async function assertAnyRailReady(testnet: boolean): Promise<RailReadiness[]> {
    const rails = await inspectRails(testnet);
    if (!rails.some((rail) => rail.ready)) {
        throw new ApiError(
            503,
            'RAILS_UNAVAILABLE',
            `No ${testnet ? 'testnet' : 'live'} network is reachable right now. Review the rail status and try again.`,
            { rails: rails.map((rail) => ({ name: rail.name, reason: rail.reason })) },
        );
    }
    return rails;
}

export function describeNetwork(network: RailNetwork) {
    const reason = availability(network);
    // Public networks advertise only their HTTPS defaults. The devnet's default
    // is a loopback URL, which wallets accept for their own machine.
    const rpcUrls = network.chain.rpcUrls.default.http.filter((url) => url.startsWith('https://') || Boolean(network.devnet));
    const explorerUrl = network.chain.blockExplorers?.default.url;
    return {
        chainId: network.chain.id,
        name: network.chain.name,
        testnet: Boolean(network.chain.testnet),
        tokenAddress: network.tokenAddress.toLowerCase(),
        symbol: 'USDC',
        decimals: 6,
        explorerUrl: explorerUrl || '',
        nativeSymbol: network.chain.nativeCurrency.symbol,
        kind: 'onchain' as const,
        assets: assetsFor(network).map((item) => ({
            ...item,
            tokenAddress: item.tokenAddress.toLowerCase(),
            enabled: !reason,
            reason,
        })),
        enabled: !reason,
        reason,
        devnet: Boolean(network.devnet),
        walletAddParams: rpcUrls.length && (network.devnet || explorerUrl?.startsWith('https://')) ? {
            chainId: '0x' + network.chain.id.toString(16),
            chainName: network.chain.name,
            nativeCurrency: network.chain.nativeCurrency,
            rpcUrls,
            ...(explorerUrl ? { blockExplorerUrls: [explorerUrl] } : {}),
        } : null,
    };
}
