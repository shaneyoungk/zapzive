import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth.middleware';
import { ApiError, audit, executeIdempotent, optionalText, parseBoundedLimit, parsePositiveAmount, requiredText, safeEmail, sandboxReference, sendApiError } from '../lib/security';

const router = Router();

// Apply auth middleware to all payroll routes
router.use(authMiddleware as any);

// GET /api/payroll/batches - List payroll batches
router.get('/batches', async (req: AuthRequest, res: Response) => {
    try {
        const status = req.query.status as string;
        const limit = parseBoundedLimit(req.query.limit, 50, 100);
        if (status && !['draft', 'pending', 'approved', 'processing', 'completed'].includes(status)) {
            throw new ApiError(422, 'INVALID_BATCH_STATUS', 'Unsupported payroll batch status.');
        }
        const where: any = { companyId: req.companyId };
        if (status) where.status = status;

        const batches = await prisma.payrollBatch.findMany({
            where,
            include: {
                payments: {
                    include: { worker: true }
                }
            },
            take: limit,
            orderBy: { createdDate: 'desc' }
        });

        res.json(batches);
    } catch (error) {
        return sendApiError(res, error, 'Failed to fetch payroll batches');
    }
});

// POST /api/payroll/batches - Create payroll batch
router.post('/batches', async (req: AuthRequest, res: Response) => {
    try {
        const name = requiredText(req.body?.name, 'name', 160);
        const workerIds = req.body?.workerIds;
        const amounts = req.body?.amounts;
        if (!Array.isArray(workerIds) || workerIds.length === 0 || workerIds.length > 500 || !Array.isArray(amounts) || workerIds.length !== amounts.length) {
            throw new ApiError(422, 'INVALID_BATCH_RECIPIENTS', 'workerIds and amounts must be non-empty arrays of equal length.');
        }
        if (new Set(workerIds).size !== workerIds.length || workerIds.some((id: unknown) => typeof id !== 'string' || id.length > 80)) {
            throw new ApiError(422, 'INVALID_BATCH_RECIPIENTS', 'A worker may appear only once in a batch.');
        }
        const parsedAmounts = amounts.map((amount: unknown) => parsePositiveAmount(amount, 'amount'));
        const workers = await prisma.worker.findMany({
            where: { companyId: req.companyId, id: { in: workerIds } },
            select: { id: true, kycStatus: true },
        });
        if (workers.length !== workerIds.length) {
            throw new ApiError(422, 'INVALID_WORKER', 'Every worker must belong to this organization.');
        }
        if (workers.some((worker) => worker.kycStatus !== 'verified')) {
            throw new ApiError(409, 'WORKER_NOT_ELIGIBLE', 'Every worker must be verified before payroll submission.');
        }
        const totalAmount = parsedAmounts.reduce((sum: number, amount: number) => sum + amount, 0);
        const result = await executeIdempotent(req.companyId!, req, async () => {
            const createdBatch = await prisma.$transaction(async (tx) => {
                const batch = await tx.payrollBatch.create({
                    data: {
                        companyId: req.companyId!,
                        name,
                        workerCount: workerIds.length,
                        totalAmount,
                        status: 'draft',
                    },
                });
                const payments = await Promise.all(
                    workerIds.map((workerId: string, index: number) =>
                        tx.payrollPayment.create({
                            data: {
                                batchId: batch.id,
                                workerId,
                                amount: parsedAmounts[index],
                                currency: 'USDC',
                                status: 'pending',
                                chain: 'Sandbox',
                            },
                        })
                    )
                );
                return { ...batch, payments };
            });
            await audit(req.companyId!, 'payroll.batch_created', 'payroll_batch', {
                actorId: req.user?.id,
                entityId: createdBatch.id,
                requestId: res.locals.requestId,
                metadata: { workerCount: workerIds.length, totalAmount },
            });
            return { status: 201, body: createdBatch };
        });
        res.status(result.status).json(result.body);
    } catch (error) {
        return sendApiError(res, error, 'Failed to create payroll batch');
    }
});

// GET /api/payroll/batches/:id - Get batch details
router.get('/batches/:id', async (req: AuthRequest, res: Response) => {
    try {
        const batch = await prisma.payrollBatch.findFirst({
            where: { id: req.params.id, companyId: req.companyId },
            include: {
                payments: {
                    include: { worker: true }
                }
            }
        });

        if (!batch) {
            return res.status(404).json({ error: 'Batch not found' });
        }

        res.json(batch);
    } catch (error) {
        return sendApiError(res, error, 'Failed to fetch batch');
    }
});

