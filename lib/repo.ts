// Repository: single data-access API with two backends.
// - Neon PostgreSQL when DATABASE_URL is set (production).
// - Local file-backed store otherwise (development/tests, same schema).
// All functions are async so callers never depend on the backend choice.

import fs from 'node:fs';
import path from 'node:path';
import { dataFilePath, readDb, withDb } from './db';
import { neonQuery } from './neon';
import { bookingRef, nowIso, uid } from './util';
import type {
  AuditEntry,
  Booking,
  BookingStatus,
  DbEvent,
  EventFilters,
  ImageRow,
  Notification,
  OutboxJob,
  OutboxStatus,
  SessionRow,
  SupportTicket,
  User,
  VerificationCode,
} from './types';

// Backend selection: Neon PostgreSQL is the source of truth whenever
// DATABASE_URL is set. The file store is used ONLY with an explicit override
// (DATA_FILE for tests, ALLOW_LOCAL_DB=true for offline development) and
// never as a silent fallback. Without any configuration this throws a clear
// error that pages render as a meaningful failure state.
let warnedLocal = false;

function shouldUseNeon(): boolean {
  if (process.env.DATA_FILE) return false;
  if (process.env.DATABASE_URL) return true;
  if (process.env.ALLOW_LOCAL_DB === 'true') {
    if (!warnedLocal) {
      warnedLocal = true;
      console.warn('[adify] ALLOW_LOCAL_DB=true: using the local file database (development only). Set DATABASE_URL for Neon PostgreSQL.');
    }
    return false;
  }
  throw new Error(
    'database_unavailable: no database configured. Set DATABASE_URL (Neon PostgreSQL) or ALLOW_LOCAL_DB=true for explicit local development.',
  );
}

// ---------- row mappers (Neon snake_case -> camelCase) ----------

type Row = Record<string, unknown>;

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}
function iso(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  return str(v);
}
function isoNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString();
  return typeof v === 'string' ? v : null;
}
function numNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function intNull(v: unknown): number | null {
  const n = numNull(v);
  return n === null ? null : Math.floor(n);
}

function mapUser(r: Row): User {
  return {
    id: str(r.id),
    fullName: str(r.full_name),
    email: str(r.email),
    passwordHash: str(r.password_hash),
    country: str(r.country),
    phone: str(r.phone),
    emailVerifiedAt: isoNull(r.email_verified_at),
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  };
}

function mapSession(r: Row): SessionRow {
  return {
    token: str(r.token),
    userId: str(r.user_id),
    createdAt: iso(r.created_at),
    expiresAt: iso(r.expires_at),
  };
}

function mapCode(r: Row): VerificationCode {
  return {
    id: str(r.id),
    userId: str(r.user_id),
    purpose: r.purpose === 'password_reset' ? 'password_reset' : 'email_verify',
    codeHash: str(r.code_hash),
    expiresAt: iso(r.expires_at),
    attempts: Number(r.attempts ?? 0),
    consumedAt: isoNull(r.consumed_at),
    createdAt: iso(r.created_at),
  };
}

function mapEvent(r: Row): DbEvent {
  return {
    id: str(r.id),
    ownerId: str(r.owner_id),
    title: str(r.title),
    class: r.class === 'ceremony' ? 'ceremony' : 'event',
    category: str(r.category),
    description: str(r.description),
    coverKey: str(r.cover_key),
    coverUrl: str(r.cover_url),
    startAt: iso(r.start_at),
    endAt: iso(r.end_at),
    timezone: str(r.timezone, 'UTC'),
    registrationDeadline: str(r.registration_deadline),
    attendance:
      r.attendance === 'online' ? 'online' : r.attendance === 'hybrid' ? 'hybrid' : 'physical',
    venueName: str(r.venue_name),
    country: str(r.country),
    city: str(r.city),
    address: str(r.address),
    directions: str(r.directions),
    accessibility: str(r.accessibility),
    onlinePlatform: str(r.online_platform),
    onlineAccess: str(r.online_access),
    pricing: r.pricing === 'paid' ? 'paid' : 'free',
    priceAmount: numNull(r.price_amount),
    priceAmountMinor: intNull(r.price_amount_minor),
    currency: str(r.currency),
    capacityType: r.capacity_type === 'unlimited' ? 'unlimited' : 'limited',
    capacity: intNull(r.capacity),
    bookingMethod: r.booking_method === 'reserve' ? 'reserve' : 'request',
    spotsPerBooking: Number(r.spots_per_booking ?? 1) || 1,
    eligibility: str(r.eligibility),
    waitlistEnabled: r.waitlist_enabled === true,
    cancellationPolicy: str(r.cancellation_policy),
    refundTerms: str(r.refund_terms),
    attendanceRules: str(r.attendance_rules),
    organizerContact: str(r.organizer_contact),
    publicListing: r.public_listing !== false,
    status: (str(r.status, 'draft') as DbEvent['status']),
    moderationNote: str(r.moderation_note),
    programItems: Array.isArray(r.program_items) ? (r.program_items as DbEvent['programItems']) : [],
    extraContacts: Array.isArray(r.extra_contacts)
      ? (r.extra_contacts as DbEvent['extraContacts'])
      : [],
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
    publishedAt: isoNull(r.published_at),
  };
}

function mapBooking(r: Row): Booking {
  return {
    id: str(r.id),
    eventId: str(r.event_id),
    userId: str(r.user_id),
    reference: str(r.reference),
    spots: Number(r.spots ?? 1) || 1,
    status: str(r.status, 'pending') as BookingStatus,
    paymentStatus: str(r.payment_status),
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  };
}

function mapNotification(r: Row): Notification {
  return {
    id: str(r.id),
    userId: str(r.user_id),
    kind: str(r.kind),
    title: str(r.title),
    body: str(r.body),
    link: str(r.link),
    readAt: isoNull(r.read_at),
    createdAt: iso(r.created_at),
  };
}

function mapTicket(r: Row): SupportTicket {
  return {
    id: str(r.id),
    name: str(r.name),
    email: str(r.email),
    topic: str(r.topic),
    message: str(r.message),
    bookingRef: str(r.booking_ref),
    contactPref: str(r.contact_pref, 'email'),
    status: str(r.status, 'open'),
    createdAt: iso(r.created_at),
  };
}

// ---------- users ----------

