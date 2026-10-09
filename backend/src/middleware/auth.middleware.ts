import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { readCookie } from '../lib/security';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        companyId: string;
        email?: string;
        name?: string;
        role: string;
        status: string;
    };
    companyId?: string;
    authType?: 'session' | 'api_key';
    apiKeyScopes?: string[];
}

type SessionToken = jwt.JwtPayload & {
    sub?: string;
    companyId?: string;
    email?: string;
    name?: string;
    role?: string;
    status?: string;
    authVersion?: number;
};

function invalidSession(res: Response, message: string) {
    return res.status(401).json({
        error: 'Unauthorized',
        code: 'SESSION_INVALID',
        message,
    });
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        const cookieToken = readCookie(req, 'zapzive_session');
        if (cookieToken && !authHeader && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.headers['x-requested-with'] !== 'XMLHttpRequest') {
            return res.status(403).json({
                error: 'A trusted request header is required for cookie-authenticated changes',
                code: 'CSRF_CHECK_FAILED',
            });
        }
        const bearerToken = authHeader?.startsWith('Bearer ')
            ? authHeader.slice('Bearer '.length).trim()
            : undefined;
        const basicToken = authHeader?.startsWith('Basic ')
            ? (() => {
                try {
                    const decoded = Buffer.from(authHeader.slice('Basic '.length).trim(), 'base64').toString('utf8');
                    return decoded.split(':', 1)[0]?.trim() || undefined;
                } catch {
                    return undefined;
                }
            })()
            : undefined;
        const apiCredential = bearerToken || basicToken;
        const token = apiCredential || cookieToken;

        if (!token) {
            return invalidSession(res, 'No token provided');
        }

        const secret = process.env.JWT_SECRET;
        if (!secret || secret.length < 32) {
            console.error('JWT_SECRET is missing or too short');
            return res.status(500).json({ error: 'Authentication is not configured securely' });
        }

        const looksLikeApiKey = Boolean(apiCredential && /^(sk|zapzive)_(test|live)_/.test(apiCredential));
        if (looksLikeApiKey) {
            const keyHash = crypto.createHash('sha256').update(apiCredential!).digest('hex');
            const apiKey = await prisma.apiKey.findUnique({
                where: { key: keyHash },
                select: { companyId: true, environment: true, scopes: true, company: { select: { id: true, status: true, isTestMode: true } } },
            });
            if (!apiKey || apiKey.company.status !== 'active') return invalidSession(res, 'Invalid or revoked API key');
            if (apiKey.environment === 'test' && !apiKey.company.isTestMode) {
                return res.status(403).json({ error: 'This test key cannot access live mode', code: 'ENVIRONMENT_MISMATCH' });
            }
            const apiUser = await prisma.user.findFirst({
                where: { companyId: apiKey.companyId, status: 'active' },
                select: { id: true, email: true, name: true, role: true, status: true },
                orderBy: { createdAt: 'asc' },
            });
            if (!apiUser) return invalidSession(res, 'The API key owner is no longer active');
            let scopes: string[] = ['read'];
            try {
                const parsed = JSON.parse(apiKey.scopes);
                if (Array.isArray(parsed)) scopes = parsed.filter((scope): scope is string => typeof scope === 'string');
            } catch {
                // A malformed scope record fails closed to read-only access.
            }
            const requiredScope = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) ? 'write' : 'read';
            if (!scopes.includes(requiredScope) && !scopes.includes('admin')) {
                return res.status(403).json({ error: 'This API key does not have the required scope', code: 'INSUFFICIENT_SCOPE' });
            }
            req.user = { id: apiUser.id, companyId: apiKey.companyId, email: apiUser.email, name: apiUser.name, role: apiUser.role, status: apiUser.status };
            req.companyId = apiKey.companyId;
            req.authType = 'api_key';
            req.apiKeyScopes = scopes;
            await prisma.apiKey.update({ where: { key: keyHash }, data: { lastUsed: new Date() } });
            next();
            return;
        }

        let payload: SessionToken;
        try {
            payload = jwt.verify(token, secret, {
                algorithms: ['HS256'],
                issuer: process.env.JWT_ISSUER || 'zapzive-api',
                audience: process.env.JWT_AUDIENCE || 'zapzive-dashboard',
            }) as SessionToken;
        } catch {
            return invalidSession(res, 'Invalid or expired token');
        }

        if (!payload.sub || !payload.companyId) {
            return invalidSession(res, 'Please sign in again to refresh your session');
        }

        const user = await prisma.user.findFirst({
            where: { id: payload.sub, companyId: payload.companyId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                status: true,
                authVersion: true,
                company: { select: { id: true, status: true } },
            },
        });
        if (!user || user.company.status !== 'active' || user.authVersion !== (payload.authVersion || 0)) {
            return invalidSession(res, 'Your session is no longer valid. Please sign in again.');
        }

        req.user = {
            id: user.id,
            companyId: user.company.id,
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status,
        };
        if (req.user.status !== 'active') {
            return res.status(403).json({
                error: 'Account is not active',
                code: 'ACCOUNT_INACTIVE',
            });
        }
        req.companyId = payload.companyId;
        req.authType = 'session';
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export function requireRole(...roles: string[]) {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (req.authType === 'api_key') {
            const requiredScope = roles.includes('developer') ? 'keys:manage' : roles.includes('approver') ? 'approve' : 'write';
            if (req.apiKeyScopes?.includes(requiredScope)) return next();
            return res.status(403).json({ error: 'This API key does not have the required scope', code: 'INSUFFICIENT_SCOPE' });
        }
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'You do not have permission to perform this action',
                code: 'INSUFFICIENT_PERMISSION',
            });
        }
        next();
    };
}
