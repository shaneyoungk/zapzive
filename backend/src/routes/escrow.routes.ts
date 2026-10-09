import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth.middleware';
import { ApiError, audit, executeIdempotent, optionalText, parseBoundedLimit, parsePositiveAmount, requiredText, safeEmail, sandboxReference, sendApiError } from '../lib/security';

const router = Router();

// --- PUBLIC ROUTES (No Auth Required) ---

// GET /api/escrow/public/:id - Get public contract details
router.get('/public/:id', async (req: Request, res: Response) => {
    try {
        const contract = await prisma.contract.findFirst({
            where: { id: req.params.id, isPublic: true },
            select: {
                id: true,
                title: true,
                description: true,
                client: true,
                contractor: true,
                totalAmount: true,
                lockedAmount: true,
                releasedAmount: true,
                status: true,
                startDate: true,
                endDate: true,
                chain: true,
                milestones: {
                    select: { id: true, title: true, description: true, amount: true, status: true, dueDate: true },
                    orderBy: { dueDate: 'asc' },
                },
                company: { select: { name: true, country: true } },
            },
        });
        if (!contract) return res.status(404).json({ error: 'Contract not found or not public', code: 'NOT_FOUND' });
        res.json(contract);
    } catch (error) {
        return sendApiError(res, error, 'Failed to fetch public contract');
    }
});

// POST /api/escrow/public/:id/bid - Submit a bid
router.post('/public/:id/bid', async (req: Request, res: Response) => {
    try {
        const contractorName = requiredText(req.body?.contractorName, 'contractorName', 120);
        const contractorEmail = safeEmail(req.body?.contractorEmail);
        const proposal = requiredText(req.body?.proposal, 'proposal', 5000);
        const bidAmount = parsePositiveAmount(req.body?.amount, 'amount');
        const publicContract = await prisma.contract.findFirst({
            where: { id: req.params.id, isPublic: true, status: 'draft' },
            select: { id: true },
        });
        if (!publicContract) return res.status(404).json({ error: 'Contract not found or no longer accepting bids', code: 'NOT_FOUND' });

        const bid = await prisma.contractBid.create({
            data: {
                contractId: publicContract.id,
                contractorName,
                contractorEmail,
                proposal,
                amount: bidAmount,
                status: 'pending'
            }
        });

        res.status(201).json(bid);
    } catch (error) {
        return sendApiError(res, error, 'Failed to submit bid');
    }
});

// --- PROTECTED ROUTES ---

// Apply auth middleware to all remaining routes
router.use(authMiddleware as any);

// GET /api/escrow/contracts - List contracts
router.get('/contracts', async (req: AuthRequest, res: Response) => {
    try {
        const status = req.query.status as string;
        const limit = parseBoundedLimit(req.query.limit, 50, 100);
        if (status && !['draft', 'active', 'funded', 'completed', 'disputed', 'cancelled'].includes(status)) {
            throw new ApiError(422, 'INVALID_CONTRACT_STATUS', 'Unsupported contract status.');
        }
        const where: any = { companyId: req.companyId };
        if (status) where.status = status;

        const contracts = await prisma.contract.findMany({
            where,
            include: {
                milestones: true,
                _count: {
                    select: { bids: true }
                }
            },
            take: limit,
            orderBy: { createdAt: 'desc' }
        });

        res.json(contracts);
    } catch (error) {
        return sendApiError(res, error, 'Failed to fetch contracts');
    }
});

// GET /api/escrow/contracts/:id - Get single contract with bids
router.get('/contracts/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const contract = await prisma.contract.findFirst({
            where: {
                id: req.params.id,
                companyId: req.companyId
            },
            include: {
                milestones: true,
                bids: {
                    orderBy: { createdAt: 'desc' }
                },
                company: {
                    select: { name: true, country: true }
                }
            }
        });

        if (!contract) {
            return res.status(404).json({ error: 'Contract not found' });
        }

        res.json(contract);
    } catch (error) {
        return sendApiError(res, error, 'Failed to fetch contract');
    }
});

