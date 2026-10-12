import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '../src/lib/security';
import { convertMinor, crossRate, formatMinor, parseMinor, percentOf, tryParseMinor } from '../src/payouts/money';
import { SANDBOX_RATES_PER_USD, cleanDetails, corridorFor, detailProblems, maskDestination, normalizePhone } from '../src/payouts/catalog';
import { assertMovementTransition, assertRunTransition, canTransitionMovement, canTransitionRun } from '../src/payouts/states';
import { DEFAULT_POLICY, evaluatePolicy } from '../src/payouts/policy';
import { summarizeIssues, validateLines, type LineInput } from '../src/payouts/validation';
import { sandboxProvider } from '../src/payouts/providers/sandbox';

const code = (expected: string) => (error: unknown) => error instanceof ApiError && error.code === expected;

test('amounts parse exactly into minor units', () => {
    assert.equal(parseMinor('48,200', 'KES'), 4_820_000);
    assert.equal(parseMinor('48200.5', 'KES'), 4_820_050);
    assert.equal(parseMinor('3000000', 'UGX'), 3_000_000);
    assert.equal(parseMinor('0.10', 'USD'), 10);
    assert.throws(() => parseMinor('1.005', 'USD'), code('INVALID_AMOUNT_PRECISION'));
    assert.throws(() => parseMinor('10.5', 'UGX'), code('INVALID_AMOUNT_PRECISION'));
    assert.throws(() => parseMinor('0', 'KES'), code('INVALID_AMOUNT'));
    assert.throws(() => parseMinor('-5', 'KES'), code('INVALID_AMOUNT'));
    assert.throws(() => parseMinor('1e5', 'KES'), code('INVALID_AMOUNT'));
    assert.equal(tryParseMinor('abc', 'KES'), null);
});

test('formatting and conversion avoid float drift', () => {
    assert.equal(formatMinor(494_000_000, 'KES'), 'KES 4,940,000.00');
    assert.equal(formatMinor(3_000_000, 'UGX'), 'UGX 3,000,000');
    // KES 129,200.00 at 129.2 KES/USD is exactly USD 1,000.00
    assert.equal(convertMinor(12_920_000, 'KES', 'USD', SANDBOX_RATES_PER_USD), 100_000);
    // Funding costs round up so the operator is never under-funded.
    assert.equal(convertMinor(100, 'KES', 'USD', SANDBOX_RATES_PER_USD, true), 1);
    assert.equal(crossRate('USD', 'KES', SANDBOX_RATES_PER_USD), '129.2');
    assert.equal(percentOf(10_001, 50), 51);
});

