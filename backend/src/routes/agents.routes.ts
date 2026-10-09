import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { ApiError, parseBoundedLimit, requiredText, safeEmail, sendApiError } from '../lib/security';

const router = Router();

// Apply auth middleware
router.use(authMiddleware as any);

// GET /api/agents - List all agents
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const status = typeof req.query.status === 'string' ? req.query.status : undefined;
        const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : undefined;
        const limit = parseBoundedLimit(req.query.limit, 50, 100);
        if (status && !['active', 'inactive', 'pending'].includes(status)) {
            throw new ApiError(422, 'INVALID_AGENT_STATUS', 'Unsupported agent status.');
        }

        const where: any = { companyId: req.companyId };
        if (status) where.status = status;
        if (search) {
            where.OR = [
                { name: { contains: search } },
                { location: { contains: search } },
                { country: { contains: search } }
            ];
        }

        const agents = await prisma.agent.findMany({
            where,
            take: limit,
            include: {
                transactions: {
                    take: 5,
                    orderBy: { createdAt: 'desc' }
                }
            },
            orderBy: { joinedDate: 'desc' }
        });

        res.json(agents);
    } catch (error) {
        return sendApiError(res, error, 'Failed to fetch agents');
    }
});

// POST /api/agents - Register new agent
router.post('/', async (req: AuthRequest, res: Response) => {
    try {
        const name = requiredText(req.body?.name, 'name', 120);
        const location = requiredText(req.body?.location, 'location', 160);
        const country = requiredText(req.body?.country, 'country', 80);
        const phone = requiredText(req.body?.phone, 'phone', 40);
        const email = safeEmail(req.body?.email);

        const agent = await prisma.agent.create({
            data: {
                companyId: req.companyId!,
                name,
                location,
                country,
                phone,
                email,
                status: 'pending',
                rating: 0,
                totalPayouts: 0,
                completedTransactions: 0,
                pendingPayouts: 0
            }
        });

        res.status(201).json(agent);
    } catch (error) {
        return sendApiError(res, error, 'Failed to register agent');
    }
});

// GET /api/agents/:id - Get agent details
router.get('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const agent = await prisma.agent.findFirst({
            where: { id: req.params.id, companyId: req.companyId },
            include: {
                transactions: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!agent) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        res.json(agent);
    } catch (error) {
        return sendApiError(res, error, 'Failed to fetch agent');
    }
});

// PUT /api/agents/:id - Update agent
router.put('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const existing = await prisma.agent.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
        if (!existing) return res.status(404).json({ error: 'Agent not found', code: 'NOT_FOUND' });
        const data = {
            name: req.body?.name === undefined ? existing.name : requiredText(req.body.name, 'name', 120),
            location: req.body?.location === undefined ? existing.location : requiredText(req.body.location, 'location', 160),
            country: req.body?.country === undefined ? existing.country : requiredText(req.body.country, 'country', 80),
            phone: req.body?.phone === undefined ? existing.phone : requiredText(req.body.phone, 'phone', 40),
            email: req.body?.email === undefined ? existing.email : safeEmail(req.body.email),
        };
        const agent = await prisma.agent.update({ where: { id: existing.id }, data });

        res.json(agent);
    } catch (error) {
        return sendApiError(res, error, 'Failed to update agent');
    }
});

// POST /api/agents/:id/activate - Activate agent
router.post('/:id/activate', async (req: AuthRequest, res: Response) => {
    try {
        const existing = await prisma.agent.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
        if (!existing) return res.status(404).json({ error: 'Agent not found', code: 'NOT_FOUND' });
        const agent = await prisma.agent.update({ where: { id: existing.id }, data: { status: 'active' } });

        res.json(agent);
    } catch (error) {
        return sendApiError(res, error, 'Failed to activate agent');
    }
});

// POST /api/agents/:id/deactivate - Deactivate agent
router.post('/:id/deactivate', async (req: AuthRequest, res: Response) => {
    try {
        const existing = await prisma.agent.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
        if (!existing) return res.status(404).json({ error: 'Agent not found', code: 'NOT_FOUND' });
        const agent = await prisma.agent.update({ where: { id: existing.id }, data: { status: 'inactive' } });

        res.json(agent);
    } catch (error) {
        return sendApiError(res, error, 'Failed to deactivate agent');
    }
});

// GET /api/agents/:id/transactions - Agent transactions
router.get('/:id/transactions', async (req: AuthRequest, res: Response) => {
    try {
        const agent = await prisma.agent.findFirst({ where: { id: req.params.id, companyId: req.companyId }, select: { id: true } });
        if (!agent) return res.status(404).json({ error: 'Agent not found', code: 'NOT_FOUND' });
        const transactions = await prisma.agentTransaction.findMany({
            where: { agentId: req.params.id },
            take: parseBoundedLimit(req.query.limit, 50, 100),
            orderBy: { createdAt: 'desc' }
        });

        res.json(transactions);
    } catch (error) {
        return sendApiError(res, error, 'Failed to fetch agent transactions');
    }
});

export default router;
