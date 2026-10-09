import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { ApiError, parseBoundedLimit, sendApiError } from '../lib/security';

const router = Router();
router.use(authMiddleware as any);

function csvValue(value: unknown): string {
    const raw = value && typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
    const safe = /^[=+\-@]/.test(raw) ? "'" + raw : raw;
    return '"' + safe.replace(/"/g, '""') + '"';
}

// GET /api/analytics/overview - Analytics overview
router.get('/overview', async (req: AuthRequest, res: Response) => {
    try {
        const [
            totalTransactions,
            totalVolume,
            activeUsers,
            avgTransactionValue,
            payrollVolume,
            escrowLocked,
            activeContracts,
            remittanceVolume,
        ] = await Promise.all([
            prisma.transaction.count({ where: { companyId: req.companyId } }),
            prisma.transaction.aggregate({ _sum: { amount: true }, where: { companyId: req.companyId } }),
            prisma.worker.count({ where: { companyId: req.companyId, kycStatus: 'verified' } }),
            prisma.transaction.aggregate({ _avg: { amount: true }, where: { companyId: req.companyId } })
            , prisma.payrollBatch.aggregate({ _sum: { totalAmount: true }, _count: true, where: { companyId: req.companyId } })
            , prisma.contract.aggregate({ _sum: { lockedAmount: true }, where: { companyId: req.companyId, status: { in: ['active', 'funded'] } } })
            , prisma.contract.count({ where: { companyId: req.companyId, status: { in: ['active', 'funded'] } } })
            , prisma.remittance.aggregate({ _sum: { amount: true }, _count: true, where: { companyId: req.companyId } })
        ]);

        res.json({
            totalTransactions,
            totalVolume: totalVolume._sum.amount || 0,
            activeUsers,
            avgTransactionValue: avgTransactionValue._avg.amount || 0,
            payrollVolume: payrollVolume._sum.totalAmount || 0,
            payrollCount: payrollVolume._count,
            escrowLocked: escrowLocked._sum.lockedAmount || 0,
            activeContracts,
            remittanceVolume: remittanceVolume._sum.amount || 0,
            remittanceCount: remittanceVolume._count,
        });
    } catch (error) {
        return sendApiError(res, error, 'Failed to fetch analytics overview');
    }
});

// GET /api/analytics/transactions - Transaction analytics
router.get('/transactions', async (req: AuthRequest, res: Response) => {
    try {
        const period = typeof req.query.period === 'string' ? req.query.period : '6m';
        const periods: Record<string, number> = { '30d': 2, '90d': 3, '6m': 6, '12m': 12 };
        const bucketCount = periods[period];
        if (!bucketCount) throw new ApiError(422, 'INVALID_PERIOD', 'period must be one of 30d, 90d, 6m, or 12m.');

        const start = new Date();
        start.setMonth(start.getMonth() - bucketCount + 1, 1);
        start.setHours(0, 0, 0, 0);
        const transactions = await prisma.transaction.findMany({
            where: { companyId: req.companyId, timestamp: { gte: start } },
            select: { amount: true, timestamp: true }
        });
        const data = Array.from({ length: bucketCount }, (_, index) => {
            const date = new Date(start);
            date.setMonth(start.getMonth() + index);
            const monthTransactions = transactions.filter((transaction) =>
                transaction.timestamp.getFullYear() === date.getFullYear() &&
                transaction.timestamp.getMonth() === date.getMonth()
            );
            return {
                month: date.toLocaleString('default', { month: 'short' }),
                volume: monthTransactions.reduce((sum, transaction) => sum + transaction.amount, 0),
                count: monthTransactions.length
            };
        });

        res.json(data);
    } catch (error) {
        return sendApiError(res, error, 'Failed to fetch transaction analytics');
    }
});

// GET /api/analytics/revenue - Revenue analytics
router.get('/revenue', async (req: AuthRequest, res: Response) => {
    try {
        const feeTransactions = await prisma.transaction.findMany({
            where: { companyId: req.companyId, fees: { not: null } },
            select: { fees: true, timestamp: true }
        });
        const expenseTransactions = await prisma.transaction.findMany({
            where: { companyId: req.companyId, isIncoming: false },
            select: { amount: true, timestamp: true }
        });
        const totalFees = feeTransactions.reduce((sum, transaction) => sum + (transaction.fees || 0), 0);
        const start = new Date();
        start.setMonth(start.getMonth() - 11, 1);
        start.setHours(0, 0, 0, 0);
        const monthlyRevenue = Array.from({ length: 12 }, (_, index) => {
            const date = new Date(start);
            date.setMonth(start.getMonth() + index);
            return {
                month: date.toLocaleString('default', { month: 'short' }),
                revenue: feeTransactions
                    .filter((transaction) => transaction.timestamp.getFullYear() === date.getFullYear() && transaction.timestamp.getMonth() === date.getMonth())
                    .reduce((sum, transaction) => sum + (transaction.fees || 0), 0),
                expenses: expenseTransactions
                    .filter((transaction) => transaction.timestamp.getFullYear() === date.getFullYear() && transaction.timestamp.getMonth() === date.getMonth())
                    .reduce((sum, transaction) => sum + transaction.amount, 0)
            };
        });

        res.json({
            totalFees,
            monthlyRevenue
        });
    } catch (error) {
        return sendApiError(res, error, 'Failed to fetch revenue analytics');
    }
});

// GET /api/analytics/geography - Geographic distribution
router.get('/geography', async (req: AuthRequest, res: Response) => {
    try {
        const remittancesByCountry = await prisma.remittance.groupBy({
            by: ['recipientCountry'],
            _count: true,
            _sum: { amount: true },
            where: { companyId: req.companyId }
        });

        const data = remittancesByCountry.map(item => ({
            country: item.recipientCountry,
            count: item._count,
            volume: item._sum.amount || 0
        }));

        res.json(data);
    } catch (error) {
        return sendApiError(res, error, 'Failed to fetch geographic analytics');
    }
});

// GET /api/analytics/export - Export analytics data
router.get('/export', async (req: AuthRequest, res: Response) => {
    try {
        const format = typeof req.query.format === 'string' ? req.query.format : 'json';
        const type = typeof req.query.type === 'string' ? req.query.type : 'transactions';
        if (!['json', 'csv'].includes(format)) throw new ApiError(422, 'INVALID_EXPORT_FORMAT', 'format must be json or csv.');
        if (!['transactions', 'remittances', 'payroll'].includes(type)) {
            throw new ApiError(422, 'INVALID_EXPORT_TYPE', 'Unsupported analytics export type.');
        }

        let data: any[] = [];

        switch (type) {
            case 'transactions':
                data = await prisma.transaction.findMany({
                    where: { companyId: req.companyId },
                    take: 5000,
                    orderBy: { timestamp: 'desc' }
                });
                break;
            case 'remittances':
                data = await prisma.remittance.findMany({
                    where: { companyId: req.companyId },
                    take: 5000,
                    include: { recipient: true }
                });
                break;
            case 'payroll':
                data = await prisma.payrollBatch.findMany({
                    where: { companyId: req.companyId },
                    take: 5000,
                    include: { payments: true }
                });
                break;
        }

        if (format === 'csv') {
            const headers = Object.keys(data[0] || {});
            const rows = data.map(row => headers.map((header) => csvValue(row[header])).join(','));
            const csv = [headers, ...rows].join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=${type}-export.csv`);
            res.send(csv);
        } else {
            res.json(data);
        }
    } catch (error) {
        return sendApiError(res, error, 'Failed to export analytics data');
    }
});

export default router;
