import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isDiscoverable, lifecycleOf, remainingSpots, resolveBookingAction } from '../lib/events';
import type { DbEvent } from '../lib/types';

function base(overrides: Partial<DbEvent> = {}): DbEvent {
  const now = Date.now();
  return {
    id: 'e1',
    ownerId: 'u1',
    title: 'Test',
    class: 'event',
    category: 'Technology',
    description: 'desc',
    coverKey: '',
    coverUrl: '',
    startAt: new Date(now + 3600_000).toISOString(),
    endAt: new Date(now + 7200_000).toISOString(),
    timezone: 'UTC',
    registrationDeadline: '',
    attendance: 'physical',
    venueName: 'Hall',
    country: 'NG',
    city: 'Lagos',
    address: '',
    directions: '',
    accessibility: '',
    onlinePlatform: '',
    onlineAccess: '',
    pricing: 'free',
    priceAmount: null,
    priceAmountMinor: null,
    currency: '',
    capacityType: 'limited',
    capacity: 10,
    bookingMethod: 'request',
    spotsPerBooking: 1,
    eligibility: '',
    waitlistEnabled: false,
    cancellationPolicy: 'x',
    refundTerms: '',
    attendanceRules: '',
    organizerContact: 'x',
    publicListing: true,
    status: 'published',
    moderationNote: '',
    programItems: [],
    extraContacts: [],
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
    publishedAt: new Date(now).toISOString(),
    ...overrides,
  };
}

describe('listing lifecycle', () => {
  it('derives upcoming / happening / completed from server time', () => {
    const now = Date.now();
    assert.equal(lifecycleOf(base(), now), 'upcoming');
    assert.equal(
      lifecycleOf(
        base({
          startAt: new Date(now - 1000).toISOString(),
          endAt: new Date(now + 1000).toISOString(),
        }),
        now,
      ),
      'happening',
    );
    assert.equal(
      lifecycleOf(
        base({
          startAt: new Date(now - 2000).toISOString(),
          endAt: new Date(now - 1000).toISOString(),
        }),
        now,
      ),
      'completed',
    );
  });

  it('maps cancelled and suspended regardless of dates', () => {
    assert.equal(lifecycleOf(base({ status: 'cancelled' })), 'cancelled');
    assert.equal(lifecycleOf(base({ status: 'suspended' })), 'suspended');
  });

  it('only published + public + active listings are discoverable', () => {
    const now = Date.now();
    assert.equal(isDiscoverable(base(), now), true);
    assert.equal(isDiscoverable(base({ status: 'draft' }), now), false);
    assert.equal(isDiscoverable(base({ status: 'pending' }), now), false);
    assert.equal(isDiscoverable(base({ status: 'cancelled' }), now), false);
    assert.equal(isDiscoverable(base({ status: 'suspended' }), now), false);
    assert.equal(isDiscoverable(base({ status: 'rejected' }), now), false);
    assert.equal(isDiscoverable(base({ publicListing: false }), now), false);
    assert.equal(
      isDiscoverable(
        base({ startAt: new Date(now - 2000).toISOString(), endAt: new Date(now - 1000).toISOString() }),
        now,
      ),
      false,
    );
  });

  it('computes remaining spots only for limited events', () => {
    assert.equal(remainingSpots(base({ capacity: 10 }), 4), 6);
    assert.equal(remainingSpots(base({ capacity: 10 }), 10), 0);
    assert.equal(remainingSpots(base({ capacityType: 'unlimited', capacity: null }), 500), null);
  });

  it('resolves the correct booking action', () => {
    const now = Date.now();
    const event = base();
    assert.equal(
      resolveBookingAction({ event, confirmedUsed: 0, existing: null, userId: 'u2', nowMs: now }),
      'request',
    );
    assert.equal(
      resolveBookingAction({
        event: base({ bookingMethod: 'reserve' }),
        confirmedUsed: 0,
        existing: null,
        userId: 'u2',
        nowMs: now,
      }),
      'reserve',
    );
    assert.equal(
      resolveBookingAction({ event, confirmedUsed: 0, existing: null, userId: 'u1', nowMs: now }),
      'manage',
    );
    assert.equal(
      resolveBookingAction({
        event: base({ capacity: 2 }),
        confirmedUsed: 2,
        existing: null,
        userId: 'u2',
        nowMs: now,
      }),
      'soldout',
    );
    assert.equal(
      resolveBookingAction({
        event: base({ capacity: 2, waitlistEnabled: true }),
        confirmedUsed: 2,
        existing: null,
        userId: 'u2',
        nowMs: now,
      }),
      'waitlist',
    );
    assert.equal(
      resolveBookingAction({
        event: base({ registrationDeadline: new Date(now - 1000).toISOString() }),
        confirmedUsed: 0,
        existing: null,
        userId: 'u2',
        nowMs: now,
      }),
      'closed',
    );
    assert.equal(
      resolveBookingAction({
        event: base({ startAt: new Date(now - 2000).toISOString(), endAt: new Date(now - 1000).toISOString() }),
        confirmedUsed: 0,
        existing: null,
        userId: 'u2',
        nowMs: now,
      }),
      'ended',
    );
  });
});
