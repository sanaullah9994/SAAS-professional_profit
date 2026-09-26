import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { buildAuthorizationUrl, createSignedState, getAmazonConfig, missingAmazonConfig } from '@amazon-profit/amazon';
import { notConfiguredRedirect, setOAuthCookie } from '@/lib/amazon-oauth';
import { workspaceId } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const targetWorkspace = await workspaceId();
  const missing = missingAmazonConfig();
  if (missing.length > 0) return notConfiguredRedirect(req.nextUrl.origin, missing);

  let config;
  try {
    config = getAmazonConfig();
  } catch {
    return notConfiguredRedirect(req.nextUrl.origin, missing);
  }

  const state = createSignedState({ workspaceId: targetWorkspace, nonce: randomUUID() }, process.env.AMAZON_TOKEN_ENCRYPTION_KEY!);
  const authorizationUrl = buildAuthorizationUrl({
    applicationId: config.spApiAppId,
    state,
    marketplaceId: config.marketplaceId,
    redirectUri: config.redirectUri,
    appVersion: config.appVersion,
  });

  const response = NextResponse.redirect(authorizationUrl);
  setOAuthCookie(response, state);
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
