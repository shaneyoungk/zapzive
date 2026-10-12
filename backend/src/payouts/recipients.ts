// Recipients (stored in the Worker table). Changing payout details is a
// sensitive event: it is recorded, and in-flight payouts are put on hold.

import prisma from '../lib/prisma';
import { ApiError, safeEmail } from '../lib/security';
import { cleanDetails, corridorFor, countryCode, COUNTRIES, detailProblems, maskDestination, parseDetails, PAYOUT_METHODS, type PayoutDetails } from './catalog';
import { isSupportedCurrency } from './money';
import { EDITABLE_RUN_STATES } from './states';
import { type Actor, parseDetailsInput, recipientSummary, recordEvent, revalidateRun } from './core';
import { holdForChangedDetails } from './movements';

const RECIPIENT_TYPES = ['contractor', 'vendor', 'creator', 'freelancer', 'supplier', 'business'];

export interface RecipientInput {
    name?: string;
    email?: string;
    phone?: string;
    type?: string;
    title?: string;
    country?: string;
    payoutMethod?: string;
    payoutCurrency?: string;
    payoutDetails?: unknown;
}

function validatePayout(country: string | null, method: string | undefined, currency: string | undefined, details: PayoutDetails): void {
    if (!method) return;
    if (!(method in PAYOUT_METHODS)) throw new ApiError(422, 'UNSUPPORTED_METHOD', 'Choose a supported payout method.');
    if (!currency || !isSupportedCurrency(currency)) throw new ApiError(422, 'UNSUPPORTED_CURRENCY', 'Choose a supported payout currency.');
    const corridor = corridorFor(country, currency, method);
    if (!corridor.ok) throw new ApiError(422, 'UNSUPPORTED_ROUTE', corridor.reason);
    const problems = detailProblems(method, details, country);
    if (problems.length) throw new ApiError(422, 'INVALID_PAYOUT_DETAILS', problems[0], { problems });
}

export async function createRecipient(actor: Actor, input: RecipientInput) {
    const name = input.name?.trim();
    if (!name || name.length > 120) throw new ApiError(422, 'INVALID_NAME', 'Recipient name is required.');
    const email = safeEmail(input.email);
    const country = countryCode(input.country);
    if (!country) throw new ApiError(422, 'INVALID_COUNTRY', 'Choose a supported country.');
    const type = RECIPIENT_TYPES.includes(input.type ?? '') ? input.type! : 'contractor';
    const method = input.payoutMethod || undefined;
    const currency = input.payoutCurrency || (method === 'usdc_wallet' ? 'USDC' : COUNTRIES[country].currency);
    const details = method ? cleanDetails(method, parseDetailsInput(input.payoutDetails), country) : {};
    validatePayout(country, method, currency, details);

    return prisma.$transaction(async (tx) => {
        const existing = await tx.worker.findUnique({ where: { companyId_email: { companyId: actor.companyId, email } } });
        if (existing) throw new ApiError(409, 'RECIPIENT_EXISTS', 'A recipient with this email already exists.');
        const recipient = await tx.worker.create({
            data: {
                companyId: actor.companyId, name, email, phone: input.phone?.trim().slice(0, 30) ?? '', role: input.title?.trim().slice(0, 80) ?? '', country, wallet: '',
                kycStatus: 'unverified', recipientType: type, payoutMethod: method ?? null, payoutCurrency: method ? currency : null,
                payoutDetails: method ? JSON.stringify(details) : null, detailsUpdatedAt: method ? new Date() : null,
            },
        });
        await recordEvent(tx, actor, actor.companyId, 'recipient.created', 'recipient', recipient.id, { name, destination: maskDestination(method ?? null, method ? details : null) });
        return recipientSummary(recipient);
    }).catch((error: unknown) => {
        // Two concurrent creates with the same email: the database unique index decides.
        if ((error as { code?: string })?.code === 'P2002') throw new ApiError(409, 'RECIPIENT_EXISTS', 'A recipient with this email already exists.');
        throw error;
    });
}

