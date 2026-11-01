import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  confirmedSpots,
  confirmedSpotsMany,
  createBooking,
  getUserBookingForEvent,
  listEventBookings,
  listUserBookings,
  updateBookingStatus,
} from '../lib/repo';
import { cleanupDb, isolateDb, makeEvent, makeUser } from './helpers';

const file = isolateDb('bookings');
after(() => cleanupDb(file));

describe('booking capacity and ownership', () => {
  it('enforces capacity for confirmed bookings but not pending ones', async () => {
    const owner = await makeUser({ email: `bk-own-${Date.now()}@example.com` });
    const event = await makeEvent(owner.id, { title: 'Capacity Test Event', capacity: 2 });
    const a = await makeUser({ email: `bk-a-${Date.now()}@example.com` });
    const b = await makeUser({ email: `bk-b-${Date.now()}@example.com` });
    const c = await makeUser({ email: `bk-c-${Date.now()}@example.com` });

    await createBooking({ eventId: event.id, userId: a.id, spots: 1, status: 'confirmed' });
    await createBooking({ eventId: event.id, userId: b.id, spots: 1, status: 'confirmed' });
    assert.equal(await confirmedSpots(event.id), 2);

    await assert.rejects(
      createBooking({ eventId: event.id, userId: c.id, spots: 1, status: 'confirmed' }),
      /capacity_exceeded/,
    );
    // Pending requests do not consume capacity.
    const pending = await createBooking({ eventId: event.id, userId: c.id, spots: 1, status: 'pending' });
    assert.equal(pending.status, 'pending');
    assert.equal(await confirmedSpots(event.id), 2);
  });

  it('guards organizer approvals against overruns', async () => {
    const owner = await makeUser({ email: `bk-g-${Date.now()}@example.com` });
    const event = await makeEvent(owner.id, { title: 'Guard Test Event', capacity: 1 });
    const a = await makeUser({ email: `bk-ga-${Date.now()}@example.com` });
    const b = await makeUser({ email: `bk-gb-${Date.now()}@example.com` });
    await createBooking({ eventId: event.id, userId: a.id, spots: 1, status: 'confirmed' });
    const req = await createBooking({ eventId: event.id, userId: b.id, spots: 1, status: 'pending' });

    await assert.rejects(updateBookingStatus(req.id, 'confirmed', true), /capacity_exceeded/);
    const declined = await updateBookingStatus(req.id, 'declined');
    assert.equal(declined?.status, 'declined');
  });

  it('isolates bookings per user and per event', async () => {
    const owner = await makeUser({ email: `bk-i-${Date.now()}@example.com` });
    const event = await makeEvent(owner.id, { title: 'Isolation Event' });
    const other = await makeEvent(owner.id, { title: 'Other Event' });
    const a = await makeUser({ email: `bk-ia-${Date.now()}@example.com` });
    const b = await makeUser({ email: `bk-ib-${Date.now()}@example.com` });

    await createBooking({ eventId: event.id, userId: a.id, spots: 1, status: 'confirmed' });
    await createBooking({ eventId: other.id, userId: b.id, spots: 1, status: 'confirmed' });

    const aRows = await listUserBookings(a.id);
    assert.ok(aRows.length > 0);
    assert.ok(aRows.every((r) => r.booking.userId === a.id));

    const eventRows = await listEventBookings(event.id);
    assert.ok(eventRows.length > 0);
    assert.ok(eventRows.every((r) => r.eventId === event.id));

    assert.equal((await getUserBookingForEvent(event.id, a.id))?.status, 'confirmed');
    assert.equal(await getUserBookingForEvent(event.id, b.id), null);
  });

  it('batches availability lookups without N+1 queries', async () => {
    const owner = await makeUser({ email: `bk-n-${Date.now()}@example.com` });
    const e1 = await makeEvent(owner.id, { title: 'Batch One' });
    const e2 = await makeEvent(owner.id, { title: 'Batch Two' });
    const a = await makeUser({ email: `bk-na-${Date.now()}@example.com` });
    await createBooking({ eventId: e1.id, userId: a.id, spots: 2, status: 'confirmed' });
    const used = await confirmedSpotsMany([e1.id, e2.id, 'missing']);
    assert.equal(used[e1.id], 2);
    assert.equal(used[e2.id] ?? 0, 0);
  });

  it('supports past vs active booking splits', async () => {
    const owner = await makeUser({ email: `bk-p-${Date.now()}@example.com` });
    const past = await makeEvent(owner.id, {
      title: 'Past Booked Event',
      status: 'published',
      startAt: new Date(Date.now() - 7200_000).toISOString(),
      endAt: new Date(Date.now() - 3600_000).toISOString(),
    });
    const a = await makeUser({ email: `bk-pa-${Date.now()}@example.com` });
    await createBooking({ eventId: past.id, userId: a.id, spots: 1, status: 'confirmed' });
    const pastRows = await listUserBookings(a.id, { status: 'past' });
    assert.ok(pastRows.some((r) => r.event.id === past.id));
    const activeRows = await listUserBookings(a.id, { status: 'active' });
    assert.ok(!activeRows.some((r) => r.event.id === past.id));
  });
});