// PUT /api/escrow/contracts/:id/bids/:bidId/accept - Accept a bid
router.put('/contracts/:id/bids/:bidId/accept', requireRole('owner', 'admin', 'approver'), async (req: AuthRequest, res: Response) => {
    try {
        // Verify contract ownership
        const contract = await prisma.contract.findFirst({
            where: {
                id: req.params.id,
                companyId: req.companyId
            }
        });

        if (!contract) {
            return res.status(404).json({ error: 'Contract not found' });
        }

        // Get the bid
        const bid = await prisma.contractBid.findFirst({
            where: {
                id: req.params.bidId,
                contractId: req.params.id
            }
        });

        if (!bid) {
            return res.status(404).json({ error: 'Bid not found' });
        }

        if (contract.status !== 'draft' || bid.status !== 'pending') {
            throw new ApiError(409, 'INVALID_BID_STATE', 'Only a pending bid on a draft contract can be accepted.');
        }
        const result = await executeIdempotent(req.companyId!, req, async () => {
            const accepted = await prisma.$transaction(async (tx) => {
                const debit = await tx.asset.updateMany({
                    where: { companyId: req.companyId!, symbol: 'USDC', balance: { gte: bid.amount } },
                    data: { balance: { decrement: bid.amount }, usdValue: { decrement: bid.amount } },
                });
                if (debit.count !== 1) {
                    throw new ApiError(409, 'INSUFFICIENT_BALANCE', 'The treasury does not have enough USDC to fund this contract.');
                }
                await tx.contractBid.update({ where: { id: bid.id }, data: { status: 'accepted' } });
                await tx.contractBid.updateMany({
                    where: { contractId: contract.id, id: { not: bid.id }, status: 'pending' },
                    data: { status: 'rejected' },
                });
                const fundedContract = await tx.contract.update({
                    where: { id: contract.id },
                    data: {
                        contractor: bid.contractorName,
                        status: 'active',
                        totalAmount: bid.amount,
                        lockedAmount: bid.amount,
                        isPublic: false,
                    },
                    include: { milestones: true },
                });
                await tx.transaction.create({
                    data: {
                        companyId: req.companyId!,
                        type: 'escrow',
                        description: 'Escrow funded: ' + contract.title,
                        amount: bid.amount,
                        currency: 'USDC',
                        isIncoming: false,
                        status: 'settled',
                        chain: 'Sandbox',
                        txHash: sandboxReference('escrow-fund'),
                    },
                });
                return fundedContract;
            });
            await audit(req.companyId!, 'escrow.bid_accepted', 'contract', {
                actorId: req.user?.id,
                entityId: contract.id,
                requestId: res.locals.requestId,
                metadata: { bidId: bid.id, amount: bid.amount },
            });
            return { status: 200, body: accepted };
        });
        res.status(result.status).json(result.body);
    } catch (error) {
        return sendApiError(res, error, 'Failed to accept bid');
    }
});

// PUT /api/escrow/contracts/:id/bids/:bidId/reject - Reject a bid
router.put('/contracts/:id/bids/:bidId/reject', requireRole('owner', 'admin', 'approver'), async (req: AuthRequest, res: Response) => {
    try {
        // Verify contract ownership
        const contract = await prisma.contract.findFirst({
            where: {
                id: req.params.id,
                companyId: req.companyId
            }
        });

        if (!contract) {
            return res.status(404).json({ error: 'Contract not found' });
        }

        // Update bid status to rejected
        const bid = await prisma.contractBid.updateMany({
            where: {
                id: req.params.bidId,
                contractId: req.params.id
            },
            data: { status: 'rejected' }
        });

        if (bid.count === 0) {
            return res.status(404).json({ error: 'Bid not found' });
        }

        res.json({ message: 'Bid rejected successfully' });
    } catch (error) {
        return sendApiError(res, error, 'Failed to reject bid');
    }
});