test('corridors and payout details are validated', () => {
    assert.deepEqual(corridorFor('KE', 'KES', 'mpesa'), { ok: true });
    assert.equal(corridorFor('NG', 'NGN', 'mpesa').ok, false);
    assert.equal(corridorFor('KE', 'UGX', 'mpesa').ok, false);
    assert.equal(corridorFor(null, 'USDC', 'usdc_wallet').ok, true);
    assert.equal(corridorFor('KE', 'USD', 'usdc_wallet').ok, false);
    assert.equal(normalizePhone('0712 345 678', 'KE'), '+254712345678');
    assert.deepEqual(detailProblems('mpesa', { phone: '+254712345678' }, 'KE'), []);
    assert.equal(detailProblems('mpesa', { phone: '+256772123456' }, 'KE').length, 1);
    assert.equal(detailProblems('mobile_money', { phone: '+254712345678' }, 'UG').length, 1);
    assert.equal(detailProblems('bank', { bankName: 'KCB', accountNumber: '12' }, 'KE').length, 1);
    assert.equal(detailProblems('usdc_wallet', { walletAddress: '0x1234', network: 'base' }, null).length, 1);
    assert.equal(detailProblems('usdc_wallet', { walletAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', network: 'solana' }, null).length, 1);
    assert.deepEqual(cleanDetails('bank', { bankName: ' KCB ', accountNumber: '1100 2233 44' }, 'KE'), { bankName: 'KCB', accountNumber: '1100223344' });
    assert.equal(maskDestination('bank', { bankName: 'KCB', accountNumber: '1100223344' }), 'KCB · ••••3344');
});

test('lifecycle transitions are explicit', () => {
    assert.ok(canTransitionRun('ready', 'awaiting_approval'));
    assert.ok(canTransitionRun('awaiting_approval', 'rejected'));
    assert.ok(!canTransitionRun('draft', 'approved'));
    assert.ok(!canTransitionRun('completed', 'processing'));
    assert.throws(() => assertRunTransition('processing', 'cancelled'), code('INVALID_RUN_TRANSITION'));
    assert.ok(canTransitionMovement('failed', 'queued'));
    assert.ok(canTransitionMovement('approved', 'on_hold'));
    assert.ok(!canTransitionMovement('delivered', 'failed'));
    assert.throws(() => assertMovementTransition('ready', 'delivered'), code('INVALID_MOVEMENT_TRANSITION'));
});

test('approval policy explains its decision', () => {
    const small = evaluatePolicy(DEFAULT_POLICY, [{ amountMinor: 5_000_000, currency: 'KES', isNewRecipient: false, detailsChanged: false }]);
    assert.equal(small.requiredApprovals, 0);
    const medium = evaluatePolicy(DEFAULT_POLICY, [{ amountMinor: 50_000_000, currency: 'KES', isNewRecipient: false, detailsChanged: false }]);
    assert.equal(medium.requiredApprovals, 1);
    assert.match(medium.summary, /one approver/);
    const large = evaluatePolicy(DEFAULT_POLICY, [{ amountMinor: 1_200_000_000, currency: 'KES', isNewRecipient: false, detailsChanged: false }]);
    assert.equal(large.requiredApprovals, 2);
    const changed = evaluatePolicy(DEFAULT_POLICY, [{ amountMinor: 100_000, currency: 'KES', isNewRecipient: false, detailsChanged: true }]);
    assert.equal(changed.requiredApprovals, 1);
    // Cross-currency totals are converted into the policy currency (USD 1,000 = KES 129,200).
    assert.equal(evaluatePolicy(DEFAULT_POLICY, [{ amountMinor: 100_000, currency: 'USD', isNewRecipient: false, detailsChanged: false }]).totalInPolicyCurrencyMinor, 12_920_000);
});

const line = (overrides: Partial<LineInput>): LineInput => ({
    id: 'l1', recipientId: 'r1', recipientName: 'Amina', recipientStatus: 'active', verification: 'verified', amountMinor: 14_800_000, currency: 'KES',
    payoutMethod: 'mpesa', details: { phone: '+254712345601' }, country: 'KE', externalReference: null, detailsUpdatedAt: null, ...overrides,
});

test('validation finds blocking problems and reviewable warnings', () => {
    const history = new Map([['r1', { deliveredAmountsMinor: [14_000_000, 14_200_000], paidReferences: new Set(['sep-2026']), lastDeliveredAt: new Date('2026-09-26') }]]);
    const lines = [
        line({ id: 'ok' }),
        line({ id: 'unknown', recipientId: null, recipientName: 'Ghost' }),
        line({ id: 'badphone', recipientId: 'r2', details: { phone: '123' } }),
        line({ id: 'anomaly', amountMinor: 140_000_000, payoutMethod: 'bank', details: { bankName: 'KCB', accountNumber: '1100223344' } }),
        line({ id: 'dupref', recipientId: 'r1', externalReference: 'SEP-2026' }),
        line({ id: 'changed', detailsUpdatedAt: new Date('2026-10-07') }),
        line({ id: 'limit', recipientId: 'r3', amountMinor: 30_000_000 }),
    ];
    const issues = validateLines(lines, history);
    const codes = (id: string) => issues.get(id)!.map((issue) => issue.code);
    assert.ok(!codes('unknown').includes('new_recipient'));
    assert.ok(codes('unknown').includes('unknown_recipient'));
    assert.ok(codes('badphone').includes('invalid_payout_details'));
    assert.ok(codes('anomaly').includes('amount_anomaly'));
    assert.ok(codes('dupref').includes('already_paid_reference'));
    assert.ok(codes('changed').includes('details_changed'));
    assert.ok(codes('limit').includes('method_limit'));
    assert.ok(codes('ok').includes('duplicate_recipient')); // r1 appears several times in this run
    const summary = summarizeIssues(lines.map((item) => issues.get(item.id)!));
    assert.equal(summary.total, 7);
    assert.ok(summary.needsCorrection >= 3);
});

test('sandbox provider is deterministic and labelled', () => {
    const quote = sandboxProvider.quote({ sourceCurrency: 'USD', destinationCurrency: 'KES', destinationAmountMinor: 12_920_000, payoutMethod: 'mpesa', country: 'KE' });
    assert.equal(quote.principalMinor, 100_000);
    assert.equal(quote.feeMinor, 500); // 0.5% of USD 1,000
    assert.equal(quote.totalMinor, 100_500);
    assert.ok(quote.sandbox);
    const base = { movementId: 'm', reference: 'MV-1', payoutMethod: 'mpesa', destinationAmountMinor: 100, currency: 'KES' };
    assert.equal(sandboxProvider.settle({ ...base, details: { phone: '+254712340000' } }).status, 'failed');
    assert.equal(sandboxProvider.settle({ ...base, details: { phone: '+254712345601' } }).status, 'delivered');
    assert.match(sandboxProvider.submit({ ...base, details: null }).providerReference, /^SBX-[0-9A-F]{10}$/);
});

import { normalizeAmountText } from '../src/payouts/money';
import { validateScheduledFor } from '../src/payouts/runs';

test('spreadsheet amounts are normalised, ambiguous ones are never guessed', () => {
    assert.equal(normalizeAmountText('KES 150,000'), '150000');
    assert.equal(normalizeAmountText('150 000'), '150000');
    assert.equal(normalizeAmountText('1,000/='), '1000');
    assert.equal(normalizeAmountText('Ksh 2,500.50'), '2500.50');
    assert.equal(normalizeAmountText('1.250,75'), '1250.75');
    assert.equal(normalizeAmountText('1.250.000'), '1250000');
    // "1.250" could be 1.25 or 1,250: kept as a decimal so precision checks reject it for KES.
    assert.equal(parseMinor('1.25', 'KES'), 125);
    assert.equal(tryParseMinor('1.250', 'KES'), null);
    assert.equal(normalizeAmountText('-50'), null);
    assert.equal(normalizeAmountText('(30)'), null);
    assert.equal(normalizeAmountText('abc'), null);
    assert.equal(parseMinor('KES 48,200', 'KES'), 4_820_000);
});

test('validation catches ambiguity and double-payment risks', () => {
    const history = new Map([['r1', { deliveredAmountsMinor: [14_800_000, 14_800_000], paidReferences: new Set<string>(), lastDeliveredAt: new Date(Date.now() - 3 * 86_400_000), recentDeliveries: [{ amountMinor: 14_800_000, currency: 'KES', deliveredAt: new Date(Date.now() - 3 * 86_400_000), externalReference: 'SEP-1' }] }]]);
    const issues = validateLines([
        line({ id: 'ambiguous', recipientId: null, recipientName: 'John Doe', ambiguousName: true }),
        line({ id: 'other-run', recipientId: 'r2', otherOpenRuns: ['PR-1004'] }),
        line({ id: 'repeat', recipientId: 'r1', externalReference: 'OCT-1' }),
    ], history);
    const codes = (id: string) => issues.get(id)!.map((issue) => issue.code);
    assert.deepEqual(codes('ambiguous'), ['ambiguous_recipient']);
    assert.ok(codes('other-run').includes('in_other_open_run'));
    assert.ok(codes('repeat').includes('recent_same_amount'));
    // Unknown recipients get one clear issue, not derived noise.
    assert.deepEqual(validateLines([line({ id: 'u', recipientId: null, payoutMethod: null, country: null })], new Map()).get('u')!.map((issue) => issue.code), ['unknown_recipient']);
});

test('held payouts can rejoin approval and processing dates are bounded', () => {
    assert.ok(canTransitionMovement('on_hold', 'awaiting_approval'));
    assert.throws(() => validateScheduledFor(new Date(Date.now() - 3 * 86_400_000)), code('DATE_IN_PAST'));
    assert.throws(() => validateScheduledFor(new Date(Date.now() + 400 * 86_400_000)), code('DATE_TOO_FAR'));
    assert.doesNotThrow(() => validateScheduledFor(new Date(Date.now() + 86_400_000)));
});
