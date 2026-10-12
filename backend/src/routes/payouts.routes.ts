// Payout operations API: runs, payouts (movements), approvals, exceptions,
// reconciliation, reports, activity, policy, funding, and sandbox scenario.

import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth.middleware';
import { ApiError, executeIdempotent, optionalText, requiredText, sendApiError } from '../lib/security';
import { corridorCatalog, PAYOUT_METHODS, SANDBOX_RATES_PER_USD } from '../payouts/catalog';
import { CURRENCY_EXPONENT, parseMinor } from '../payouts/money';
import { SANDBOX_OUTCOME_RULES } from '../payouts/providers/sandbox';
import { type Actor, getPolicy, recordEvent } from '../payouts/core';
import * as runs from '../payouts/runs';
import * as movements from '../payouts/movements';
import * as queries from '../payouts/queries';
import { addSandboxFunds, hasSampleData, loadSampleScenario, removeSampleScenario } from '../payouts/sample';

const router = Router();
router.use(authMiddleware as any);

const PREPARE = ['owner', 'admin', 'operator', 'treasury'];
const APPROVE = ['owner', 'admin', 'approver'];
const ADMIN = ['owner', 'admin'];

function actorFrom(req: AuthRequest, res: Response): Actor {
    if (!req.user || !req.companyId) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in again.');
    return { id: req.user.id, name: req.user.name || req.user.email || 'Workspace member', role: req.user.role, companyId: req.companyId, requestId: res.locals?.requestId };
}

/** Wraps a write in idempotency handling and the standard error envelope. */
function mutation(handler: (actor: Actor, req: AuthRequest) => Promise<unknown>, status = 200) {
    return async (req: AuthRequest, res: Response) => {
        try {
            const actor = actorFrom(req, res);
            const result = await executeIdempotent(actor.companyId, req, async () => ({ status, body: (await handler(actor, req)) ?? { ok: true } }));
            res.status(result.status).json(result.body);
        } catch (error) {
            sendApiError(res, error, 'The request could not be completed');
        }
    };
}

function read(handler: (actor: Actor, req: AuthRequest) => Promise<unknown>) {
    return async (req: AuthRequest, res: Response) => {
        try { res.json(await handler(actorFrom(req, res), req)); } catch (error) { sendApiError(res, error, 'The request could not be completed'); }
    };
}

const parseDate = (value: unknown, field: string): Date | null | undefined => {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) throw new ApiError(422, 'INVALID_DATE', `${field} is not a valid date.`);
    return date;
};
const str = (value: unknown) => (typeof value === 'string' ? value : undefined);

// ---------------------------------------------------------------- configuration

router.get('/config', read(async () => ({
    methods: Object.entries(PAYOUT_METHODS).map(([id, item]) => ({ id, ...item })),
    corridors: corridorCatalog(),
    currencies: Object.keys(CURRENCY_EXPONENT).map((code) => ({ code, exponent: CURRENCY_EXPONENT[code] })),
    sandboxRatesPerUsd: SANDBOX_RATES_PER_USD,
    sandboxOutcomes: SANDBOX_OUTCOME_RULES,
    provider: { id: 'sandbox', name: 'Zapzive sandbox provider', live: false },
})));

// ---------------------------------------------------------------- home, activity, reports

router.get('/home', read((actor) => queries.home(actor.companyId, actor.id)));

router.get('/activity', read((actor, req) => queries.activity(actor.companyId, { entityType: str(req.query.entityType), cursor: str(req.query.cursor), limit: req.query.limit ? Number(req.query.limit) : undefined })));

function reportFilters(req: AuthRequest): queries.ReportFilters {
    return {
        from: parseDate(req.query.from, 'from') ?? undefined,
        to: parseDate(req.query.to, 'to') ?? undefined,
        country: str(req.query.country) || undefined,
        currency: str(req.query.currency) || undefined,
        method: str(req.query.method) || undefined,
        status: str(req.query.status) || undefined,
    };
}

router.get('/reports', read(async (actor, req) => {
    const result = await queries.reports(actor.companyId, reportFilters(req));
    return { ...result, rows: result.rows.slice(0, 200) };
}));