// POST /api/escrow/contracts - Create contract
router.post('/contracts', requireRole('owner', 'admin', 'operator'), async (req: AuthRequest, res: Response) => {
    try {
        const {
            title,
            description,
            client,
            contractor,
            totalAmount,
            startDate,
            endDate,
            milestones,
            isPublic
        } = req.body;
        const normalizedTitle = requiredText(title, 'title', 160);
        const normalizedDescription = optionalText(description, 'description', 5000);
        const normalizedClient = requiredText(client, 'client', 160);
        const normalizedContractor = requiredText(contractor, 'contractor', 160);
        const parsedTotalAmount = parsePositiveAmount(totalAmount, 'totalAmount');
        const normalizedStartDate = new Date(String(startDate));
        const normalizedEndDate = new Date(String(endDate));
        if (Number.isNaN(normalizedStartDate.getTime()) || Number.isNaN(normalizedEndDate.getTime()) || normalizedEndDate < normalizedStartDate) {
            throw new ApiError(422, 'INVALID_CONTRACT_DATES', 'Contract dates must be valid and the end date must follow the start date.');
        }
        if (!Array.isArray(milestones) || milestones.length === 0 || milestones.length > 50) {
            throw new ApiError(422, 'INVALID_MILESTONES', 'Provide between 1 and 50 milestones.');
        }
        const normalizedMilestones = milestones.map((milestone: unknown) => {
            const item = milestone as Record<string, unknown>;
            return {
                title: requiredText(item.title, 'milestone.title', 160),
                description: requiredText(item.description, 'milestone.description', 1000),
                amount: parsePositiveAmount(item.amount, 'milestone.amount'),
                dueDate: new Date(String(item.dueDate)),
            };
        });
        if (normalizedMilestones.some((milestone) => Number.isNaN(milestone.dueDate.getTime()))) {
            throw new ApiError(422, 'INVALID_MILESTONE_DATE', 'Every milestone must have a valid due date.');
        }
        const milestoneTotal = normalizedMilestones.reduce((sum, milestone) => sum + milestone.amount, 0);
        if (Math.abs(milestoneTotal - parsedTotalAmount) > 0.000001) {
            throw new ApiError(422, 'MILESTONE_TOTAL_MISMATCH', 'Milestone amounts must equal the contract total.');
        }

        const result = await executeIdempotent(req.companyId!, req, async () => {
            const contract = await prisma.contract.create({
            data: {
                companyId: req.companyId!,
                title: normalizedTitle,
                description: normalizedDescription,
                client: normalizedClient,
                contractor: normalizedContractor,
                totalAmount: parsedTotalAmount,
                lockedAmount: 0,
                releasedAmount: 0,
                status: 'draft',
                isPublic: isPublic === true,
                startDate: normalizedStartDate,
                endDate: normalizedEndDate,
                chain: 'Sandbox',
                contractAddress: null,
                 milestones: {
                     create: normalizedMilestones.map((milestone) => ({
                         title: milestone.title,
                         description: milestone.description,
                         amount: milestone.amount,
                         status: 'pending',
                         dueDate: milestone.dueDate
                    }))
                }
            },
            include: {
                milestones: true
            }
            });
            await audit(req.companyId!, 'escrow.contract_created', 'contract', {
                actorId: req.user?.id,
                entityId: contract.id,
                requestId: res.locals.requestId,
            });
            return { status: 201, body: contract };
        });

        res.status(result.status).json(result.body);
    } catch (error) {
        return sendApiError(res, error, 'Failed to create contract');
    }
});

// PUT /api/escrow/contracts/:id - Update contract
router.put('/contracts/:id', async (req: AuthRequest, res: Response) => {
    try {
        const existing = await prisma.contract.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
        if (!existing) return res.status(404).json({ error: 'Contract not found' });
        const data = {
            title: req.body?.title === undefined ? undefined : requiredText(req.body.title, 'title', 160),
            description: req.body?.description === undefined ? undefined : requiredText(req.body.description, 'description', 5000),
            client: req.body?.client === undefined ? undefined : requiredText(req.body.client, 'client', 160),
            contractor: req.body?.contractor === undefined ? undefined : requiredText(req.body.contractor, 'contractor', 160),
            startDate: req.body?.startDate === undefined ? undefined : new Date(String(req.body.startDate)),
            endDate: req.body?.endDate === undefined ? undefined : new Date(String(req.body.endDate)),
            isPublic: req.body?.isPublic === undefined ? undefined : req.body.isPublic === true,
        };
        const contract = await prisma.contract.update({
            where: { id: req.params.id },
            data,
            include: {
                milestones: true
            }
        });

        res.json(contract);
    } catch (error) {
        return sendApiError(res, error, 'Failed to update contract');
    }
});

