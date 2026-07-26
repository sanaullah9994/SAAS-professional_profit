import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

// Everything NOT listed here is protected by default, so a new page under
// app/(dashboard)/* is never accidentally left unauthenticated just because
// nobody remembered to add it to a matcher list.
const PUBLIC_PATHS = new Set(['/', '/pricing', '/login', '/forgot-password', '/reset-password', '/verify-email']);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // This middleware protects pages, not API routes — every route under /api
  // manages its own access (better-auth's own routes, or intentionally public
  // @OptionalAuth-equivalent data endpoints like /api/v1/dashboard/overview).
  if (pathname.startsWith('/api/')) return NextResponse.next();
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

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
