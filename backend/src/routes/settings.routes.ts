import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import crypto from 'crypto';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth.middleware';
import { ApiError, requiredText, safeEmail, sendApiError } from '../lib/security';
import { assertAnyRailReady, assertRailsReady } from '../crypto/config';

const router = Router();

function encryptWebhookSecret(secret: string): string {
    const secretKey = process.env.JWT_SECRET;
    if (!secretKey || secretKey.length < 32) throw new Error('JWT_SECRET is required to protect webhook secrets');
    const key = crypto.createHash('sha256').update(secretKey).digest();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return ['enc:v1', iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join(':');
}

// Apply auth middleware to all settings routes
router.use(authMiddleware as any);

// GET /api/settings/profile - Get company profile
router.get('/profile', async (req: AuthRequest, res: Response) => {
    try {
        const company = await prisma.company.findUnique({
            where: { id: req.companyId }
        });

        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }

        res.json(company);
    } catch (error) {
        return sendApiError(res, error, 'Failed to fetch profile');
    }
});

// PUT /api/settings/profile - Update profile
router.put('/profile', requireRole('owner', 'admin'), async (req: AuthRequest, res: Response) => {
    try {
        const name = req.body?.name === undefined ? undefined : requiredText(req.body.name, 'name', 160);
        const email = req.body?.email === undefined ? undefined : safeEmail(req.body.email);
        const phone = req.body?.phone === undefined ? undefined : requiredText(req.body.phone, 'phone', 40);
        const country = req.body?.country === undefined ? undefined : requiredText(req.body.country, 'country', 80);
        const address = req.body?.address === undefined ? undefined : requiredText(req.body.address, 'address', 300);
        if (req.body?.isTestMode !== undefined) {
            throw new ApiError(403, 'LIVE_MODE_REVIEW_REQUIRED', 'Sandbox/live mode changes require a separate reviewed workflow.');
        }

        const company = await prisma.company.update({
            where: { id: req.companyId },
            data: {
                name,
                email,
                phone,
                country,
                address,
            }
        });

        res.json(company);
    } catch (error) {
        return sendApiError(res, error, 'Failed to update profile');
    }
});

// Switch the workspace between real testnets and the separately gated live
// networks. This is deliberately unavailable to API-key authentication.
router.post('/environment', requireRole('owner', 'admin'), async (req: AuthRequest, res: Response) => {
    try {
        if (req.authType !== 'session') throw new ApiError(403, 'SESSION_REQUIRED', 'Environment changes require an authenticated session.');
        const mode = req.body?.mode;
        if (mode !== 'testnet' && mode !== 'live') throw new ApiError(422, 'INVALID_ENVIRONMENT', 'mode must be testnet or live.');
        if (mode === 'live') {
            if (process.env.CRYPTO_ENABLE_MAINNET !== 'true' || process.env.CRYPTO_PERSISTENT_STORAGE !== 'true') {
                throw new ApiError(403, 'LIVE_MODE_NOT_READY', 'Live networks require persistent storage and explicit operator enablement.');
            }
            if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL?.startsWith('file:')) {
                throw new ApiError(403, 'DURABLE_STORAGE_REQUIRED', 'Live networks cannot use file-backed serverless storage.');
            }
        }
        // Do an on-chain read before changing the workspace mode. Live mode needs
        // every rail, so a partly configured environment is never presented as
        // ready for signing. Testnet is the safe direction: one reachable rail is
        // enough, and an unreachable network still fails per request.
        if (mode === 'live') await assertRailsReady(false);
        else await assertAnyRailReady(true);
        const company = await prisma.company.update({
            where: { id: req.companyId },
            data: {
                isTestMode: mode === 'testnet',
                ...(mode === 'live' ? { liveEnabledAt: new Date() } : {}),
            },
        });
        await prisma.auditEvent.create({
            data: {
                companyId: req.companyId!, actorId: req.user?.id,
                action: mode === 'live' ? 'workspace.live_mode_enabled' : 'workspace.testnet_mode_enabled',
                entityType: 'company', entityId: company.id, requestId: res.locals.requestId,
            },
        });
        res.json(company);
    } catch (error) {
        return sendApiError(res, error, 'Failed to change workspace environment');
    }
});

