import { NextResponse } from 'next/server';

export const AMAZON_OAUTH_COOKIE = 'amazon_oauth_state';

export function redirectConnections(origin: string, params: Record<string, string>): NextResponse {
  const url = new URL('/connections', origin);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = NextResponse.redirect(url);
  clearOAuthCookie(response);
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}

export function clearOAuthCookie(response: NextResponse): void {
  response.cookies.set(AMAZON_OAUTH_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/',
  });
}

export function setOAuthCookie(response: NextResponse, state: string): void {
  response.cookies.set(AMAZON_OAUTH_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    path: '/',
  });
}

export function notConfiguredRedirect(origin: string, missing: string[]): NextResponse {
  const response = redirectConnections(origin, { error: 'not_configured', missing: missing.join(',') });
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
