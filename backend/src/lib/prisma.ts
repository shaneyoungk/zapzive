import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

function getDatabaseUrl(): string | undefined {
    const configuredUrl = process.env.DATABASE_URL;

    // Vercel functions have a read-only deployment filesystem. Keep the existing
    // SQLite demo database usable by copying it to the function's writable /tmp
    // directory on cold start. Hosted databases continue to use their URL as-is.
    if (!process.env.VERCEL || !configuredUrl?.startsWith('file:')) {
        return configuredUrl;
    }

    const runtimePath = '/tmp/zapzive.db';
    if (!fs.existsSync(runtimePath)) {
        const bundledPath = [
            path.resolve(process.cwd(), 'prisma', 'dev.db'),
            path.resolve(__dirname, '../../prisma/dev.db'),
        ].find((candidate) => fs.existsSync(candidate));

        if (!bundledPath) {
            throw new Error('Bundled SQLite database was not included in the deployment');
        }

        fs.copyFileSync(bundledPath, runtimePath);
    }

    return `file:${runtimePath}`;
}

const prisma = new PrismaClient({
    datasources: {
        db: { url: getDatabaseUrl() },
    },
});

export default prisma;