// GET /api/settings/api-keys - List API keys
router.get('/api-keys', async (req: AuthRequest, res: Response) => {
    try {
        const apiKeys = await prisma.apiKey.findMany({
            where: { companyId: req.companyId },
            orderBy: { createdAt: 'desc' }
        });

        res.json(apiKeys.map(({ key: storedKey, ...apiKey }) => ({
            ...apiKey,
            scopes: (() => {
                try {
                    const parsed = JSON.parse(apiKey.scopes);
                    return Array.isArray(parsed) ? parsed : [];
                } catch {
                    return [];
                }
            })(),
            key: '••••••••' + storedKey.slice(-8),
        })));
    } catch (error) {
        return sendApiError(res, error, 'Failed to fetch API keys');
    }
});

// POST /api/settings/api-keys - Generate API key
router.post('/api-keys', requireRole('owner', 'admin', 'developer'), async (req: AuthRequest, res: Response) => {
    try {
        const name = requiredText(req.body?.name, 'name', 100);
        const env = req.body?.environment === undefined ? 'test' : req.body.environment;
        if (!['test', 'live'].includes(env)) throw new ApiError(422, 'INVALID_KEY_ENVIRONMENT', 'environment must be test or live.');
        if (env === 'live') {
            throw new ApiError(403, 'LIVE_MODE_REVIEW_REQUIRED', 'Live API keys are unavailable until your organization completes production review.');
        }
        const requestedScopes = req.body?.scopes === undefined ? ['read', 'write'] : req.body.scopes;
        if (!Array.isArray(requestedScopes) || requestedScopes.length < 1 || requestedScopes.length > 3) {
            throw new ApiError(422, 'INVALID_KEY_SCOPES', 'scopes must contain between one and three permissions.');
        }
        const allowedScopes = new Set(['read', 'write', 'approve']);
        const scopes = [...new Set(requestedScopes.filter((scope: unknown): scope is string => typeof scope === 'string'))];
        if (scopes.length !== requestedScopes.length || scopes.some((scope) => !allowedScopes.has(scope))) {
            throw new ApiError(422, 'INVALID_KEY_SCOPES', 'Allowed scopes are read, write, and approve.');
        }

        // Generate random API key
        const prefix = env === 'live' ? 'sk_live' : 'sk_test';
        const randomKey = crypto.randomBytes(24).toString('hex');
        const key = `${prefix}_${randomKey}`;

        const apiKey = await prisma.apiKey.create({
            data: {
                companyId: req.companyId!,
                name,
                environment: env,
                scopes: JSON.stringify(scopes),
                key: crypto.createHash('sha256').update(key).digest('hex')
            }
        });

        res.status(201).json({
            id: apiKey.id,
            name: apiKey.name,
            environment: apiKey.environment,
            scopes,
            createdAt: apiKey.createdAt,
            key,
            warning: 'Save this key now. It will not be shown again.',
        });
    } catch (error) {
        return sendApiError(res, error, 'Failed to generate API key');
    }
});

// DELETE /api/settings/api-keys/:id - Revoke API key
router.delete('/api-keys/:id', requireRole('owner', 'admin', 'developer'), async (req: AuthRequest, res: Response) => {
    try {
        const apiKey = await prisma.apiKey.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
        if (!apiKey) return res.status(404).json({ error: 'API key not found', code: 'NOT_FOUND' });
        await prisma.apiKey.delete({ where: { id: apiKey.id } });

        res.json({ message: 'API key revoked successfully' });
    } catch (error) {
        return sendApiError(res, error, 'Failed to revoke API key');
    }
});

// GET /api/settings/webhooks - List webhooks
router.get('/webhooks', async (req: AuthRequest, res: Response) => {
    try {
        const webhooks = await prisma.webhook.findMany({
            where: { companyId: req.companyId },
            orderBy: { createdAt: 'desc' }
        });

        res.json(webhooks.map(({ secret, ...webhook }) => ({
            ...webhook,
            secret: '••••••••',
        })));
    } catch (error) {
        return sendApiError(res, error, 'Failed to fetch webhooks');
    }
});