export async function createUser(input: {
  fullName: string;
  email: string;
  passwordHash: string;
  country: string;
  phone: string;
}): Promise<User> {
  const now = nowIso();
  if (shouldUseNeon()) {
    const rows = await neonQuery<Row>(
      `INSERT INTO users (id, full_name, email, password_hash, country, phone, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [uid(), input.fullName, input.email, input.passwordHash, input.country, input.phone, now, now],
    );
    return mapUser(rows[0]);
  }
  const user: User = {
    id: uid(),
    fullName: input.fullName,
    email: input.email,
    passwordHash: input.passwordHash,
    country: input.country,
    phone: input.phone,
    emailVerifiedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  withDb((db) => {
    db.users.push(user);
  });
  return user;
}

export async function getUserById(id: string): Promise<User | null> {
  if (shouldUseNeon()) {
    const rows = await neonQuery<Row>(`SELECT * FROM users WHERE id = $1`, [id]);
    return rows.length ? mapUser(rows[0]) : null;
  }
  return readDb((db) => db.users.find((u) => u.id === id) ?? null);
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const normalized = email.trim().toLowerCase();
  if (shouldUseNeon()) {
    const rows = await neonQuery<Row>(`SELECT * FROM users WHERE LOWER(email) = $1`, [normalized]);
    return rows.length ? mapUser(rows[0]) : null;
  }
  return readDb((db) => db.users.find((u) => u.email.toLowerCase() === normalized) ?? null);
}

export async function updateUser(
  id: string,
  patch: Partial<Pick<User, 'fullName' | 'country' | 'phone' | 'passwordHash' | 'emailVerifiedAt'>>,
): Promise<User | null> {
  if (shouldUseNeon()) {
    const sets: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    if (patch.fullName !== undefined) {
      sets.push(`full_name = $${i++}`);
      params.push(patch.fullName);
    }
    if (patch.country !== undefined) {
      sets.push(`country = $${i++}`);
      params.push(patch.country);
    }
    if (patch.phone !== undefined) {
      sets.push(`phone = $${i++}`);
      params.push(patch.phone);
    }
    if (patch.passwordHash !== undefined) {
      sets.push(`password_hash = $${i++}`);
      params.push(patch.passwordHash);
    }
    if (patch.emailVerifiedAt !== undefined) {
      sets.push(`email_verified_at = $${i++}`);
      params.push(patch.emailVerifiedAt);
    }
    if (!sets.length) return getUserById(id);
    sets.push(`updated_at = $${i++}`);
    params.push(nowIso());
    params.push(id);
    const rows = await neonQuery<Row>(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
      params,
    );
    return rows.length ? mapUser(rows[0]) : null;
  }
  return withDb((db) => {
    const user = db.users.find((u) => u.id === id);
    if (!user) return null;
    if (patch.fullName !== undefined) user.fullName = patch.fullName;
    if (patch.country !== undefined) user.country = patch.country;
    if (patch.phone !== undefined) user.phone = patch.phone;
    if (patch.passwordHash !== undefined) user.passwordHash = patch.passwordHash;
    if (patch.emailVerifiedAt !== undefined) user.emailVerifiedAt = patch.emailVerifiedAt;
    user.updatedAt = nowIso();
    return user;
  });
}

// ---------- sessions ----------

export async function createSession(userId: string, days = 30): Promise<SessionRow> {
  const now = new Date();
  const expires = new Date(now.getTime() + days * 24 * 3600 * 1000).toISOString();
  if (shouldUseNeon()) {
    const token = uid() + uid().replace(/-/g, '');
    const rows = await neonQuery<Row>(
      `INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES ($1,$2,$3,$4) RETURNING *`,
      [token, userId, now.toISOString(), expires],
    );
    return mapSession(rows[0]);
  }
  const row: SessionRow = {
    token: uid() + uid().replace(/-/g, ''),
    userId,
    createdAt: now.toISOString(),
    expiresAt: expires,
  };
  withDb((db) => {
    db.sessions.push(row);
  });
  return row;
}

export async function getSession(token: string): Promise<SessionRow | null> {
  if (shouldUseNeon()) {
    const rows = await neonQuery<Row>(`SELECT * FROM sessions WHERE token = $1`, [token]);
    return rows.length ? mapSession(rows[0]) : null;
  }
  return readDb((db) => db.sessions.find((s) => s.token === token) ?? null);
}

export async function deleteSession(token: string): Promise<void> {
  if (shouldUseNeon()) {
    await neonQuery(`DELETE FROM sessions WHERE token = $1`, [token]);
    return;
  }
  withDb((db) => {
    db.sessions = db.sessions.filter((s) => s.token !== token);
  });
}

export async function deleteUserSessions(userId: string): Promise<void> {
  if (shouldUseNeon()) {
    await neonQuery(`DELETE FROM sessions WHERE user_id = $1`, [userId]);
    return;
  }
  withDb((db) => {
    db.sessions = db.sessions.filter((s) => s.userId !== userId);
  });
}

// ---------- verification codes ----------

export async function createCode(input: {
  userId: string;
  purpose: VerificationCode['purpose'];
  codeHash: string;
  ttlMinutes: number;
}): Promise<VerificationCode> {
  const now = new Date();
  const expires = new Date(now.getTime() + input.ttlMinutes * 60 * 1000).toISOString();
  if (shouldUseNeon()) {
    const rows = await neonQuery<Row>(
      `INSERT INTO verification_codes (id, user_id, purpose, code_hash, expires_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [uid(), input.userId, input.purpose, input.codeHash, expires, now.toISOString()],
    );
    return mapCode(rows[0]);
  }
  const code: VerificationCode = {
    id: uid(),
    userId: input.userId,
    purpose: input.purpose,
    codeHash: input.codeHash,
    expiresAt: expires,
    attempts: 0,
    consumedAt: null,
    createdAt: now.toISOString(),
  };
  withDb((db) => {
    db.codes.push(code);
  });
  return code;
}

export async function getLatestCode(
  userId: string,
  purpose: VerificationCode['purpose'],
): Promise<VerificationCode | null> {
  if (shouldUseNeon()) {
    const rows = await neonQuery<Row>(
      `SELECT * FROM verification_codes WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1`,
      [userId, purpose],
    );
    return rows.length ? mapCode(rows[0]) : null;
  }
  return readDb((db) => {
    const list = db.codes
      .filter((c) => c.userId === userId && c.purpose === purpose && !c.consumedAt)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return list[0] ?? null;
  });
}

export async function bumpCodeAttempts(id: string): Promise<void> {
  if (shouldUseNeon()) {
    await neonQuery(`UPDATE verification_codes SET attempts = attempts + 1 WHERE id = $1`, [id]);
    return;
  }
  withDb((db) => {
    const code = db.codes.find((c) => c.id === id);
    if (code) code.attempts += 1;
  });
}

export async function consumeCode(id: string): Promise<void> {
  if (shouldUseNeon()) {
    await neonQuery(`UPDATE verification_codes SET consumed_at = $1 WHERE id = $2`, [nowIso(), id]);
    return;
  }
  withDb((db) => {
    const code = db.codes.find((c) => c.id === id);
    if (code) code.consumedAt = nowIso();
  });
}

export async function countRecentCodes(userId: string, minutes: number): Promise<number> {
  const since = new Date(Date.now() - minutes * 60 * 1000).toISOString();
  if (shouldUseNeon()) {
    const rows = await neonQuery<Row>(
      `SELECT COUNT(*)::int AS n FROM verification_codes WHERE user_id = $1 AND created_at > $2`,
      [userId, since],
    );
    return Number(rows[0]?.n ?? 0);
  }
  return readDb(
    (db) => db.codes.filter((c) => c.userId === userId && c.createdAt > since).length,
  );
}

// ---------- events ----------

export type NewEvent = Omit<DbEvent, 'id' | 'createdAt' | 'updatedAt' | 'publishedAt'> & {
  publishedAt?: string | null;
};

const EVENT_COLUMNS = [
  'id', 'owner_id', 'title', 'class', 'category', 'description', 'cover_key', 'cover_url',
  'start_at', 'end_at', 'timezone', 'registration_deadline', 'attendance', 'venue_name',
  'country', 'city', 'address', 'directions', 'accessibility', 'online_platform',
  'online_access', 'pricing', 'price_amount', 'price_amount_minor', 'currency', 'capacity_type', 'capacity',
  'booking_method', 'spots_per_booking', 'eligibility', 'waitlist_enabled',
  'cancellation_policy', 'refund_terms', 'attendance_rules', 'organizer_contact',
  'public_listing', 'status', 'moderation_note', 'program_items', 'extra_contacts',
  'created_at', 'updated_at', 'published_at',
].join(', ');

function eventToRow(e: DbEvent): unknown[] {
  return [
    e.id, e.ownerId, e.title, e.class, e.category, e.description, e.coverKey || null,
    e.coverUrl || null, e.startAt, e.endAt, e.timezone, e.registrationDeadline || null,
    e.attendance, e.venueName, e.country, e.city, e.address, e.directions, e.accessibility,
    e.onlinePlatform, e.onlineAccess, e.pricing, e.priceAmount, e.priceAmountMinor, e.currency || null,
    e.capacityType, e.capacity, e.bookingMethod, e.spotsPerBooking, e.eligibility,
    e.waitlistEnabled, e.cancellationPolicy, e.refundTerms, e.attendanceRules,
    e.organizerContact, e.publicListing, e.status, e.moderationNote,
    JSON.stringify(e.programItems), JSON.stringify(e.extraContacts),
    e.createdAt, e.updatedAt, e.publishedAt,
  ];
}

export async function createEvent(input: NewEvent): Promise<DbEvent> {
  const now = nowIso();
  const event: DbEvent = {
    ...input,
    id: uid(),
    createdAt: now,
    updatedAt: now,
    publishedAt: input.publishedAt ?? null,
  };
  if (shouldUseNeon()) {
    const placeholders = eventToRow(event)
      .map((_, i) => `$${i + 1}`)
      .join(',');
    const rows = await neonQuery<Row>(
      `INSERT INTO events (${EVENT_COLUMNS}) VALUES (${placeholders}) RETURNING *`,
      eventToRow(event),
    );
    return mapEvent(rows[0]);
  }
  withDb((db) => {
    db.events.push(event);
  });
  return event;
}

export async function getEventById(id: string): Promise<DbEvent | null> {
  if (shouldUseNeon()) {
    const rows = await neonQuery<Row>(`SELECT * FROM events WHERE id = $1`, [id]);
    return rows.length ? mapEvent(rows[0]) : null;
  }
  return readDb((db) => db.events.find((e) => e.id === id) ?? null);
}

const EVENT_PATCH_COLUMNS: Record<string, string> = {
  title: 'title', class: 'class', category: 'category', description: 'description',
  coverKey: 'cover_key', coverUrl: 'cover_url', startAt: 'start_at', endAt: 'end_at',
  timezone: 'timezone', registrationDeadline: 'registration_deadline', attendance: 'attendance',
  venueName: 'venue_name', country: 'country', city: 'city', address: 'address',
  directions: 'directions', accessibility: 'accessibility', onlinePlatform: 'online_platform',
  onlineAccess: 'online_access', pricing: 'pricing', priceAmount: 'price_amount',
  priceAmountMinor: 'price_amount_minor',
  currency: 'currency', capacityType: 'capacity_type', capacity: 'capacity',
  bookingMethod: 'booking_method', spotsPerBooking: 'spots_per_booking',
  eligibility: 'eligibility', waitlistEnabled: 'waitlist_enabled',
  cancellationPolicy: 'cancellation_policy', refundTerms: 'refund_terms',
  attendanceRules: 'attendance_rules', organizerContact: 'organizer_contact',
  publicListing: 'public_listing', status: 'status', moderationNote: 'moderation_note',
  programItems: 'program_items', extraContacts: 'extra_contacts', publishedAt: 'published_at',
};

export async function updateEvent(
  id: string,
  patch: Partial<Omit<DbEvent, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>>,
): Promise<DbEvent | null> {
  if (shouldUseNeon()) {
    const sets: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    for (const [key, value] of Object.entries(patch)) {
      const col = EVENT_PATCH_COLUMNS[key];
      if (!col || value === undefined) continue;
      sets.push(`${col} = $${i++}`);
      params.push(
        key === 'programItems' || key === 'extraContacts' ? JSON.stringify(value ?? []) : value,
      );
    }
    if (!sets.length) return getEventById(id);
    sets.push(`updated_at = $${i++}`);
    params.push(nowIso());
    params.push(id);
    const rows = await neonQuery<Row>(
      `UPDATE events SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
      params,
    );
    return rows.length ? mapEvent(rows[0]) : null;
  }
  return withDb((db) => {
    const event = db.events.find((e) => e.id === id);
    if (!event) return null;
    Object.assign(event, patch);
    event.updatedAt = nowIso();
    return event;
  });
}

function confirmedSpotsMap(db: { bookings: Booking[] }): Map<string, number> {
  const map = new Map<string, number>();
  for (const b of db.bookings) {
    if (b.status !== 'confirmed') continue;
    map.set(b.eventId, (map.get(b.eventId) ?? 0) + b.spots);
  }
  return map;
}

function applyLocalFilters(
  db: { events: DbEvent[]; users: User[]; bookings: Booking[] },
  f: EventFilters,
  nowMs: number,
): DbEvent[] {
  const names = new Map(db.users.map((u) => [u.id, u.fullName.toLowerCase()] as const));
  const used = confirmedSpotsMap(db);
  const q = (f.q ?? '').trim().toLowerCase();
  const org = (f.organizer ?? '').trim().toLowerCase();
  const fromMs = f.dateFrom ? Date.parse(f.dateFrom) : NaN;
  const toMs = f.dateTo ? Date.parse(f.dateTo) : NaN;

  let list = db.events.filter((e) => {
    if (f.eligibleOnly) {
      if (e.status !== 'published' || !e.publicListing) return false;
      if (Date.parse(e.endAt) <= nowMs) return false;
    }
    if (f.status && e.status !== f.status) return false;
    if (f.ownerId && e.ownerId !== f.ownerId) return false;
    if (f.class && e.class !== f.class) return false;
    if (f.category && e.category !== f.category) return false;
    if (f.pricing && e.pricing !== f.pricing) return false;
    if (f.attendance && e.attendance !== f.attendance) return false;
    if (f.country && e.country.toUpperCase() !== f.country.toUpperCase()) return false;
    if (f.city && e.city.toLowerCase() !== f.city.toLowerCase()) return false;
    const start = Date.parse(e.startAt);
    const end = Date.parse(e.endAt);
    if (f.time === 'upcoming' && !(start > nowMs)) return false;
    if (f.time === 'happening' && !(start <= nowMs && end > nowMs)) return false;
    if (Number.isFinite(fromMs) && end < (fromMs as number)) return false;
    if (Number.isFinite(toMs) && start > (toMs as number)) return false;
    if (org && !(names.get(e.ownerId) ?? '').includes(org)) return false;
    if (q) {
      const hay = `${e.title} ${e.description} ${e.category} ${e.city} ${e.country} ${names.get(e.ownerId) ?? ''}`.toLowerCase();
      if (!q.split(/\s+/).every((tok) => hay.includes(tok))) return false;
    }
    if (f.availableOnly) {
      if (e.status !== 'published' || !e.publicListing || end <= nowMs) return false;
      if (
        e.capacityType === 'limited' &&
        typeof e.capacity === 'number' &&
        (used.get(e.id) ?? 0) >= e.capacity
      ) {
        return false;
      }
    }
    return true;
  });

  if (f.sort === 'created_desc') {
    list = list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  } else {
    list = list.sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
  }
  return list;
}

function buildEventWhere(f: EventFilters, now: string): { clauses: string[]; params: unknown[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];
  const add = (clause: string, value?: unknown) => {
    if (value !== undefined) {
      params.push(value);
      clauses.push(clause.replace('?', `$${params.length}`));
    } else {
      clauses.push(clause);
    }
  };
  if (f.eligibleOnly) {
    add(`status = ?`, 'published');
    add(`public_listing = TRUE`);
    params.push(now);
    clauses.push(`end_at > $${params.length}`);
  }
  if (f.status) add(`status = ?`, f.status);
  if (f.ownerId) add(`owner_id = ?`, f.ownerId);
  if (f.class) add(`class = ?`, f.class);
  if (f.category) add(`category = ?`, f.category);
  if (f.pricing) add(`pricing = ?`, f.pricing);
  if (f.attendance) add(`attendance = ?`, f.attendance);
  if (f.country) add(`UPPER(country) = ?`, f.country.toUpperCase());
  if (f.city) add(`LOWER(city) = ?`, f.city.toLowerCase());
  if (f.time === 'upcoming') {
    params.push(now);
    clauses.push(`start_at > $${params.length}`);
  }
  if (f.time === 'happening') {
    params.push(now, now);
    clauses.push(`start_at <= $${params.length - 1} AND end_at > $${params.length}`);
  }
  if (f.dateFrom) {
    params.push(f.dateFrom);
    clauses.push(`end_at >= $${params.length}`);
  }
  if (f.dateTo) {
    params.push(f.dateTo);
    clauses.push(`start_at <= $${params.length}`);
  }
  if (f.organizer) {
    params.push(`%${f.organizer.trim().toLowerCase()}%`);
    clauses.push(
      `EXISTS (SELECT 1 FROM users u WHERE u.id = events.owner_id AND LOWER(u.full_name) LIKE $${params.length})`,
    );
  }
  if (f.q) {
    for (const tok of f.q.trim().toLowerCase().split(/\s+/)) {
      params.push(`%${tok}%`);
      const p = `$${params.length}`;
      clauses.push(
        `(LOWER(title) LIKE ${p} OR LOWER(description) LIKE ${p} OR LOWER(category) LIKE ${p} OR LOWER(city) LIKE ${p} OR LOWER(country) LIKE ${p} OR EXISTS (SELECT 1 FROM users u WHERE u.id = events.owner_id AND LOWER(u.full_name) LIKE ${p}))`,
      );
    }
  }
  if (f.availableOnly) {
    params.push(now);
    clauses.push(
      `status = 'published' AND public_listing = TRUE AND end_at > $${params.length} AND (capacity_type = 'unlimited' OR capacity IS NULL OR (SELECT COALESCE(SUM(spots),0) FROM bookings b WHERE b.event_id = events.id AND b.status = 'confirmed') < capacity)`,
    );
  }
  return { clauses, params };
}

export async function listEvents(f: EventFilters): Promise<{ items: DbEvent[]; total: number }> {
  const limit = Math.min(Math.max(f.limit ?? 24, 1), 100);
  const offset = Math.max(f.offset ?? 0, 0);
  if (shouldUseNeon()) {
    const now = nowIso();
    const { clauses, params } = buildEventWhere(f, now);
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const order = f.sort === 'created_desc' ? 'created_at DESC' : 'start_at ASC';
    const rows = await neonQuery<Row>(
      `SELECT * FROM events ${where} ORDER BY ${order} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    );
    const count = await neonQuery<Row>(`SELECT COUNT(*)::int AS n FROM events ${where}`, params);
    return { items: rows.map(mapEvent), total: Number(count[0]?.n ?? 0) };
  }
  return readDb((db) => {
    const filtered = applyLocalFilters(db, f, Date.now());
    return { items: filtered.slice(offset, offset + limit), total: filtered.length };
  });
}

export async function distinctCategories(): Promise<string[]> {
  if (shouldUseNeon()) {
    const rows = await neonQuery<Row>(
      `SELECT DISTINCT category FROM events WHERE status = 'published' AND public_listing = TRUE AND end_at > $1 ORDER BY category`,
      [nowIso()],
    );
    return rows.map((r) => str(r.category)).filter(Boolean);
  }
  return readDb((db) => {
    const now = Date.now();
    const set = new Set<string>();
    for (const e of db.events) {
      if (e.status === 'published' && e.publicListing && Date.parse(e.endAt) > now) {
        set.add(e.category);
      }
    }
    return [...set].sort();
  });
}

export async function distinctCountries(): Promise<string[]> {
  if (shouldUseNeon()) {
    const rows = await neonQuery<Row>(
      `SELECT DISTINCT country FROM events WHERE status = 'published' AND public_listing = TRUE AND end_at > $1 AND country <> '' ORDER BY country`,
      [nowIso()],
    );
    return rows.map((r) => str(r.country)).filter(Boolean);
  }
  return readDb((db) => {
    const now = Date.now();
    const set = new Set<string>();
    for (const e of db.events) {
      if (
        e.status === 'published' &&
        e.publicListing &&
        e.country &&
        Date.parse(e.endAt) > now
      ) {
        set.add(e.country.toUpperCase());
      }
    }
    return [...set].sort();
  });
}

export interface DiscoveryCounts {
  total: number;
  happening: number;
  byCategory: Record<string, number>;
  byCountry: Record<string, number>;
}

// Real aggregate counts over eligible listings only. One pass per backend,
// so hero stats and category/country cards never show invented numbers.
export async function eligibleCounts(): Promise<DiscoveryCounts> {
  if (shouldUseNeon()) {
    const now = nowIso();
    const where = `status = 'published' AND public_listing = TRUE AND end_at > $1`;
    const totals = await neonQuery<Row>(
      `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE start_at <= $1)::int AS happening FROM events WHERE ${where}`,
      [now],
    );
    const cats = await neonQuery<Row>(
      `SELECT category, COUNT(*)::int AS n FROM events WHERE ${where} GROUP BY category ORDER BY category`,
      [now],
    );
    const countries = await neonQuery<Row>(
      `SELECT country, COUNT(*)::int AS n FROM events WHERE ${where} AND country <> '' GROUP BY country ORDER BY country`,
      [now],
    );
    const byCategory: Record<string, number> = {};
    for (const r of cats) byCategory[str(r.category)] = Number(r.n ?? 0);
    const byCountry: Record<string, number> = {};
    for (const r of countries) byCountry[str(r.country)] = Number(r.n ?? 0);
    return {
      total: Number(totals[0]?.total ?? 0),
      happening: Number(totals[0]?.happening ?? 0),
      byCategory,
      byCountry,
    };
  }
  return readDb((db) => {
    const now = Date.now();
    const out: DiscoveryCounts = { total: 0, happening: 0, byCategory: {}, byCountry: {} };
    for (const e of db.events) {
      if (e.status !== 'published' || !e.publicListing || Date.parse(e.endAt) <= now) continue;
      out.total += 1;
      if (Date.parse(e.startAt) <= now) out.happening += 1;
      out.byCategory[e.category] = (out.byCategory[e.category] ?? 0) + 1;
      if (e.country) {
        const code = e.country.toUpperCase();
        out.byCountry[code] = (out.byCountry[code] ?? 0) + 1;
      }
    }
    return out;
  });
}

export async function getOwnerNames(ids: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(ids)];
  if (!unique.length) return {};
  if (shouldUseNeon()) {
    const rows = await neonQuery<Row>(`SELECT id, full_name FROM users WHERE id = ANY($1)`, [unique]);
    const out: Record<string, string> = {};
    for (const r of rows) out[str(r.id)] = str(r.full_name);
    return out;
  }
  return readDb((db) => {
    const out: Record<string, string> = {};
    for (const u of db.users) {
      if (unique.includes(u.id)) out[u.id] = u.fullName;
    }
    return out;
  });
}

