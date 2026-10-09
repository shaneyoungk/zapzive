import { Router, Request, Response } from 'express';
import { createHash, timingSafeEqual } from 'crypto';
import { getAddress, isAddress } from 'viem';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { ApiError, audit, executeIdempotent, parseBoundedLimit, parsePositiveAmount, requiredText, safeEmail, sandboxReference, sendApiError } from '../lib/security';

const router = Router();
const sandboxRates: Record<string, number> = {
    NGN: 1200,
    KES: 130,
    UGX: 3700,
    GHS: 15,
    MXN: 18,
    BRL: 5,
};

type RecipientDestination = 'wallet' | 'bank' | 'mobile-money' | 'cash-agent';
type RecipientWalletNetwork = 'evm' | 'tron';

function optionalDestination(value: unknown, field: string, maxLength: number): string | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    return requiredText(value, field, maxLength);
}

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function isValidTronAddress(value: string): boolean {
    // TRON external addresses are Base58Check-encoded, start with the mainnet
    // address byte 0x41, and carry a four-byte double-SHA256 checksum. A regex
    // alone accepts many mistyped addresses and is not safe for a payout rail.
    if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(value)) return false;
    let number = 0n;
    for (const character of value) {
        const digit = BASE58_ALPHABET.indexOf(character);
        if (digit < 0) return false;
        number = number * 58n + BigInt(digit);
    }
    const bytes: number[] = [];
    while (number > 0n) {
        bytes.unshift(Number(number % 256n));
        number /= 256n;
    }
    const leadingZeros = value.match(/^1*/)?.[0].length ?? 0;
    const decoded = Buffer.from([...new Array(leadingZeros).fill(0), ...bytes]);
    if (decoded.length !== 25 || decoded[0] !== 0x41) return false;
    const body = decoded.subarray(0, 21);
    const expected = createHash('sha256').update(createHash('sha256').update(body).digest()).digest().subarray(0, 4);
    return timingSafeEqual(decoded.subarray(21), expected);
}

function normalizeWalletDestination(value: unknown, network: RecipientWalletNetwork): string {
    const wallet = requiredText(value, 'walletAddress', 100);
    if (network === 'tron') {
        // This prevents an EVM address from being silently sent to a TRON
        // payout path and rejects Base58 strings with a bad checksum.
        if (!isValidTronAddress(wallet)) {
            throw new ApiError(422, 'INVALID_TRON_ADDRESS', 'Provide a valid TRON base58 recipient address.');
        }
        return wallet;
    }
    if (!isAddress(wallet) || /^0x0{40}$/i.test(wallet)) {
        throw new ApiError(422, 'INVALID_EVM_ADDRESS', 'Provide a valid, nonzero EVM recipient address.');
    }
    return getAddress(wallet).toLowerCase();
}

// Apply auth middleware to all remittance routes
router.use(authMiddleware as any);

// GET /api/remittance - List all remittances
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const status = req.query.status as string;
        const search = req.query.search as string;
        const limit = parseBoundedLimit(req.query.limit, 50, 100);
        if (status && !['pending', 'processing', 'completed', 'failed', 'cancelled', 'draft'].includes(status)) {
            throw new ApiError(422, 'INVALID_REMITTANCE_STATUS', 'Unsupported remittance status.');
        }

        const where: any = { companyId: req.companyId };
        if (status) where.status = status;
        if (search) {
            where.OR = [
                { sender: { contains: search } },
                { recipientCountry: { contains: search } }
            ];
        }

        const remittances = await prisma.remittance.findMany({
            where,
            take: limit,
            include: { recipient: true },
            orderBy: { createdDate: 'desc' }
        });

        res.json(remittances);
    } catch (error) {
        return sendApiError(res, error, 'Failed to fetch remittances');
    }
});

