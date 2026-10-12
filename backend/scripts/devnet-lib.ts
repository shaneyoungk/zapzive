import fs from 'node:fs';
import path from 'node:path';
import solc from 'solc';
import { createPublicClient, createWalletClient, formatEther, formatUnits, getAddress, getContractAddress, http, isAddress, parseAbi, parseEther, parseUnits, type Abi, type Address, type Hex } from 'viem';
import { LOCAL_DEVNET_CHAIN_ID, LOCAL_DEVNET_TOKENS, localDevnetChain } from '../src/crypto/devnet';

// Shared by `npm run devnet` and `npm run devnet:fund`. Everything here talks to
// the private local chain only; no public network is read or written.

export const FUND_ETH = '10';
export const FUND_TOKENS = '10000';

// Deployed in this order from Hardhat's first account on a fresh chain, which
// places each contract at the deterministic address the backend expects.
export const DEVNET_TOKENS = [
    { symbol: 'USDC', name: 'Local USD Coin', decimals: 6, address: LOCAL_DEVNET_TOKENS.USDC, nonce: 0 },
    { symbol: 'USDT', name: 'Local Tether USD', decimals: 6, address: LOCAL_DEVNET_TOKENS.USDT, nonce: 1 },
    { symbol: 'DAI', name: 'Local Dai', decimals: 18, address: LOCAL_DEVNET_TOKENS.DAI, nonce: 2 },
] as const;

const mintAbi = parseAbi(['function mint(address to, uint256 value)', 'function balanceOf(address owner) view returns (uint256)']);

export function devnetRpcUrl(): string {
    return process.env.CRYPTO_LOCAL_DEVNET_RPC_URL?.trim() || localDevnetChain.rpcUrls.default.http[0];
}

function publicClient() {
    return createPublicClient({ chain: localDevnetChain, transport: http(devnetRpcUrl(), { timeout: 15_000 }) });
}

// Hardhat's first account is unlocked on the node and owns the test tokens.
async function ownerWallet() {
    const [owner] = await createWalletClient({ chain: localDevnetChain, transport: http(devnetRpcUrl()) }).getAddresses();
    if (!owner) throw new Error('The devnet exposes no unlocked account.');
    return createWalletClient({ chain: localDevnetChain, transport: http(devnetRpcUrl()), account: owner });
}

export async function devnetChainId(): Promise<number | null> {
    try { return await publicClient().getChainId(); } catch { return null; }
}

export async function assertDevnetRunning() {
    if (await devnetChainId() !== LOCAL_DEVNET_CHAIN_ID) {
        throw new Error(`No local devnet is running at ${devnetRpcUrl()}. Start it with: npm run devnet`);
    }
}

export function parseRecipients(args: string[]): Address[] {
    return args.map((value) => {
        if (!isAddress(value, { strict: false })) throw new Error(`${value} is not a valid wallet address.`);
        return getAddress(value);
    });
}

function compileTestStablecoin(): { abi: Abi; bytecode: Hex } {
    const source = fs.readFileSync(path.resolve(__dirname, '..', 'contracts', 'ZapziveTestStablecoin.sol'), 'utf8');
    const output = JSON.parse(solc.compile(JSON.stringify({
        language: 'Solidity',
        sources: { 'ZapziveTestStablecoin.sol': { content: source } },
        // Hardhat 2.22 runs the Cancun hardfork by default.
        settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: 'cancun', outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } } },
    }))) as { contracts?: Record<string, Record<string, { abi: Abi; evm: { bytecode: { object: string } } }>>; errors?: Array<{ severity: string; formattedMessage: string }> };
    const errors = output.errors?.filter((item) => item.severity === 'error') || [];
    if (errors.length) throw new Error(errors.map((item) => item.formattedMessage).join('\n'));
    const artifact = output.contracts?.['ZapziveTestStablecoin.sol']?.ZapziveTestStablecoin;
    if (!artifact?.evm.bytecode.object) throw new Error('The test stablecoin contract did not produce bytecode.');
    return { abi: artifact.abi, bytecode: ('0x' + artifact.evm.bytecode.object) as Hex };
}

export async function deployDevnetTokens() {
    const client = publicClient();
    const wallet = await ownerWallet();
    const owner = wallet.account.address;
    let compiled: ReturnType<typeof compileTestStablecoin> | null = null;
    for (const token of DEVNET_TOKENS) {
        const code = await client.getCode({ address: token.address });
        if (code && code !== '0x') continue;
        const nonce = await client.getTransactionCount({ address: owner });
        const predicted = getContractAddress({ from: owner, nonce: BigInt(token.nonce) }).toLowerCase();
        if (nonce !== token.nonce || predicted !== token.address) {
            throw new Error(`${token.symbol} cannot be placed at ${token.address} on this chain. Stop the devnet and start it again so the chain is fresh.`);
        }
        compiled ??= compileTestStablecoin();
        const hash = await wallet.deployContract({ abi: compiled.abi, bytecode: compiled.bytecode, args: [token.name, token.symbol, token.decimals] });
        const receipt = await client.waitForTransactionReceipt({ hash });
        if (receipt.contractAddress?.toLowerCase() !== token.address) throw new Error(`${token.symbol} was deployed to an unexpected address.`);
    }
}

export async function fundDevnetAccount(recipient: Address) {
    const client = publicClient();
    const wallet = await ownerWallet();
    const hashes = [await wallet.sendTransaction({ to: recipient, value: parseEther(FUND_ETH) })];
    for (const token of DEVNET_TOKENS) {
        hashes.push(await wallet.writeContract({ address: token.address, abi: mintAbi, functionName: 'mint', args: [recipient, parseUnits(FUND_TOKENS, token.decimals)] }));
    }
    for (const hash of hashes) {
        const receipt = await client.waitForTransactionReceipt({ hash });
        if (receipt.status !== 'success') throw new Error(`Funding transaction ${hash} failed.`);
    }
}

export async function describeBalances(address: Address): Promise<string> {
    const client = publicClient();
    const parts = [`${formatEther(await client.getBalance({ address }))} ETH`];
    for (const token of DEVNET_TOKENS) {
        const units = await client.readContract({ address: token.address, abi: mintAbi, functionName: 'balanceOf', args: [address] });
        parts.push(`${formatUnits(units, token.decimals)} ${token.symbol}`);
    }
    return parts.join(', ');
}
