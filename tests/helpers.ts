import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { hashPassword } from '../lib/password';
import { createEvent, createUser, type NewEvent } from '../lib/repo';

export function isolateDb(tag: string): string {
  const file = path.join(os.tmpdir(), `adify-test-${tag}-${process.pid}.json`);
  process.env.DATA_FILE = file;
  try {
    fs.unlinkSync(file);
  } catch {
    // fresh file
  }
  return file;
}

export function cleanupDb(file: string): void {
  try {
    fs.unlinkSync(file);
  } catch {
    // ignore
  }
}

let userSeq = 0;
export async function makeUser(overrides: { email?: string; fullName?: string } = {}) {
  userSeq += 1;
  return createUser({
    fullName: overrides.fullName ?? `Test User ${userSeq}`,
    email: overrides.email ?? `user${userSeq}-${Date.now()}@example.com`,
    passwordHash: await hashPassword('Passw0rd!'),
    country: '',
    phone: '',
  });
}

export function eventDefaults(ownerId: string): NewEvent {
  const start = new Date(Date.now() + 7 * 24 * 3600 * 1000);
  const end = new Date(start.getTime() + 3 * 3600 * 1000);
  return {
    ownerId,
    title: 'Lagos Tech Gathering',
    class: 'event',
    category: 'Technology',
    description: 'A sufficiently long description of this technology gathering in Lagos for testing.',
    coverKey: '',
    coverUrl: '',
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    timezone: 'Africa/Lagos',
    registrationDeadline: '',
    attendance: 'physical',
    venueName: 'Test Hall',
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
    capacity: 100,
    bookingMethod: 'request',
    spotsPerBooking: 2,
    eligibility: '',
    waitlistEnabled: true,
    cancellationPolicy: 'Cancel anytime.',
    refundTerms: '',
    attendanceRules: '',
    organizerContact: 'organizer@example.com',
    publicListing: true,
    status: 'published',
    moderationNote: '',
    programItems: [],
    extraContacts: [],
    publishedAt: new Date().toISOString(),
  };
}

export async function makeEvent(ownerId: string, overrides: Partial<NewEvent> = {}) {
  return createEvent({ ...eventDefaults(ownerId), ...overrides });
}
