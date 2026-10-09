import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...');

    const demoCompanyId = 'demo-company-123';

    // Create demo company
    const company = await prisma.company.upsert({
        where: { id: demoCompanyId },
        update: {},
        create: {
            id: demoCompanyId,
            name: 'Zapzive Demo Inc.',
            email: 'contact@zapzive.demo',
            phone: '+1 (555) 123-4567',
            country: 'United States',
            address: '123 Finance Street, New York, NY 10001',
            isTestMode: true
        }
    });

    console.log('✅ Created company:', company.name);

    // Create a demo user for this company
    const demoUser = await prisma.user.upsert({
        where: { email: 'demo@zapzive.com' },
        update: {},
        create: {
            id: 'demo-user-id',
            email: 'demo@zapzive.com',
            name: 'Demo User',
            // scrypt hash for the documented demo password: password123
            password: 'scrypt:0eacad5ab829f243ebb6366562834592:5a613484d93727035d6c7e285d1af4ee56512867b571a721965cabe02904775304a7e571d4c7564bdaaa592eafa56156c6d4df0a842078d8ab473a5423ffeaae',
            companyId: demoCompanyId
        }
    });

    console.log('✅ Created demo user:', demoUser.email);

    // Create assets
    const assets = await Promise.all([
        prisma.asset.upsert({
            where: { companyId_symbol: { companyId: demoCompanyId, symbol: 'USDC' } },
            update: { chain: 'Zapzive Sandbox', icon: '/icons/usdc.png' },
            create: {
                companyId: demoCompanyId,
                symbol: 'USDC',
                name: 'USD Coin',
                balance: 45230.50,
                usdValue: 45230.50,
                change24h: 0.01,
                chain: 'Zapzive Sandbox',
                color: '#2775CA',
                icon: '/icons/usdc.png'
            }
        }),
        prisma.asset.upsert({
            where: { companyId_symbol: { companyId: demoCompanyId, symbol: 'USDT' } },
            update: { chain: 'Zapzive Sandbox', icon: '/icons/tether.png' },
            create: {
                companyId: demoCompanyId,
                symbol: 'USDT',
                name: 'Tether',
                balance: 12450.00,
                usdValue: 12450.00,
                change24h: -0.02,
                chain: 'Zapzive Sandbox',
                color: '#26A17B',
                icon: '/icons/tether.png'
            }
        }),
        prisma.asset.upsert({
            where: { companyId_symbol: { companyId: demoCompanyId, symbol: 'ETH' } },
            update: { chain: 'Zapzive Sandbox', icon: '/icons/ethereum.png' },
            create: {
                companyId: demoCompanyId,
                symbol: 'ETH',
                name: 'Ethereum',
                balance: 3.56,
                usdValue: 8727.58,
                change24h: 2.34,
                chain: 'Zapzive Sandbox',
                color: '#627EEA',
                icon: '/icons/ethereum.png'
            }
        }),
        prisma.asset.upsert({
            where: { companyId_symbol: { companyId: demoCompanyId, symbol: 'MATIC' } },
            update: { chain: 'Zapzive Sandbox', icon: '/icons/polygon.png' },
            create: { companyId: demoCompanyId, symbol: 'MATIC', name: 'Polygon', balance: 5000, usdValue: 2500, change24h: 0, chain: 'Zapzive Sandbox', color: '#8247E5', icon: '/icons/polygon.png' }
        }),
        prisma.asset.upsert({
            where: { companyId_symbol: { companyId: demoCompanyId, symbol: 'DAI' } },
            update: { chain: 'Zapzive Sandbox', icon: '/icons/dai.svg' },
            create: { companyId: demoCompanyId, symbol: 'DAI', name: 'Dai', balance: 50000, usdValue: 50000, change24h: 0, chain: 'Zapzive Sandbox', color: '#F5AC37', icon: '/icons/dai.svg' }
        }),
        prisma.asset.upsert({
            where: { companyId_symbol: { companyId: demoCompanyId, symbol: 'BTC' } },
            update: { chain: 'Zapzive Sandbox', icon: '/icons/bitcoin.svg' },
            create: { companyId: demoCompanyId, symbol: 'BTC', name: 'Bitcoin', balance: 1, usdValue: 60000, change24h: 0, chain: 'Zapzive Sandbox', color: '#F7931A', icon: '/icons/bitcoin.svg' }
        }),
        prisma.asset.upsert({
            where: { companyId_symbol: { companyId: demoCompanyId, symbol: 'SOL' } },
            update: { chain: 'Zapzive Sandbox', icon: '/icons/solana.svg' },
            create: { companyId: demoCompanyId, symbol: 'SOL', name: 'Solana', balance: 100, usdValue: 15000, change24h: 0, chain: 'Zapzive Sandbox', color: '#14F195', icon: '/icons/solana.svg' }
        })
    ]);

    console.log('✅ Created', assets.length, 'assets');

    // Create recipients
    const recipients = await Promise.all([
        prisma.recipient.upsert({
            where: { id: 'demo-recipient-1' },
            update: {},
            create: {
                id: 'demo-recipient-1',
                companyId: demoCompanyId,
                name: 'Maria Garcia',
                email: 'maria@example.com',
                phone: '+52 555 1234567',
                country: 'Mexico',
                walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
            }
        }),
        prisma.recipient.upsert({
            where: { id: 'demo-recipient-2' },
            update: {},
            create: {
                id: 'demo-recipient-2',
                companyId: demoCompanyId,
                name: 'John Smith',
                email: 'john@example.com',
                phone: '+234 80 12345678',
                country: 'Nigeria',
                mobileNumber: '+234 80 12345678'
            }
        })
    ]);

    console.log('✅ Created', recipients.length, 'recipients');

    // Create workers
    const workers = await Promise.all([
        prisma.worker.upsert({
            where: { email: 'sarah.j@example.com' },
            update: {},
            create: {
                companyId: demoCompanyId,
                name: 'Sarah Johnson',
                role: 'Software Engineer',
                email: 'sarah.j@example.com',
                phone: '+1 555 0101',
                country: 'United States',
                wallet: '0x1234567890abcdef1234567890abcdef12345678',
                kycStatus: 'verified',
                totalPaid: 45000,
                avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah'
            }
        }),
        prisma.worker.upsert({
            where: { email: 'carlos.r@example.com' },
            update: {},
            create: {
                companyId: demoCompanyId,
                name: 'Carlos Rodriguez',
                role: 'Designer',
                email: 'carlos.r@example.com',
                phone: '+52 555 0202',
                country: 'Mexico',
                wallet: '0xabcdef1234567890abcdef1234567890abcdef12',
                kycStatus: 'verified',
                totalPaid: 32000,
                avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos'
            }
        })
    ]);

    console.log('✅ Created', workers.length, 'workers');

    // Create sample transactions
    const transactions = await Promise.all([
        prisma.transaction.create({
            data: {
                companyId: demoCompanyId,
                type: 'payroll',
                description: 'Payroll Batch #204',
                amount: 12450.00,
                currency: 'USDC',
                isIncoming: false,
                status: 'settled',
                fees: 12.45,
                chain: 'Ethereum',
                txHash: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890'
            }
        }),
        prisma.transaction.create({
            data: {
                companyId: demoCompanyId,
                type: 'deposit',
                description: 'Incoming Deposit',
                amount: 25000.00,
                currency: 'USDC',
                isIncoming: true,
                status: 'settled',
                chain: 'Ethereum',
                txHash: '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba'
            }
        })
    ]);

    console.log('✅ Created', transactions.length, 'transactions');

    console.log('🎉 Database seeding completed!');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