// POST /api/remittance/quote - Calculate a short-lived sandbox quote.
// Quotes are informational until a provider-backed quote ledger is enabled;
// the create endpoint always recalculates the authoritative values server-side.
router.post('/quote', async (req: AuthRequest, res: Response) => {
    try {
        const amount = parsePositiveAmount(req.body?.amount, 'amount');
        const currency = typeof req.body?.currency === 'string' ? req.body.currency.trim().toUpperCase() : 'USDC';
        const localCurrency = requiredText(req.body?.localCurrency, 'localCurrency', 10).toUpperCase();
        if (!['USDC', 'USDT', 'ETH'].includes(currency)) throw new ApiError(422, 'UNSUPPORTED_CURRENCY', 'Unsupported source currency.');
        const fxRate = sandboxRates[localCurrency];
        if (!fxRate) throw new ApiError(422, 'UNSUPPORTED_CORRIDOR', 'This sandbox corridor is not available yet.');
        const fee = Number((amount * 0.01 + 2).toFixed(2));
        res.json({
            id: sandboxReference('quote'),
            sourceAmount: amount,
            sourceCurrency: currency,
            destinationAmount: Number((amount * fxRate).toFixed(2)),
            destinationCurrency: localCurrency,
            fxRate,
            fee,
            environment: 'sandbox',
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
        });
    } catch (error) {
        return sendApiError(res, error, 'Failed to create remittance quote');
    }
});

// POST /api/remittance - Create new remittance
router.post('/', async (req: AuthRequest, res: Response) => {
    try {
        const sender = requiredText(req.body?.sender, 'sender', 160);
        const recipientId = requiredText(req.body?.recipientId, 'recipientId', 80);
        const recipient = await prisma.recipient.findFirst({
            where: { id: recipientId, companyId: req.companyId },
        });
        if (!recipient) return res.status(404).json({ error: 'Recipient not found', code: 'NOT_FOUND' });
        const recipientCountry = recipient.country;
        const amount = parsePositiveAmount(req.body?.amount, 'amount');
        const currency = typeof req.body?.currency === 'string' ? req.body.currency.trim().toUpperCase() : 'USDC';
        const localCurrency = requiredText(req.body?.localCurrency, 'localCurrency', 10).toUpperCase();
        const fxRate = sandboxRates[localCurrency];
        if (!fxRate) throw new ApiError(422, 'UNSUPPORTED_CORRIDOR', 'This sandbox corridor is not available yet.');
        const localAmount = Number((amount * fxRate).toFixed(2));
        const fee = Number((amount * 0.01 + 2).toFixed(2));
        const deliveryMethod = requiredText(req.body?.deliveryMethod, 'deliveryMethod', 30);
        const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 500) : undefined;
        if (!['USDC', 'USDT', 'ETH'].includes(currency)) throw new ApiError(422, 'UNSUPPORTED_CURRENCY', 'Unsupported source currency.');
        if (!['wallet', 'bank', 'mobile-money', 'cash-agent'].includes(deliveryMethod)) {
            throw new ApiError(422, 'UNSUPPORTED_DELIVERY_METHOD', 'Unsupported delivery method.');
        }
        if (deliveryMethod === 'wallet' && !recipient.walletAddress) {
            throw new ApiError(422, 'RECIPIENT_WALLET_REQUIRED', 'This recipient does not have a wallet destination. Choose a saved wallet recipient or add one first.');
        }
        if (deliveryMethod === 'bank' && !recipient.bankAccount) {
            throw new ApiError(422, 'RECIPIENT_BANK_REQUIRED', 'This recipient does not have a bank destination. Choose a saved bank recipient or add one first.');
        }
        if (deliveryMethod === 'mobile-money' && !(recipient.mobileNumber || recipient.phone)) {
            throw new ApiError(422, 'RECIPIENT_MOBILE_REQUIRED', 'This recipient does not have a mobile-money destination. Choose a saved mobile recipient or add one first.');
        }
        const company = await prisma.company.findFirst({ where: { id: req.companyId }, select: { isTestMode: true } });
        if (!company?.isTestMode) {
            throw new ApiError(503, 'LIVE_PROVIDER_NOT_CONFIGURED', 'Live remittance delivery is not enabled for this environment.');
        }
        if (req.body?.recipientCountry !== undefined) {
            // The recipient record is authoritative; a request cannot move a
            // recipient into a different country.
            if (String(req.body.recipientCountry).trim() !== recipientCountry) {
                throw new ApiError(409, 'RECIPIENT_COUNTRY_MISMATCH', 'Recipient country does not match the saved recipient.');
            }
        }

        const result = await executeIdempotent(req.companyId!, req, async () => {
            const remittance = await prisma.$transaction(async (tx) => {
                const providerReference = sandboxReference('remittance');
                const debit = await tx.asset.updateMany({
                    where: { companyId: req.companyId!, symbol: currency, balance: { gte: amount + fee } },
                    data: { balance: { decrement: amount + fee }, usdValue: { decrement: amount + fee } },
                });
                if (debit.count !== 1) {
                    throw new ApiError(409, 'INSUFFICIENT_BALANCE', 'The treasury does not have enough balance for this remittance and fee.');
                }
                const created = await tx.remittance.create({
                    data: {
                        companyId: req.companyId!,
                        sender,
                        recipientId,
                        recipientCountry,
                        amount,
                        currency,
                        localAmount,
                        localCurrency,
                        fxRate,
                        fee,
                        deliveryMethod,
                        note,
                        status: 'completed',
                        completedDate: new Date(),
                        txHash: providerReference,
                        chain: 'Sandbox'
                    },
                    include: { recipient: true }
                });

                await tx.transaction.create({
                    data: {
                        companyId: req.companyId!,
                        type: 'remittance',
                        description: 'Remittance to ' + created.recipient.name,
                        amount,
                        currency,
                        isIncoming: false,
                        status: 'settled',
                        fees: fee,
                        chain: 'Sandbox',
                        txHash: providerReference
                    }
                });
                return created;
            });
            await audit(req.companyId!, 'remittance.created', 'remittance', {
                actorId: req.user?.id,
                entityId: remittance.id,
                requestId: res.locals.requestId,
                metadata: { amount, currency, recipientId, deliveryMethod },
            });
            return { status: 201, body: remittance };
        });

        res.status(result.status).json(result.body);
    } catch (error) {
        return sendApiError(res, error, 'Failed to create remittance');
    }
});

