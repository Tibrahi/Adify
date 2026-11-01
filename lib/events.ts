import type { Booking, BookingAction, DbEvent, Lifecycle } from './types';

// Listing lifecycle derived from stored status + server time.
// Never trusts client clocks; scheduled jobs are supplementary only.

// Single server-time source for renders (keeps components pure for the linter).
export function serverNowMs(): number {
  return Date.now();
}

export function lifecycleOf(event: DbEvent, nowMs: number = Date.now()): Lifecycle {
  if (event.status === 'cancelled') return 'cancelled';
  if (event.status === 'suspended') return 'suspended';
  const start = Date.parse(event.startAt);
  const end = Date.parse(event.endAt);
  if (Number.isFinite(end) && end <= nowMs) return 'completed';
  if (Number.isFinite(start) && start <= nowMs) return 'happening';
  return 'upcoming';
}

export function isDiscoverable(event: DbEvent, nowMs: number = Date.now()): boolean {
  if (event.status !== 'published' || !event.publicListing) return false;
  const life = lifecycleOf(event, nowMs);
  return life === 'upcoming' || life === 'happening';
}

export function remainingSpots(
  event: DbEvent,
  confirmedUsed: number,
): number | null {
  if (event.capacityType !== 'limited' || typeof event.capacity !== 'number') return null;
  return Math.max(0, event.capacity - confirmedUsed);
}

export interface BookingContext {
  event: DbEvent;
  confirmedUsed: number;
  existing: Booking | null;
  userId: string | null;
  nowMs?: number;
}

export function resolveBookingAction(ctx: BookingContext): BookingAction {
  const nowMs = ctx.nowMs ?? Date.now();
  const { event, existing, userId } = ctx;
  if (userId && event.ownerId === userId) return 'manage';
  if (existing && (existing.status === 'pending' || existing.status === 'confirmed' || existing.status === 'waitlisted')) {
    return 'manage';
  }
  const life = lifecycleOf(event, nowMs);
  if (life === 'cancelled' || life === 'suspended') return 'cancelled';
  if (life === 'completed') return 'ended';
  if (event.registrationDeadline && Date.parse(event.registrationDeadline) <= nowMs) return 'closed';
  const left = remainingSpots(event, ctx.confirmedUsed);
  if (left !== null && left <= 0) {
    return event.waitlistEnabled ? 'waitlist' : 'soldout';
  }
  return event.bookingMethod === 'reserve' ? 'reserve' : 'request';
}

export const BOOKING_ACTION_LABELS: Record<BookingAction, string> = {
  request: 'Request a Spot',
  reserve: 'Reserve a Spot',
  waitlist: 'Join Waitlist',
  closed: 'Registration Closed',
  soldout: 'Sold Out',
  ended: 'Event Ended',
  cancelled: 'Event Cancelled',
  manage: 'Manage Booking',
};
