import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

// Everything NOT listed here is protected by default, so a new page under
// app/(dashboard)/* is never accidentally left unauthenticated just because
// nobody remembered to add it to a matcher list.
const PUBLIC_PATHS = new Set(['/', '/pricing', '/login', '/forgot-password', '/reset-password', '/verify-email']);

export function middleware(request: NextRequest) {
  if (PUBLIC_PATHS.has(request.nextUrl.pathname)) return NextResponse.next();

  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'],
};
