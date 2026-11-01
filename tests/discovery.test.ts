import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { distinctCategories, distinctCountries, eligibleCounts, getEventById, listEvents, updateEvent } from '../lib/repo';
import { cleanupDb, isolateDb, makeEvent, makeUser } from './helpers';

const file = isolateDb('discovery');
after(() => cleanupDb(file));

describe('event discovery', () => {
  it('excludes drafts, cancelled, suspended and ended listings from eligibility', async () => {
    const owner = await makeUser({ email: `disc-own-${Date.now()}@example.com` });
    const visible = await makeEvent(owner.id, { title: 'Visible Tech Meetup' });
    await makeEvent(owner.id, { title: 'Draft Meetup', status: 'draft' });
    await makeEvent(owner.id, { title: 'Cancelled Meetup', status: 'cancelled' });
    await makeEvent(owner.id, { title: 'Suspended Meetup', status: 'suspended' });
    await makeEvent(owner.id, {
      title: 'Ended Meetup',
      startAt: new Date(Date.now() - 7200_000).toISOString(),
      endAt: new Date(Date.now() - 3600_000).toISOString(),
    });
    await makeEvent(owner.id, { title: 'Hidden Meetup', publicListing: false });

    const { items, total } = await listEvents({ eligibleOnly: true, limit: 50 });
    const titles = items.map((e) => e.title);
    assert.ok(titles.includes('Visible Tech Meetup'));
    assert.ok(!titles.includes('Draft Meetup'));
    assert.ok(!titles.includes('Cancelled Meetup'));
    assert.ok(!titles.includes('Suspended Meetup'));
    assert.ok(!titles.includes('Ended Meetup'));
    assert.ok(!titles.includes('Hidden Meetup'));
    assert.equal(total, items.length);

    // Owner-scoped queries still see drafts (dashboard), without eligibility.
    const mine = await listEvents({ ownerId: owner.id, limit: 50 });
    assert.ok(mine.items.some((e) => e.id === visible.id));
    assert.ok(mine.items.some((e) => e.title === 'Draft Meetup'));
  });

  it('filters by class, pricing, attendance, country and city', async () => {
    const owner = await makeUser({ email: `disc-f-${Date.now()}@example.com` });
    await makeEvent(owner.id, {
      title: 'Accra Wedding Ceremony',
      class: 'ceremony',
      category: 'Culture',
      country: 'GH',
      city: 'Accra',
      attendance: 'physical',
      pricing: 'free',
    });
    await makeEvent(owner.id, {
      title: 'Nairobi Paid Webinar',
      class: 'event',
      category: 'Education',
      country: 'KE',
      city: 'Nairobi',
      attendance: 'online',
      pricing: 'paid',
      priceAmount: 10,
      currency: 'USD',
      venueName: '',
    });

    const ceremonies = await listEvents({ eligibleOnly: true, class: 'ceremony', q: 'Accra Wedding' });
    assert.equal(ceremonies.total, 1);

    const paid = await listEvents({ eligibleOnly: true, pricing: 'paid', q: 'Nairobi Paid Webinar' });
    assert.equal(paid.total, 1);

    const online = await listEvents({ eligibleOnly: true, attendance: 'online', q: 'Nairobi Paid Webinar' });
    assert.equal(online.total, 1);

    const ghana = await listEvents({ eligibleOnly: true, country: 'GH', q: 'Ceremony' });
    assert.equal(ghana.total, 1);

    const nairobi = await listEvents({ eligibleOnly: true, city: 'nairobi', q: 'Webinar' });
    assert.equal(nairobi.total, 1);
  });

  it('matches multi-token search across title, description, category and organizer', async () => {
    const owner = await makeUser({ email: `disc-q-${Date.now()}@example.com`, fullName: 'Ada Organizer' });
    await makeEvent(owner.id, {
      title: 'Kigali Health Summit',
      category: 'Health',
      description: 'Community health workers summit with workshops and clinics.',
      country: 'RW',
      city: 'Kigali',
    });
    const byTitle = await listEvents({ eligibleOnly: true, q: 'Kigali Summit' });
    assert.ok(byTitle.items.some((e) => e.title === 'Kigali Health Summit'));
    const byDesc = await listEvents({ eligibleOnly: true, q: 'workshops clinics' });
    assert.ok(byDesc.items.some((e) => e.title === 'Kigali Health Summit'));
    const byOrg = await listEvents({ eligibleOnly: true, q: 'Ada Organizer' });
    assert.ok(byOrg.items.some((e) => e.title === 'Kigali Health Summit'));
    const byOrgParam = await listEvents({ eligibleOnly: true, organizer: 'ada' });
    assert.ok(byOrgParam.items.some((e) => e.title === 'Kigali Health Summit'));
  });

  it('splits happening vs upcoming and sorts upcoming by nearest start', async () => {
    const owner = await makeUser({ email: `disc-t-${Date.now()}@example.com` });
    const now = Date.now();
    await makeEvent(owner.id, {
      title: 'Live Now Event',
      startAt: new Date(now - 600_000).toISOString(),
      endAt: new Date(now + 600_000).toISOString(),
    });
    await makeEvent(owner.id, {
      title: 'Far Future Event',
      startAt: new Date(now + 30 * 24 * 3600_000).toISOString(),
      endAt: new Date(now + 30 * 24 * 3600_000 + 3600_000).toISOString(),
    });
    await makeEvent(owner.id, {
      title: 'Near Future Event',
      startAt: new Date(now + 24 * 3600_000).toISOString(),
      endAt: new Date(now + 24 * 3600_000 + 3600_000).toISOString(),
    });

    const happening = await listEvents({ eligibleOnly: true, time: 'happening', limit: 50 });
    assert.ok(happening.items.some((e) => e.title === 'Live Now Event'));
    assert.ok(!happening.items.some((e) => e.title === 'Near Future Event'));

    const upcoming = await listEvents({ eligibleOnly: true, time: 'upcoming', limit: 50 });
    const titles = upcoming.items.map((e) => e.title);
    assert.ok(titles.indexOf('Near Future Event') !== -1);
    assert.ok(titles.indexOf('Far Future Event') !== -1);
    assert.ok(titles.indexOf('Near Future Event') < titles.indexOf('Far Future Event'));
    assert.ok(!titles.includes('Live Now Event'));
  });

  it('paginates with stable totals', async () => {
    const first = await listEvents({ eligibleOnly: true, limit: 2, offset: 0 });
    const second = await listEvents({ eligibleOnly: true, limit: 2, offset: 2 });
    assert.equal(first.total, second.total);
    const ids = new Set([...first.items, ...second.items].map((e) => e.id));
    assert.equal(ids.size, first.items.length + second.items.length);
  });

  it('derives categories and countries only from eligible listings', async () => {
    const cats = await distinctCategories();
    const countries = await distinctCountries();
    assert.ok(cats.length > 0);
    assert.ok(countries.length > 0);
    assert.ok(!cats.includes(''));
    assert.ok(countries.every((c) => /^[A-Z]{2}$/.test(c)));
  });

  it('updates events and reads them back', async () => {
    const owner = await makeUser({ email: `disc-u-${Date.now()}@example.com` });
    const event = await makeEvent(owner.id, { title: 'Before Update' });
    await updateEvent(event.id, { title: 'After Update', city: 'Abuja' });
    const reread = await getEventById(event.id);
    assert.equal(reread?.title, 'After Update');
    assert.equal(reread?.city, 'Abuja');
  });

  it('filters sold-out events out of availableOnly', async () => {
    const owner = await makeUser({ email: `disc-a-${Date.now()}@example.com` });
    await makeEvent(owner.id, { title: 'Tiny Workshop', capacity: 1 });
    const { createBooking } = await import('../lib/repo');
    const tiny = (await listEvents({ eligibleOnly: true, q: 'Tiny Workshop' })).items[0];
    const attendee = await makeUser({ email: `disc-att-${Date.now()}@example.com` });
    await createBooking({ eventId: tiny.id, userId: attendee.id, spots: 1, status: 'confirmed' });

    const available = await listEvents({ eligibleOnly: true, availableOnly: true, q: 'Tiny Workshop', limit: 10 });
    assert.equal(available.total, 0);
    const all = await listEvents({ eligibleOnly: true, q: 'Tiny Workshop', limit: 10 });
    assert.equal(all.total, 1);
  });

  it('aggregates real counts over eligible listings only', async () => {
    const before = await eligibleCounts();
    const owner = await makeUser({ email: `disc-c-${Date.now()}@example.com` });
    await makeEvent(owner.id, { title: 'Counted Dakar Forum', category: 'Business', country: 'SN', city: 'Dakar' });
    await makeEvent(owner.id, { title: 'Uncounted Draft', category: 'Business', country: 'SN', status: 'draft' });
    const after = await eligibleCounts();
    assert.equal(after.total, before.total + 1);
    assert.equal(
      (after.byCategory['Business'] ?? 0),
      (before.byCategory['Business'] ?? 0) + 1,
    );
    assert.equal((after.byCountry['SN'] ?? 0), (before.byCountry['SN'] ?? 0) + 1);
    assert.ok(after.happening <= after.total);
  });
});
