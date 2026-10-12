// Team members and roles. Invitations need email delivery, which the sandbox
// does not have, so the API exposes members and role changes only.

import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth.middleware';
import { ApiError, audit, sendApiError } from '../lib/security';

const router = Router();
router.use(authMiddleware as any);

export const ROLES = {
    owner: 'Manages the organization, team, policies, integrations and every payout operation.',
    admin: 'Same as owner except ownership transfer.',
    operator: 'Creates recipients and payout runs, resolves operational issues. Cannot approve.',
    approver: 'Reviews, approves or rejects payout runs and changed payout details.',
    developer: 'Manages API keys, webhooks and technical diagnostics.',
} as const;

router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const members = await prisma.user.findMany({ where: { companyId: req.companyId }, select: { id: true, name: true, email: true, role: true, status: true, lastLogin: true, createdAt: true }, orderBy: { createdAt: 'asc' } });
        res.json({ members, roles: ROLES, viewerId: req.user?.id, invitations: { available: false, reason: 'Email delivery is not configured in the sandbox, so teammates cannot be invited yet.' } });
    } catch (error) {
        sendApiError(res, error, 'Team could not be loaded');
    }
});

router.put('/:id/role', requireRole('owner'), async (req: AuthRequest, res: Response) => {
    try {
        const role = String(req.body?.role ?? '');
        if (!(role in ROLES)) throw new ApiError(422, 'INVALID_ROLE', 'Choose a supported role.');
        const member = await prisma.user.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
        if (!member) throw new ApiError(404, 'MEMBER_NOT_FOUND', 'Team member not found.');
        if (member.role === 'owner' && role !== 'owner') {
            const owners = await prisma.user.count({ where: { companyId: req.companyId, role: 'owner' } });
            if (owners <= 1) throw new ApiError(409, 'LAST_OWNER', 'A workspace needs at least one owner.');
        }
        const updated = await prisma.user.update({ where: { id: member.id }, data: { role, authVersion: { increment: 1 } }, select: { id: true, name: true, email: true, role: true, status: true } });
        await audit(req.companyId!, 'team.role_changed', 'user', { actorId: req.user?.id, entityId: member.id, requestId: res.locals?.requestId, metadata: { actorName: req.user?.name, member: member.name, before: member.role, after: role } });
        res.json(updated);
    } catch (error) {
        sendApiError(res, error, 'Role could not be changed');
    }
});

export default router;
