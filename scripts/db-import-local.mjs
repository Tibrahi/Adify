// npm run db:import-local — one-shot import of the explicit local file store
// (DATA_FILE or ./data/adify.json) into Neon. Idempotent: every insert uses
// ON CONFLICT DO NOTHING on primary keys, so re-running never duplicates.
// Price floats are backfilled to integer minor units on the way in.
import fs from 'node:fs';
import path from 'node:path';
import { db, fail, loadEnv, ok } from './lib.mjs';
import { ROOT } from './lib.mjs';

loadEnv();

const file = process.env.DATA_FILE || path.join(ROOT, 'data', 'adify.json');
if (!fs.existsSync(file)) fail(`local store not found: ${file}`);
const local = JSON.parse(fs.readFileSync(file, 'utf8'));

const minorOf = (e) =>
  typeof e.priceAmountMinor === 'number'
    ? e.priceAmountMinor
    : typeof e.priceAmount === 'number'
      ? Math.round(e.priceAmount * 100)
      : null;

try {
  const sql = await db();
  let users = 0;
  for (const u of local.users ?? []) {
    const r = await sql.query(
      `INSERT INTO users (id, full_name, email, password_hash, country, phone, email_verified_at, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING RETURNING id`,
      [u.id, u.fullName, u.email, u.passwordHash, u.country ?? '', u.phone ?? '', u.emailVerifiedAt, u.createdAt, u.updatedAt],
    );
    users += r.length;
  }
  let sessions = 0;
  for (const s of local.sessions ?? []) {
    const r = await sql.query(
      `INSERT INTO sessions (token, user_id, created_at, expires_at)
       VALUES ($1,$2,$3,$4) ON CONFLICT (token) DO NOTHING RETURNING token`,
      [s.token, s.userId, s.createdAt, s.expiresAt],
    );
    sessions += r.length;
  }
  let codes = 0;
  for (const c of local.codes ?? []) {
    const r = await sql.query(
      `INSERT INTO verification_codes (id, user_id, purpose, code_hash, expires_at, attempts, consumed_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING RETURNING id`,
      [c.id, c.userId, c.purpose, c.codeHash, c.expiresAt, c.attempts ?? 0, c.consumedAt, c.createdAt],
    );
    codes += r.length;
  }
  let events = 0;
  for (const e of local.events ?? []) {
    const r = await sql.query(
      `INSERT INTO events (id, owner_id, title, class, category, description, cover_key, cover_url,
        start_at, end_at, timezone, registration_deadline, attendance, venue_name, country, city,
        address, directions, accessibility, online_platform, online_access, pricing, price_amount,
        price_amount_minor, currency, capacity_type, capacity, booking_method, spots_per_booking,
        eligibility, waitlist_enabled, cancellation_policy, refund_terms, attendance_rules,
        organizer_contact, public_listing, status, moderation_note, program_items, extra_contacts,
        created_at, updated_at, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43)
       ON CONFLICT (id) DO NOTHING RETURNING id`,
      [
        e.id, e.ownerId, e.title, e.class, e.category, e.description, e.coverKey || null,
        e.coverUrl || null, e.startAt, e.endAt, e.timezone, e.registrationDeadline || null,
        e.attendance, e.venueName, e.country, e.city, e.address, e.directions, e.accessibility,
        e.onlinePlatform, e.onlineAccess, e.pricing, e.priceAmount, minorOf(e), e.currency || null,
        e.capacityType, e.capacity, e.bookingMethod, e.spotsPerBooking, e.eligibility,
        e.waitlistEnabled, e.cancellationPolicy, e.refundTerms, e.attendanceRules,
        e.organizerContact, e.publicListing, e.status, e.moderationNote,
        JSON.stringify(e.programItems ?? []), JSON.stringify(e.extraContacts ?? []),
        e.createdAt, e.updatedAt, e.publishedAt,
      ],
    );
    events += r.length;
  }
  let bookings = 0;
  for (const b of local.bookings ?? []) {
    const r = await sql.query(
      `INSERT INTO bookings (id, event_id, user_id, reference, spots, status, payment_status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING RETURNING id`,
      [b.id, b.eventId, b.userId, b.reference, b.spots, b.status, b.paymentStatus ?? '', b.createdAt, b.updatedAt],
    );
    bookings += r.length;
  }
  let notes = 0;
  for (const n of local.notifications ?? []) {
    const r = await sql.query(
      `INSERT INTO notifications (id, user_id, kind, title, body, link, read_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING RETURNING id`,
      [n.id, n.userId, n.kind, n.title, n.body ?? '', n.link ?? '', n.readAt, n.createdAt],
    );
    notes += r.length;
  }
  ok(`imported: ${users} users, ${sessions} sessions, ${codes} codes, ${events} events, ${bookings} bookings, ${notes} notifications (existing rows skipped).`);
} catch (e) {
  fail(e.message);
}