export async function confirmedSpotsMany(eventIds: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  const unique = [...new Set(eventIds)];
  if (!unique.length) return out;
  if (shouldUseNeon()) {
    const rows = await neonQuery<Row>(
      `SELECT event_id, COALESCE(SUM(spots),0)::int AS s FROM bookings
       WHERE event_id = ANY($1) AND status = 'confirmed' GROUP BY event_id`,
      [unique],
    );
    for (const r of rows) out[str(r.event_id)] = Number(r.s ?? 0);
    return out;
  }
  return readDb((db) => {
    const wanted = new Set(unique);
    for (const b of db.bookings) {
      if (!wanted.has(b.eventId) || b.status !== 'confirmed') continue;
      out[b.eventId] = (out[b.eventId] ?? 0) + b.spots;
    }
    return out;
  });
}

export async function confirmedSpots(eventId: string): Promise<number> {
  if (shouldUseNeon()) {
    const rows = await neonQuery<Row>(
      `SELECT COALESCE(SUM(spots),0)::int AS s FROM bookings WHERE event_id = $1 AND status = 'confirmed'`,
      [eventId],
    );
    return Number(rows[0]?.s ?? 0);
  }
  return readDb((db) =>
    db.bookings
      .filter((b) => b.eventId === eventId && b.status === 'confirmed')
      .reduce((n, b) => n + b.spots, 0),
  );
}