// POST /api/escrow/contracts/:id/milestones - Add milestone
router.post('/contracts/:id/milestones', requireRole('owner', 'admin', 'operator'), async (req: AuthRequest, res: Response) => {
    try {
        const title = requiredText(req.body?.title, 'title', 160);
        const description = requiredText(req.body?.description, 'description', 1000);
        const parsedAmount = parsePositiveAmount(req.body?.amount, 'amount');
        const normalizedDueDate = new Date(String(req.body?.dueDate));
        if (Number.isNaN(normalizedDueDate.getTime())) throw new ApiError(422, 'INVALID_MILESTONE_DATE', 'dueDate must be a valid date.');
        const contract = await prisma.contract.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
        if (!contract) return res.status(404).json({ error: 'Contract not found' });
        if (contract.status !== 'draft') throw new ApiError(409, 'INVALID_CONTRACT_STATE', 'Milestones can only be added while the contract is a draft.');

        const milestone = await prisma.milestone.create({
            data: {
                contractId: req.params.id,
                title,
                description,
                amount: parsedAmount,
                status: 'pending',
                dueDate: normalizedDueDate
            }
        });

        res.status(201).json(milestone);
    } catch (error) {
        return sendApiError(res, error, 'Failed to add milestone');
    }
});

// PUT /api/escrow/contracts/:contractId/milestones/:milestoneId - Update milestone
router.put('/contracts/:contractId/milestones/:milestoneId', requireRole('owner', 'admin', 'operator'), async (req: AuthRequest, res: Response) => {
    try {
        const contract = await prisma.contract.findFirst({ where: { id: req.params.contractId, companyId: req.companyId } });
        if (!contract) return res.status(404).json({ error: 'Contract not found' });
        const existingMilestone = await prisma.milestone.findFirst({ where: { id: req.params.milestoneId, contractId: contract.id } });
        if (!existingMilestone) return res.status(404).json({ error: 'Milestone not found' });
        const data = {
            title: req.body?.title === undefined ? undefined : requiredText(req.body.title, 'title', 160),
            description: req.body?.description === undefined ? undefined : requiredText(req.body.description, 'description', 1000),
            amount: req.body?.amount === undefined ? undefined : parsePositiveAmount(req.body.amount, 'amount'),
            dueDate: req.body?.dueDate === undefined ? undefined : new Date(String(req.body.dueDate)),
            status: req.body?.status === undefined ? undefined : requiredText(req.body.status, 'status', 30),
        };
        if (data.status !== undefined && !['pending', 'in-progress', 'completed', 'disputed'].includes(data.status)) {
            throw new ApiError(422, 'INVALID_MILESTONE_STATUS', 'Unsupported milestone status.');
        }
        const milestone = await prisma.milestone.update({
            where: { id: req.params.milestoneId },
            data
        });

        res.json(milestone);
    } catch (error) {
        return sendApiError(res, error, 'Failed to update milestone');
    }
});

