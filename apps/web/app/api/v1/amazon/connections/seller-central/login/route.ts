import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createSignedState, getAmazonConfig, isTrustedAmazonUrl, missingAmazonConfig, verifySignedState } from '@amazon-profit/amazon';
import { AMAZON_OAUTH_COOKIE, notConfiguredRedirect, redirectConnections, setOAuthCookie } from '@/lib/amazon-oauth';
import { workspaceId } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const amazonCallbackUri = params.get('amazon_callback_uri');
  const amazonState = params.get('amazon_state');
  const version = params.get('version');
  const origin = req.nextUrl.origin;

  if (!amazonCallbackUri || !amazonState) {
    return redirectConnections(origin, { error: 'invalid_login_request' });
  }
  if (!isTrustedAmazonUrl(amazonCallbackUri)) {
    return redirectConnections(origin, { error: 'untrusted_callback' });
  }

  const missing = missingAmazonConfig();
  if (missing.length > 0) return notConfiguredRedirect(origin, missing);

  const key = process.env.AMAZON_TOKEN_ENCRYPTION_KEY!;
  const config = getAmazonConfig();
  const cookieState = req.cookies.get(AMAZON_OAUTH_COOKIE)?.value;
  const verified = verifySignedState(cookieState ?? null, key);
  const state = verified
    ? cookieState!
    : createSignedState({ workspaceId: await workspaceId(), nonce: randomUUID() }, key);

  const target = new URL(amazonCallbackUri);
  target.searchParams.set('amazon_state', amazonState);
  target.searchParams.set('state', state);
  target.searchParams.set('redirect_uri', config.redirectUri);
  if (version) target.searchParams.set('version', version);

  const response = NextResponse.redirect(target);
  setOAuthCookie(response, state);
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
