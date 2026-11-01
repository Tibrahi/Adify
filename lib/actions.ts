'use server';

import { revalidatePath } from 'next/cache';
import { clearSessionCookie, clientIp, getCurrentUser, setSessionCookie } from './auth';
import { lifecycleOf, resolveBookingAction } from './events';
import { notifyUser, resetEmail, sendTracked, verificationEmail } from './email';
import { parseEventForm, publicationErrors } from './event-form';
import { hashCode, hashPassword, rateLimit, verifyPassword } from './password';
import { validatePhone } from './phone';
import {
  bumpCodeAttempts,
  consumeCode,
  countRecentCodes,
  confirmedSpots,
  createBooking,
  createCode,
  createEvent,
  createNotification,
  createSession,
  createTicket,
  createUser,
  deleteSession,
  getBookingById,
  getEventById,
  getLatestCode,
  getUserBookingForEvent,
  getUserByEmail,
  getUserById,
  listEventBookings,
  logAudit,
  markAllNotificationsRead,
  markNotificationRead,
  updateBookingStatus,
  updateEvent,
  updateUser,
} from './repo';
import { deleteCover, saveCover } from './storage';
import type { BookingStatus } from './types';
import { eventPriceMinor } from './dates';
import { appBaseUrl, normalizeEmail, randomCode, safeNextPath } from './util';
import { clampInt, isCountryCode, isEmail, passwordIssues } from './validate';

// ---------- shared action result ----------

export interface ActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  redirect?: string;
}

function fail(error: string, fieldErrors?: Record<string, string>): ActionResult {
  return { ok: false, error, fieldErrors };
}

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === 'string' ? v.trim() : '';
}

// ---------- registration / login ----------

export async function registerAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ip = await clientIp();
  const rl = rateLimit(`register:${ip}`, 10, 60 * 60 * 1000);
  if (!rl.allowed) return fail('Too many registration attempts. Please try again later.');

  const fullName = str(formData, 'fullName');
  const email = normalizeEmail(str(formData, 'email'));
  const password = str(formData, 'password');
  const confirm = str(formData, 'confirm');
  const country = str(formData, 'country').toUpperCase();
  const phone = str(formData, 'phone');
  const terms = formData.get('terms') === 'on';
  const next = safeNextPath(formData.get('next'));

  const fieldErrors: Record<string, string> = {};
  if (fullName.length < 2 || fullName.length > 80) fieldErrors.fullName = 'Enter your full name.';
  if (!isEmail(email)) fieldErrors.email = 'Enter a valid email address.';
  const pwIssues = passwordIssues(password);
  if (pwIssues.length) fieldErrors.password = `Password needs ${pwIssues.join(', ')}.`;
  if (confirm !== password) fieldErrors.confirm = 'Passwords do not match.';
  if (!terms) fieldErrors.terms = 'Please accept the Terms and Privacy Policy.';
  if (country && !isCountryCode(country)) fieldErrors.country = 'Select a valid country.';
  if (phone) {
    const check = validatePhone(phone, country || undefined);
    if (!check.ok) fieldErrors.phone = check.error;
  }
  if (Object.keys(fieldErrors).length) return fail('Please fix the highlighted fields.', fieldErrors);

  const existing = await getUserByEmail(email);
  if (existing) {
    // Duplicate-safe: do not confirm or deny decisively; guide to login.
    return fail('Could not create an account with these details. If you already have an account, try logging in.');
  }

  const passwordHash = await hashPassword(password);
  const user = await createUser({ fullName, email, passwordHash, country, phone });
  await logAudit({ actorId: user.id, action: 'user.register', targetType: 'user', targetId: user.id });

  const code = randomCode(6);
  const codeRow = await createCode({ userId: user.id, purpose: 'email_verify', codeHash: hashCode(code), ttlMinutes: 15 });
  const mail = verificationEmail(code);
  // Tracked + queued: registration succeeds even if SMTP is down.
  await sendTracked({ key: `verify:${user.id}:${codeRow.id}`, to: email, subject: mail.subject, text: mail.text, html: mail.html });

  const session = await createSession(user.id, 30);
  await setSessionCookie(session.token, 30 * 24 * 3600);
  revalidatePath('/');
  return { ok: true, redirect: next ?? '/dashboard' };
}

