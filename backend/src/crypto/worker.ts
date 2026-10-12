import crypto from 'crypto';
import prisma from '../lib/prisma';
import { LOCAL_DEVNET_CHAIN_ID } from './config';
import { reconcilePayment } from './service';

// Settlement already requires a finalized block, so settled payments are only
// re-checked for a bounded window instead of every hour indefinitely. Local
// devnet settlements are never re-checked: restarting that chain erases its
// history, which is not a reorganization.
const SETTLED_WATCH_MS = 24 * 60 * 60 * 1000;

// Both the standalone worker and a scheduled invocation use these durable
// leases. A crashed process releases work when its lease expires.
export async function reconcileDuePayments(limit = 20) {
    const now = new Date();
    const due = await prisma.cryptoPayment.findMany({ where: {
        txHash: { not: null }, nextCheckAt: { lte: now },
        AND: [
            { OR: [{ status: { in: ['submitted', 'confirming'] } }, { status: 'settled', chainId: { not: LOCAL_DEVNET_CHAIN_ID }, settledAt: { gt: new Date(now.getTime() - SETTLED_WATCH_MS) } }] },
            { OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] },
        ],
    }, orderBy: { nextCheckAt: 'asc' }, take: Math.min(50, Math.max(1, limit)) });
    let checked = 0;
    let deferred = 0;
    for (const candidate of due) {
        const owner = crypto.randomUUID();
        const acquired = await prisma.cryptoPayment.updateMany({ where: {
            id: candidate.id, version: candidate.version,
            OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }],
        }, data: { leaseOwner: owner, leaseUntil: new Date(Date.now() + 120_000) } });
        if (acquired.count !== 1) continue;
        try {
            await reconcilePayment(candidate);
            checked += 1;
        } catch { deferred += 1; }
        finally {
            await prisma.cryptoPayment.updateMany({ where: { id: candidate.id, leaseOwner: owner }, data: { leaseOwner: null, leaseUntil: null } });
        }
    }
    return { checked, deferred };
}
