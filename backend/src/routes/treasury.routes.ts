import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { ApiError, audit, executeIdempotent, parseBoundedLimit, parsePositiveAmount, requiredText, sandboxReference, sendApiError } from '../lib/security';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware as any);

// GET /api/treasury/assets - List all assets
router.get('/assets', async (req: AuthRequest, res: Response) => {
    try {
        const assets = await prisma.asset.findMany({
            where: { companyId: req.companyId },
            take: parseBoundedLimit(req.query.limit, 50, 100),
            orderBy: { usdValue: 'desc' }
        });

        res.json(assets);
    } catch (error) {
        return sendApiError(res, error, 'Failed to fetch assets');
    }
});

// GET /api/treasury/portfolio - Portfolio summary
router.get('/portfolio', async (req: AuthRequest, res: Response) => {
    try {
        const assets = await prisma.asset.findMany({
            where: { companyId: req.companyId }
        });
        const totalValue = assets.reduce((sum, asset) => sum + asset.usdValue, 0);

        // No historical valuation model exists yet; return the persisted current
        // valuation instead of fabricating a price history.
        const history = totalValue > 0 ? [{
            date: new Date().toISOString().split('T')[0],
            value: totalValue
        }] : [];

        res.json({
            totalValue,
            assets: assets.length,
            history
        });
    } catch (error) {
        return sendApiError(res, error, 'Failed to fetch portfolio');
    }
});

// POST /api/treasury/swap - Execute token swap
router.post('/swap', async (req: AuthRequest, res: Response) => {
    try {
        const fromAsset = requiredText(req.body?.fromAsset, 'fromAsset', 20).toUpperCase();
        const toAsset = requiredText(req.body?.toAsset, 'toAsset', 20).toUpperCase();
        const parsedFromAmount = parsePositiveAmount(req.body?.fromAmount, 'fromAmount');
        const parsedToAmount = parsePositiveAmount(req.body?.toAmount, 'toAmount');
        const parsedRate = parsePositiveAmount(req.body?.rate, 'rate');
        const parsedFee = req.body?.fee === undefined || Number(req.body.fee) === 0 ? 0 : parsePositiveAmount(req.body.fee, 'fee');
        if (fromAsset === toAsset) throw new ApiError(422, 'INVALID_ASSET_PAIR', 'Source and destination assets must differ.');
        const company = await prisma.company.findFirst({ where: { id: req.companyId }, select: { isTestMode: true } });
        if (!company?.isTestMode) throw new ApiError(503, 'LIVE_PROVIDER_NOT_CONFIGURED', 'Live treasury execution is not enabled for this environment.');
        const source = await prisma.asset.findFirst({ where: { companyId: req.companyId, symbol: fromAsset } });
        const destination = await prisma.asset.findFirst({ where: { companyId: req.companyId, symbol: toAsset } });
        if (!source || !destination) return res.status(400).json({ error: 'One or more assets are not available in this treasury' });
        const result = await executeIdempotent(req.companyId!, req, async () => {
            const completedSwap = await prisma.$transaction(async (tx) => {
                const debit = await tx.asset.updateMany({
                    where: { companyId: req.companyId!, symbol: fromAsset, balance: { gte: parsedFromAmount + parsedFee } },
                    data: { balance: { decrement: parsedFromAmount + parsedFee }, usdValue: { decrement: parsedFromAmount + parsedFee } },
                });
                if (debit.count !== 1) {
                    throw new ApiError(409, 'INSUFFICIENT_BALANCE', 'Insufficient asset balance.');
                }
                await tx.asset.update({
                    where: { companyId_symbol: { companyId: req.companyId!, symbol: toAsset } },
                    data: { balance: { increment: parsedToAmount }, usdValue: { increment: parsedToAmount } },
                });
                const swap = await tx.swap.create({
                    data: {
                        companyId: req.companyId!,
                        fromAsset,
                        toAsset,
                        fromAmount: parsedFromAmount,
                        toAmount: parsedToAmount,
                        rate: parsedRate,
                        fee: parsedFee,
                        status: 'completed',
                        txHash: sandboxReference('swap'),
                        chain: 'Sandbox'
                    }
                });
                await tx.transaction.create({
                    data: {
                        companyId: req.companyId!,
                        type: 'swap',
                        description: 'Swap ' + parsedFromAmount + ' ' + fromAsset + ' to ' + parsedToAmount + ' ' + toAsset,
                        amount: parsedFromAmount,
                        currency: fromAsset,
                        isIncoming: false,
                        status: 'settled',
                        fees: parsedFee,
                        chain: 'Sandbox',
                        txHash: swap.txHash
                    }
                });
                return swap;
            });
            await audit(req.companyId!, 'treasury.swap_completed', 'swap', {
                actorId: req.user?.id,
                entityId: completedSwap.id,
                requestId: res.locals.requestId,
                metadata: { fromAsset, toAsset, fromAmount: parsedFromAmount, toAmount: parsedToAmount },
            });
            return { status: 201, body: completedSwap };
        });
        res.status(result.status).json(result.body);
    } catch (error) {
        return sendApiError(res, error, 'Failed to execute swap');
    }
});

