import { fromZonedTime } from 'date-fns-tz';
import { countryByCode } from './countries';
import { isKnownCurrencyCode } from './currency';
import type { NewEvent } from './repo';
import type { DbEvent, ExtraContact, ProgramItem } from './types';
import { EVENT_CATEGORIES } from './types';
import { clampInt, isValidTimezone } from './validate';

// Pure event-form pipeline (no request scope): parses the wizard payload and
// lists missing publication requirements. Used by server actions and tests.

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === 'string' ? v.trim() : '';
}

// Decimal string -> integer minor units using string math only (no float).
// Returns null for anything that is not digits with up to 2 decimals.
export function parseMinorAmount(raw: string): number | null {
  const value = raw.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return null;
  const [major, frac = ''] = value.split('.');
  const minor = Number(major) * 100 + Number((frac + '00').slice(0, 2));
  return Number.isSafeInteger(minor) ? minor : null;
}

// ---------- event form parsing ----------

export interface ParsedEvent {
  data: Omit<NewEvent, 'ownerId' | 'coverKey' | 'coverUrl' | 'status' | 'publishedAt'>;
  fieldErrors: Record<string, string>;
  coverFile: File | null;
}

// Pure: parses + validates the wizard payload. Exported for tests.
export function parseEventForm(formData: FormData): ParsedEvent {
  const fieldErrors: Record<string, string> = {};
  const title = str(formData, 'title');
  const cls = str(formData, 'class');
  const category = str(formData, 'category');
  const description = str(formData, 'description');
  const timezone = str(formData, 'timezone') || 'UTC';
  const attendance = str(formData, 'attendance');
  const pricing = str(formData, 'pricing');
  const capacityType = str(formData, 'capacityType');

  if (title.length < 4 || title.length > 120) fieldErrors.title = 'Title must be 4–120 characters.';
  if (cls !== 'event' && cls !== 'ceremony') fieldErrors.class = 'Choose Event or Ceremony.';
  if (!(EVENT_CATEGORIES as readonly string[]).includes(category)) fieldErrors.category = 'Choose a valid category.';
  if (description.length < 20 || description.length > 8000) {
    fieldErrors.description = 'Description must be 20–8000 characters.';
  }
  if (!isValidTimezone(timezone)) fieldErrors.timezone = 'Choose a valid timezone.';
  if (!['physical', 'online', 'hybrid'].includes(attendance)) fieldErrors.attendance = 'Choose an attendance format.';
  if (pricing !== 'free' && pricing !== 'paid') fieldErrors.pricing = 'Choose Free or Paid.';
  if (capacityType !== 'limited' && capacityType !== 'unlimited') fieldErrors.capacityType = 'Choose capacity.';

  const startDate = str(formData, 'startDate');
  const startTime = str(formData, 'startTime');
  const endDate = str(formData, 'endDate');
  const endTime = str(formData, 'endTime');
  let startAt = '';
  let endAt = '';
  try {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{2}:\d{2}$/.test(startTime)) {
      throw new Error('bad_start');
    }
    startAt = fromZonedTime(`${startDate}T${startTime}:00`, timezone).toISOString();
  } catch {
    fieldErrors.startDate = 'Enter a valid start date and time.';
  }
  try {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate) || !/^\d{2}:\d{2}$/.test(endTime)) {
      throw new Error('bad_end');
    }
    endAt = fromZonedTime(`${endDate}T${endTime}:00`, timezone).toISOString();
  } catch {
    fieldErrors.endDate = 'Enter a valid end date and time.';
  }
  if (startAt && endAt && Date.parse(endAt) <= Date.parse(startAt)) {
    fieldErrors.endDate = 'End must be after start.';
  }

  let registrationDeadline = '';
  const rdDate = str(formData, 'deadlineDate');
  const rdTime = str(formData, 'deadlineTime') || '23:59';
  if (rdDate) {
    try {
      registrationDeadline = fromZonedTime(`${rdDate}T${rdTime}:00`, timezone).toISOString();
      if (startAt && Date.parse(registrationDeadline) > Date.parse(startAt)) {
        fieldErrors.deadlineDate = 'Deadline must be before the event starts.';
      }
    } catch {
      fieldErrors.deadlineDate = 'Enter a valid deadline.';
    }
  }

  const venueName = str(formData, 'venueName');
  const country = str(formData, 'country').toUpperCase();
  const city = str(formData, 'city');
  const address = str(formData, 'address');
  const directions = str(formData, 'directions');
  const accessibility = str(formData, 'accessibility');
  const onlinePlatform = str(formData, 'onlinePlatform');
  const onlineAccess = str(formData, 'onlineAccess');

  const needsPhysical = attendance === 'physical' || attendance === 'hybrid';
  const needsOnline = attendance === 'online' || attendance === 'hybrid';
  if (needsPhysical) {
    if (!venueName) fieldErrors.venueName = 'Venue name is required.';
    if (!country || !countryByCode(country)) fieldErrors.country = 'Choose a valid country.';
    if (!city) fieldErrors.city = 'City is required.';
  } else if (country && !countryByCode(country)) {
    fieldErrors.country = 'Choose a valid country.';
  }
  if (needsOnline) {
    if (!onlinePlatform) fieldErrors.onlinePlatform = 'Platform is required for online events.';
    if (!onlineAccess) fieldErrors.onlineAccess = 'Access instructions are required.';
  }

  let priceAmountMinor: number | null = null;
  const currency = str(formData, 'currency').toUpperCase();
  if (pricing === 'paid') {
    const minor = parseMinorAmount(str(formData, 'priceAmount'));
    if (minor === null || minor <= 0 || minor > 10000000000) {
      fieldErrors.priceAmount = 'Enter a valid price (up to 2 decimals).';
    } else {
      priceAmountMinor = minor;
    }
    if (!isKnownCurrencyCode(currency)) fieldErrors.currency = 'Choose a currency from the list.';
  }

  let capacity: number | null = null;
  if (capacityType === 'limited') {
    const cap = clampInt(str(formData, 'capacity'), 0, 0, 1000000);
    if (cap < 1) fieldErrors.capacity = 'Enter a capacity of at least 1.';
    else capacity = cap;
  }

  const bookingMethod = str(formData, 'bookingMethod');
  if (bookingMethod !== 'request' && bookingMethod !== 'reserve') {
    fieldErrors.bookingMethod = 'Choose a booking method.';
  }
  const spotsPerBooking = clampInt(str(formData, 'spotsPerBooking') || '1', 1, 1, 20);
  const waitlistEnabled = formData.get('waitlistEnabled') === 'on';

  const cancellationPolicy = str(formData, 'cancellationPolicy');
  const organizerContact = str(formData, 'organizerContact');
  if (!cancellationPolicy) fieldErrors.cancellationPolicy = 'Cancellation policy is required.';
  if (!organizerContact) fieldErrors.organizerContact = 'Organizer contact is required.';

  const programItems: ProgramItem[] = [];
  const programIds = str(formData, 'programIds').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20);
  for (const pid of programIds) {
    const t = str(formData, `program_title_${pid}`);
    const d = str(formData, `program_detail_${pid}`);
    if (t) programItems.push({ id: pid.slice(0, 40), title: t.slice(0, 120), detail: d.slice(0, 500) });
  }
  const extraContacts: ExtraContact[] = [];
  const contactIds = str(formData, 'contactIds').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 10);
  for (const cid of contactIds) {
    const n = str(formData, `contact_name_${cid}`);
    const d = str(formData, `contact_detail_${cid}`);
    if (n) extraContacts.push({ id: cid.slice(0, 40), name: n.slice(0, 120), detail: d.slice(0, 300) });
  }

  const coverEntry = formData.get('cover');
  const coverFile = coverEntry instanceof File && coverEntry.size > 0 ? coverEntry : null;

  return {
    data: {
      title: title.slice(0, 120),
      class: (cls === 'ceremony' ? 'ceremony' : 'event'),
      category,
      description: description.slice(0, 8000),
      startAt,
      endAt,
      timezone,
      registrationDeadline,
      attendance: (['physical', 'online', 'hybrid'].includes(attendance) ? attendance : 'physical') as DbEvent['attendance'],
      venueName: venueName.slice(0, 200),
      country: country.slice(0, 2),
      city: city.slice(0, 120),
      address: address.slice(0, 300),
      directions: directions.slice(0, 500),
      accessibility: accessibility.slice(0, 500),
      onlinePlatform: onlinePlatform.slice(0, 200),
      onlineAccess: onlineAccess.slice(0, 1000),
      pricing: pricing === 'paid' ? 'paid' : 'free',
      priceAmount: null,
      priceAmountMinor,
      currency: currency.slice(0, 3),
      capacityType: capacityType === 'unlimited' ? 'unlimited' : 'limited',
      capacity,
      bookingMethod: bookingMethod === 'reserve' ? 'reserve' : 'request',
      spotsPerBooking,
      eligibility: str(formData, 'eligibility').slice(0, 500),
      waitlistEnabled,
      cancellationPolicy: cancellationPolicy.slice(0, 2000),
      refundTerms: str(formData, 'refundTerms').slice(0, 2000),
      attendanceRules: str(formData, 'attendanceRules').slice(0, 2000),
      organizerContact: organizerContact.slice(0, 300),
      publicListing: formData.get('publicListing') === 'on',
      moderationNote: '',
      programItems,
      extraContacts,
    },
    fieldErrors,
    coverFile,
  };
}