export async function loginAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ip = await clientIp();
  const email = normalizeEmail(str(formData, 'email'));
  const password = str(formData, 'password');
  const remember = formData.get('remember') === 'on';
  const next = safeNextPath(formData.get('next'));

  const rl = rateLimit(`login:${ip}:${email}`, 10, 15 * 60 * 1000);
  if (!rl.allowed) return fail('Too many login attempts. Please try again later.');
  if (!isEmail(email) || !password) return fail('Invalid email or password.');

  const user = await getUserByEmail(email);
  // Generic message either way: never reveal whether the email exists.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return fail('Invalid email or password.');
  }

  const days = remember ? 30 : 1;
  const session = await createSession(user.id, days);
  await setSessionCookie(session.token, days * 24 * 3600);
  await logAudit({ actorId: user.id, action: 'user.login', targetType: 'user', targetId: user.id });
  revalidatePath('/');
  return { ok: true, redirect: next ?? '/dashboard' };
}

export async function logoutAction(): Promise<ActionResult> {
  const { getSessionToken } = await import('./auth');
  const token = await getSessionToken();
  if (token) await deleteSession(token);
  await clearSessionCookie();
  revalidatePath('/');
  return { ok: true, redirect: '/' };
}

export async function resendCodeAction(): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail('Please log in first.');
  const recent = await countRecentCodes(user.id, 60);
  if (recent >= 5) return fail('Too many codes sent. Please try again later.');
  const latest = await getLatestCode(user.id, 'email_verify');
  if (latest && Date.parse(latest.createdAt) > Date.now() - 60 * 1000) {
    return fail('Please wait a minute before requesting another code.');
  }
  const code = randomCode(6);
  const codeRow = await createCode({ userId: user.id, purpose: 'email_verify', codeHash: hashCode(code), ttlMinutes: 15 });
  const mail = verificationEmail(code);
  await sendTracked({ key: `verify:${user.id}:${codeRow.id}`, to: user.email, subject: mail.subject, text: mail.text, html: mail.html });
  return { ok: true };
}

export async function verifyEmailAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail('Please log in first.');
  const code = str(formData, 'code').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(code)) return fail('Enter the 6-digit code.');
  const row = await getLatestCode(user.id, 'email_verify');
  if (!row) return fail('No active code. Request a new one.');
  if (Date.parse(row.expiresAt) <= Date.now()) return fail('That code expired. Request a new one.');
  if (row.attempts >= 5) return fail('Too many attempts. Request a new code.');
  if (hashCode(code) !== row.codeHash) {
    await bumpCodeAttempts(row.id);
    return fail('Incorrect code. Please try again.');
  }
  await consumeCode(row.id);
  await updateUser(user.id, { emailVerifiedAt: new Date().toISOString() });
  return { ok: true, redirect: '/dashboard/profile' };
}