// ---------- bookings ----------

export async function createBooking(input: {
  eventId: string;
  userId: string;
  spots: number;
  status: BookingStatus;
}): Promise<Booking> {
  const now = nowIso();
  const id = uid();
  const reference = bookingRef();
  if (shouldUseNeon()) {
    // Atomic capacity guard: a confirmed booking is inserted only when
    // capacity still allows it. Non-confirmed rows insert unconditionally.
    const rows = await neonQuery<Row>(
      `INSERT INTO bookings (id, event_id, user_id, reference, spots, status, created_at, updated_at)
       SELECT $1,$2,$3,$4,$5,$6,$7,$8
       WHERE ($6 <> 'confirmed') OR EXISTS (
         SELECT 1 FROM events e WHERE e.id = $2 AND (
           e.capacity_type = 'unlimited' OR e.capacity IS NULL OR
           (SELECT COALESCE(SUM(spots),0) FROM bookings b WHERE b.event_id = $2 AND b.status = 'confirmed') + $5 <= e.capacity
         )
       )
       RETURNING *`,
      [id, input.eventId, input.userId, reference, input.spots, input.status, now, now],
    );
    if (!rows.length) throw new Error('capacity_exceeded');
    return mapBooking(rows[0]);
  }
  return withDb((db) => {
    if (input.status === 'confirmed') {
      const event = db.events.find((e) => e.id === input.eventId);
      const used = db.bookings
        .filter((b) => b.eventId === input.eventId && b.status === 'confirmed')
        .reduce((n, b) => n + b.spots, 0);
      if (
        event &&
        event.capacityType === 'limited' &&
        typeof event.capacity === 'number' &&
        used + input.spots > event.capacity
      ) {
        throw new Error('capacity_exceeded');
      }
    }
    const booking: Booking = {
      id,
      eventId: input.eventId,
      userId: input.userId,
      reference,
      spots: input.spots,
      status: input.status,
      paymentStatus: '',
      createdAt: now,
      updatedAt: now,
    };
    db.bookings.push(booking);
    return booking;
  });
}

