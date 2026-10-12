import 'dotenv/config';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { LOCAL_DEVNET_CHAIN_ID } from '../src/crypto/devnet';
import { DEVNET_TOKENS, describeBalances, deployDevnetTokens, devnetChainId, devnetRpcUrl, fundDevnetAccount, parseRecipients } from './devnet-lib';

// Starts the private local chain, deploys the test tokens and funds any wallet
// addresses given. Keep it running while testing:
//   npm run devnet -- 0xYourMetaMaskAddress
async function main() {
    const recipients = parseRecipients(process.argv.slice(2));
    const rpc = new URL(devnetRpcUrl());
    const running = await devnetChainId();
    if (running !== null) {
        throw new Error(running === LOCAL_DEVNET_CHAIN_ID
            ? `A local devnet is already running at ${rpc.origin}. Fund wallets with: npm run devnet:fund -- 0xYourAddress`
            : `Another service is using ${rpc.origin}. Stop it, or set CRYPTO_LOCAL_DEVNET_RPC_URL to a free port.`);
    }

    const node = spawn(process.execPath, [
        require.resolve('hardhat/internal/cli/bootstrap.js'),
        '--config', path.resolve(__dirname, '..', 'devnet', 'hardhat.config.cjs'),
        'node', '--hostname', rpc.hostname, '--port', rpc.port || '8545',
    ], { stdio: ['ignore', 'ignore', 'inherit'], env: { ...process.env, HARDHAT_DISABLE_TELEMETRY_PROMPT: 'true' } });
    const exited = new Promise<number>((resolve) => node.once('exit', (code) => resolve(code ?? 0)));
    const stop = () => { node.kill(); };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);

    try {
        const startedAt = Date.now();
        while (await devnetChainId() !== LOCAL_DEVNET_CHAIN_ID) {
            if (node.exitCode !== null) throw new Error('The devnet stopped while starting.');
            if (Date.now() - startedAt > 60_000) throw new Error('The devnet did not start within 60 seconds.');
            await delay(500);
        }
        await deployDevnetTokens();
        for (const recipient of recipients) await fundDevnetAccount(recipient);
    } catch (error) {
        stop();
        throw error;
    }

    console.log(`\nLocal devnet running at ${rpc.origin} (chain ID ${LOCAL_DEVNET_CHAIN_ID}). Keep this terminal open.\n`);
    console.log('Test tokens:');
    for (const token of DEVNET_TOKENS) console.log(`  ${token.symbol.padEnd(5)} ${token.address}`);
    for (const recipient of recipients) console.log(`\nFunded ${recipient}: ${await describeBalances(recipient)}`);
    console.log([
        '',
        'Next:',
        '  1. Set CRYPTO_ENABLE_LOCAL_DEVNET=true in backend/.env and restart the backend.',
        '  2. In Crypto payments choose "Local devnet"; MetaMask asks to add the network.',
        '  3. Optional: import the token addresses above in MetaMask to see them in the wallet.',
        ...(recipients.length ? [] : ['  Fund a wallet with: npm run devnet:fund -- 0xYourAddress']),
        '',
        'Stopping this process erases the chain. After a restart, fund again and clear MetaMask\'s',
        'activity for this network (Settings > Advanced > Clear activity tab data).',
    ].join('\n'));

    process.exitCode = await exited;
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