router.get('/reports/export', async (req: AuthRequest, res: Response) => {
    try {
        const actor = actorFrom(req, res);
        const result = await queries.reports(actor.companyId, reportFilters(req));
        const csv = queries.toCsv([
            ['Run', 'Internal reference', 'Provider reference', 'Recipient', 'Method', 'Country', 'Status', 'Amount', 'Currency', 'Fee', 'Funding cost', 'Funding currency', 'Submitted at', 'Delivered at', 'Failure reason'],
            ...result.rows.map((row) => [row.runReference, row.reference, row.providerReference, row.recipientName, row.payoutMethodLabel, row.country, row.state, (row.amountMinor / 10 ** (CURRENCY_EXPONENT[row.currency] ?? 2)).toFixed(CURRENCY_EXPONENT[row.currency] ?? 2), row.currency, row.feeMinor === null ? '' : (row.feeMinor / 100).toFixed(2), row.sourceAmountMinor === null ? '' : (row.sourceAmountMinor / 100).toFixed(2), row.sourceCurrency, row.submittedAt ? new Date(row.submittedAt).toISOString() : '', row.deliveredAt ? new Date(row.deliveredAt).toISOString() : '', row.failureReason]),
        ]);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="zapzive-payouts-report.csv"`);
        res.send(csv);
    } catch (error) {
        sendApiError(res, error, 'The report could not be exported');
    }
});

// ---------------------------------------------------------------- payout runs

router.get('/runs', read((actor, req) => queries.listRuns(actor.companyId, { status: str(req.query.status) })));
router.get('/runs/:id', read((actor, req) => queries.getRun(actor.companyId, req.params.id, actor.id)));

router.post('/runs', requireRole(...PREPARE), mutation(async (actor, req) => runs.createRun(actor, {
    name: requiredText(req.body?.name, 'name', 120),
    purpose: optionalText(req.body?.purpose, 'purpose', 200),
    scheduledFor: parseDate(req.body?.scheduledFor, 'scheduledFor'),
    fundingCurrency: req.body?.fundingCurrency === undefined ? 'USD' : (['USD'].includes(req.body.fundingCurrency) ? req.body.fundingCurrency : (() => { throw new ApiError(422, 'UNSUPPORTED_FUNDING_CURRENCY', 'Sandbox funding is held in USD.'); })()),
}), 201));

router.patch('/runs/:id', requireRole(...PREPARE), mutation((actor, req) => runs.updateRun(actor, req.params.id, {
    name: optionalText(req.body?.name, 'name', 120), purpose: optionalText(req.body?.purpose, 'purpose', 200), scheduledFor: parseDate(req.body?.scheduledFor, 'scheduledFor'),
})));

router.post('/runs/:id/items', requireRole(...PREPARE), mutation((actor, req) => {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    return runs.addItems(actor, req.params.id, items.map((item: Record<string, unknown>) => ({
        recipientId: requiredText(item?.recipientId, 'recipientId', 64), amount: String(item?.amount ?? ''), currency: str(item?.currency), externalReference: optionalText(item?.externalReference, 'externalReference', 80),
    })));
}));

router.post('/runs/:id/items/import', requireRole(...PREPARE), mutation((actor, req) => {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    return runs.importItems(actor, req.params.id, rows.map((row: Record<string, unknown>) => ({
        name: str(row?.name)?.slice(0, 120), email: str(row?.email)?.slice(0, 320), amount: str(row?.amount)?.slice(0, 40), currency: str(row?.currency)?.slice(0, 8), reference: str(row?.reference)?.slice(0, 80),
    })));
}));

router.patch('/runs/:id/items/:movementId', requireRole(...PREPARE), mutation((actor, req) => runs.updateItem(actor, req.params.id, req.params.movementId, {
    amount: req.body?.amount === undefined ? undefined : String(req.body.amount), currency: str(req.body?.currency), recipientId: str(req.body?.recipientId),
    externalReference: req.body?.externalReference === undefined ? undefined : (str(req.body.externalReference) ?? null),
})));
router.delete('/runs/:id/items/:movementId', requireRole(...PREPARE), mutation((actor, req) => runs.removeItem(actor, req.params.id, req.params.movementId)));
router.post('/runs/:id/items/:movementId/acknowledge', requireRole(...PREPARE), mutation((actor, req) => runs.acknowledgeIssues(actor, req.params.id, req.params.movementId, Array.isArray(req.body?.codes) ? req.body.codes.filter((code: unknown): code is string => typeof code === 'string').slice(0, 20) : [])));

router.post('/runs/:id/submit', requireRole(...PREPARE), mutation((actor, req) => runs.submitRun(actor, req.params.id)));
router.post('/runs/:id/approve', requireRole(...APPROVE), mutation((actor, req) => runs.approveRun(actor, req.params.id, optionalText(req.body?.comment, 'comment', 500))));
router.post('/runs/:id/reject', requireRole(...APPROVE), mutation((actor, req) => runs.rejectRun(actor, req.params.id, requiredText(req.body?.comment, 'comment', 500))));
router.post('/runs/:id/execute', requireRole(...PREPARE, 'approver'), mutation((actor, req) => runs.executeRun(actor, req.params.id)));
router.post('/runs/:id/cancel', requireRole(...PREPARE), mutation((actor, req) => runs.cancelRun(actor, req.params.id, optionalText(req.body?.reason, 'reason', 300))));
router.post('/runs/:id/reconcile', requireRole(...PREPARE, 'approver'), mutation((actor, req) => runs.reconcileRun(actor, req.params.id, optionalText(req.body?.note, 'note', 500))));

router.get('/runs/:id/export', async (req: AuthRequest, res: Response) => {
    try {
        const actor = actorFrom(req, res);
        const format = (['ledger', 'journal', 'receipt'].includes(String(req.query.format)) ? req.query.format : 'ledger') as 'ledger' | 'journal' | 'receipt';
        const csv = await queries.runExport(actor.companyId, req.params.id, format);
        const run = await prisma.payoutRun.findFirst({ where: { id: req.params.id, companyId: actor.companyId }, select: { reference: true } });
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${run?.reference ?? 'payout-run'}-${format}.csv"`);
        res.send(csv);
    } catch (error) {
        sendApiError(res, error, 'The export could not be created');
    }
});

