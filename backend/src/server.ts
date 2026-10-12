import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { requestId, ApiError } from './lib/security';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.routes';
import dashboardRoutes from './routes/dashboard.routes';
import remittanceRoutes from './routes/remittance.routes';
import payrollRoutes from './routes/payroll.routes';
import treasuryRoutes from './routes/treasury.routes';
import escrowRoutes from './routes/escrow.routes';
import analyticsRoutes from './routes/analytics.routes';
import complianceRoutes from './routes/compliance.routes';
import agentsRoutes from './routes/agents.routes';
import settingsRoutes from './routes/settings.routes';
import cryptoRoutes, { cryptoCron } from './routes/crypto.routes';
import payoutsRoutes from './routes/payouts.routes';
import recipientsRoutes from './routes/recipients.routes';
import teamRoutes from './routes/team.routes';
import { processSandboxSettlements } from './payouts/movements';
import { reconcileDuePayments } from './crypto/worker';

const app: Express = express();
const PORT = process.env.PORT || 3001;
app.disable('x-powered-by');

// Middleware
const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://zapzive.vercel.app'
].map((origin) => origin.replace(/\/$/, '')).filter((origin, index, list) => list.indexOf(origin) === index);

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function rateLimit(maximum: number, windowMs: number) {
    return (req: Request, res: Response, next: NextFunction) => {
        const now = Date.now();
        const key = req.ip + ':' + (req.baseUrl || '') + ':' + req.path;
        if (buckets.size > 10000) {
            for (const [bucketKey, bucketValue] of buckets) {
                if (bucketValue.resetAt <= now) buckets.delete(bucketKey);
            }
        }
        const current = buckets.get(key);
        const bucket = !current || current.resetAt <= now
            ? { count: 0, resetAt: now + windowMs }
            : current;
        bucket.count += 1;
        buckets.set(key, bucket);

        if (bucket.count > maximum) {
            res.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
            return res.status(429).json({
                error: 'Too many requests. Please try again later.',
                code: 'RATE_LIMITED',
            });
        }
        next();
    };
}

app.use((req: Request, res: Response, next: NextFunction) => {
    const id = requestId(req);
    res.locals.requestId = id;
    res.setHeader('X-Request-Id', id);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
});

app.use(cors({
    origin: (origin, callback) => {
        // Non-browser clients do not send Origin. Browser origins remain strictly
        // allowlisted; credentials must never be combined with arbitrary Vercel hosts.
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Idempotency-Key', 'X-Request-Id'],
    maxAge: 600,
}));
app.use(express.json({ limit: '256kb', strict: true }));
app.use(express.urlencoded({ extended: false, limit: '64kb' }));
app.use(rateLimit(600, 60_000));
app.use(morgan('dev'));

// Health check
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
// The strict brute-force limit guards credential endpoints only; the session check runs on every
// page load and stays under the general limit, otherwise normal browsing would be throttled.
const credentialLimit = rateLimit(30, 15 * 60_000);
app.use('/api/auth', (req: Request, res: Response, next: NextFunction) => (req.method === 'GET' ? next() : credentialLimit(req, res, next)), authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/remittance', remittanceRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/treasury', treasuryRoutes);
app.use('/api/escrow/public', rateLimit(60, 15 * 60_000));
app.use('/api/escrow', escrowRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/agents', agentsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/payouts', payoutsRoutes);
app.use('/api/recipients', recipientsRoutes);
app.use('/api/team', teamRoutes);
// The browser polls a pending payment every 15 seconds. This leaves ample room
// for normal use while preventing a single client from turning the verifier into
// an unbounded RPC proxy.
app.use('/api/crypto', rateLimit(120, 60_000), cryptoRoutes);
app.get('/api/internal/crypto/reconcile', cryptoCron);

// Error handling middleware
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    void next;
    const requestIdentifier = res.locals.requestId;
    const message = err instanceof Error ? err.message : 'Unknown request error';
    console.error('request_failed', {
        requestId: requestIdentifier,
        method: req.method,
        path: req.path,
        error: message,
    });
    if (err instanceof ApiError) {
        return res.status(err.status).json({
            error: err.message,
            code: err.code,
            requestId: requestIdentifier,
        });
    }
    if (message === 'Not allowed by CORS') {
        return res.status(403).json({
            error: 'This browser origin is not allowed to call the Zapzive API.',
            code: 'CORS_ORIGIN_DENIED',
            requestId: requestIdentifier,
        });
    }
    if (err && typeof err === 'object' && 'type' in err && (err as { type?: unknown }).type === 'entity.too.large') {
        return res.status(413).json({
            error: 'The request body is too large.',
            code: 'REQUEST_TOO_LARGE',
            requestId: requestIdentifier,
        });
    }
    if (err instanceof SyntaxError && 'body' in err) {
        return res.status(400).json({
            error: 'The request body contains invalid JSON.',
            code: 'INVALID_JSON',
            requestId: requestIdentifier,
        });
    }
    res.status(500).json({
        error: 'Something went wrong',
        code: 'INTERNAL_ERROR',
        requestId: requestIdentifier,
    });
});

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Route not found', code: 'ROUTE_NOT_FOUND', requestId: res.locals.requestId });
});

let reconciliationRunning = false;
async function reconcileLocalPayments() {
    if (reconciliationRunning) return;
    reconciliationRunning = true;
    try {
        const result = await reconcileDuePayments(20);
        if (result.checked || result.deferred) console.info('crypto_reconciliation', result);
    } catch (error) {
        console.error('crypto_reconciliation_failed', { error: error instanceof Error ? error.message : 'unknown_error' });
    } finally {
        reconciliationRunning = false;
    }
}

// Start server
if (process.env.VERCEL !== '1') app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
});

// A local or long-running backend can reconcile signed payments without a
// browser staying open. Serverless deployments use the protected cron route.
if (process.env.VERCEL !== '1' && process.env.CRYPTO_AUTOSTART_WORKER === 'true') {
    const interval = Math.max(5_000, Number(process.env.CRYPTO_RECONCILIATION_INTERVAL_MS) || 15_000);
    void reconcileLocalPayments();
    const timer = setInterval(() => { void reconcileLocalPayments(); }, interval);
    timer.unref();
}

// Sandbox payout provider: applies settlement outcomes on the server, never in
// the browser. A reentrancy flag inside processSandboxSettlements prevents overlap.
if (process.env.VERCEL !== '1') {
    const payoutTimer = setInterval(() => {
        processSandboxSettlements().catch((error) => console.error('sandbox_payout_settlement_failed', error));
    }, 3_000);
    payoutTimer.unref();
}

export default app;