export async function getBookingById(id: string): Promise<Booking | null> {
  if (shouldUseNeon()) {
    const rows = await neonQuery<Row>(`SELECT * FROM bookings WHERE id = $1`, [id]);
    return rows.length ? mapBooking(rows[0]) : null;
  }
  return readDb((db) => db.bookings.find((b) => b.id === id) ?? null);
}

export async function getUserBookingForEvent(
  eventId: string,
  userId: string,
): Promise<Booking | null> {
  if (shouldUseNeon()) {
    const rows = await neonQuery<Row>(
      `SELECT * FROM bookings WHERE event_id = $1 AND user_id = $2`,
      [eventId, userId],
    );
    return rows.length ? mapBooking(rows[0]) : null;
  }
  return readDb(
    (db) => db.bookings.find((b) => b.eventId === eventId && b.userId === userId) ?? null,
  );
}

export interface UserBookingRow {
  booking: Booking;
  event: DbEvent;
}

export async function listUserBookings(
  userId: string,
  filter: { status?: BookingStatus | 'past' | 'active' } = {},
): Promise<UserBookingRow[]> {
  if (shouldUseNeon()) {
    const now = nowIso();
    let extra = '';
    const params: unknown[] = [userId];
    if (filter.status === 'past') {
      params.push(now);
      extra = `AND e.end_at <= $${params.length}`;
    } else if (filter.status === 'active') {
      params.push(now);
      extra = `AND e.end_at > $${params.length} AND b.status IN ('pending','confirmed','waitlisted')`;
    } else if (filter.status) {
      params.push(filter.status);
      extra = `AND b.status = $${params.length}`;
    }
    const rows = await neonQuery<Row>(
      `SELECT b.id AS booking_id, b.event_id AS booking_event_id, b.user_id AS booking_user_id,
              b.reference AS booking_reference, b.spots AS booking_spots, b.status AS booking_status,
              b.payment_status AS booking_payment_status, b.created_at AS booking_created_at,
              b.updated_at AS booking_updated_at, e.* FROM bookings b JOIN events e ON e.id = b.event_id
       WHERE b.user_id = $1 ${extra} ORDER BY e.start_at ASC`,
      params,
    );
    return rows.map((r) => {
      const booking = mapBooking({
        id: r.booking_id,
        event_id: r.booking_event_id,
        user_id: r.booking_user_id,
        reference: r.booking_reference,
        spots: r.booking_spots,
        status: r.booking_status,
        payment_status: r.booking_payment_status,
        created_at: r.booking_created_at,
        updated_at: r.booking_updated_at,
      });
      const event = mapEvent(r);
      return { booking, event };
    });
  }
  return readDb((db) => {
    const now = Date.now();
    const events = new Map(db.events.map((e) => [e.id, e] as const));
    return db.bookings
      .filter((b) => {
        if (b.userId !== userId) return false;
        const e = events.get(b.eventId);
        if (!e) return false;
        if (filter.status === 'past') return Date.parse(e.endAt) <= now;
        if (filter.status === 'active') {
          return (
            Date.parse(e.endAt) > now &&
            (b.status === 'pending' || b.status === 'confirmed' || b.status === 'waitlisted')
          );
        }
        if (filter.status) return b.status === filter.status;
        return true;
      })
      .map((booking) => ({ booking, event: events.get(booking.eventId) as DbEvent }))
      .sort((a, b) => Date.parse(a.event.startAt) - Date.parse(b.event.startAt));
  });
}