// ---------------------------------------------------------------- individual payouts

router.get('/movements', read((actor, req) => queries.listMovements(actor.companyId, {
    state: str(req.query.state)?.split(',').filter(Boolean), runId: str(req.query.runId), recipientId: str(req.query.recipientId), q: str(req.query.q)?.slice(0, 80), limit: req.query.limit ? Number(req.query.limit) : undefined,
})));
router.get('/movements/:id', read((actor, req) => queries.getMovement(actor.companyId, req.params.id)));
router.post('/movements/:id/retry', requireRole(...PREPARE, 'approver'), mutation((actor, req) => movements.retryMovement(actor, req.params.id)));
router.post('/movements/:id/cancel', requireRole(...PREPARE), mutation((actor, req) => movements.cancelMovement(actor, req.params.id, optionalText(req.body?.reason, 'reason', 300))));
router.post('/movements/:id/release', requireRole(...APPROVE), mutation((actor, req) => movements.releaseHold(actor, req.params.id, optionalText(req.body?.comment, 'comment', 500))));

// ---------------------------------------------------------------- approvals, exceptions, reconciliation

router.get('/approvals', read((actor) => queries.approvalsQueue(actor.companyId, actor.id)));
router.get('/exceptions', read((actor) => queries.exceptions(actor.companyId)));
router.get('/reconciliation', read((actor) => queries.reconciliationList(actor.companyId)));

// ---------------------------------------------------------------- policy

router.get('/policy', read((actor) => getPolicy(prisma, actor.companyId)));

router.put('/policy', requireRole(...ADMIN), mutation(async (actor, req) => {
    const currency = typeof req.body?.currency === 'string' && req.body.currency in CURRENCY_EXPONENT ? req.body.currency : 'KES';
    const single = parseMinor(String(req.body?.singleApprovalAbove ?? ''), currency, 'One-approver threshold');
    const dual = parseMinor(String(req.body?.dualApprovalAbove ?? ''), currency, 'Two-approver threshold');
    if (dual <= single) throw new ApiError(422, 'INVALID_THRESHOLDS', 'The two-approver threshold must be higher than the one-approver threshold.');
    const data = {
        currency, singleApprovalAboveMinor: single, dualApprovalAboveMinor: dual,
        newRecipientRequiresApproval: req.body?.newRecipientRequiresApproval !== false,
        changedDetailsRequiresApproval: req.body?.changedDetailsRequiresApproval !== false,
        allowSelfApproval: req.body?.allowSelfApproval === true,
        updatedById: actor.id,
    };
    return prisma.$transaction(async (tx) => {
        const before = await tx.approvalPolicy.findUnique({ where: { companyId: actor.companyId } });
        const policy = await tx.approvalPolicy.upsert({ where: { companyId: actor.companyId }, create: { companyId: actor.companyId, ...data }, update: data });
        await recordEvent(tx, actor, actor.companyId, 'approval_policy.updated', 'approval_policy', policy.id, {
            before: before ? { single: before.singleApprovalAboveMinor, dual: before.dualApprovalAboveMinor, selfApproval: before.allowSelfApproval } : null,
            after: { single, dual, currency, selfApproval: data.allowSelfApproval, newRecipient: data.newRecipientRequiresApproval, changedDetails: data.changedDetailsRequiresApproval },
        });
        return policy;
    });
}));

// ---------------------------------------------------------------- funding & sandbox

router.get('/funding', read((actor) => queries.fundingSummary(actor.companyId)));
router.post('/funding/sandbox', requireRole(...ADMIN, 'treasury'), mutation((actor, req) => addSandboxFunds(actor, String(req.body?.amount ?? ''))));

router.get('/sandbox/sample', read(async (actor) => ({ loaded: await hasSampleData(actor.companyId) })));
router.post('/sandbox/sample', requireRole(...ADMIN), mutation(async (actor) => { await loadSampleScenario(actor); return { loaded: true }; }, 201));
router.delete('/sandbox/sample', requireRole(...ADMIN), mutation(async (actor) => { await removeSampleScenario(actor); return { loaded: false }; }));

export default router;
