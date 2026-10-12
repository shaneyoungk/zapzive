// Opt-in sandbox scenario: "ACME Digital Services, Nairobi". Every record is
// flagged isSample so it is labelled in the product and can be removed.

import prisma from '../lib/prisma';
import { ApiError } from '../lib/security';
import { maskDestination, type PayoutDetails } from './catalog';
import { formatMinor, parseMinor } from './money';
import { sandboxProvider } from './providers/sandbox';
import { type Actor, getFunding, movementReference, nextRunReference, recordEvent, revalidateRun } from './core';

interface SampleRecipient {
    key: string; name: string; email: string; country: string; type: string; title: string;
    method: 'mpesa' | 'mobile_money' | 'bank' | 'usdc_wallet'; currency: string; details: PayoutDetails;
    pay: [string, string, string]; // August, September, October amounts
}

const RECIPIENTS: SampleRecipient[] = [
    { key: 'amina', name: 'Amina Wanjiru', email: 'amina.wanjiru@sample.zapzive.dev', country: 'KE', type: 'contractor', title: 'Product designer', method: 'mpesa', currency: 'KES', details: { phone: '+254712345601' }, pay: ['148000', '148000', '152000'] },
    { key: 'brian', name: 'Brian Otieno', email: 'brian.otieno@sample.zapzive.dev', country: 'KE', type: 'contractor', title: 'Frontend developer', method: 'mpesa', currency: 'KES', details: { phone: '+254712345602' }, pay: ['165000', '165000', '165000'] },
    { key: 'peter', name: 'Peter Mwangi', email: 'peter.mwangi@sample.zapzive.dev', country: 'KE', type: 'contractor', title: 'Field technician', method: 'mpesa', currency: 'KES', details: { phone: '+254712340000' }, pay: ['48200', '48200', '48200'] },
    { key: 'mercy', name: 'Mercy Achieng', email: 'mercy.achieng@sample.zapzive.dev', country: 'KE', type: 'creator', title: 'Video producer', method: 'mpesa', currency: 'KES', details: { phone: '+254711223344' }, pay: ['92000', '88000', '95500'] },
    { key: 'daniel', name: 'Daniel Kiprop', email: 'daniel.kiprop@sample.zapzive.dev', country: 'KE', type: 'contractor', title: 'QA engineer', method: 'mpesa', currency: 'KES', details: { phone: '+254722334455' }, pay: ['128000', '134000', '131000'] },
    { key: 'mary', name: 'Mary Njeri', email: 'mary.njeri@sample.zapzive.dev', country: 'KE', type: 'contractor', title: 'Finance assistant', method: 'bank', currency: 'KES', details: { bankName: 'Equity Bank', accountNumber: '0123456789', bankCode: 'EQBLKENA' }, pay: ['82000', '82000', '82000'] },
    { key: 'james', name: 'James Kamau', email: 'james.kamau@sample.zapzive.dev', country: 'KE', type: 'contractor', title: 'Backend developer', method: 'bank', currency: 'KES', details: { bankName: 'KCB Bank', accountNumber: '1100223344', bankCode: 'KCBLKENX' }, pay: ['140000', '138000', '1250000'] },
    { key: 'sarah', name: 'Sarah Namuli', email: 'sarah.namuli@sample.zapzive.dev', country: 'UG', type: 'contractor', title: 'Support lead', method: 'mobile_money', currency: 'UGX', details: { phone: '+256772123456' }, pay: ['2900000', '2900000', '3000000'] },
    { key: 'joseph', name: 'Joseph Okello', email: 'joseph.okello@sample.zapzive.dev', country: 'UG', type: 'freelancer', title: 'Translator', method: 'mobile_money', currency: 'UGX', details: { phone: '+256701234567' }, pay: ['1200000', '950000', '1100000'] },
    { key: 'chinedu', name: 'Chinedu Eze', email: 'chinedu.eze@sample.zapzive.dev', country: 'NG', type: 'contractor', title: 'Data analyst', method: 'bank', currency: 'NGN', details: { bankName: 'GTBank', accountNumber: '0123456781', bankCode: 'GTBINGLA' }, pay: ['1650000', '1650000', '1700000'] },
    { key: 'lena', name: 'Lena Mwende', email: 'lena.mwende@sample.zapzive.dev', country: 'KE', type: 'freelancer', title: 'Smart-contract reviewer', method: 'usdc_wallet', currency: 'USDC', details: { walletAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', network: 'base' }, pay: ['900', '900', '950'] },
    { key: 'northwind', name: 'Northwind Design LLC', email: 'billing@northwind.sample.zapzive.dev', country: 'US', type: 'vendor', title: 'Design agency', method: 'bank', currency: 'USD', details: { bankName: 'Chase', accountNumber: '483920117', bankCode: 'CHASUS33' }, pay: ['2400', '2400', '2400'] },
];

const day = (offset: number, hour = 10) => { const d = new Date(); d.setUTCHours(hour, 0, 0, 0); d.setUTCDate(d.getUTCDate() + offset); return d; };

function nextFriday(): Date {
    const d = new Date();
    d.setUTCHours(9, 0, 0, 0);
    const diff = (5 - d.getUTCDay() + 7) % 7 || 7;
    d.setUTCDate(d.getUTCDate() + diff);
    return d;
}

export async function hasSampleData(companyId: string) {
    return (await prisma.payoutRun.count({ where: { companyId, isSample: true } })) > 0;
}

export async function loadSampleScenario(actor: Actor) {
    const company = await prisma.company.findUnique({ where: { id: actor.companyId } });
    if (!company?.isTestMode) throw new ApiError(403, 'SANDBOX_ONLY', 'Sample data is only available in a sandbox workspace.');
    if (await hasSampleData(actor.companyId)) throw new ApiError(409, 'SAMPLE_EXISTS', 'The sample scenario is already loaded.');

    await prisma.$transaction(async (tx) => {
        const recipients = new Map<string, { id: string; spec: SampleRecipient }>();
        for (const spec of RECIPIENTS) {
            const existing = await tx.worker.findUnique({ where: { companyId_email: { companyId: actor.companyId, email: spec.email } } });
            const changedAfterSeptember = spec.key === 'mary';
            const data = {
                name: spec.name, role: spec.title, phone: spec.details.phone ?? '', country: spec.country, wallet: spec.details.walletAddress ?? '', kycStatus: 'verified', verifiedAt: day(-75),
                recipientType: spec.type, status: 'active', payoutMethod: spec.method, payoutCurrency: spec.currency, isSample: true,
                payoutDetails: JSON.stringify(changedAfterSeptember ? { ...spec.details, bankName: 'NCBA Bank', accountNumber: '7765432109', bankCode: 'CBAFKENX' } : spec.details),
                detailsUpdatedAt: changedAfterSeptember ? day(-2, 14) : day(-75),
            };
            const recipient = existing ? await tx.worker.update({ where: { id: existing.id }, data }) : await tx.worker.create({ data: { companyId: actor.companyId, email: spec.email, ...data } });
            recipients.set(spec.key, { id: recipient.id, spec });
            if (changedAfterSeptember) {
                await tx.auditEvent.create({ data: { companyId: actor.companyId, action: 'recipient.payout_details_changed', entityType: 'recipient', entityId: recipient.id, createdAt: day(-2, 14), metadata: JSON.stringify({ sample: true, actorName: 'Mary Njeri (recipient)', name: spec.name, before: maskDestination('bank', spec.details), after: 'NCBA Bank · ••••2109' }) } });
            }
        }

        // Two completed historical runs (August reconciled; September with one failure, not yet reconciled).
        const history: Array<{ name: string; monthIndex: 0 | 1; submitted: number; reconciled: boolean }> = [
            { name: 'August contractors', monthIndex: 0, submitted: -44, reconciled: true },
            { name: 'September contractors', monthIndex: 1, submitted: -14, reconciled: false },
        ];
        for (const item of history) {
            const run = await tx.payoutRun.create({
                data: {
                    companyId: actor.companyId, reference: await nextRunReference(tx, actor.companyId), name: item.name, purpose: 'Monthly contractor payouts', scheduledFor: day(item.submitted + 1, 9),
                    fundingCurrency: 'USD', status: 'completed', requiredApprovals: 1, policySummary: 'This run requires one approver. Total value exceeds KES 100,000.',
                    createdById: actor.id, createdByName: actor.name, submittedById: actor.id, submittedAt: day(item.submitted, 9), approvedAt: day(item.submitted, 11),
                    executedAt: day(item.submitted + 1, 9), completedAt: day(item.submitted + 1, 9), reconciledAt: item.reconciled ? day(item.submitted + 3, 15) : null,
                    reconciledById: item.reconciled ? actor.id : null, isSample: true,
                },
            });
            let failed = false;
            for (const { id, spec } of recipients.values()) {
                const amountMinor = parseMinor(spec.pay[item.monthIndex], spec.currency);
                const quote = sandboxProvider.quote({ sourceCurrency: 'USD', destinationCurrency: spec.currency, destinationAmountMinor: amountMinor, payoutMethod: spec.method, country: spec.country });
                const fails = item.monthIndex === 1 && spec.key === 'peter';
                failed ||= fails;
                const detailsAtTime = spec.details;
                await tx.movement.create({
                    data: {
                        companyId: actor.companyId, runId: run.id, reference: movementReference(), recipientId: id, recipientName: spec.name, externalReference: `${item.name.split(' ')[0].slice(0, 3).toUpperCase()}-2026-${spec.key}`,
                        amountMinor, currency: spec.currency, payoutMethod: spec.method, destination: maskDestination(spec.method, detailsAtTime), country: spec.country,
                        sourceCurrency: 'USD', sourceAmountMinor: quote.totalMinor, feeMinor: quote.feeMinor, fxRate: quote.fxRate, quotedAt: day(item.submitted, 9), quoteExpiresAt: day(item.submitted, 9),
                        provider: quote.provider, rail: quote.rail, providerReference: `SBX-${spec.key.toUpperCase().slice(0, 4)}${item.monthIndex}${String(amountMinor % 997).padStart(3, '0')}`,
                        state: fails ? 'failed' : 'delivered', validationIssues: '[]', submittedAt: day(item.submitted + 1, 9),
                        deliveredAt: fails ? null : day(item.submitted + 1, 9), deliveredAmountMinor: fails ? null : amountMinor,
                        failedAt: fails ? day(item.submitted + 1, 9) : null, exceptionType: fails ? 'recipient_unavailable' : null,
                        failureReason: fails ? 'Beneficiary account unavailable. The mobile wallet could not receive funds.' : null, requestedById: actor.id, isSample: true,
                    },
                });
            }
            if (failed) await tx.payoutRun.update({ where: { id: run.id }, data: { status: 'completed_with_failures' } });
            await tx.approval.create({ data: { companyId: actor.companyId, runId: run.id, actorId: actor.id, actorName: actor.name, decision: 'approved', selfApproval: true, beforeStatus: 'awaiting_approval', afterStatus: 'approved', createdAt: day(item.submitted, 11) } });
            const meta = { sample: true, reference: run.reference, name: run.name, actorName: actor.name };
            await tx.auditEvent.createMany({
                data: [
                    { companyId: actor.companyId, action: 'payout_run.submitted', entityType: 'payout_run', entityId: run.id, createdAt: day(item.submitted, 9), metadata: JSON.stringify({ ...meta, payouts: RECIPIENTS.length }) },
                    { companyId: actor.companyId, action: 'payout_run.approved', entityType: 'payout_run', entityId: run.id, createdAt: day(item.submitted, 11), metadata: JSON.stringify(meta) },
                    { companyId: actor.companyId, action: 'payout_run.sent', entityType: 'payout_run', entityId: run.id, createdAt: day(item.submitted + 1, 9), metadata: JSON.stringify(meta) },
                    { companyId: actor.companyId, action: failed ? 'payout_run.completed_with_failures' : 'payout_run.completed', entityType: 'payout_run', entityId: run.id, createdAt: day(item.submitted + 1, 9, ), metadata: JSON.stringify({ ...meta, actorName: 'Zapzive sandbox provider' }) },
                    ...(item.reconciled ? [{ companyId: actor.companyId, action: 'payout_run.reconciled', entityType: 'payout_run', entityId: run.id, createdAt: day(item.submitted + 3, 15), metadata: JSON.stringify(meta) }] : []),
                ],
            });
        }

        // October: a fresh draft built through the normal validation path, then submitted.
        const october = await tx.payoutRun.create({
            data: { companyId: actor.companyId, reference: await nextRunReference(tx, actor.companyId), name: 'October contractors', purpose: 'Monthly contractor payouts', scheduledFor: nextFriday(), fundingCurrency: 'USD', createdById: actor.id, createdByName: actor.name, isSample: true },
        });
        for (const { id, spec } of recipients.values()) {
            if (spec.key === 'peter') continue; // Peter's September payout is still an open exception.
            await tx.movement.create({ data: { companyId: actor.companyId, runId: october.id, reference: movementReference(), recipientId: id, recipientName: spec.name, externalReference: `OCT-2026-${spec.key}`, amountMinor: parseMinor(spec.pay[2], spec.currency), currency: spec.currency, payoutMethod: spec.method, country: spec.country, requestedById: actor.id, isSample: true } });
        }
        await revalidateRun(tx, october);
        // Acknowledge the reviewed warnings (changed details, unusual amount) the way an operator would, then submit.
        const lines = await tx.movement.findMany({ where: { runId: october.id } });
        for (const line of lines) {
            const warnings = (JSON.parse(line.validationIssues ?? '[]') as Array<{ code: string; severity: string }>).filter((issue) => issue.severity === 'warning').map((issue) => issue.code);
            await tx.movement.update({ where: { id: line.id }, data: { acknowledgedIssues: JSON.stringify(warnings), state: 'awaiting_approval' } });
        }
        const refreshed = await tx.payoutRun.findUniqueOrThrow({ where: { id: october.id } });
        await tx.payoutRun.update({ where: { id: october.id }, data: { status: 'awaiting_approval', requiredApprovals: Math.max(1, refreshed.requiredApprovals), submittedById: actor.id, submittedAt: day(0, 8) } });
        await recordEvent(tx, actor, actor.companyId, 'payout_run.submitted', 'payout_run', october.id, { sample: true, reference: october.reference, name: october.name, payouts: lines.length, policy: refreshed.policySummary });

        const funding = await getFunding(tx, actor.companyId, 'USD');
        const topUp = 3_000_000; // USD 30,000.00
        await tx.fundingAccount.update({ where: { id: funding.id }, data: { availableMinor: { increment: topUp } } });
        await recordEvent(tx, actor, actor.companyId, 'funding.sandbox_added', 'funding', funding.id, { sample: true, amount: formatMinor(topUp, 'USD') });
        await recordEvent(tx, actor, actor.companyId, 'sandbox.sample_loaded', 'workspace', actor.companyId, { recipients: RECIPIENTS.length, runs: 3 });
    }, { timeout: 30_000 });
}

export async function removeSampleScenario(actor: Actor) {
    await prisma.$transaction(async (tx) => {
        const runs = await tx.payoutRun.findMany({ where: { companyId: actor.companyId, isSample: true }, select: { id: true } });
        const runIds = runs.map((run) => run.id);
        const inFlight = await tx.movement.count({ where: { runId: { in: runIds }, state: { in: ['queued', 'processing'] } } });
        if (inFlight) throw new ApiError(409, 'SAMPLE_IN_FLIGHT', 'Wait for sample payouts that are processing to finish before removing sample data.');
        await tx.approval.deleteMany({ where: { runId: { in: runIds } } });
        await tx.movement.deleteMany({ where: { companyId: actor.companyId, OR: [{ runId: { in: runIds } }, { isSample: true }] } });
        await tx.payoutRun.deleteMany({ where: { id: { in: runIds } } });
        const sampleRecipients = await tx.worker.findMany({ where: { companyId: actor.companyId, isSample: true }, select: { id: true } });
        for (const recipient of sampleRecipients) {
            const used = await tx.movement.count({ where: { recipientId: recipient.id } });
            const legacy = await tx.payrollPayment.count({ where: { workerId: recipient.id } });
            if (!used && !legacy) await tx.worker.delete({ where: { id: recipient.id } });
        }
        await recordEvent(tx, actor, actor.companyId, 'sandbox.sample_removed', 'workspace', actor.companyId, { runs: runIds.length });
    }, { timeout: 30_000 });
}

export async function addSandboxFunds(actor: Actor, amount: string, currency = 'USD') {
    const company = await prisma.company.findUnique({ where: { id: actor.companyId } });
    if (!company?.isTestMode) throw new ApiError(403, 'SANDBOX_ONLY', 'Sandbox funds can only be added in a sandbox workspace. Live funding comes from your connected provider.');
    const minor = parseMinor(amount, currency);
    if (minor > 100_000_000) throw new ApiError(422, 'AMOUNT_TOO_LARGE', 'Add at most USD 1,000,000 of sandbox funds at a time.');
    return prisma.$transaction(async (tx) => {
        const funding = await getFunding(tx, actor.companyId, currency);
        if (funding.availableMinor + funding.reservedMinor + minor > 1_000_000_000) throw new ApiError(422, 'SANDBOX_LIMIT', 'Sandbox funding is capped at USD 10,000,000 per workspace.');
        const updated = await tx.fundingAccount.update({ where: { id: funding.id }, data: { availableMinor: { increment: minor } } });
        await recordEvent(tx, actor, actor.companyId, 'funding.sandbox_added', 'funding', funding.id, { amount: formatMinor(minor, currency) });
        return updated;
    });
}
