import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth.middleware';
import { audit, ApiError, optionalText, requiredText, safeEmail, sendApiError } from '../lib/security';

const router = Router();
function scryptAsync(password: string, salt: string, keyLength: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        crypto.scrypt(password, salt, keyLength, {
            N: 16_384,
            r: 8,
            p: 1,
            maxmem: 32 * 1024 * 1024,
        }, (error, derivedKey) => {
            if (error) return reject(error);
            resolve(derivedKey as Buffer);
        });
    });
}

async function hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = await scryptAsync(password, salt, 64);
    return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
    if (!stored.startsWith('scrypt:')) return false;
    const [, salt, key] = stored.split(':');
    if (!salt || !key) return false;
    const derivedKey = await scryptAsync(password, salt, 64);
    const expected = Buffer.from(key, 'hex');
    return expected.length === derivedKey.length && crypto.timingSafeEqual(expected, derivedKey);
}

function issueToken(user: { id: string; companyId: string; email: string; name: string; role: string; status: string; authVersion?: number }): string {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');
    return jwt.sign(
        {
            companyId: user.companyId,
            role: user.role,
            status: user.status,
            authVersion: user.authVersion || 0,
        },
        secret,
        {
            subject: user.id,
            expiresIn: '8h',
            issuer: process.env.JWT_ISSUER || 'zapzive-api',
            audience: process.env.JWT_AUDIENCE || 'zapzive-dashboard',
        },
    );
}

function setSessionCookie(res: Response, token: string) {
    const secure = process.env.NODE_ENV === 'production';
    const sameSite = secure ? 'SameSite=None' : 'SameSite=Lax';
    res.setHeader('Set-Cookie', 'zapzive_session=' + encodeURIComponent(token) + '; Path=/; HttpOnly; ' + sameSite + (secure ? '; Secure' : '') + '; Max-Age=28800');
}

function clearSessionCookie(res: Response) {
    res.setHeader('Set-Cookie', 'zapzive_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
}

// POST /api/auth/signup - Create new user account
router.post('/signup', async (req: Request, res: Response) => {
    try {
        const normalizedEmail = safeEmail(req.body?.email);
        const normalizedName = requiredText(req.body?.name, 'name', 120);
        const normalizedCompanyName = requiredText(req.body?.companyName, 'companyName', 160);
        const normalizedCountry = requiredText(req.body?.country, 'country', 80);
        const password = req.body?.password;
        if (typeof password !== 'string' || password.length < 12 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
            throw new ApiError(422, 'WEAK_PASSWORD', 'Password must be at least 12 characters and include letters and numbers.');
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail }
        });

        if (existingUser) {
            throw new ApiError(409, 'ACCOUNT_EXISTS', 'An account with that email already exists. Use the sign-in or recovery flow.');
        }

        const passwordHash = await hashPassword(password);
        const { company, user } = await prisma.$transaction(async (tx) => {
            const createdCompany = await tx.company.create({
                data: {
                    name: normalizedCompanyName,
                    email: normalizedEmail,
                    country: normalizedCountry,
                    isTestMode: true,
                    phone: '',
                    address: ''
                }
            });
            const createdUser = await tx.user.create({
                data: {
                    email: normalizedEmail,
                    name: normalizedName,
                    password: passwordHash,
                    role: 'owner',
                    status: 'active',
                    emailVerifiedAt: new Date(),
                    companyId: createdCompany.id
                }
            });
            // Seed a minimal sandbox workspace in the same transaction as the
            // account so a partial signup cannot create an unusable company.
            await tx.worker.createMany({
                data: [
                    {
                        name: 'Alex Rivera',
                        role: 'Senior Engineer',
                        email: `alex.${createdCompany.id}@example.com`,
                        phone: '+1 555-0101',
                        country: 'United States',
                        wallet: '0x71C7...f9a1',
                        kycStatus: 'verified',
                        totalPaid: 12500,
                        companyId: createdCompany.id
                    },
                    {
                        name: 'Sarah Chen',
                        role: 'Product Designer',
                        email: `sarah.${createdCompany.id}@example.com`,
                        phone: '+1 555-0102',
                        country: 'Singapore',
                        wallet: '0x3aB2...eD44',
                        kycStatus: 'verified',
                        totalPaid: 8400,
                        companyId: createdCompany.id
                    }
                ]
            });
            await tx.asset.createMany({
                data: [
                    // These are simulated balances for the test workspace. They
                    // intentionally live in the shared Asset ledger so treasury,
                    // overview, analytics, and the sandbox payment rail agree.
                    { companyId: createdCompany.id, symbol: 'USDC', name: 'USD Coin', balance: 100000, usdValue: 100000, change24h: 0, chain: 'Zapzive Sandbox', color: '#2775CA', icon: '/icons/usdc.png' },
                    { companyId: createdCompany.id, symbol: 'USDT', name: 'Tether', balance: 100000, usdValue: 100000, change24h: 0, chain: 'Zapzive Sandbox', color: '#26A17B', icon: '/icons/tether.png' },
                    { companyId: createdCompany.id, symbol: 'ETH', name: 'Ethereum', balance: 25, usdValue: 62500, change24h: 0, chain: 'Zapzive Sandbox', color: '#627EEA', icon: '/icons/ethereum.png' },
                    { companyId: createdCompany.id, symbol: 'MATIC', name: 'Polygon', balance: 5000, usdValue: 2500, change24h: 0, chain: 'Zapzive Sandbox', color: '#8247E5', icon: '/icons/polygon.png' },
                    { companyId: createdCompany.id, symbol: 'DAI', name: 'Dai', balance: 50000, usdValue: 50000, change24h: 0, chain: 'Zapzive Sandbox', color: '#F5AC37', icon: '/icons/dai.svg' },
                    { companyId: createdCompany.id, symbol: 'BTC', name: 'Bitcoin', balance: 1, usdValue: 60000, change24h: 0, chain: 'Zapzive Sandbox', color: '#F7931A', icon: '/icons/bitcoin.svg' },
                    { companyId: createdCompany.id, symbol: 'SOL', name: 'Solana', balance: 100, usdValue: 15000, change24h: 0, chain: 'Zapzive Sandbox', color: '#14F195', icon: '/icons/solana.svg' }
                ]
            });
            return { company: createdCompany, user: createdUser };
        });

        const token = issueToken(user);
        setSessionCookie(res, token);
        await audit(company.id, 'account.created', 'user', {
            actorId: user.id,
            entityId: user.id,
            requestId: res.locals.requestId,
        });
        res.status(201).json({
            success: true,
            message: 'Sandbox account created successfully',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                companyId: user.companyId,
                role: user.role,
            },
            company: {
                id: company.id,
                name: company.name,
                country: company.country,
                isTestMode: company.isTestMode,
            },
        });
    } catch (error) {
        return sendApiError(res, error, 'Failed to create account');
    }
});