export async function listEventBookings(
  eventId: string,
  status?: BookingStatus,
): Promise<Booking[]> {
  if (shouldUseNeon()) {
    const rows = status
      ? await neonQuery<Row>(`SELECT * FROM bookings WHERE event_id = $1 AND status = $2 ORDER BY created_at ASC`, [
          eventId,
          status,
        ])
      : await neonQuery<Row>(`SELECT * FROM bookings WHERE event_id = $1 ORDER BY created_at ASC`, [
          eventId,
        ]);
    return rows.map(mapBooking);
  }
  return readDb((db) =>
    db.bookings
      .filter((b) => b.eventId === eventId && (!status || b.status === status))
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)),
  );
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
  guardCapacity = false,
): Promise<Booking | null> {
  const now = nowIso();
  if (shouldUseNeon()) {
    if (guardCapacity && status === 'confirmed') {
      const rows = await neonQuery<Row>(
        `UPDATE bookings b SET status = 'confirmed', updated_at = $2
         WHERE b.id = $1 AND b.status <> 'confirmed' AND EXISTS (
           SELECT 1 FROM events e WHERE e.id = b.event_id AND (
             e.capacity_type = 'unlimited' OR e.capacity IS NULL OR
             (SELECT COALESCE(SUM(spots),0) FROM bookings x WHERE x.event_id = b.event_id AND x.status = 'confirmed') + b.spots <= e.capacity
           )
         )
         RETURNING *`,
        [id, now],
      );
      if (!rows.length) {
        const existing = await getBookingById(id);
        if (existing && existing.status !== 'confirmed') throw new Error('capacity_exceeded');
        return existing;
      }
      return mapBooking(rows[0]);
    }
    const rows = await neonQuery<Row>(
      `UPDATE bookings SET status = $2, updated_at = $3 WHERE id = $1 RETURNING *`,
      [id, status, now],
    );
    return rows.length ? mapBooking(rows[0]) : null;
  }
  return withDb((db) => {
    const booking = db.bookings.find((b) => b.id === id);
    if (!booking) return null;
    if (guardCapacity && status === 'confirmed' && booking.status !== 'confirmed') {
      const event = db.events.find((e) => e.id === booking.eventId);
      const used = db.bookings
        .filter((b) => b.eventId === booking.eventId && b.status === 'confirmed')
        .reduce((n, b) => n + b.spots, 0);
      if (
        event &&
        event.capacityType === 'limited' &&
        typeof event.capacity === 'number' &&
        used + booking.spots > event.capacity
      ) {
        throw new Error('capacity_exceeded');
      }
    }
    booking.status = status;
    booking.updatedAt = now;
    return booking;
  });
}

