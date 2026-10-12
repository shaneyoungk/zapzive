import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import solc from 'solc';
import { createPublicClient, createWalletClient, http, parseUnits, type Abi, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { RAIL_NETWORKS } from '../src/crypto/config';

const root = path.resolve(__dirname, '..');
const contractPath = path.join(root, 'contracts', 'ZapziveTestStablecoin.sol');
const envPath = path.join(root, '.env');
dotenv.config({ path: envPath });
function setEnvValue(content: string, key: string, value: string) {
    const lines = content.split(/\r?\n/);
    const index = lines.findIndex((line) => line.startsWith(key + '='));
    if (index >= 0) lines[index] = key + '=' + value;
    else lines.push(key + '=' + value);
    return lines.join('\n');
}

async function main() {
    const deployerKey = process.env.CRYPTO_TESTNET_DEPLOYER_PRIVATE_KEY?.trim();
    if (!deployerKey || !/^0x[0-9a-fA-F]{64}$/.test(deployerKey)) {
        throw new Error('CRYPTO_TESTNET_DEPLOYER_PRIVATE_KEY must be provided at runtime and must be a 32-byte 0x-prefixed key. Never commit it.');
    }
    if (!fs.existsSync(envPath)) throw new Error('backend/.env is required before deploying test assets.');

    const source = fs.readFileSync(contractPath, 'utf8');
    const compiled = JSON.parse(solc.compile(JSON.stringify({
        language: 'Solidity',
        sources: { 'ZapziveTestStablecoin.sol': { content: source } },
        settings: { optimizer: { enabled: true, runs: 200 }, outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } } },
    }))) as { contracts?: Record<string, Record<string, { abi: readonly unknown[]; evm: { bytecode: { object: string } } }>>; errors?: Array<{ severity: string; formattedMessage: string }> };

    const errors = compiled.errors?.filter((item) => item.severity === 'error') || [];
    if (errors.length) throw new Error(errors.map((item) => item.formattedMessage).join('\n'));
    const artifact = compiled.contracts?.['ZapziveTestStablecoin.sol']?.ZapziveTestStablecoin;
    if (!artifact?.evm.bytecode.object) throw new Error('The test stablecoin contract did not produce bytecode.');
    const bytecode = ('0x' + artifact.evm.bytecode.object) as Hex;
    const abi = artifact.abi as Abi;

    const requestedNetworks = (process.env.CRYPTO_TESTNET_DEPLOYER_NETWORKS || RAIL_NETWORKS.filter((item) => item.chain.testnet).map((item) => item.key).join(','))
        .split(',').map((item) => item.trim()).filter(Boolean);
    const mintTo = (process.env.CRYPTO_TESTNET_MINT_TO?.trim() || '') as Address;
    const mintAmount = process.env.CRYPTO_TESTNET_MINT_AMOUNT?.trim() || '100000';

    let envContent = fs.readFileSync(envPath, 'utf8');
    const account = privateKeyToAccount(deployerKey as Hex);
    console.log('Test asset deployer:', account.address);

    for (const key of requestedNetworks) {
        const network = RAIL_NETWORKS.find((item) => item.key === key && item.chain.testnet);
        if (!network) throw new Error(`Unsupported testnet network: ${key}`);
        const rpcUrl = process.env[network.rpcEnv] || network.chain.rpcUrls.default.http[0];
        const publicClient = createPublicClient({ chain: network.chain, transport: http(rpcUrl) });
        const walletClient = createWalletClient({ account, chain: network.chain, transport: http(rpcUrl) });

        for (const [symbol, decimals] of [['USDT', 6], ['DAI', 18]] as const) {
            const envKey = 'CRYPTO_' + key.replace(/-/g, '_').toUpperCase() + '_' + symbol + '_ADDRESS';
            const hash = await walletClient.deployContract({
                chain: network.chain,
                abi,
                bytecode,
                args: [`Zapzive Test ${symbol}`, symbol, decimals],
            });
            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            if (!receipt.contractAddress) throw new Error(`Deployment did not return a contract address for ${key} ${symbol}.`);
            envContent = setEnvValue(envContent, envKey, receipt.contractAddress);
            console.log(`${key} ${symbol}: ${receipt.contractAddress} (${hash})`);

            const recipient = mintTo || account.address;
            const mintHash = await walletClient.writeContract({
                chain: network.chain,
                address: receipt.contractAddress,
                abi,
                functionName: 'mint',
                args: [recipient, parseUnits(mintAmount, decimals)],
            });
            await publicClient.waitForTransactionReceipt({ hash: mintHash });
            console.log(`${key} ${symbol}: minted ${mintAmount} to ${recipient}`);
        }
    }

    fs.writeFileSync(envPath, envContent.endsWith('\n') ? envContent : envContent + '\n', { encoding: 'utf8', mode: 0o600 });
    console.log('Updated backend/.env with the deployed test-asset addresses.');
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