// POST /api/settings/webhooks - Create webhook
router.post('/webhooks', requireRole('owner', 'admin', 'developer'), async (req: AuthRequest, res: Response) => {
    try {
        const url = requiredText(req.body?.url, 'url', 500);
        let parsedUrl: URL;
        try {
            parsedUrl = new URL(url);
        } catch {
            throw new ApiError(422, 'INVALID_WEBHOOK_URL', 'Webhook URL must be a valid URL.');
        }
        if (parsedUrl.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
            throw new ApiError(422, 'INVALID_WEBHOOK_URL', 'Webhook URL must use HTTPS.');
        }
        const events = Array.isArray(req.body?.events)
            ? req.body.events.filter((event: unknown): event is string => typeof event === 'string').slice(0, 50)
            : [];
        if (events.length === 0) throw new ApiError(422, 'INVALID_WEBHOOK_EVENTS', 'Select at least one webhook event.');

        const secret = crypto.randomBytes(32).toString('hex');

        const webhook = await prisma.webhook.create({
            data: {
                companyId: req.companyId!,
                url: parsedUrl.toString(),
                events: JSON.stringify(events),
                secret: encryptWebhookSecret(secret),
                active: true
            }
        });

        res.status(201).json({ ...webhook, warning: 'Save this signing secret now. It will not be shown again.' });
    } catch (error) {
        return sendApiError(res, error, 'Failed to create webhook');
    }
});

// PUT /api/settings/webhooks/:id - Update webhook
router.put('/webhooks/:id', requireRole('owner', 'admin', 'developer'), async (req: AuthRequest, res: Response) => {
    try {
        const existing = await prisma.webhook.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
        if (!existing) return res.status(404).json({ error: 'Webhook not found', code: 'NOT_FOUND' });
        let normalizedUrl: string | undefined;
        if (req.body?.url !== undefined) {
            const url = requiredText(req.body.url, 'url', 500);
            let parsedUrl: URL;
            try {
                parsedUrl = new URL(url);
            } catch {
                throw new ApiError(422, 'INVALID_WEBHOOK_URL', 'Webhook URL must be a valid URL.');
            }
            if (parsedUrl.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
                throw new ApiError(422, 'INVALID_WEBHOOK_URL', 'Webhook URL must use HTTPS.');
            }
            normalizedUrl = parsedUrl.toString();
        }
        const events = req.body?.events === undefined
            ? undefined
            : Array.isArray(req.body.events)
                ? req.body.events.filter((event: unknown): event is string => typeof event === 'string').slice(0, 50)
                : [];
        if (events !== undefined && events.length === 0) {
            throw new ApiError(422, 'INVALID_WEBHOOK_EVENTS', 'Select at least one webhook event.');
        }
        const active = req.body?.active === undefined ? undefined : req.body.active === true;
        const webhook = await prisma.webhook.update({
            where: { id: existing.id },
            data: {
                url: normalizedUrl,
                events: events ? JSON.stringify(events) : undefined,
                active
            }
        });

        res.json({ ...webhook, secret: '••••••••' });
    } catch (error) {
        return sendApiError(res, error, 'Failed to update webhook');
    }
});

// DELETE /api/settings/webhooks/:id - Delete webhook
router.delete('/webhooks/:id', requireRole('owner', 'admin', 'developer'), async (req: AuthRequest, res: Response) => {
    try {
        const webhook = await prisma.webhook.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
        if (!webhook) return res.status(404).json({ error: 'Webhook not found', code: 'NOT_FOUND' });
        await prisma.webhook.delete({ where: { id: webhook.id } });

        res.json({ message: 'Webhook deleted successfully' });
    } catch (error) {
        return sendApiError(res, error, 'Failed to delete webhook');
    }
});

// GET /api/settings/metrics - Get usage metrics
router.get('/metrics', async (req: AuthRequest, res: Response) => {
    try {
        const metrics = await prisma.usageMetric.findMany({
            where: { companyId: req.companyId },
            orderBy: { timestamp: 'desc' },
            take: 100
        });

        res.json(metrics);
    } catch (error) {
        return sendApiError(res, error, 'Failed to fetch metrics');
    }
});

export default router;
