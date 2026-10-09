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
app.use('/api/auth', rateLimit(30, 15 * 60_000), authRoutes);
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
// The browser polls a pending payment every 15 seconds. This leaves ample room
// for normal use while preventing a single client from turning the verifier into
// an unbounded RPC proxy.
app.use('/api/crypto', rateLimit(120, 60_000), cryptoRoutes);
app.get('/api/internal/crypto/reconcile', cryptoCron);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    void next;
    const requestIdentifier = res.locals.requestId;
    console.error('request_failed', {
        requestId: requestIdentifier,
        method: req.method,
        path: req.path,
        error: err.message,
    });
    if (err instanceof ApiError) {
        return res.status(err.status).json({
            error: err.message,
            code: err.code,
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
    res.status(404).json({ error: 'Not Found', message: 'Route not found' });
});

// Start server
if (process.env.VERCEL !== '1') app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
});

export default app;