// ---------- notifications ----------

export async function createNotification(input: {
  userId: string;
  kind: string;
  title: string;
  body?: string;
  link?: string;
}): Promise<Notification> {
  const now = nowIso();
  if (shouldUseNeon()) {
    const rows = await neonQuery<Row>(
      `INSERT INTO notifications (id, user_id, kind, title, body, link, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [uid(), input.userId, input.kind, input.title, input.body ?? '', input.link ?? '', now],
    );
    return mapNotification(rows[0]);
  }
  const n: Notification = {
    id: uid(),
    userId: input.userId,
    kind: input.kind,
    title: input.title,
    body: input.body ?? '',
    link: input.link ?? '',
    readAt: null,
    createdAt: now,
  };
  withDb((db) => {
    db.notifications.push(n);
  });
  return n;
}

export async function listUserNotifications(
  userId: string,
  limit = 30,
): Promise<Notification[]> {
  const safe = Math.min(Math.max(limit, 1), 100);
  if (shouldUseNeon()) {
    const rows = await neonQuery<Row>(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [userId, safe],
    );
    return rows.map(mapNotification);
  }
  return readDb((db) =>
    db.notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, safe),
  );
}

export async function unreadNotificationCount(userId: string): Promise<number> {
  if (shouldUseNeon()) {
    const rows = await neonQuery<Row>(
      `SELECT COUNT(*)::int AS n FROM notifications WHERE user_id = $1 AND read_at IS NULL`,
      [userId],
    );
    return Number(rows[0]?.n ?? 0);
  }
  return readDb(
    (db) => db.notifications.filter((n) => n.userId === userId && !n.readAt).length,
  );
}

export async function markNotificationRead(id: string, userId: string): Promise<void> {
  if (shouldUseNeon()) {
    await neonQuery(`UPDATE notifications SET read_at = $1 WHERE id = $2 AND user_id = $3`, [
      nowIso(),
      id,
      userId,
    ]);
    return;
  }
  withDb((db) => {
    const n = db.notifications.find((x) => x.id === id && x.userId === userId);
    if (n && !n.readAt) n.readAt = nowIso();
  });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  if (shouldUseNeon()) {
    await neonQuery(`UPDATE notifications SET read_at = $1 WHERE user_id = $2 AND read_at IS NULL`, [
      nowIso(),
      userId,
    ]);
    return;
  }
  withDb((db) => {
    for (const n of db.notifications) {
      if (n.userId === userId && !n.readAt) n.readAt = nowIso();
    }
  });
}

// ---------- support ----------

export async function createTicket(input: {
  name: string;
  email: string;
  topic: string;
  message: string;
  bookingRef: string;
  contactPref: string;
}): Promise<SupportTicket> {
  const now = nowIso();
  if (shouldUseNeon()) {
    const rows = await neonQuery<Row>(
      `INSERT INTO support_tickets (id, name, email, topic, message, booking_ref, contact_pref, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'open',$8) RETURNING *`,
      [uid(), input.name, input.email, input.topic, input.message, input.bookingRef, input.contactPref, now],
    );
    return mapTicket(rows[0]);
  }
  const t: SupportTicket = {
    id: uid(),
    name: input.name,
    email: input.email,
    topic: input.topic,
    message: input.message,
    bookingRef: input.bookingRef,
    contactPref: input.contactPref,
    status: 'open',
    createdAt: now,
  };
  withDb((db) => {
    db.support.push(t);
  });
  return t;
}

// ---------- audit ----------

export async function logAudit(input: {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  const now = nowIso();
  if (shouldUseNeon()) {
    await neonQuery(
      `INSERT INTO audit_log (id, actor_id, action, target_type, target_id, meta, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [uid(), input.actorId || null, input.action, input.targetType, input.targetId, JSON.stringify(input.meta ?? {}), now],
    );
    return;
  }
  const entry: AuditEntry = {
    id: uid(),
    actorId: input.actorId,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    meta: input.meta ?? {},
    createdAt: now,
  };
  withDb((db) => {
    db.audit.push(entry);
  });
}

// ---------- images (database-backed, S3-free) ----------

function mapImage(r: Row): ImageRow {
  return {
    id: str(r.id),
    ownerId: str(r.owner_id),
    mime: str(r.mime),
    size: Number(r.size_bytes ?? r.size ?? 0),
    createdAt: iso(r.created_at),
  };
}

function localBlobPath(id: string): string {
  return path.join(path.dirname(dataFilePath()), 'blobs', id);
}

export async function createImage(input: {
  ownerId: string;
  mime: string;
  data: Buffer;
}): Promise<ImageRow> {
  const now = nowIso();
  const id = uid();
  if (shouldUseNeon()) {
    const rows = await neonQuery<Row>(
      `INSERT INTO images (id, owner_id, mime, size_bytes, data, created_at)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, owner_id, mime, size_bytes, created_at`,
      [id, input.ownerId, input.mime, input.data.length, input.data, now],
    );
    return mapImage(rows[0]);
  }
  const row: ImageRow = {
    id,
    ownerId: input.ownerId,
    mime: input.mime,
    size: input.data.length,
    createdAt: now,
  };
  const file = localBlobPath(id);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, input.data);
  withDb((db) => {
    db.images.push(row);
  });
  return row;
}

export async function getImageWithData(id: string): Promise<(ImageRow & { data: Buffer }) | null> {
  if (shouldUseNeon()) {
    const rows = await neonQuery<Row>(`SELECT id, owner_id, mime, size_bytes, data, created_at FROM images WHERE id = $1`, [id]);
    if (!rows.length) return null;
    const data = rows[0].data as Buffer;
    return { ...mapImage(rows[0]), data: Buffer.isBuffer(data) ? data : Buffer.from([]) };
  }
  const row = readDb((db) => db.images.find((i) => i.id === id) ?? null);
  if (!row) return null;
  try {
    return { ...row, data: fs.readFileSync(localBlobPath(id)) };
  } catch {
    return null;
  }
}

