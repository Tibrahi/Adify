// Shared ADIFY domain types. Mirrors migrations/001_init.sql.

export type EventClass = 'event' | 'ceremony';
export type Attendance = 'physical' | 'online' | 'hybrid';
export type Pricing = 'free' | 'paid';
export type EventStatus =
  | 'draft'
  | 'pending'
  | 'published'
  | 'rejected'
  | 'cancelled'
  | 'suspended';
export type Lifecycle = 'upcoming' | 'happening' | 'completed' | 'cancelled' | 'suspended';
export type BookingStatus = 'pending' | 'confirmed' | 'waitlisted' | 'cancelled' | 'declined';
export type BookingMethod = 'request' | 'reserve';

export interface User {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  country: string;
  phone: string;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionRow {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface VerificationCode {
  id: string;
  userId: string;
  purpose: 'email_verify' | 'password_reset';
  codeHash: string;
  expiresAt: string;
  attempts: number;
  consumedAt: string | null;
  createdAt: string;
}

export interface ProgramItem {
  id: string;
  title: string;
  detail: string;
}

export interface ExtraContact {
  id: string;
  name: string;
  detail: string;
}

export interface DbEvent {
  id: string;
  ownerId: string;
  title: string;
  class: EventClass;
  category: string;
  description: string;
  coverKey: string;
  coverUrl: string;
  startAt: string;
  endAt: string;
  timezone: string;
  registrationDeadline: string;
  attendance: Attendance;
  venueName: string;
  country: string;
  city: string;
  address: string;
  directions: string;
  accessibility: string;
  onlinePlatform: string;
  onlineAccess: string;
  pricing: Pricing;
  /** Legacy float price (read-only, retained for history). Canonical: priceAmountMinor. */
  priceAmount: number | null;
  /** Canonical price in integer minor units (cents). Null when free/unset. */
  priceAmountMinor: number | null;
  currency: string;
  capacityType: 'limited' | 'unlimited';
  capacity: number | null;
  bookingMethod: BookingMethod;
  spotsPerBooking: number;
  eligibility: string;
  waitlistEnabled: boolean;
  cancellationPolicy: string;
  refundTerms: string;
  attendanceRules: string;
  organizerContact: string;
  publicListing: boolean;
  status: EventStatus;
  moderationNote: string;
  programItems: ProgramItem[];
  extraContacts: ExtraContact[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface Booking {
  id: string;
  eventId: string;
  userId: string;
  reference: string;
  spots: number;
  status: BookingStatus;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  kind: string;
  title: string;
  body: string;
  link: string;
  readAt: string | null;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  bookingRef: string;
  contactPref: string;
  status: string;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  meta: Record<string, unknown>;
  createdAt: string;
}

export interface ImageRow {
  id: string;
  ownerId: string;
  mime: string;
  size: number;
  createdAt: string;
}

export type OutboxStatus = 'queued' | 'sending' | 'retry' | 'sent' | 'failed';

export interface OutboxJob {
  id: string;
  key: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  status: OutboxStatus;
  attempts: number;
  nextAttemptAt: string;
  lastError: string;
  sentAt: string | null;
  createdAt: string;
}

export interface DbShape {
  users: User[];
  sessions: SessionRow[];
  codes: VerificationCode[];
  events: DbEvent[];
  bookings: Booking[];
  notifications: Notification[];
  support: SupportTicket[];
  audit: AuditEntry[];
  images: ImageRow[];
  outbox: OutboxJob[];
}

export interface EventFilters {
  q?: string;
  class?: EventClass;
  category?: string;
  city?: string;
  country?: string;
  organizer?: string;
  pricing?: Pricing;
  attendance?: Attendance;
  time?: 'upcoming' | 'happening';
  dateFrom?: string;
  dateTo?: string;
  availableOnly?: boolean;
  ownerId?: string;
  status?: EventStatus;
  eligibleOnly?: boolean;
  limit?: number;
  offset?: number;
  sort?: 'start_asc' | 'created_desc';
}

export type BookingAction =
  | 'request'
  | 'reserve'
  | 'waitlist'
  | 'closed'
  | 'soldout'
  | 'ended'
  | 'cancelled'
  | 'manage';

export const EVENT_CATEGORIES = [
  'Education',
  'Business',
  'Technology',
  'Culture',
  'Entertainment',
  'Community',
  'Awards and celebrations',
  'Health',
  'Sports',
  'Religion',
] as const;
