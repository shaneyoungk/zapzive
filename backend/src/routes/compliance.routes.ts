import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { ApiError, parseBoundedLimit, requiredText, sendApiError } from '../lib/security';

const router = Router();

// Apply auth middleware
router.use(authMiddleware as any);

// GET /api/compliance/items - List compliance items
router.get('/items', async (req: AuthRequest, res: Response) => {
    try {
        const type = req.query.type as string;
        const status = req.query.status as string;
        const riskLevel = req.query.riskLevel as string;
        const limit = parseBoundedLimit(req.query.limit, 50, 100);
        if (type && !['kyc', 'aml', 'sanctions', 'transaction'].includes(type)) throw new ApiError(422, 'INVALID_COMPLIANCE_TYPE', 'Unsupported compliance type.');
        if (status && !['approved', 'pending', 'flagged', 'rejected'].includes(status)) throw new ApiError(422, 'INVALID_COMPLIANCE_STATUS', 'Unsupported compliance status.');
        if (riskLevel && !['low', 'medium', 'high'].includes(riskLevel)) throw new ApiError(422, 'INVALID_RISK_LEVEL', 'Unsupported risk level.');

        const where: any = { companyId: req.companyId };
        if (type) where.type = type;
        if (status) where.status = status;
        if (riskLevel) where.riskLevel = riskLevel;

        const items = await prisma.complianceItem.findMany({
            where,
            take: limit,
            orderBy: { date: 'desc' }
        });

        res.json(items);
    } catch (error) {
        return sendApiError(res, error, 'Failed to fetch compliance items');
    }
});

// POST /api/compliance/kyc - Submit KYC
router.post('/kyc', async (req: AuthRequest, res: Response) => {
    try {
        const entity = requiredText(req.body?.entity, 'entity', 160);
        const details = requiredText(req.body?.details, 'details', 2000);

        const kycItem = await prisma.complianceItem.create({
            data: {
                companyId: req.companyId!,
                type: 'kyc',
                entity,
                status: 'pending',
                riskLevel: 'low',
                details
            }
        });

        res.status(201).json(kycItem);
    } catch (error) {
        return sendApiError(res, error, 'Failed to submit KYC');
    }
});

// GET /api/compliance/kyc/:id - Get KYC status
router.get('/kyc/:id', async (req: AuthRequest, res: Response) => {
    try {
        const item = await prisma.complianceItem.findFirst({
            where: { id: req.params.id, companyId: req.companyId }
        });

        if (!item) {
            return res.status(404).json({ error: 'KYC item not found', code: 'NOT_FOUND' });
        }

        res.json(item);
    } catch (error) {
        return sendApiError(res, error, 'Failed to fetch KYC status');
    }
});

// POST /api/compliance/aml - Run AML check
router.post('/aml', async (req: AuthRequest, res: Response) => {
    try {
        const entity = requiredText(req.body?.entity, 'entity', 160);
        const details = requiredText(req.body?.details, 'details', 2000);

        const amlItem = await prisma.complianceItem.create({
            data: {
                companyId: req.companyId!,
                type: 'aml',
                entity,
                status: 'pending',
                riskLevel: 'medium',
                details
            }
        });

        res.status(201).json(amlItem);
    } catch (error) {
        return sendApiError(res, error, 'Failed to run AML check');
    }
});

// GET /api/compliance/reports - Compliance reports
router.get('/reports', async (req: AuthRequest, res: Response) => {
    try {
        const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
        const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;

        const where: any = { companyId: req.companyId };
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
                return res.status(422).json({ error: 'Invalid compliance report date range', code: 'INVALID_DATE_RANGE' });
            }
            where.date = { gte: start, lte: end };
        }

        const items = await prisma.complianceItem.findMany({
            where,
            take: parseBoundedLimit(req.query.limit, 100, 200),
            orderBy: { date: 'desc' }
        });

        const summary = {
            total: items.length,
            approved: items.filter(i => i.status === 'approved').length,
            pending: items.filter(i => i.status === 'pending').length,
            flagged: items.filter(i => i.status === 'flagged').length,
            rejected: items.filter(i => i.status === 'rejected').length,
            byType: {
                kyc: items.filter(i => i.type === 'kyc').length,
                aml: items.filter(i => i.type === 'aml').length,
                sanctions: items.filter(i => i.type === 'sanctions').length,
                transaction: items.filter(i => i.type === 'transaction').length
            },
            byRiskLevel: {
                low: items.filter(i => i.riskLevel === 'low').length,
                medium: items.filter(i => i.riskLevel === 'medium').length,
                high: items.filter(i => i.riskLevel === 'high').length
            }
        };

        res.json({ summary, items });
    } catch (error) {
        return sendApiError(res, error, 'Failed to generate compliance reports');
    }
});

export default router;
