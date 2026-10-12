// Recipients API. Storage is the Worker table; the product calls them recipients.

import { Router, Response } from 'express';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth.middleware';
import { ApiError, executeIdempotent, sendApiError } from '../lib/security';
import * as queries from '../payouts/queries';
import { createRecipient, setRecipientStatus, updateRecipient, verifyRecipient, type RecipientInput } from '../payouts/recipients';
import type { Actor } from '../payouts/core';

const router = Router();
router.use(authMiddleware as any);

const MANAGE = ['owner', 'admin', 'operator', 'treasury'];

function actorFrom(req: AuthRequest, res: Response): Actor {
    if (!req.user || !req.companyId) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in again.');
    return { id: req.user.id, name: req.user.name || req.user.email || 'Workspace member', role: req.user.role, companyId: req.companyId, requestId: res.locals?.requestId };
}

function input(body: Record<string, unknown> | undefined): RecipientInput {
    const text = (key: string) => (typeof body?.[key] === 'string' ? (body[key] as string) : undefined);
    return { name: text('name'), email: text('email'), phone: text('phone'), type: text('type'), title: text('title'), country: text('country'), payoutMethod: text('payoutMethod'), payoutCurrency: text('payoutCurrency'), payoutDetails: body?.payoutDetails };
}

function mutation(handler: (actor: Actor, req: AuthRequest) => Promise<unknown>, status = 200) {
    return async (req: AuthRequest, res: Response) => {
        try {
            const actor = actorFrom(req, res);
            const result = await executeIdempotent(actor.companyId, req, async () => ({ status, body: await handler(actor, req) }));
            res.status(result.status).json(result.body);
        } catch (error) {
            sendApiError(res, error, 'The recipient could not be saved');
        }
    };
}

router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const actor = actorFrom(req, res);
        res.json(await queries.listRecipients(actor.companyId, { q: typeof req.query.q === 'string' ? req.query.q.slice(0, 80) : undefined, status: typeof req.query.status === 'string' ? req.query.status : undefined }));
    } catch (error) { sendApiError(res, error, 'Recipients could not be loaded'); }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
    try { res.json(await queries.getRecipient(actorFrom(req, res).companyId, req.params.id)); } catch (error) { sendApiError(res, error, 'Recipient could not be loaded'); }
});

router.post('/', requireRole(...MANAGE), mutation((actor, req) => createRecipient(actor, input(req.body)), 201));
router.put('/:id', requireRole(...MANAGE), mutation((actor, req) => updateRecipient(actor, req.params.id, input(req.body))));
router.post('/:id/archive', requireRole(...MANAGE), mutation((actor, req) => setRecipientStatus(actor, req.params.id, 'archived')));
router.post('/:id/restore', requireRole(...MANAGE), mutation((actor, req) => setRecipientStatus(actor, req.params.id, 'active')));
router.post('/:id/verify', requireRole(...MANAGE), mutation((actor, req) => verifyRecipient(actor, req.params.id)));

export default router;
