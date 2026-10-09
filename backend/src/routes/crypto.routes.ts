import { Router, type Response, type NextFunction } from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { authMiddleware, requireRole, type AuthRequest } from '../middleware/auth.middleware';
import { ApiError, executeIdempotent, parseBoundedLimit, requiredText, requireIdempotencyKey, sendApiError } from '../lib/security';
import { RAIL_NETWORKS, describeNetwork } from '../crypto/config';
import { createPayment, ensureSandboxWallet, ownedPayment, paymentView, preparePayment, reconcilePayment, submitPayment, verifyWallet, walletBalances, walletChallenge, type RailActor } from '../crypto/service';
import { reconcileDuePayments } from '../crypto/worker';

const router = Router();
router.use(authMiddleware);
router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
const moneyPermission = requireRole('owner', 'admin', 'treasury', 'approver');
const actor = (req: AuthRequest, res: Response): RailActor => ({ companyId: req.companyId!, userId: req.user!.id, requestId: res.locals.requestId });
const sessionOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.authType !== 'session') return res.status(403).json({ error: 'Sign in to link a wallet.', code: 'SESSION_REQUIRED' });
    next();
};
type Action = (req: AuthRequest, res: Response) => Promise<unknown>;
const handle = (action: Action) => async (req: AuthRequest, res: Response) => {
    try { await action(req, res); } catch (error) { sendApiError(res, error, 'The crypto rail request could not be completed.'); }
};
const idOf = (req: AuthRequest) => requiredText(req.params.id, 'payment id', 100);

router.get('/networks', handle(async (req, res) => {
    const company = await prisma.company.findUniqueOrThrow({ where: { id: req.companyId } });
    if (company.isTestMode) await ensureSandboxWallet(req.companyId!, req.user!.id);
    res.json({ networks: RAIL_NETWORKS.filter(n => Boolean(n.chain.testnet) === company.isTestMode).map(describeNetwork), mode: company.isTestMode ? 'testnet' : 'live', signing: 'external-wallet' });
}));

router.get('/wallets', handle(async (req, res) => {
    await ensureSandboxWallet(req.companyId!, req.user!.id);
    res.json(await prisma.cryptoWallet.findMany({ where: { companyId: req.companyId }, select: { id: true, chainId: true, address: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 100 }));
}));

router.post('/wallets/challenge', sessionOnly, moneyPermission, handle(async (req, res) => {
    res.status(201).json(await walletChallenge(actor(req, res), req.body || {}));
}));
router.post('/wallets/verify', sessionOnly, moneyPermission, handle(async (req, res) => {
    res.json(await verifyWallet(actor(req, res), requiredText(req.body?.challengeId, 'challengeId', 100), req.body?.signature));
}));
router.get('/balances', handle(async (req, res) => {
    const chainId = Number(requiredText(req.query.chainId, 'chainId', 20));
    if (!Number.isSafeInteger(chainId) || chainId <= 0) throw new ApiError(422, 'INVALID_CHAIN_ID', 'Provide a valid network chain ID.');
    res.json(await walletBalances(actor(req, res), chainId, requiredText(req.query.address, 'address', 100), req.query.asset));
}));

router.get('/payments', handle(async (req, res) => {
    const limit = parseBoundedLimit(req.query.limit, 25, 100);
    const cursor = req.query.cursor === undefined ? undefined : requiredText(req.query.cursor, 'cursor', 100);
    if (cursor) await ownedPayment(req.companyId!, cursor);
    const rows = await prisma.cryptoPayment.findMany({ where: { companyId: req.companyId }, take: limit + 1,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    res.json({ items: rows.slice(0, limit).map(paymentView), nextCursor: rows.length > limit ? rows[limit - 1].id : null });
}));
router.post('/payments', moneyPermission, handle(async (req, res) => {
    res.status(201).json(paymentView(await createPayment(actor(req, res), requireIdempotencyKey(req), req.body || {})));
}));
router.get('/payments/:id', handle(async (req, res) => {
    res.json(paymentView(await ownedPayment(req.companyId!, idOf(req))));
}));
router.post('/payments/:id/prepare', moneyPermission, handle(async (req, res) => {
    res.json(await preparePayment(actor(req, res), idOf(req)));
}));
router.post('/payments/:id/submit', moneyPermission, handle(async (req, res) => {
    const result = await executeIdempotent(req.companyId!, req, async () => ({
        status: 200,
        body: paymentView(await submitPayment(actor(req, res), idOf(req), req.body?.txHash)),
    }));
    res.status(result.status).json(result.body);
}));
router.post('/payments/:id/reconcile', handle(async (req, res) => {
    const payment = await ownedPayment(req.companyId!, idOf(req));
    res.json(paymentView(await reconcilePayment(payment)));
}));
router.get('/payments/:id/journal', handle(async (req, res) => {
    const payment = await ownedPayment(req.companyId!, idOf(req));
    res.json(await prisma.cryptoJournal.findMany({ where: { paymentId: payment.id }, include: { entries: true }, orderBy: { createdAt: 'asc' } }));
}));

// Cron invokes this independent endpoint, never a user-supplied URL or RPC.
export async function cryptoCron(req: AuthRequest, res: Response) {
    try {
        // Vercel supplies CRON_SECRET as a Bearer token; a dedicated secret also
        // works for a standalone scheduler. Neither is ever sent to the browser.
        const secret = process.env.CRYPTO_WORKER_SECRET || process.env.CRON_SECRET;
        const supplied = req.headers.authorization || '';
        if (!secret || secret.length < 32) throw new ApiError(503, 'WORKER_NOT_CONFIGURED', 'Scheduled reconciliation is not configured.');
        const actual = Buffer.from(supplied);
        const expected = Buffer.from(`Bearer ${secret}`);
        if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) throw new ApiError(401, 'UNAUTHORIZED', 'Unauthorized.');
        res.setHeader('Cache-Control', 'no-store');
        res.json(await reconcileDuePayments(5));
    } catch (error) { sendApiError(res, error); }
}

export default router;
