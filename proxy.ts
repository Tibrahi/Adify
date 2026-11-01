import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE } from './lib/cookie-name';

// Guests hitting protected dashboard routes are sent to auth with the
// intended destination preserved. Session validity is re-checked server-side.
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (!pathname.startsWith('/dashboard')) return NextResponse.next();
  if (!request.cookies.get(SESSION_COOKIE)?.value) {
    const next = encodeURIComponent(`${pathname}${search}`);
    const url = request.nextUrl.clone();
    url.pathname = '/auth';
    url.search = `?mode=login&next=${next}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/dashboard/:path*'] };