// Static recipient routes must be declared before /:id so "recipients" is not
// interpreted as a remittance identifier.
router.get('/recipients/list', async (req: AuthRequest, res: Response) => {
    try {
        const recipients = await prisma.recipient.findMany({
            where: { companyId: req.companyId },
            take: parseBoundedLimit(req.query.limit, 100, 200),
            orderBy: { createdAt: 'desc' },
        });
        res.json(recipients);
    } catch (error) {
        return sendApiError(res, error, 'Failed to fetch recipients');
    }
});

router.post('/recipients/add', async (req: AuthRequest, res: Response) => {
    try {
        const name = requiredText(req.body?.name, 'name', 160);
        const email = req.body?.email ? safeEmail(req.body.email) : undefined;
        // A phone number is meaningful for mobile-money delivery, but must not
        // block a wallet or bank recipient from being saved.
        const phone = optionalDestination(req.body?.phone, 'phone', 40) || '';
        const country = requiredText(req.body?.country, 'country', 80);
        const requestedType = req.body?.destinationType;
        const rawWallet = optionalDestination(req.body?.walletAddress, 'walletAddress', 100);
        const rawBank = optionalDestination(req.body?.bankAccount, 'bankAccount', 120);
        const rawMobile = optionalDestination(req.body?.mobileNumber, 'mobileNumber', 40);
        const destinationType: RecipientDestination = requestedType === 'wallet' || requestedType === 'bank' || requestedType === 'mobile-money' || requestedType === 'cash-agent'
            ? requestedType
            : rawWallet ? 'wallet' : rawBank ? 'bank' : rawMobile ? 'mobile-money' : (() => { throw new ApiError(422, 'MISSING_PAYOUT_DESTINATION', 'Choose a wallet, bank, or mobile-money destination.'); })();
        if (req.body?.walletNetwork !== undefined && req.body.walletNetwork !== 'evm' && req.body.walletNetwork !== 'tron') {
            throw new ApiError(422, 'INVALID_WALLET_NETWORK', 'Choose EVM or TRON for a wallet recipient.');
        }
        const walletNetwork: RecipientWalletNetwork = req.body?.walletNetwork === 'tron' ? 'tron' : 'evm';
        const walletAddress = destinationType === 'wallet' ? normalizeWalletDestination(rawWallet, walletNetwork) : undefined;
        const bankAccount = destinationType === 'bank' ? requiredText(rawBank, 'bankAccount', 120) : undefined;
        const recipientPhone = destinationType === 'mobile-money' ? (phone || rawMobile || '') : phone;
        const mobileNumber = destinationType === 'mobile-money' ? requiredText(recipientPhone, 'mobileNumber', 40) : undefined;
        if (destinationType === 'mobile-money' && !recipientPhone) {
            throw new ApiError(422, 'MOBILE_PHONE_REQUIRED', 'Provide the recipient phone number for mobile-money delivery.');
        }

        const result = await executeIdempotent(req.companyId!, req, async () => {
            const recipient = await prisma.recipient.create({
                data: { companyId: req.companyId!, name, email, phone: recipientPhone, country, walletAddress, walletNetwork: walletAddress ? walletNetwork : undefined, bankAccount, mobileNumber },
            });
            await audit(req.companyId!, 'recipient.created', 'recipient', {
                actorId: req.user?.id,
                entityId: recipient.id,
                requestId: res.locals.requestId,
                metadata: { destinationType, walletNetwork: walletAddress ? walletNetwork : undefined },
            });
            return { status: 201, body: recipient };
        });
        res.status(result.status).json(result.body);
    } catch (error) {
        return sendApiError(res, error, 'Failed to add recipient');
    }
});

