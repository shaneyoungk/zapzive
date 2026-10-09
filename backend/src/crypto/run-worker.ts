import 'dotenv/config';
import prisma from '../lib/prisma';
import { reconcileDuePayments } from './worker';
import { setTimeout as delay } from 'node:timers/promises';

let stopping = false;
process.once('SIGTERM', () => { stopping = true; });
process.once('SIGINT', () => { stopping = true; });

async function main() {
    do {
        const result = await reconcileDuePayments();
        if (result.checked || result.deferred) console.info('crypto_reconciliation', result);
        if (process.argv.includes('--once')) break;
        if (!stopping) await delay(5_000);
    } while (!stopping);
}

main().catch(() => { console.error('crypto_worker_failed'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
