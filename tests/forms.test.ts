import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseEventForm, publicationErrors } from '../lib/event-form';
import { isSmtpConfigured, sendMail } from '../lib/email';
import { validateImage } from '../lib/storage';
import type { DbEvent } from '../lib/types';

// Builds the exact field set the EventWizard submits.
function wizardForm(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  const base: Record<string, string> = {
    title: 'Lagos Tech Gathering',
    class: 'event',
    category: 'Technology',
    description: 'A sufficiently long description of this technology gathering for form testing.',
    timezone: 'Africa/Lagos',
    attendance: 'physical',
    pricing: 'free',
    capacityType: 'limited',
    startDate: '2026-12-01',
    startTime: '10:00',
    endDate: '2026-12-01',
    endTime: '13:00',
    deadlineDate: '',
    deadlineTime: '',
    venueName: 'Test Hall',
    country: 'NG',
    city: 'Lagos',
    address: '',
    directions: '',
    accessibility: '',
    onlinePlatform: '',
    onlineAccess: '',
    priceAmount: '',
    currency: '',
    capacity: '100',
    bookingMethod: 'request',
    spotsPerBooking: '2',
    eligibility: '',
    cancellationPolicy: 'Cancel anytime before the event.',
    refundTerms: '',
    attendanceRules: '',
    organizerContact: 'organizer@example.com',
    programIds: '',
    contactIds: '',
    submit: 'publish',
    ...overrides,
  };
  for (const [k, v] of Object.entries(base)) fd.append(k, v);
  fd.append('publicListing', 'on');
  fd.append('waitlistEnabled', 'on');
  return fd;
}

describe('event form parsing (wizard contract)', () => {
  it('parses a complete physical event with no errors', () => {
    const parsed = parseEventForm(wizardForm());
    assert.deepEqual(parsed.fieldErrors, {});
    assert.equal(parsed.data.title, 'Lagos Tech Gathering');
    assert.equal(parsed.data.country, 'NG');
    assert.equal(parsed.data.capacity, 100);
    assert.equal(parsed.coverFile, null);
    // Africa/Lagos is UTC+1: 10:00 local becomes 09:00Z.
    assert.equal(parsed.data.startAt, '2026-12-01T09:00:00.000Z');
    assert.equal(parsed.data.endAt, '2026-12-01T12:00:00.000Z');
  });

  it('requires venue details for physical/hybrid and platform for online', () => {
    const noVenue = parseEventForm(wizardForm({ venueName: '', city: '', country: '' }));
    assert.ok(noVenue.fieldErrors.venueName);
    assert.ok(noVenue.fieldErrors.city);
    assert.ok(noVenue.fieldErrors.country);

    const online = parseEventForm(
      wizardForm({ attendance: 'online', onlinePlatform: 'Zoom', onlineAccess: 'Link after booking' }),
    );
    assert.deepEqual(online.fieldErrors, {});

    const onlineBare = parseEventForm(wizardForm({ attendance: 'online' }));
    assert.ok(onlineBare.fieldErrors.onlinePlatform);
    assert.ok(onlineBare.fieldErrors.onlineAccess);
  });

  it('validates schedule relationships and deadlines', () => {
    const flipped = parseEventForm(wizardForm({ endDate: '2026-11-01', endTime: '09:00' }));
    assert.ok(flipped.fieldErrors.endDate);

    const badDeadline = parseEventForm(wizardForm({ deadlineDate: '2026-12-02', deadlineTime: '10:00' }));
    assert.ok(badDeadline.fieldErrors.deadlineDate);

    const okDeadline = parseEventForm(wizardForm({ deadlineDate: '2026-11-30', deadlineTime: '23:59' }));
    assert.deepEqual(okDeadline.fieldErrors, {});
  });

  it('validates paid pricing and limited capacity', () => {
    const paidBare = parseEventForm(wizardForm({ pricing: 'paid' }));
    assert.ok(paidBare.fieldErrors.priceAmount);
    assert.ok(paidBare.fieldErrors.currency);

    const paid = parseEventForm(wizardForm({ pricing: 'paid', priceAmount: '1500', currency: 'ngn' }));
    assert.deepEqual(paid.fieldErrors, {});
    assert.equal(paid.data.priceAmountMinor, 150000);
    assert.equal(paid.data.priceAmount, null);
    assert.equal(paid.data.currency, 'NGN');

    const unknownCurrency = parseEventForm(wizardForm({ pricing: 'paid', priceAmount: '10', currency: 'ZZZ' }));
    assert.ok(unknownCurrency.fieldErrors.currency);

    const noCapacity = parseEventForm(wizardForm({ capacity: '0' }));
    assert.ok(noCapacity.fieldErrors.capacity);

    const unlimited = parseEventForm(wizardForm({ capacityType: 'unlimited', capacity: '' }));
    assert.deepEqual(unlimited.fieldErrors, {});
    assert.equal(unlimited.data.capacity, null);
  });

  it('rejects bad enums, timezones and short content', () => {
    const bad = parseEventForm(
      wizardForm({ class: 'party', category: 'Nope', timezone: 'Mars/Olympus', title: 'x', description: 'short' }),
    );
    assert.ok(bad.fieldErrors.class);
    assert.ok(bad.fieldErrors.category);
    assert.ok(bad.fieldErrors.timezone);
    assert.ok(bad.fieldErrors.title);
    assert.ok(bad.fieldErrors.description);
  });

  it('requires cancellation policy and organizer contact', () => {
    const parsed = parseEventForm(wizardForm({ cancellationPolicy: '', organizerContact: '' }));
    assert.ok(parsed.fieldErrors.cancellationPolicy);
    assert.ok(parsed.fieldErrors.organizerContact);
  });

  it('parses dynamic program items and contacts with stable ids', () => {
    const fd = wizardForm({ programIds: 'p1,p2', contactIds: 'c1' });
    fd.append('program_title_p1', 'Opening');
    fd.append('program_detail_p1', 'Doors open');
    fd.append('program_title_p2', 'Keynote');
    fd.append('program_detail_p2', '');
    fd.append('contact_name_c1', 'Ada');
    fd.append('contact_detail_c1', 'ada@example.com');
    const parsed = parseEventForm(fd);
    assert.deepEqual(parsed.fieldErrors, {});
    assert.equal(parsed.data.programItems.length, 2);
    assert.equal(parsed.data.programItems[0].id, 'p1');
    assert.equal(parsed.data.programItems[1].title, 'Keynote');
    assert.equal(parsed.data.extraContacts.length, 1);
    assert.equal(parsed.data.extraContacts[0].name, 'Ada');
  });

  it('extracts an uploaded cover file when present', () => {
    const fd = wizardForm();
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );
    fd.append('cover', new File([png], 'cover.png', { type: 'image/png' }));
    const parsed = parseEventForm(fd);
    assert.deepEqual(parsed.fieldErrors, {});
    assert.ok(parsed.coverFile);
    assert.equal(parsed.coverFile?.name, 'cover.png');
  });
});