// POST /api/escrow/contracts/:contractId/release - Release funds
router.post('/contracts/:contractId/release', requireRole('owner', 'admin', 'approver'), async (req: AuthRequest, res: Response) => {
    try {
        const { milestoneId, amount } = req.body;
        const parsedAmount = parsePositiveAmount(amount, 'amount');
        const contractForRelease = await prisma.contract.findFirst({
            where: { id: req.params.contractId, companyId: req.companyId },
        });
        if (!contractForRelease) return res.status(404).json({ error: 'Contract not found', code: 'NOT_FOUND' });
        if (!['active', 'funded'].includes(contractForRelease.status)) {
            throw new ApiError(409, 'INVALID_CONTRACT_STATE', 'This contract is not ready for release.');
        }
        if (contractForRelease.lockedAmount < parsedAmount) {
            throw new ApiError(409, 'INSUFFICIENT_LOCKED_FUNDS', 'The release exceeds the locked balance.');
        }
        const milestoneForRelease = await prisma.milestone.findFirst({
            where: { id: milestoneId, contractId: contractForRelease.id },
        });
        if (!milestoneForRelease) return res.status(404).json({ error: 'Milestone not found', code: 'NOT_FOUND' });
        if (['released', 'disputed'].includes(milestoneForRelease.status)) {
            throw new ApiError(409, 'INVALID_MILESTONE_STATE', 'This milestone cannot be released in its current state.');
        }
        if (Math.abs(milestoneForRelease.amount - parsedAmount) > 0.000001) {
            throw new ApiError(409, 'MILESTONE_AMOUNT_MISMATCH', 'The release amount must equal the milestone amount.');
        }

        const result = await executeIdempotent(req.companyId!, req, async () => {
            const updatedContract = await prisma.$transaction(async (tx) => {
                const updatedMilestone = await tx.milestone.updateMany({
                    where: {
                        id: milestoneForRelease.id,
                        contractId: contractForRelease.id,
                        status: { notIn: ['released', 'disputed'] },
                    },
                    data: { status: 'released', completedDate: new Date() },
                });
                if (updatedMilestone.count !== 1) {
                    throw new ApiError(409, 'INVALID_MILESTONE_STATE', 'This milestone has already been released or disputed.');
                }
                const updated = await tx.contract.updateMany({
                    where: {
                        id: contractForRelease.id,
                        companyId: req.companyId!,
                        lockedAmount: { gte: parsedAmount },
                    },
                    data: {
                        lockedAmount: { decrement: parsedAmount },
                        releasedAmount: { increment: parsedAmount },
                    },
                });
                if (updated.count !== 1) {
                    throw new ApiError(409, 'INSUFFICIENT_LOCKED_FUNDS', 'The release exceeds the locked balance.');
                }
                await tx.transaction.create({
                    data: {
                        companyId: req.companyId!,
                        type: 'escrow',
                        description: 'Escrow release: ' + contractForRelease.title,
                        amount: parsedAmount,
                        currency: 'USDC',
                        isIncoming: false,
                        status: 'settled',
                        chain: 'Sandbox',
                        txHash: sandboxReference('escrow'),
                    },
                });
                return tx.contract.findFirst({
                    where: { id: contractForRelease.id, companyId: req.companyId },
                    include: { milestones: true },
                });
            });
            await audit(req.companyId!, 'escrow.milestone_released', 'contract', {
                actorId: req.user?.id,
                entityId: contractForRelease.id,
                requestId: res.locals.requestId,
                metadata: { milestoneId, amount: parsedAmount },
            });
            return { status: 200, body: updatedContract };
        });
        res.status(result.status).json(result.body);
    } catch (error) {
        return sendApiError(res, error, 'Failed to release funds');
    }
});

// POST /api/escrow/contracts/:id/dispute - Raise dispute
router.post('/contracts/:id/dispute', requireRole('owner', 'admin', 'approver'), async (req: AuthRequest, res: Response) => {
    try {
        const reason = requiredText(req.body?.reason, 'reason', 2000);
        const existing = await prisma.contract.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
        if (!existing) return res.status(404).json({ error: 'Contract not found' });
        if (!['active', 'funded'].includes(existing.status)) {
            throw new ApiError(409, 'INVALID_CONTRACT_STATE', 'Only an active or funded contract can be disputed.');
        }

        const result = await executeIdempotent(req.companyId!, req, async () => {
            const contract = await prisma.$transaction(async (tx) => {
                const changed = await tx.contract.updateMany({
                    where: { id: existing.id, companyId: req.companyId!, status: { in: ['active', 'funded'] } },
                    data: { status: 'disputed' },
                });
                if (changed.count !== 1) {
                    throw new ApiError(409, 'INVALID_CONTRACT_STATE', 'This contract is no longer available for dispute.');
                }
                return tx.contract.findFirst({
                    where: { id: existing.id, companyId: req.companyId! },
                    include: { milestones: true },
                });
            });
            await audit(req.companyId!, 'escrow.contract_disputed', 'contract', {
                actorId: req.user?.id,
                entityId: existing.id,
                requestId: res.locals.requestId,
                metadata: { reason },
            });
            return { status: 200, body: contract };
        });
        res.status(result.status).json(result.body);
    } catch (error) {
        return sendApiError(res, error, 'Failed to raise dispute');
    }
});

export default router;
