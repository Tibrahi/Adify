import { cookies, headers } from 'next/headers';
import { connection } from 'next/server';
import { getSession, getUserById } from './repo';
import type { User } from './types';
import { SESSION_COOKIE } from './util';

export { SESSION_COOKIE };

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function setSessionCookie(token: string, maxAgeSec: number): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, cookieOptions(maxAgeSec));
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<User | null> {
  // Session validation depends on the incoming request (cookies + current
  // time), so prerendering must stop here. This single choke point keeps every
  // dashboard route, the site header, and all guarded pages request-time.
  await connection();
  const token = await getSessionToken();
  if (!token) return null;
  const session = await getSession(token);
  if (!session) return null;
  if (Date.parse(session.expiresAt) <= Date.now()) return null;
  return getUserById(session.userId);
}

export async function clientIp(fallback = 'unknown'): Promise<string> {
  try {
    const h = await headers();
    const forwarded = h.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim() || fallback;
    return h.get('x-real-ip')?.trim() || fallback;
  } catch {
    return fallback;
  }
}
