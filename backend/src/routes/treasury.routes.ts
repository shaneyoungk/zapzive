import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { ApiError, parseBoundedLimit, sendApiError } from '../lib/security';
import { getOnchainPortfolio } from '../crypto/portfolio';

const router = Router();
router.use(authMiddleware as any);

router.get('/assets', async (req: AuthRequest, res: Response) => {
    try {
        const portfolio = await getOnchainPortfolio(req.companyId!);
        res.json(portfolio.items.slice(0, parseBoundedLimit(req.query.limit, 50, 100)).map((asset) => ({
            id: asset.id,
            symbol: asset.symbol,
            name: asset.name,
            balance: asset.amount,
            amountUnits: asset.amountUnits,
            decimals: asset.decimals,
            usdValue: asset.usdValue,
            change24h: null,
            chain: asset.network,
            chainId: asset.chainId,
            walletAddress: asset.walletAddress,
            color: asset.color,
            icon: asset.icon,
            source: asset.source,
            valuation: asset.valuation,
            explorerUrl: asset.explorerUrl,
            asOf: asset.asOf,
        })));
    } catch (error) { return sendApiError(res, error, 'Failed to fetch assets'); }
});

router.get('/portfolio', async (req: AuthRequest, res: Response) => {
    try {
        const portfolio = await getOnchainPortfolio(req.companyId!);
        res.json({
            totalValue: null,
            valuation: 'not_configured',
            assets: portfolio.items.length,
            history: [],
            items: portfolio.items,
            networkErrors: portfolio.networkErrors,
            syncedAt: portfolio.syncedAt,
        });
    } catch (error) { return sendApiError(res, error, 'Failed to fetch portfolio'); }
});

function unsupportedOperation(res: Response, message: string) {
    return sendApiError(res, new ApiError(503, 'ONCHAIN_OPERATION_REQUIRED', message));
}

router.post('/swap', async (_req: AuthRequest, res: Response) => unsupportedOperation(res, 'Swaps require a configured on-chain swap provider and wallet signature. No local balance mutation was performed.'));
router.post('/deposit', async (_req: AuthRequest, res: Response) => unsupportedOperation(res, 'Deposits are read from connected wallet balances. Use the wallet payment flow to send funds on-chain.'));
router.post('/withdraw', async (_req: AuthRequest, res: Response) => unsupportedOperation(res, 'Withdrawals require a supported on-chain payment and wallet signature. No local balance mutation was performed.'));

router.get('/history', async (req: AuthRequest, res: Response) => {
    try {
        const limit = parseBoundedLimit(req.query.limit, 50, 100);
        const type = typeof req.query.type === 'string' ? req.query.type : undefined;
        const where: { companyId: string; type?: string } = { companyId: req.companyId! };
        if (type) where.type = type;
        const transactions = await prisma.transaction.findMany({ where, take: limit, orderBy: { timestamp: 'desc' } });
        res.json(transactions);
    } catch (error) { return sendApiError(res, error, 'Failed to fetch transaction history'); }
});

export default router;
