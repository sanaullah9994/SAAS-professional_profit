import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

export function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

// Everything rendered under app/(dashboard)/* — requires a session.
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/alerts/:path*',
    '/cogs/:path*',
    '/connections/:path*',
    '/custom-categories/:path*',
    '/fba-inventory/:path*',
    '/inventory/:path*',
    '/invoices/:path*',
    '/keyword-frequency/:path*',
    '/manual-expenses/:path*',
    '/orders/:path*',
    '/performance/:path*',
    '/plan-setup/:path*',
    '/ppc-analytics/:path*',
    '/products-cogs/:path*',
    '/profit-calculator/:path*',
    '/profit-loss/:path*',
    '/refer-earn/:path*',
    '/refunds/:path*',
    '/search-term-tags/:path*',
    '/settings/:path*',
    '/sku-profitability/:path*',
    '/sync-history/:path*',
    '/traffic-analytics/:path*',
    '/user-permissions/:path*',
  ],
};