// Pure: lists missing publication requirements. Exported for tests.
export function publicationErrors(e: DbEvent): string[] {
  const errors: string[] = [];
  if (e.title.length < 4) errors.push('title');
  if (e.description.length < 20) errors.push('description');
  if (!e.startAt || !e.endAt || Date.parse(e.endAt) <= Date.parse(e.startAt)) errors.push('schedule');
  if (Date.parse(e.endAt) <= Date.now()) errors.push('end_in_past');
  const needsPhysical = e.attendance === 'physical' || e.attendance === 'hybrid';
  const needsOnline = e.attendance === 'online' || e.attendance === 'hybrid';
  if (needsPhysical && (!e.venueName || !e.country || !e.city)) errors.push('venue');
  if (needsOnline && (!e.onlinePlatform || !e.onlineAccess)) errors.push('online');
  const minor =
    e.priceAmountMinor ?? (typeof e.priceAmount === 'number' ? Math.round(e.priceAmount * 100) : 0);
  if (e.pricing === 'paid' && (!(minor > 0) || !e.currency)) errors.push('price');
  if (e.capacityType === 'limited' && !(e.capacity ?? 0)) errors.push('capacity');
  if (!e.cancellationPolicy || !e.organizerContact) errors.push('policies');
  if (!e.publicListing) errors.push('public_listing');
  return errors;
}