// POST /api/treasury/deposit - Deposit funds
router.post('/deposit', async (req: AuthRequest, res: Response) => {
    try {
        const asset = requiredText(req.body?.asset, 'asset', 20).toUpperCase();
        const parsedAmount = parsePositiveAmount(req.body?.amount);
        const company = await prisma.company.findFirst({ where: { id: req.companyId }, select: { isTestMode: true } });
        if (!company?.isTestMode) throw new ApiError(503, 'LIVE_PROVIDER_NOT_CONFIGURED', 'Live deposits require provider confirmation.');
        const existingAsset = await prisma.asset.findFirst({ where: { companyId: req.companyId, symbol: asset } });
        if (!existingAsset) return res.status(400).json({ error: 'Asset is not available in this treasury' });

        const result = await executeIdempotent(req.companyId!, req, async () => {
            const transaction = await prisma.$transaction(async (tx) => {
                await tx.asset.update({
                    where: { companyId_symbol: { companyId: req.companyId!, symbol: asset } },
                    data: { balance: { increment: parsedAmount }, usdValue: { increment: parsedAmount } },
                });
                return tx.transaction.create({
                    data: {
                        companyId: req.companyId!,
                        type: 'deposit',
                        description: 'Sandbox faucet deposit ' + parsedAmount + ' ' + asset,
                        amount: parsedAmount,
                        currency: asset,
                        isIncoming: true,
                        status: 'settled',
                        chain: 'Sandbox',
                        txHash: sandboxReference('deposit')
                    }
                });
            });
            await audit(req.companyId!, 'treasury.deposit_completed', 'transaction', {
                actorId: req.user?.id,
                entityId: transaction.id,
                requestId: res.locals.requestId,
                metadata: { asset, amount: parsedAmount },
            });
            return { status: 201, body: transaction };
        });
        res.status(result.status).json(result.body);
    } catch (error) {
        return sendApiError(res, error, 'Failed to process deposit');
    }
});

// POST /api/treasury/withdraw - Withdraw funds
router.post('/withdraw', async (req: AuthRequest, res: Response) => {
    try {
        const asset = requiredText(req.body?.asset, 'asset', 20).toUpperCase();
        const parsedAmount = parsePositiveAmount(req.body?.amount);
        const address = requiredText(req.body?.address, 'address', 300);
        const company = await prisma.company.findFirst({ where: { id: req.companyId }, select: { isTestMode: true } });
        if (!company?.isTestMode) throw new ApiError(503, 'LIVE_PROVIDER_NOT_CONFIGURED', 'Live withdrawals require provider confirmation.');
        const existingAsset = await prisma.asset.findFirst({ where: { companyId: req.companyId, symbol: asset } });
        if (!existingAsset) return res.status(400).json({ error: 'Asset is not available in this treasury' });
        const result = await executeIdempotent(req.companyId!, req, async () => {
            const transaction = await prisma.$transaction(async (tx) => {
                const debit = await tx.asset.updateMany({
                    where: { companyId: req.companyId!, symbol: asset, balance: { gte: parsedAmount } },
                    data: { balance: { decrement: parsedAmount }, usdValue: { decrement: parsedAmount } },
                });
                if (debit.count !== 1) {
                    throw new ApiError(409, 'INSUFFICIENT_BALANCE', 'Insufficient asset balance.');
                }
                return tx.transaction.create({
                    data: {
                        companyId: req.companyId!,
                        type: 'withdrawal',
                        description: 'Sandbox withdrawal ' + parsedAmount + ' ' + asset + ' to ' + address.substring(0, 10) + '...',
                        amount: parsedAmount,
                        currency: asset,
                        isIncoming: false,
                        status: 'settled',
                        chain: 'Sandbox',
                        txHash: sandboxReference('withdrawal')
                    }
                });
            });
            await audit(req.companyId!, 'treasury.withdrawal_completed', 'transaction', {
                actorId: req.user?.id,
                entityId: transaction.id,
                requestId: res.locals.requestId,
                metadata: { asset, amount: parsedAmount },
            });
            return { status: 201, body: transaction };
        });
        res.status(result.status).json(result.body);
    } catch (error) {
        return sendApiError(res, error, 'Failed to process withdrawal');
    }
});

// GET /api/treasury/history - Transaction history
router.get('/history', async (req: AuthRequest, res: Response) => {
    try {
        const limit = parseBoundedLimit(req.query.limit, 50, 100);
        const type = typeof req.query.type === 'string' ? req.query.type : undefined;

        const where: any = { companyId: req.companyId };
        if (type) where.type = type;

        const transactions = await prisma.transaction.findMany({
            where,
            take: limit,
            orderBy: { timestamp: 'desc' }
        });

        res.json(transactions);
    } catch (error) {
        return sendApiError(res, error, 'Failed to fetch transaction history');
    }
});

export default router;