// PUT /api/payroll/batches/:id - Update batch
router.put('/batches/:id', async (req: AuthRequest, res: Response) => {
    try {
        const existing = await prisma.payrollBatch.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
        if (!existing) return res.status(404).json({ error: 'Batch not found' });
        if (!['draft', 'pending'].includes(existing.status)) {
            throw new ApiError(409, 'INVALID_BATCH_STATE', 'Only a draft or pending batch can be edited.');
        }
        const data = {
            name: req.body?.name === undefined ? undefined : requiredText(req.body.name, 'name', 160),
        };
        const batch = await prisma.payrollBatch.update({
            where: { id: req.params.id },
            data,
            include: {
                payments: {
                    include: { worker: true }
                }
            }
        });

        res.json(batch);
    } catch (error) {
        return sendApiError(res, error, 'Failed to update batch');
    }
});

// POST /api/payroll/batches/:id/approve - Approve batch
router.post('/batches/:id/approve', requireRole('owner', 'admin', 'approver'), async (req: AuthRequest, res: Response) => {
    try {
        const existing = await prisma.payrollBatch.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
        if (!existing) return res.status(404).json({ error: 'Batch not found' });
        if (!['draft', 'pending'].includes(existing.status)) {
            throw new ApiError(409, 'INVALID_BATCH_STATE', 'Only a draft or pending batch can be approved.');
        }
        const batch = await prisma.payrollBatch.update({
            where: { id: req.params.id },
            data: { status: 'approved' }
        });

        res.json(batch);
    } catch (error) {
        return sendApiError(res, error, 'Failed to approve batch');
    }
});

// POST /api/payroll/batches/:id/execute - Execute batch
router.post('/batches/:id/execute', requireRole('owner', 'admin', 'approver'), async (req: AuthRequest, res: Response) => {
    try {
        const existing = await prisma.payrollBatch.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
        if (!existing) return res.status(404).json({ error: 'Batch not found' });
        if (existing.status !== 'approved') {
            throw new ApiError(409, 'INVALID_BATCH_STATE', 'Only an approved batch can be executed.');
        }
        const company = await prisma.company.findFirst({ where: { id: req.companyId }, select: { isTestMode: true } });
        if (!company?.isTestMode) {
            throw new ApiError(503, 'LIVE_PROVIDER_NOT_CONFIGURED', 'Live payroll execution is not enabled for this environment.');
        }
        const result = await executeIdempotent(req.companyId!, req, async () => {
            const completedBatch = await prisma.$transaction(async (tx) => {
                const claim = await tx.payrollBatch.updateMany({
                    where: { id: existing.id, companyId: req.companyId!, status: 'approved' },
                    data: { status: 'processing', scheduledDate: new Date() },
                });
                if (claim.count !== 1) {
                    throw new ApiError(409, 'INVALID_BATCH_STATE', 'This batch has already been executed or is no longer approved.');
                }
                const debit = await tx.asset.updateMany({
                    where: { companyId: req.companyId!, symbol: 'USDC', balance: { gte: existing.totalAmount } },
                    data: { balance: { decrement: existing.totalAmount }, usdValue: { decrement: existing.totalAmount } },
                });
                if (debit.count !== 1) {
                    throw new ApiError(409, 'INSUFFICIENT_BALANCE', 'The treasury does not have enough USDC for this payroll batch.');
                }

                const payments = await tx.payrollPayment.findMany({ where: { batchId: existing.id } });
                for (const payment of payments) {
                    await tx.payrollPayment.update({
                        where: { id: payment.id },
                        data: { status: 'completed', txHash: sandboxReference('pay') },
                    });
                    await tx.worker.update({
                        where: { id: payment.workerId },
                        data: { totalPaid: { increment: payment.amount }, lastPayment: new Date() },
                    });
                }
                await tx.transaction.create({
                    data: {
                        companyId: req.companyId!,
                        type: 'payroll',
                        description: 'Payroll batch ' + existing.name,
                        amount: existing.totalAmount,
                        currency: 'USDC',
                        isIncoming: false,
                        status: 'settled',
                        chain: 'Sandbox',
                        txHash: sandboxReference('payroll'),
                    },
                });
                await tx.payrollBatch.update({
                    where: { id: existing.id },
                    data: { status: 'completed', completedDate: new Date() },
                });
                return tx.payrollBatch.findFirst({
                    where: { id: existing.id, companyId: req.companyId },
                    include: { payments: { include: { worker: true } } },
                });
            });
            await audit(req.companyId!, 'payroll.batch_completed', 'payroll_batch', {
                actorId: req.user?.id,
                entityId: existing.id,
                requestId: res.locals.requestId,
                metadata: { amount: existing.totalAmount },
            });
            return { status: 200, body: completedBatch };
        });
        res.status(result.status).json(result.body);
    } catch (error) {
        return sendApiError(res, error, 'Failed to execute batch');
    }
});

