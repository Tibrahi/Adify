import { randomBytes, randomUUID } from 'node:crypto';

export { SESSION_COOKIE } from './cookie-name';

export function uid(): string {
  return randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function bookingRef(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(6);
  let s = '';
  for (const b of bytes) s += alphabet[b % alphabet.length];
  return `ADF-${s}`;
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function randomCode(digits = 6): string {
  let s = '';
  const bytes = randomBytes(digits);
  for (const b of bytes) s += String(b % 10);
  return s;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Only allow relative redirect targets on this site (prevents open redirects).
export function safeNextPath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null;
  if (value.includes('://')) return null;
  return value.slice(0, 300);
}

export function appBaseUrl(): string {
  const raw = (process.env.APP_BASE_URL || 'http://localhost:3000').trim();
  return raw.replace(/\/+$/, '');
}

export function excerpt(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}