export async function deleteImage(id: string, ownerId: string): Promise<boolean> {
  if (shouldUseNeon()) {
    const rows = await neonQuery<Row>(`DELETE FROM images WHERE id = $1 AND owner_id = $2 RETURNING id`, [id, ownerId]);
    return rows.length > 0;
  }
  let removed = false;
  withDb((db) => {
    const before = db.images.length;
    db.images = db.images.filter((i) => !(i.id === id && i.ownerId === ownerId));
    removed = db.images.length !== before;
  });
  if (removed) {
    try {
      fs.unlinkSync(localBlobPath(id));
    } catch {
      // metadata already removed; file cleanup is best-effort
    }
  }
  return removed;
}

export async function getEventByCoverKey(imageId: string): Promise<DbEvent | null> {
  if (shouldUseNeon()) {
    const rows = await neonQuery<Row>(`SELECT * FROM events WHERE cover_key = $1 LIMIT 1`, [imageId]);
    return rows.length ? mapEvent(rows[0]) : null;
  }
  return readDb((db) => db.events.find((e) => e.coverKey === imageId) ?? null);
}

// ---------- email outbox (durable notifications) ----------

function mapOutbox(r: Row): OutboxJob {
  const status = str(r.status, 'queued');
  return {
    id: str(r.id),
    key: str(r.idempotency_key ?? r.key),
    to: str(r.recipient ?? r.to),
    subject: str(r.subject),
    text: str(r.body_text ?? r.text),
    html: str(r.body_html ?? r.html),
    status: (['queued', 'sending', 'retry', 'sent', 'failed'].includes(status) ? status : 'queued') as OutboxStatus,
    attempts: Number(r.attempts ?? 0),
    nextAttemptAt: iso(r.next_attempt_at ?? r.nextAttemptAt),
    lastError: str(r.last_error ?? r.lastError),
    sentAt: isoNull(r.sent_at ?? r.sentAt),
    createdAt: iso(r.created_at),
  };
}

export async function enqueueOutbox(input: {
  key: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<OutboxJob> {
  const now = nowIso();
  if (shouldUseNeon()) {
    const rows = await neonQuery<Row>(
      `INSERT INTO email_outbox (id, idempotency_key, recipient, subject, body_text, body_html, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,'queued',$7)
       ON CONFLICT (idempotency_key) DO NOTHING RETURNING *`,
      [uid(), input.key, input.to, input.subject, input.text, input.html, now],
    );
    if (rows.length) return mapOutbox(rows[0]);
    const existing = await neonQuery<Row>(`SELECT * FROM email_outbox WHERE idempotency_key = $1`, [input.key]);
    return mapOutbox(existing[0]);
  }
  return withDb((db) => {
    const found = db.outbox.find((o) => o.key === input.key);
    if (found) return found;
    const job: OutboxJob = {
      id: uid(),
      key: input.key,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      status: 'queued',
      attempts: 0,
      nextAttemptAt: now,
      lastError: '',
      sentAt: null,
      createdAt: now,
    };
    db.outbox.push(job);
    return job;
  });
}

// Atomic claim: only due jobs flip to 'sending', so concurrent workers cannot
// double-send. Returns the job or null when already claimed elsewhere.
export async function claimOutboxJob(id: string): Promise<OutboxJob | null> {
  if (shouldUseNeon()) {
    const rows = await neonQuery<Row>(
      `UPDATE email_outbox SET status = 'sending', attempts = attempts + 1
       WHERE id = $1 AND status IN ('queued', 'retry') AND next_attempt_at <= NOW()
       RETURNING *`,
      [id],
    );
    return rows.length ? mapOutbox(rows[0]) : null;
  }
  return withDb((db) => {
    const job = db.outbox.find((o) => o.id === id);
    if (!job || (job.status !== 'queued' && job.status !== 'retry')) return null;
    if (Date.parse(job.nextAttemptAt) > Date.now()) return null;
    job.status = 'sending';
    job.attempts += 1;
    return job;
  });
}

export async function markOutboxSent(id: string): Promise<void> {
  if (shouldUseNeon()) {
    await neonQuery(`UPDATE email_outbox SET status = 'sent', last_error = '', sent_at = NOW() WHERE id = $1`, [id]);
    return;
  }
  withDb((db) => {
    const job = db.outbox.find((o) => o.id === id);
    if (job) {
      job.status = 'sent';
      job.lastError = '';
      job.sentAt = nowIso();
    }
  });
}

export async function markOutboxRetry(id: string, error: string, delaySec: number): Promise<void> {
  const safe = error.slice(0, 300);
  if (shouldUseNeon()) {
    await neonQuery(
      `UPDATE email_outbox SET status = 'retry', last_error = $2, next_attempt_at = NOW() + ($3 || ' seconds')::interval WHERE id = $1`,
      [id, safe, String(Math.max(1, Math.floor(delaySec)))],
    );
    return;
  }
  withDb((db) => {
    const job = db.outbox.find((o) => o.id === id);
    if (job) {
      job.status = 'retry';
      job.lastError = safe;
      job.nextAttemptAt = new Date(Date.now() + Math.max(1, delaySec) * 1000).toISOString();
    }
  });
}

export async function markOutboxFailed(id: string, error: string): Promise<void> {
  const safe = error.slice(0, 300);
  if (shouldUseNeon()) {
    await neonQuery(`UPDATE email_outbox SET status = 'failed', last_error = $2 WHERE id = $1`, [id, safe]);
    return;
  }
  withDb((db) => {
    const job = db.outbox.find((o) => o.id === id);
    if (job) {
      job.status = 'failed';
      job.lastError = safe;
    }
  });
}

export async function listOutbox(status?: OutboxStatus, limit = 50): Promise<OutboxJob[]> {
  const safe = Math.min(Math.max(limit, 1), 200);
  if (shouldUseNeon()) {
    const rows = status
      ? await neonQuery<Row>(`SELECT * FROM email_outbox WHERE status = $1 ORDER BY created_at DESC LIMIT $2`, [status, safe])
      : await neonQuery<Row>(`SELECT * FROM email_outbox ORDER BY created_at DESC LIMIT $1`, [safe]);
    return rows.map(mapOutbox);
  }
  return readDb((db) =>
    db.outbox
      .filter((o) => !status || o.status === status)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, safe),
  );
}

