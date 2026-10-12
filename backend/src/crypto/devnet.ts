import { defineChain, type Address } from 'viem';

// The private local chain started by `npm run devnet`. This module imports only
// viem: the long-running devnet process must not load the Prisma engine, whose
// files it would otherwise lock against `prisma generate` on Windows.

export const LOCAL_DEVNET_CHAIN_ID = 31_337;

// `npm run devnet` deploys these test tokens from Hardhat's first account on a
// fresh chain (nonces 0, 1 and 2), so their addresses are deterministic.
export const LOCAL_DEVNET_TOKENS = {
    USDC: '0x5fbdb2315678afecb367f032d93f642f64180aa3',
    USDT: '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512',
    DAI: '0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0',
} as const satisfies Record<string, Address>;

export const localDevnetChain = defineChain({
    id: LOCAL_DEVNET_CHAIN_ID,
    name: 'Local devnet',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: ['http://127.0.0.1:8545'] } },
    testnet: true,
});
