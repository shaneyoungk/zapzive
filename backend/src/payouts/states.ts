// The single source of truth for payout-run and movement lifecycles.
// Every state change in the service layer goes through assertTransition.

import { ApiError } from '../lib/security';

export const RUN_STATES = ['draft', 'needs_correction', 'ready', 'awaiting_approval', 'approved', 'processing', 'completed', 'completed_with_failures', 'rejected', 'cancelled'] as const;
export type RunState = typeof RUN_STATES[number];

export const MOVEMENT_STATES = ['draft', 'needs_correction', 'ready', 'awaiting_approval', 'approved', 'queued', 'processing', 'delivered', 'failed', 'on_hold', 'cancelled', 'reversed', 'expired'] as const;
export type MovementState = typeof MOVEMENT_STATES[number];

const RUN_TRANSITIONS: Record<RunState, RunState[]> = {
    draft: ['needs_correction', 'ready', 'cancelled'],
    needs_correction: ['needs_correction', 'ready', 'draft', 'cancelled'],
    ready: ['ready', 'needs_correction', 'draft', 'awaiting_approval', 'approved', 'cancelled'],
    awaiting_approval: ['awaiting_approval', 'approved', 'rejected', 'cancelled'],
    approved: ['processing', 'cancelled', 'awaiting_approval'],
    processing: ['processing', 'completed', 'completed_with_failures'],
    completed_with_failures: ['processing', 'completed', 'completed_with_failures'],
    completed: [],
    rejected: ['draft', 'needs_correction', 'ready', 'cancelled'],
    cancelled: [],
};

const MOVEMENT_TRANSITIONS: Record<MovementState, MovementState[]> = {
    draft: ['needs_correction', 'ready', 'cancelled'],
    needs_correction: ['needs_correction', 'ready', 'cancelled'],
    ready: ['ready', 'needs_correction', 'awaiting_approval', 'approved', 'cancelled'],
    awaiting_approval: ['approved', 'ready', 'on_hold', 'cancelled'],
    approved: ['queued', 'on_hold', 'cancelled', 'ready', 'awaiting_approval'],
    queued: ['processing', 'failed'],
    processing: ['delivered', 'failed'],
    failed: ['queued', 'on_hold', 'cancelled'],
    on_hold: ['approved', 'awaiting_approval', 'queued', 'cancelled'],
    delivered: ['reversed'],
    cancelled: [],
    reversed: [],
    expired: [],
};

export function canTransitionRun(from: string, to: string): boolean {
    return (RUN_TRANSITIONS[from as RunState] ?? []).includes(to as RunState);
}

export function canTransitionMovement(from: string, to: string): boolean {
    return (MOVEMENT_TRANSITIONS[from as MovementState] ?? []).includes(to as MovementState);
}

export function assertRunTransition(from: string, to: string): void {
    if (!canTransitionRun(from, to)) throw new ApiError(409, 'INVALID_RUN_TRANSITION', `A payout run cannot move from "${from}" to "${to}".`);
}

export function assertMovementTransition(from: string, to: string): void {
    if (!canTransitionMovement(from, to)) throw new ApiError(409, 'INVALID_MOVEMENT_TRANSITION', `A payout cannot move from "${from}" to "${to}".`);
}

/** Runs whose line items can still be edited. */
export const EDITABLE_RUN_STATES: RunState[] = ['draft', 'needs_correction', 'ready', 'rejected'];
export const TERMINAL_MOVEMENT_STATES: MovementState[] = ['delivered', 'cancelled', 'reversed', 'expired'];
export const IN_FLIGHT_MOVEMENT_STATES: MovementState[] = ['queued', 'processing'];
export const EXCEPTION_MOVEMENT_STATES: MovementState[] = ['failed', 'on_hold'];
