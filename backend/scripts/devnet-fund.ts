import 'dotenv/config';
import { assertDevnetRunning, describeBalances, fundDevnetAccount, parseRecipients } from './devnet-lib';

// Sends test ETH, USDC, USDT and DAI to wallets on a running local devnet:
//   npm run devnet:fund -- 0xYourMetaMaskAddress
async function main() {
    const recipients = parseRecipients(process.argv.slice(2));
    if (!recipients.length) throw new Error('Usage: npm run devnet:fund -- 0xYourAddress [0xAnotherAddress ...]');
    await assertDevnetRunning();
    for (const recipient of recipients) {
        await fundDevnetAccount(recipient);
        console.log(`Funded ${recipient}: ${await describeBalances(recipient)}`);
    }
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