// GET /api/remittance/:id - Get remittance details
router.get('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const remittance = await prisma.remittance.findFirst({
            where: { id: req.params.id, companyId: req.companyId },
            include: { recipient: true }
        });

        if (!remittance) {
            return res.status(404).json({ error: 'Remittance not found' });
        }

        res.json(remittance);
    } catch (error) {
        return sendApiError(res, error, 'Failed to fetch remittance');
    }
});

// PUT /api/remittance/:id - Update remittance
router.put('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const existing = await prisma.remittance.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
        if (!existing) return res.status(404).json({ error: 'Remittance not found' });
        if (!['pending', 'draft'].includes(existing.status)) {
            throw new ApiError(409, 'INVALID_REMITTANCE_STATE', 'Only an unsubmitted remittance can be edited.');
        }
        const data = {
            note: req.body?.note === undefined ? undefined : requiredText(req.body.note, 'note', 500),
        };
        const remittance = await prisma.remittance.update({
            where: { id: req.params.id },
            data,
            include: { recipient: true }
        });

        res.json(remittance);
    } catch (error) {
        return sendApiError(res, error, 'Failed to update remittance');
    }
});

// POST /api/remittance/:id/cancel - Cancel remittance
router.post('/:id/cancel', async (req: AuthRequest, res: Response) => {
    try {
        const existing = await prisma.remittance.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
        if (!existing) return res.status(404).json({ error: 'Remittance not found' });
        if (!['pending', 'processing'].includes(existing.status)) {
            throw new ApiError(409, 'INVALID_REMITTANCE_STATE', 'This remittance cannot be cancelled in its current state.');
        }
        const remittance = await prisma.remittance.update({
            where: { id: req.params.id },
            data: { status: 'cancelled' },
            include: { recipient: true }
        });

        res.json(remittance);
    } catch (error) {
        return sendApiError(res, error, 'Failed to cancel remittance');
    }
});

export default router;
