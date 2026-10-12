import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { ApiError, parseBoundedLimit, sendApiError } from '../lib/security';
import { getOnchainPortfolio } from '../crypto/portfolio';

const router = Router();

// Apply auth middleware to all dashboard routes
router.use(authMiddleware as any);

// GET /api/dashboard/stats - Get dashboard statistics
router.get('/stats', async (req: AuthRequest, res: Response) => {
    try {
        const [
            portfolio,
            transactionCount,
            workerCount,
            agentCount
        ] = await Promise.all([
            getOnchainPortfolio(req.companyId!),
            prisma.transaction.count({ where: { companyId: req.companyId } }),
            prisma.worker.count({ where: { companyId: req.companyId } }),
            prisma.agent.count({ where: { companyId: req.companyId, status: 'active' } })
        ]);

        res.json({
            totalBalance: null,
            balanceSource: 'onchain',
            onchainAssetCount: portfolio.items.length,
            onchainNetworkErrors: portfolio.networkErrors,
            monthlyVolume: (await prisma.transaction.aggregate({
                _sum: { amount: true },
                where: {
                    companyId: req.companyId,
                    timestamp: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
                    isIncoming: false,
                },
            }))._sum.amount || 0,
            activeWorkers: workerCount,
            activeAgents: agentCount,
            transactionCount: transactionCount
        });
    } catch (error) {
        return sendApiError(res, error, 'Failed to fetch dashboard stats');
    }
});

// GET /api/dashboard/balance - Get balance breakdown
router.get('/balance', async (req: AuthRequest, res: Response) => {
    try {
        const portfolio = await getOnchainPortfolio(req.companyId!);
        const balanceBreakdown = portfolio.items.map(asset => ({
            label: asset.symbol + ' on ' + asset.network,
            value: null,
            amount: asset.amount,
            color: asset.color,
            bgColor: asset.color,
            source: asset.source,
        }));

        res.json(balanceBreakdown);
    } catch (error) {
        return sendApiError(res, error, 'Failed to fetch balance breakdown');
    }
});

// GET /api/dashboard/transactions - Get recent transactions
router.get('/transactions', async (req: AuthRequest, res: Response) => {
    try {
        const limit = parseBoundedLimit(req.query.limit, 10, 100);
        const type = req.query.type as string;
        const status = req.query.status as string;
        if (type && !['payroll', 'remittance', 'escrow', 'deposit', 'withdrawal', 'swap'].includes(type)) {
            throw new ApiError(422, 'INVALID_TRANSACTION_TYPE', 'Unsupported transaction type.');
        }
        if (status && !['pending', 'processing', 'settled', 'failed', 'cancelled'].includes(status)) {
            throw new ApiError(422, 'INVALID_TRANSACTION_STATUS', 'Unsupported transaction status.');
        }

        const where: any = { companyId: req.companyId };
        if (type) where.type = type;
        if (status) where.status = status;

        const transactions = await prisma.transaction.findMany({
            where,
            take: limit,
            orderBy: { timestamp: 'desc' }
        });

        res.json(transactions);
    } catch (error) {
        return sendApiError(res, error, 'Failed to fetch transactions');
    }
});

// GET /api/dashboard/activity - Get recent activity feed
router.get('/activity', async (req: AuthRequest, res: Response) => {
    try {
        const limit = parseBoundedLimit(req.query.limit, 5, 50);

        const recentTransactions = await prisma.transaction.findMany({
            where: { companyId: req.companyId },
            take: limit,
            orderBy: { timestamp: 'desc' },
            select: {
                id: true,
                type: true,
                description: true,
                amount: true,
                status: true,
                timestamp: true
            }
        });

        const activity = recentTransactions.map(tx => ({
            id: tx.id,
            type: tx.type,
            message: tx.description,
            timestamp: tx.timestamp.toISOString(),
            status: tx.status
        }));

        res.json(activity);
    } catch (error) {
        return sendApiError(res, error, 'Failed to fetch activity feed');
    }
});

export default router;