export async function updateRecipient(actor: Actor, recipientId: string, input: RecipientInput) {
    return prisma.$transaction(async (tx) => {
        const recipient = await tx.worker.findFirst({ where: { id: recipientId, companyId: actor.companyId } });
        if (!recipient) throw new ApiError(404, 'RECIPIENT_NOT_FOUND', 'Recipient not found.');
        const country = input.country !== undefined ? countryCode(input.country) : countryCode(recipient.country);
        if (!country) throw new ApiError(422, 'INVALID_COUNTRY', 'Choose a supported country.');
        const method = input.payoutMethod !== undefined ? (input.payoutMethod || undefined) : recipient.payoutMethod ?? undefined;
        const currency = input.payoutCurrency !== undefined ? input.payoutCurrency : recipient.payoutCurrency ?? undefined;
        const previousDetails = parseDetails(recipient.payoutDetails);
        const details = input.payoutDetails !== undefined && method ? cleanDetails(method, parseDetailsInput(input.payoutDetails), country) : previousDetails ?? {};
        validatePayout(country, method, currency, details);

        if (input.email) {
            const email = safeEmail(input.email);
            const clash = await tx.worker.findFirst({ where: { companyId: actor.companyId, email, NOT: { id: recipient.id } }, select: { name: true } });
            if (clash) throw new ApiError(409, 'RECIPIENT_EXISTS', `${clash.name} already uses this email address. Each recipient needs their own email.`);
        }
        const detailsChanged = method !== (recipient.payoutMethod ?? undefined)
            || (currency ?? null) !== recipient.payoutCurrency
            || JSON.stringify(details) !== JSON.stringify(previousDetails ?? {});
        const updated = await tx.worker.update({
            where: { id: recipient.id },
            data: {
                name: input.name?.trim().slice(0, 120) || recipient.name,
                email: input.email ? safeEmail(input.email) : recipient.email,
                phone: input.phone !== undefined ? input.phone.trim().slice(0, 30) : recipient.phone,
                role: input.title !== undefined ? input.title.trim().slice(0, 80) : recipient.role,
                recipientType: RECIPIENT_TYPES.includes(input.type ?? '') ? input.type : recipient.recipientType,
                country,
                ...(detailsChanged ? { payoutMethod: method ?? null, payoutCurrency: method ? currency ?? null : null, payoutDetails: method ? JSON.stringify(details) : null, detailsUpdatedAt: new Date() } : {}),
            },
        });
        let held = 0;
        if (detailsChanged) {
            await recordEvent(tx, actor, actor.companyId, 'recipient.payout_details_changed', 'recipient', recipient.id, {
                name: updated.name, before: maskDestination(recipient.payoutMethod, previousDetails), after: maskDestination(method ?? null, method ? details : null),
            });
            held = await holdForChangedDetails(tx, actor, recipient.id);
        } else {
            await recordEvent(tx, actor, actor.companyId, 'recipient.updated', 'recipient', recipient.id, { name: updated.name });
        }
        const runs = await tx.payoutRun.findMany({ where: { companyId: actor.companyId, status: { in: EDITABLE_RUN_STATES }, movements: { some: { recipientId: recipient.id } } } });
        for (const run of runs) await revalidateRun(tx, run);
        return { recipient: recipientSummary(updated), detailsChanged, paymentsHeld: held };
    });
}

export async function setRecipientStatus(actor: Actor, recipientId: string, status: 'active' | 'archived') {
    return prisma.$transaction(async (tx) => {
        const recipient = await tx.worker.findFirst({ where: { id: recipientId, companyId: actor.companyId } });
        if (!recipient) throw new ApiError(404, 'RECIPIENT_NOT_FOUND', 'Recipient not found.');
        if (status === 'archived') {
            const active = await tx.movement.count({ where: { recipientId, state: { in: ['awaiting_approval', 'approved', 'queued', 'processing', 'on_hold'] } } });
            if (active) throw new ApiError(409, 'RECIPIENT_IN_USE', 'This recipient has payouts in progress. Finish or cancel them before archiving.');
        }
        const updated = await tx.worker.update({ where: { id: recipient.id }, data: { status } });
        await recordEvent(tx, actor, actor.companyId, status === 'archived' ? 'recipient.archived' : 'recipient.restored', 'recipient', recipient.id, { name: recipient.name });
        // Draft runs that include this recipient must reflect the change before anyone submits them.
        const runs = await tx.payoutRun.findMany({ where: { companyId: actor.companyId, status: { in: EDITABLE_RUN_STATES }, movements: { some: { recipientId: recipient.id } } } });
        for (const run of runs) await revalidateRun(tx, run);
        return recipientSummary(updated);
    });
}

/**
 * Sandbox verification: checks that payout details are complete and routable.
 * It is a format check, not identity verification, and is labelled as such.
 */
export async function verifyRecipient(actor: Actor, recipientId: string) {
    return prisma.$transaction(async (tx) => {
        const recipient = await tx.worker.findFirst({ where: { id: recipientId, companyId: actor.companyId } });
        if (!recipient) throw new ApiError(404, 'RECIPIENT_NOT_FOUND', 'Recipient not found.');
        const country = countryCode(recipient.country);
        const details = parseDetails(recipient.payoutDetails);
        const problems = !recipient.payoutMethod ? ['No payout method on file.'] : [
            ...(() => { const corridor = corridorFor(country, recipient.payoutCurrency ?? '', recipient.payoutMethod!); return corridor.ok ? [] : [corridor.reason]; })(),
            ...detailProblems(recipient.payoutMethod, details, country),
        ];
        const status = problems.length ? 'failed' : 'verified';
        const updated = await tx.worker.update({ where: { id: recipient.id }, data: { kycStatus: status, verifiedAt: status === 'verified' ? new Date() : null } });
        await recordEvent(tx, actor, actor.companyId, status === 'verified' ? 'recipient.verified' : 'recipient.verification_failed', 'recipient', recipient.id, { name: recipient.name, check: 'sandbox format check', problems });
        const runs = await tx.payoutRun.findMany({ where: { companyId: actor.companyId, status: { in: EDITABLE_RUN_STATES }, movements: { some: { recipientId: recipient.id } } } });
        for (const run of runs) await revalidateRun(tx, run);
        return { recipient: recipientSummary(updated), problems };
    });
}
