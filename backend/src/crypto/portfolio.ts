import { BaseError, erc20Abi, formatUnits, type Address } from 'viem';
import prisma from '../lib/prisma';
import { ApiError } from '../lib/security';
import { assertNetworkEnabled, assetsFor, checkedClient, railNetworks, type RailNetwork } from './config';

export interface OnchainHolding {
    id: string;
    walletId: string;
    chainId: number;
    network: string;
    walletAddress: string;
    symbol: string;
    name: string;
    kind: 'erc20' | 'native';
    tokenAddress: string;
    decimals: number;
    amount: string;
    amountUnits: string;
    icon: string;
    color: string;
    explorerUrl: string | null;
    source: 'rpc';
    usdValue: null;
    valuation: 'not_configured';
    asOf: string;
}

export interface OnchainPortfolio {
    mode: 'testnet' | 'live';
    items: OnchainHolding[];
    networkErrors: Array<{ chainId: number; network: string; message: string }>;
    syncedAt: string;
}

// Raw provider errors can embed the RPC URL, and with it a provider API key.
// Only messages written for users, or viem's URL-free summary, reach the browser.
function messageFor(error: unknown) {
    if (error instanceof ApiError) return error.message;
    if (error instanceof BaseError && error.shortMessage) return error.shortMessage.slice(0, 240);
    return 'The network could not be read right now.';
}

async function readWallet(network: RailNetwork, walletId: string, walletAddress: Address, asOf: string) {
    assertNetworkEnabled(network);
    const client = await checkedClient(network);
    const nativeUnits = await client.getBalance({ address: walletAddress });
    const errors: string[] = [];
    // Each token is read independently so one misconfigured or unreachable
    // contract does not hide the wallet's other balances.
    const rows = await Promise.all(assetsFor(network).map(async (asset): Promise<OnchainHolding | null> => {
        let units = nativeUnits;
        if (asset.kind === 'erc20') {
            try {
                const [balance, decimals] = await Promise.all([
                    client.readContract({ address: asset.tokenAddress, abi: erc20Abi, functionName: 'balanceOf', args: [walletAddress] }),
                    client.readContract({ address: asset.tokenAddress, abi: erc20Abi, functionName: 'decimals' }),
                ]);
                if (decimals !== asset.decimals) {
                    throw new ApiError(503, 'TOKEN_CONFIGURATION_MISMATCH', 'The ' + asset.symbol + ' token returned unexpected decimal precision.');
                }
                units = balance;
            } catch (error) {
                errors.push(asset.symbol + ': ' + messageFor(error));
                return null;
            }
        }
        return {
            id: walletId + ':' + network.chain.id + ':' + asset.symbol,
            walletId,
            chainId: network.chain.id,
            network: network.chain.name,
            walletAddress,
            symbol: asset.symbol,
            name: asset.name,
            kind: asset.kind,
            tokenAddress: asset.tokenAddress.toLowerCase(),
            decimals: asset.decimals,
            amount: formatUnits(units, asset.decimals),
            amountUnits: units.toString(),
            icon: asset.icon,
            color: asset.color,
            explorerUrl: network.chain.blockExplorers?.default.url || null,
            source: 'rpc' as const,
            usdValue: null,
            valuation: 'not_configured' as const,
            asOf,
        };
    }));
    return { rows: rows.filter((row): row is OnchainHolding => row !== null), errors };
}

export async function getOnchainPortfolio(companyId: string): Promise<OnchainPortfolio> {
    const company = await prisma.company.findFirst({
        where: { id: companyId, status: 'active' },
        select: { id: true, isTestMode: true },
    });
    if (!company) throw new ApiError(404, 'COMPANY_NOT_FOUND', 'Workspace not found.');

    const wallets = await prisma.cryptoWallet.findMany({
        where: { companyId },
        select: { id: true, chainId: true, address: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
    });
    const syncedAt = new Date().toISOString();
    const items: OnchainHolding[] = [];
    const networkErrors: OnchainPortfolio['networkErrors'] = [];

    await Promise.all(wallets.map(async (wallet) => {
        // A wallet linked on a network that is no longer configured cannot be
        // read or used for payments, so it is not reported as a read failure.
        const network = railNetworks().find((item) => item.chain.id === wallet.chainId);
        if (!network || Boolean(network.chain.testnet) !== company.isTestMode) return;
        try {
            const { rows, errors } = await readWallet(network, wallet.id, wallet.address as Address, syncedAt);
            items.push(...rows);
            if (errors.length) networkErrors.push({ chainId: wallet.chainId, network: network.chain.name, message: errors.join(' ') });
        } catch (error) {
            networkErrors.push({ chainId: wallet.chainId, network: network.chain.name, message: messageFor(error) });
        }
    }));

    items.sort((left, right) => {
        const networkOrder = left.network.localeCompare(right.network);
        return networkOrder || left.symbol.localeCompare(right.symbol) || left.walletAddress.localeCompare(right.walletAddress);
    });

    return {
        mode: company.isTestMode ? 'testnet' : 'live',
        items,
        networkErrors,
        syncedAt,
    };
}