export async function forgotPasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ip = await clientIp();
  const rl = rateLimit(`forgot:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) return fail('Too many attempts. Please try again later.');
  const email = normalizeEmail(str(formData, 'email'));
  // Always respond generically.
  if (!isEmail(email)) return { ok: true };
  const user = await getUserByEmail(email);
  if (user) {
    const recent = await countRecentCodes(user.id, 60);
    if (recent < 5) {
      const token = randomCode(8);
      const codeRow = await createCode({ userId: user.id, purpose: 'password_reset', codeHash: hashCode(token), ttlMinutes: 30 });
      const link = `${appBaseUrl()}/auth/reset?token=${token}&email=${encodeURIComponent(email)}`;
      const mail = resetEmail(link);
      await sendTracked({ key: `reset:${user.id}:${codeRow.id}`, to: email, subject: mail.subject, text: mail.text, html: mail.html });
    }
  }
  return { ok: true };
}

export async function resetPasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const email = normalizeEmail(str(formData, 'email'));
  const token = str(formData, 'token').replace(/\s+/g, '');
  const password = str(formData, 'password');
  const confirm = str(formData, 'confirm');
  const pwIssues = passwordIssues(password);
  if (pwIssues.length) return fail(`Password needs ${pwIssues.join(', ')}.`);
  if (confirm !== password) return fail('Passwords do not match.');
  const user = await getUserByEmail(email);
  if (!user) return fail('This reset link is invalid or expired.');
  const row = await getLatestCode(user.id, 'password_reset');
  if (!row || Date.parse(row.expiresAt) <= Date.now() || row.attempts >= 5 || hashCode(token) !== row.codeHash) {
    if (row) await bumpCodeAttempts(row.id);
    return fail('This reset link is invalid or expired.');
  }
  await consumeCode(row.id);
  await updateUser(user.id, { passwordHash: await hashPassword(password) });
  await logAudit({ actorId: user.id, action: 'user.password_reset', targetType: 'user', targetId: user.id });
  return { ok: true, redirect: '/auth?mode=login' };
}

async function storeCover(file: File | null, ownerId: string): Promise<string> {
  if (!file) return '';
  const buf = Buffer.from(await file.arrayBuffer());
  return saveCover(buf, file.type, ownerId);
}

// ---------- event actions ----------

export async function createEventAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail('Please log in to post an event.', undefined);
  const ip = await clientIp();
  const rl = rateLimit(`event:create:${user.id}:${ip}`, 20, 60 * 60 * 1000);
  if (!rl.allowed) return fail('Too many events created. Please try again later.');

  const parsed = parseEventForm(formData);
  if (Object.keys(parsed.fieldErrors).length) {
    return fail('Please fix the highlighted fields.', parsed.fieldErrors);
  }
  let coverKey = '';
  try {
    coverKey = await storeCover(parsed.coverFile, user.id);
  } catch {
    return fail('Cover image must be JPG, PNG, WebP or GIF up to 5 MB.', { cover: 'Invalid cover image.' });
  }

  const submit = formData.get('submit') === 'publish';
  const event = await createEvent({
    ...parsed.data,
    ownerId: user.id,
    coverKey,
    coverUrl: '',
    status: 'draft',
    publishedAt: null,
  });
  await logAudit({ actorId: user.id, action: 'event.create', targetType: 'event', targetId: event.id });

  if (submit) {
    const pubErrors = publicationErrors(event);
    if (pubErrors.length) {
      return { ok: true, redirect: `/dashboard/events/${event.id}?notice=draft_saved` };
    }
    await updateEvent(event.id, { status: 'published', publishedAt: new Date().toISOString() });
    await logAudit({ actorId: user.id, action: 'event.publish', targetType: 'event', targetId: event.id });
    await notifyUser({
      userId: user.id,
      email: user.email,
      kind: 'event_published',
      title: 'Your listing is published',
      body: `“${event.title}” is now visible in public discovery.`,
      link: `/events/${event.id}`,
      key: `event:${event.id}:published`,
    });
  }
  revalidatePath('/');
  revalidatePath('/discover');
  return { ok: true, redirect: `/dashboard/events/${event.id}` };
}

export async function updateEventAction(eventId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail('Please log in first.');
  const event = await getEventById(eventId);
  if (!event || event.ownerId !== user.id) return fail('You cannot edit this listing.');
  if (event.status === 'cancelled' || event.status === 'suspended') {
    return fail('Cancelled or suspended listings cannot be edited.');
  }

  const parsed = parseEventForm(formData);
  if (Object.keys(parsed.fieldErrors).length) {
    return fail('Please fix the highlighted fields.', parsed.fieldErrors);
  }
  let coverKey = event.coverKey;
  let coverUrl = event.coverUrl;
  if (parsed.coverFile) {
    try {
      const previous = coverKey;
      coverKey = await storeCover(parsed.coverFile, user.id);
      coverUrl = '';
      if (previous) await deleteCover(previous, user.id);
    } catch {
      return fail('Cover image must be JPG, PNG, WebP or GIF up to 5 MB.', { cover: 'Invalid cover image.' });
    }
  }

  const materialChange =
    parsed.data.startAt !== event.startAt ||
    parsed.data.endAt !== event.endAt ||
    parsed.data.venueName !== event.venueName ||
    parsed.data.city !== event.city ||
    parsed.data.country !== event.country ||
    parsed.data.attendance !== event.attendance ||
    parsed.data.pricing !== event.pricing ||
    parsed.data.priceAmountMinor !== eventPriceMinor(event) ||
    parsed.data.capacity !== event.capacity;

  await updateEvent(eventId, { ...parsed.data, coverKey, coverUrl });
  await logAudit({ actorId: user.id, action: 'event.update', targetType: 'event', targetId: eventId });

  if (materialChange && event.status === 'published') {
    const bookings = await listEventBookings(eventId, 'confirmed');
    for (const b of bookings.slice(0, 200)) {
      const attendee = await getUserById(b.userId);
      if (!attendee) continue;
      await notifyUser({
        userId: attendee.id,
        email: attendee.email,
        kind: 'event_changed',
        title: 'An event you booked has changed',
        body: `“${event.title}” details changed. Please review the listing.`,
        link: `/events/${eventId}`,
        key: `event:${eventId}:changed:${attendee.id}:${new Date().toISOString().slice(0, 13)}`,
      });
    }
  }
  revalidatePath('/');
  revalidatePath('/discover');
  revalidatePath(`/events/${eventId}`);
  return { ok: true, redirect: `/dashboard/events/${eventId}` };
}

export async function publishEventAction(eventId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail('Please log in first.');
  const event = await getEventById(eventId);
  if (!event || event.ownerId !== user.id) return fail('You cannot publish this listing.');
  if (event.status === 'published') return { ok: true, redirect: `/events/${eventId}` };
  if (event.status === 'cancelled' || event.status === 'suspended') {
    return fail('This listing cannot be published.');
  }
  const errors = publicationErrors(event);
  if (errors.length) {
    return fail(`This listing is missing required publication details: ${errors.join(', ')}.`);
  }
  await updateEvent(eventId, { status: 'published', publishedAt: new Date().toISOString() });
  await logAudit({ actorId: user.id, action: 'event.publish', targetType: 'event', targetId: eventId });
  await notifyUser({
    userId: user.id,
    email: user.email,
    kind: 'event_published',
    title: 'Your listing is published',
    body: `“${event.title}” is now visible in public discovery.`,
    link: `/events/${eventId}`,
    key: `event:${eventId}:published`,
  });
  revalidatePath('/');
  revalidatePath('/discover');
  return { ok: true, redirect: `/events/${eventId}` };
}

export async function unpublishEventAction(eventId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail('Please log in first.');
  const event = await getEventById(eventId);
  if (!event || event.ownerId !== user.id) return fail('You cannot change this listing.');
  if (event.status !== 'published') return fail('Only published listings can be unpublished.');
  await updateEvent(eventId, { status: 'draft' });
  await logAudit({ actorId: user.id, action: 'event.unpublish', targetType: 'event', targetId: eventId });
  revalidatePath('/');
  revalidatePath('/discover');
  revalidatePath(`/events/${eventId}`);
  return { ok: true, redirect: `/dashboard/events/${eventId}` };
}

export async function cancelEventAction(eventId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail('Please log in first.');
  const event = await getEventById(eventId);
  if (!event || event.ownerId !== user.id) return fail('You cannot cancel this listing.');
  if (event.status === 'cancelled') return { ok: true, redirect: `/dashboard/events/${eventId}` };
  await updateEvent(eventId, { status: 'cancelled' });
  await logAudit({ actorId: user.id, action: 'event.cancel', targetType: 'event', targetId: eventId });
  const bookings = await listEventBookings(eventId);
  for (const b of bookings.filter((x) => x.status === 'confirmed' || x.status === 'pending' || x.status === 'waitlisted').slice(0, 200)) {
    await updateBookingStatus(b.id, 'cancelled');
    const attendee = await getUserById(b.userId);
    if (!attendee) continue;
    await notifyUser({
      userId: attendee.id,
      email: attendee.email,
      kind: 'booking_cancelled',
      title: 'An event you booked was cancelled',
      body: `“${event.title}” was cancelled by the organizer. Booking ${b.reference}.`,
      key: `event:${event.id}:cancelled:${b.id}`,
      link: '/dashboard/bookings',
    });
  }
  revalidatePath('/');
  revalidatePath('/discover');
  revalidatePath(`/events/${eventId}`);
  return { ok: true, redirect: `/dashboard/events/${eventId}` };
}

// ---------- booking actions ----------

export async function bookingAction(eventId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: 'auth_required', redirect: `/auth?mode=login&next=${encodeURIComponent(`/events/${eventId}`)}` };
  }
  const event = await getEventById(eventId);
  if (!event) return fail('This listing no longer exists.');
  if (event.ownerId === user.id) return fail('Organizers cannot book their own listing.');
  if (event.status !== 'published' || !event.publicListing) return fail('This listing is not available for booking.');

  const life = lifecycleOf(event);
  if (life === 'completed') return fail('This event has ended.');
  if (life === 'cancelled' || life === 'suspended') return fail('This event was cancelled.');
  if (event.registrationDeadline && Date.parse(event.registrationDeadline) <= Date.now()) {
    return fail('Registration for this event is closed.');
  }

  const existing = await getUserBookingForEvent(eventId, user.id);
  if (existing && (existing.status === 'pending' || existing.status === 'confirmed' || existing.status === 'waitlisted')) {
    return fail('You already have a booking for this event.', undefined);
  }

  const spots = clampInt(str(formData, 'spots') || '1', 1, 1, event.spotsPerBooking);
  const used = await confirmedSpots(eventId);
  const action = resolveBookingAction({ event, confirmedUsed: used, existing, userId: user.id });
  if (action === 'closed') return fail('Registration for this event is closed.');
  if (action === 'soldout') return fail('This event is sold out.');
  if (action === 'ended' || action === 'cancelled') return fail('This event is no longer available.');

  let status: BookingStatus = 'pending';
  if (action === 'reserve') status = 'confirmed';
  if (action === 'waitlist') status = 'waitlisted';

  try {
    const booking = await createBooking({ eventId, userId: user.id, spots, status });
    await logAudit({ actorId: user.id, action: 'booking.create', targetType: 'booking', targetId: booking.id });
    const owner = await getUserById(event.ownerId);
    const statusText = status === 'confirmed' ? 'confirmed' : status === 'waitlisted' ? 'waitlisted' : 'pending review';
    await notifyUser({
      userId: user.id,
      email: user.email,
      kind: 'booking_created',
      title: 'Booking request received',
      body: `“${event.title}” · ${booking.reference} · ${statusText}.`,
      key: `booking:${booking.id}:attendee`,
      link: '/dashboard/bookings',
    });
    if (owner) {
      await notifyUser({
        userId: owner.id,
        email: owner.email,
        kind: 'booking_request',
        title: 'New booking request',
        body: `“${event.title}” · ${booking.reference} · ${spots} spot(s).`,
        key: `booking:${booking.id}:organizer`,
        link: `/dashboard/events/${eventId}`,
      });
    }
    revalidatePath(`/events/${eventId}`);
    return { ok: true, redirect: '/dashboard/bookings' };
  } catch (err) {
    if (err instanceof Error && err.message === 'capacity_exceeded') {
      return fail('This event just sold out. Please try the waitlist if available.');
    }
    throw err;
  }
}

export async function cancelBookingAction(bookingId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail('Please log in first.');
  const booking = await getBookingById(bookingId);
  if (!booking) return fail('Booking not found.');
  const event = await getEventById(booking.eventId);
  if (!event) return fail('Booking not found.');
  const isAttendee = booking.userId === user.id;
  const isOwner = event.ownerId === user.id;
  if (!isAttendee && !isOwner) return fail('You cannot change this booking.');
  if (booking.status === 'cancelled') return { ok: true, redirect: '/dashboard/bookings' };
  await updateBookingStatus(bookingId, 'cancelled');
  await logAudit({ actorId: user.id, action: 'booking.cancel', targetType: 'booking', targetId: bookingId });
  const otherId = isAttendee ? event.ownerId : booking.userId;
  const other = await getUserById(otherId);
  if (other) {
    await notifyUser({
      userId: other.id,
      email: other.email,
      kind: 'booking_cancelled',
      title: 'A booking was cancelled',
      body: `“${event.title}” · ${booking.reference}.`,
      link: isAttendee ? `/dashboard/events/${event.id}` : '/dashboard/bookings',
      key: `booking:${booking.id}:cancelled:${other.id}`,
    });
  }
  revalidatePath('/dashboard/bookings');
  revalidatePath(`/events/${event.id}`);
  return { ok: true, redirect: isAttendee ? '/dashboard/bookings' : `/dashboard/events/${event.id}` };
}

export async function decideBookingAction(bookingId: string, decision: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail('Please log in first.');
  const booking = await getBookingById(bookingId);
  if (!booking) return fail('Booking not found.');
  const event = await getEventById(booking.eventId);
  if (!event || event.ownerId !== user.id) return fail('Only the organizer can decide this request.');
  if (decision !== 'approve' && decision !== 'decline') return fail('Invalid decision.');
  if (booking.status !== 'pending' && booking.status !== 'waitlisted') {
    return fail('This request was already decided.');
  }
  try {
    if (decision === 'approve') {
      await updateBookingStatus(bookingId, 'confirmed', true);
    } else {
      await updateBookingStatus(bookingId, 'declined');
    }
  } catch (err) {
    if (err instanceof Error && err.message === 'capacity_exceeded') {
      return fail('Capacity is full. You cannot approve this request.');
    }
    throw err;
  }
  await logAudit({
    actorId: user.id,
    action: decision === 'approve' ? 'booking.approve' : 'booking.decline',
    targetType: 'booking',
    targetId: bookingId,
  });
  const attendee = await getUserById(booking.userId);
  if (attendee) {
    await notifyUser({
      userId: attendee.id,
      email: attendee.email,
      kind: decision === 'approve' ? 'booking_approved' : 'booking_declined',
      title: decision === 'approve' ? 'Your booking was approved' : 'Your booking was declined',
      body: `“${event.title}” · ${booking.reference}.`,
      link: '/dashboard/bookings',
      key: `booking:${booking.id}:${decision}`,
    });
  }
  revalidatePath(`/dashboard/events/${event.id}`);
  return { ok: true, redirect: `/dashboard/events/${event.id}` };
}

// ---------- notifications / profile / support ----------

export async function markNotificationAction(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail('Please log in first.');
  await markNotificationRead(id, user.id);
  revalidatePath('/dashboard');
  return { ok: true };
}

export async function markAllNotificationsAction(): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail('Please log in first.');
  await markAllNotificationsRead(user.id);
  revalidatePath('/dashboard');
  return { ok: true };
}

export async function updateProfileAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail('Please log in first.');
  const fullName = str(formData, 'fullName');
  const country = str(formData, 'country').toUpperCase();
  const phone = str(formData, 'phone');
  const fieldErrors: Record<string, string> = {};
  if (fullName.length < 2 || fullName.length > 80) fieldErrors.fullName = 'Enter your full name.';
  if (country && !isCountryCode(country)) fieldErrors.country = 'Select a valid country.';
  if (phone) {
    const check = validatePhone(phone, country || undefined);
    if (!check.ok) fieldErrors.phone = check.error;
  }
  if (Object.keys(fieldErrors).length) return fail('Please fix the highlighted fields.', fieldErrors);
  await updateUser(user.id, { fullName, country, phone });
  revalidatePath('/dashboard');
  return { ok: true };
}

export async function changePasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail('Please log in first.');
  const current = str(formData, 'current');
  const password = str(formData, 'password');
  const confirm = str(formData, 'confirm');
  if (!(await verifyPassword(current, user.passwordHash))) return fail('Current password is incorrect.');
  const issues = passwordIssues(password);
  if (issues.length) return fail(`New password needs ${issues.join(', ')}.`);
  if (confirm !== password) return fail('Passwords do not match.');
  await updateUser(user.id, { passwordHash: await hashPassword(password) });
  await createNotification({
    userId: user.id,
    kind: 'security',
    title: 'Password changed',
    body: 'Your account password was changed.',
    link: '/dashboard/profile',
  });
  return { ok: true };
}

const SUPPORT_TOPICS = ['Booking help', 'Publishing help', 'Account & login', 'Report a listing', 'Other'];

export async function supportAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ip = await clientIp();
  const rl = rateLimit(`support:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) return fail('Too many support requests. Please try again later.');
  const name = str(formData, 'name');
  const email = normalizeEmail(str(formData, 'email'));
  const topic = str(formData, 'topic');
  const message = str(formData, 'message');
  const bookingRefValue = str(formData, 'bookingRef').toUpperCase();
  const contactPref = str(formData, 'contactPref') || 'email';

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2 || name.length > 80) fieldErrors.name = 'Enter your name.';
  if (!isEmail(email)) fieldErrors.email = 'Enter a valid email address.';
  if (!SUPPORT_TOPICS.includes(topic)) fieldErrors.topic = 'Choose a topic.';
  if (message.length < 10 || message.length > 3000) fieldErrors.message = 'Message must be 10–3000 characters.';
  if (bookingRefValue && !/^ADF-[A-Z0-9]{6}$/.test(bookingRefValue)) fieldErrors.bookingRef = 'Enter a valid booking reference.';
  if (Object.keys(fieldErrors).length) return fail('Please fix the highlighted fields.', fieldErrors);

  // Anti-spam: simple honeypot + link-count heuristic.
  if (str(formData, 'company')) return { ok: true };
  if ((message.match(/https?:\/\//g) ?? []).length > 3) return fail('Your message looks like spam. Please remove extra links.');

  const ticket = await createTicket({
    name,
    email,
    topic,
    message,
    bookingRef: bookingRefValue,
    contactPref,
  });
  const supportTo = process.env.SUPPORT_EMAIL || '';
  if (supportTo && isEmail(supportTo)) {
    // Tracked: the ticket is stored regardless of mail delivery.
    await sendTracked({
      key: `support:${ticket.id}:team`,
      to: supportTo,
      subject: `ADIFY support: ${topic} (${ticket.id.slice(0, 8)})`,
      text: `From: ${name} <${email}>\nTopic: ${topic}\nBooking: ${bookingRefValue || 'n/a'}\n\n${message}`,
    });
  }
  await sendTracked({
    key: `support:${ticket.id}:ack`,
    to: email,
    subject: 'We received your ADIFY support request',
    text: `Hi ${name},\n\nWe received your request about “${topic}”. Reference: ${ticket.id.slice(0, 8)}. We will reply to this email address.\n\n— ADIFY support`,
  });
  return { ok: true };
}