// POST /api/auth/login - Login user
router.post('/login', async (req: Request, res: Response) => {
    try {
        const normalizedEmail = safeEmail(req.body?.email);
        const password = req.body?.password;
        if (typeof password !== 'string' || password.length === 0) {
            throw new ApiError(422, 'INVALID_CREDENTIALS', 'Email and password are required.');
        }

        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            include: { company: true }
        });

        if (!user || !(await verifyPassword(password, user.password))) {
            return res.status(401).json({ error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' });
        }
        if (user.status !== 'active' || user.company.status !== 'active') {
            return res.status(403).json({ error: 'This account is not active', code: 'ACCOUNT_INACTIVE' });
        }

        // Update last login
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
        });

        const token = issueToken(user);
        setSessionCookie(res, token);
        await audit(user.companyId, 'auth.login', 'user', { actorId: user.id, requestId: res.locals.requestId });
        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                companyId: user.companyId,
                role: user.role,
            },
            company: user.company,
        });
    } catch (error) {
        return sendApiError(res, error, 'Login failed');
    }
});

// GET /api/auth/session - Return the current server-validated session.
router.get('/session', authMiddleware as any, async (req: AuthRequest, res: Response) => {
    try {
        const user = await prisma.user.findFirst({
            where: { id: req.user?.id, companyId: req.companyId },
            include: { company: true },
        });
        if (!user) return res.status(401).json({ error: 'Session is no longer valid', code: 'SESSION_INVALID' });

        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                companyId: user.companyId,
                role: user.role,
                status: user.status,
            },
            company: user.company,
        });
    } catch (error) {
        return sendApiError(res, error, 'Failed to validate session');
    }
});

// POST /api/auth/verify-email - Send verification email
router.post('/verify-email', async (req: Request, res: Response) => {
    try {
        safeEmail(req.body?.email);
        // Do not return a verification secret. A production delivery adapter must
        // enqueue a one-time hashed token with an email provider.
        res.json({ message: 'If the account exists, a verification message will be sent.' });
    } catch (error) {
        return sendApiError(res, error, 'Failed to send verification email');
    }
});

// POST /api/auth/complete-onboarding - Complete company setup
router.post('/complete-onboarding', authMiddleware as any, requireRole('owner', 'admin'), async (req: AuthRequest, res: Response) => {
    try {
        const phone = optionalText(req.body?.phone, 'phone', 40);
        const address = optionalText(req.body?.address, 'address', 300);

        const company = await prisma.company.update({
            where: { id: req.companyId },
            data: {
                phone,
                address,
            }
        });

        await audit(req.companyId!, 'organization.onboarding_completed', 'company', {
            actorId: req.user?.id,
            entityId: req.companyId,
            requestId: res.locals.requestId,
        });
        res.json(company);
    } catch (error) {
        return sendApiError(res, error, 'Failed to complete onboarding');
    }
});

// POST /api/auth/logout - Revoke all access tokens issued to this user.
router.post('/logout', authMiddleware as any, async (req: AuthRequest, res: Response) => {
    try {
        await prisma.user.updateMany({
            where: { id: req.user?.id, companyId: req.companyId },
            data: { authVersion: { increment: 1 } },
        });
        clearSessionCookie(res);
        res.json({ success: true });
    } catch (error) {
        return sendApiError(res, error, 'Logout failed');
    }
});

export default router;
