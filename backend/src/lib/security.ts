import crypto from 'crypto';
import { Request } from 'express';
import prisma from './prisma';

export class ApiError extends Error {
    status: number;
    code: string;
    details?: unknown;

    constructor(status: number, code: string, message: string, details?: unknown) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

export function requestId(req: Request): string {
    const value = req.headers['x-request-id'];
    if (typeof value === 'string' && /^[A-Za-z0-9._:-]{1,100}$/.test(value)) {
        return value;
    }
    return crypto.randomUUID();
}

export function readCookie(req: Request, name: string): string | undefined {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return undefined;
    const prefix = name + '=';
    const pair = cookieHeader.split(';').map((item) => item.trim()).find((item) => item.startsWith(prefix));
    if (!pair) return undefined;
    try {
        return decodeURIComponent(pair.slice(prefix.length));
    } catch {
        return undefined;
    }
}

function stableValue(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(stableValue);
    if (value && typeof value === 'object') {
        return Object.keys(value as Record<string, unknown>)
            .sort()
            .reduce<Record<string, unknown>>((result, key) => {
                result[key] = stableValue((value as Record<string, unknown>)[key]);
                return result;
            }, {});
    }
    return value;
}

export function requestHash(value: unknown): string {
    return crypto.createHash('sha256').update(JSON.stringify(stableValue(value))).digest('hex');
}

export function sandboxReference(prefix: string): string {
    return 'sandbox_' + prefix + '_' + crypto.randomBytes(16).toString('hex');
}

export function requireIdempotencyKey(req: Request): string {
    const value = req.headers['idempotency-key'];
    if (typeof value !== 'string' || !/^[A-Za-z0-9._:-]{8,200}$/.test(value)) {
        throw new ApiError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Provide a valid Idempotency-Key header.');
    }
    return value;
}

export type IdempotencyStart =
    | { replay: true; status: number; body: unknown }
    | { replay: false; id: string };

export async function beginIdempotency(
    companyId: string,
    req: Request,
    key: string,
): Promise<IdempotencyStart> {
    const hash = requestHash(req.body);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    try {
        const record = await prisma.idempotencyKey.create({
            data: {
                companyId,
                key,
                method: req.method,
                path: req.path,
                requestHash: hash,
                expiresAt,
            },
        });
        return { replay: false, id: record.id };
    } catch {
        const existing = await prisma.idempotencyKey.findUnique({
            where: { companyId_key: { companyId, key } },
        });

        if (!existing || existing.expiresAt <= new Date()) {
            throw new ApiError(409, 'IDEMPOTENCY_RETRY_REQUIRED', 'The idempotency key is unavailable. Use a new key.');
        }
        if (existing.requestHash !== hash || existing.method !== req.method || existing.path !== req.path) {
            throw new ApiError(409, 'IDEMPOTENCY_KEY_REUSED', 'The idempotency key was used with a different request.');
        }
        if (existing.state === 'processing') {
            throw new ApiError(409, 'OPERATION_IN_PROGRESS', 'An operation with this idempotency key is already processing.');
        }
        if (existing.responseStatus && existing.responseBody) {
            return {
                replay: true,
                status: existing.responseStatus,
                body: JSON.parse(existing.responseBody),
            };
        }
        throw new ApiError(409, 'IDEMPOTENCY_RETRY_REQUIRED', 'The previous operation did not produce a replayable response.');
    }
}

export async function completeIdempotency(id: string, status: number, body: unknown): Promise<void> {
    await prisma.idempotencyKey.update({
        where: { id },
        data: {
            state: 'completed',
            responseStatus: status,
            responseBody: JSON.stringify(body),
        },
    });
}

export async function failIdempotency(id: string, status: number, body: unknown): Promise<void> {
    await prisma.idempotencyKey.update({
        where: { id },
        data: {
            state: 'failed',
            responseStatus: status,
            responseBody: JSON.stringify(body),
        },
    });
}

export function apiErrorBody(error: unknown, fallback = 'Request failed'): { error: string; code: string; details?: unknown } {
    if (error instanceof ApiError) {
        return {
            error: error.message,
            code: error.code,
            ...(error.details === undefined ? {} : { details: error.details }),
        };
    }
    return { error: fallback, code: 'INTERNAL_ERROR' };
}

export async function executeIdempotent(
    companyId: string,
    req: Request,
    operation: () => Promise<{ status: number; body: unknown }>,
): Promise<{ status: number; body: unknown }> {
    const key = requireIdempotencyKey(req);
    const started = await beginIdempotency(companyId, req, key);
    if (started.replay) return { status: started.status, body: started.body };

    try {
        const result = await operation();
        await completeIdempotency(started.id, result.status, result.body);
        return result;
    } catch (error) {
        const body = apiErrorBody(error);
        const status = error instanceof ApiError ? error.status : 500;
        await failIdempotency(started.id, status, body);
        throw error;
    }
}

export async function audit(
    companyId: string,
    action: string,
    entityType: string,
    options: { actorId?: string; entityId?: string; requestId?: string; metadata?: unknown } = {},
): Promise<void> {
    try {
        await prisma.auditEvent.create({
            data: {
                companyId,
                action,
                entityType,
                actorId: options.actorId,
                entityId: options.entityId,
                requestId: options.requestId,
                metadata: options.metadata === undefined ? undefined : JSON.stringify(options.metadata),
            },
        });
    } catch (error) {
        console.error('audit_event_failed', { companyId, action, entityType, error });
    }
}

export function parsePositiveAmount(value: unknown, field = 'amount'): number {
    if (typeof value !== 'number' && typeof value !== 'string') {
        throw new ApiError(422, 'INVALID_AMOUNT', field + ' must be a positive number.');
    }
    const normalized = typeof value === 'string' ? value.trim() : value;
    const amount = Number(normalized);
    if (!Number.isFinite(amount) || amount <= 0 || amount > Number.MAX_SAFE_INTEGER) {
        throw new ApiError(422, 'INVALID_AMOUNT', field + ' must be a positive finite number.');
    }
    const decimalPlaces = typeof normalized === 'string' && normalized.includes('.')
        ? normalized.split('.')[1].length
        : String(amount).includes('.') ? String(amount).split('.')[1].length : 0;
    if (decimalPlaces > 6) {
        throw new ApiError(422, 'INVALID_AMOUNT_PRECISION', field + ' has too many decimal places.');
    }
    return amount;
}

export function parseBoundedLimit(value: unknown, fallback = 50, maximum = 100): number {
    if (value === undefined || value === '') return fallback;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) {
        throw new ApiError(422, 'INVALID_LIMIT', 'limit must be an integer between 1 and ' + maximum + '.');
    }
    return parsed;
}

export function requiredText(value: unknown, field: string, maxLength = 200): string {
    if (typeof value !== 'string') {
        throw new ApiError(422, 'INVALID_FIELD', field + ' is required.');
    }
    const result = value.trim();
    if (!result || result.length > maxLength) {
        throw new ApiError(422, 'INVALID_FIELD', field + ' must be between 1 and ' + maxLength + ' characters.');
    }
    return result;
}

export function optionalText(value: unknown, field: string, maxLength = 200): string | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    return requiredText(value, field, maxLength);
}

export function safeEmail(value: unknown): string {
    const email = requiredText(value, 'email', 320).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new ApiError(422, 'INVALID_EMAIL', 'Provide a valid email address.');
    }
    return email;
}

export function sendApiError(res: { status: (status: number) => { json: (body: unknown) => unknown }; locals?: { requestId?: string } }, error: unknown, fallback = 'Request failed') {
    const body = apiErrorBody(error, fallback);
    return res.status(error instanceof ApiError ? error.status : 500).json({
        ...body,
        requestId: res.locals?.requestId,
    });
}