describe('publication gating', () => {
  function publishedLike(overrides: Partial<DbEvent> = {}): DbEvent {
    const now = Date.now();
    return {
      id: 'e', ownerId: 'u', title: 'Complete Event', class: 'event', category: 'Business',
      description: 'A complete description that is long enough to pass validation checks.',
      coverKey: '', coverUrl: '', startAt: new Date(now + 86400000).toISOString(),
      endAt: new Date(now + 90000000).toISOString(), timezone: 'UTC', registrationDeadline: '',
      attendance: 'physical', venueName: 'Hall', country: 'NG', city: 'Lagos', address: '',
      directions: '', accessibility: '', onlinePlatform: '', onlineAccess: '', pricing: 'free',
      priceAmount: null, priceAmountMinor: null, currency: '', capacityType: 'limited', capacity: 10,
      bookingMethod: 'request', spotsPerBooking: 1, eligibility: '', waitlistEnabled: false,
      cancellationPolicy: 'Policy', refundTerms: '', attendanceRules: '',
      organizerContact: 'org@example.com', publicListing: true, status: 'draft',
      moderationNote: '', programItems: [], extraContacts: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), publishedAt: null,
      ...overrides,
    };
  }

  it('publishes only complete, future, public listings', () => {
    assert.deepEqual(publicationErrors(publishedLike()), []);
    const now = Date.now();
    assert.ok(publicationErrors(publishedLike({
      startAt: new Date(now - 7200000).toISOString(),
      endAt: new Date(now - 3600000).toISOString(),
    })).includes('end_in_past'));
    assert.ok(publicationErrors(publishedLike({ venueName: '' })).includes('venue'));
    assert.ok(publicationErrors(publishedLike({ publicListing: false })).includes('public_listing'));
    assert.ok(
      publicationErrors(publishedLike({ pricing: 'paid', priceAmountMinor: null, currency: '' })).includes('price'),
    );
    assert.deepEqual(publicationErrors(publishedLike({ pricing: 'paid', priceAmountMinor: 5000, currency: 'USD' })), []);
    assert.ok(
      publicationErrors(
        publishedLike({ attendance: 'online', onlinePlatform: '', onlineAccess: '' }),
      ).includes('online'),
    );
  });
});

describe('cover validation and mail safety', () => {
  const png1x1 = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );

  it('accepts real images and rejects spoofed or oversized uploads', () => {
    assert.deepEqual(validateImage(png1x1, 'image/png'), { ext: 'png', mime: 'image/png' });
    assert.throws(() => validateImage(Buffer.from('not-an-image'), 'image/png'), /cover_invalid_type/);
    assert.throws(() => validateImage(png1x1, 'image/jpeg'), /cover_invalid_type/);
    assert.throws(() => validateImage(Buffer.alloc(6 * 1024 * 1024), 'image/png'), /cover_too_large/);
  });

  it('refuses email header injection without sending', async () => {
    assert.equal(isSmtpConfigured(), false);
    await assert.rejects(
      sendMail({ to: 'a@example.com', subject: 'hi\r\nBcc: evil@example.com', text: 'x' }),
      /invalid_email_headers/,
    );
  });
});