// GET /api/payroll/workers - List workers
router.get('/workers', async (req: AuthRequest, res: Response) => {
    try {
        const search = req.query.search as string;
        const kycStatus = req.query.kycStatus as string;
        const limit = parseBoundedLimit(req.query.limit, 100, 200);
        if (kycStatus && !['verified', 'pending', 'failed'].includes(kycStatus)) {
            throw new ApiError(422, 'INVALID_KYC_STATUS', 'Unsupported worker KYC status.');
        }

        const where: any = { companyId: req.companyId };
        if (search) {
            where.OR = [
                { name: { contains: search } },
                { email: { contains: search } },
                { country: { contains: search } }
            ];
        }
        if (kycStatus) where.kycStatus = kycStatus;

        const workers = await prisma.worker.findMany({
            where,
            take: limit,
            orderBy: { createdAt: 'desc' }
        });

        res.json(workers);
    } catch (error) {
        return sendApiError(res, error, 'Failed to fetch workers');
    }
});

// POST /api/payroll/workers - Add worker
router.post('/workers', async (req: AuthRequest, res: Response) => {
    try {
        const name = requiredText(req.body?.name, 'name', 160);
        const role = requiredText(req.body?.role, 'role', 120);
        const email = safeEmail(req.body?.email);
        const phone = requiredText(req.body?.phone, 'phone', 40);
        const country = requiredText(req.body?.country, 'country', 80);
        const wallet = requiredText(req.body?.wallet, 'wallet', 200);
        const bankAccount = optionalText(req.body?.bankAccount, 'bankAccount', 300);

        const worker = await prisma.worker.create({
            data: {
                companyId: req.companyId!,
                name,
                role,
                email,
                phone,
                country,
                wallet,
                bankAccount,
                kycStatus: 'pending',
                avatar: null
            }
        });

        res.status(201).json(worker);
    } catch (error) {
        return sendApiError(res, error, 'Failed to add worker');
    }
});

// PUT /api/payroll/workers/:id - Update worker
router.put('/workers/:id', async (req: AuthRequest, res: Response) => {
    try {
        const existing = await prisma.worker.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
        if (!existing) return res.status(404).json({ error: 'Worker not found' });
        const data = {
            name: req.body?.name === undefined ? undefined : requiredText(req.body.name, 'name', 160),
            role: req.body?.role === undefined ? undefined : requiredText(req.body.role, 'role', 120),
            email: req.body?.email === undefined ? undefined : safeEmail(req.body.email),
            phone: req.body?.phone === undefined ? undefined : requiredText(req.body.phone, 'phone', 40),
            country: req.body?.country === undefined ? undefined : requiredText(req.body.country, 'country', 80),
            wallet: req.body?.wallet === undefined ? undefined : requiredText(req.body.wallet, 'wallet', 200),
            bankAccount: req.body?.bankAccount === undefined ? undefined : optionalText(req.body.bankAccount, 'bankAccount', 300),
        };
        const worker = await prisma.worker.update({
            where: { id: req.params.id },
            data,
        });

        res.json(worker);
    } catch (error) {
        return sendApiError(res, error, 'Failed to update worker');
    }
});

// DELETE /api/payroll/workers/:id - Remove worker
router.delete('/workers/:id', async (req: AuthRequest, res: Response) => {
    try {
        const existing = await prisma.worker.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
        if (!existing) return res.status(404).json({ error: 'Worker not found' });
        const hasPayments = await prisma.payrollPayment.count({ where: { workerId: existing.id } });
        if (hasPayments > 0) {
            return res.status(409).json({ error: 'Referenced workers must be archived instead of deleted', code: 'WORKER_REFERENCED' });
        }
        await prisma.worker.delete({ where: { id: existing.id } });

        res.json({ message: 'Worker removed successfully' });
    } catch (error) {
        return sendApiError(res, error, 'Failed to remove worker');
    }
});

export default router;
