import { NextRequest, NextResponse } from 'next/server';
import {
  encrypt,
  exchangeAuthorizationCode,
  getAmazonConfig,
  marketplaceLabel,
  missingAmazonConfig,
  resolveMarketplace,
  verifySignedState,
} from '@amazon-profit/amazon';
import { query } from '@amazon-profit/db';
import { AMAZON_OAUTH_COOKIE, clearOAuthCookie, notConfiguredRedirect, redirectConnections } from '@/lib/amazon-oauth';
import { kickInitialSync } from '@/lib/amazon-sync';

export const dynamic = 'force-dynamic';

const CONNECTIONS_PATH = '/connections';

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const params = req.nextUrl.searchParams;
  const oauthError = params.get('error');
  if (oauthError) {
    return redirectConnections(origin, { error: 'authorization_denied', detail: oauthError });
  }

  const missing = missingAmazonConfig();
  if (missing.length > 0) return notConfiguredRedirect(origin, missing);
  const config = getAmazonConfig();

  const state = params.get('state');
  const sellingPartnerId = params.get('selling_partner_id');
  const code = params.get('spapi_oauth_code');
  const cookieState = req.cookies.get(AMAZON_OAUTH_COOKIE)?.value;
  const key = process.env.AMAZON_TOKEN_ENCRYPTION_KEY!;

  const statePayload = verifySignedState(state, key);
  const cookiePayload = verifySignedState(cookieState ?? null, key);
  if (!statePayload || !cookiePayload || statePayload.nonce !== cookiePayload.nonce || statePayload.workspaceId !== cookiePayload.workspaceId) {
    return redirectConnections(origin, { error: 'invalid_state' });
  }
  if (!sellingPartnerId || !code) {
    return redirectConnections(origin, { error: 'missing_oauth_parameters' });
  }

  let refreshToken: string;
  try {
    const tokens = await exchangeAuthorizationCode({
      code,
      redirectUri: config.redirectUri,
      clientId: config.lwaClientId,
      clientSecret: config.lwaClientSecret,
    });
    if (!tokens.refreshToken) return redirectConnections(origin, { error: 'token_exchange_failed' });
    refreshToken = tokens.refreshToken;
  } catch (error) {
    console.error('[amazon-oauth] code exchange failed:', error instanceof Error ? error.message : error);
    return redirectConnections(origin, { error: 'token_exchange_failed' });
  }

  const marketplace = resolveMarketplace(config.marketplaceId);
  const encryptedRefreshToken = encrypt(refreshToken, config.encryptionKey);
  const displayName = `${marketplaceLabel(marketplace.id)} (${sellingPartnerId})`;

  let amazonAccountId: string;
  try {
    const result = await query<{ id: string }>(
      `INSERT INTO amazon_accounts(workspace_id, seller_id, display_name, marketplace_id, region, status, provider_mode, sp_refresh_token_encrypted, connected_at)
       VALUES($1, $2, $3, $4, $5, 'connected', 'live', $6, now())
       ON CONFLICT (workspace_id, seller_id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         marketplace_id = EXCLUDED.marketplace_id,
         region = EXCLUDED.region,
         status = 'connected',
         provider_mode = 'live',
         sp_refresh_token_encrypted = EXCLUDED.sp_refresh_token_encrypted,
         connected_at = now(),
         updated_at = now()
       RETURNING id::text`,
      [statePayload.workspaceId, sellingPartnerId, displayName, marketplace.id, marketplace.region, encryptedRefreshToken],
    );
    amazonAccountId = result.rows[0]!.id;
  } catch (error) {
    console.error('[amazon-oauth] failed to store connection:', error instanceof Error ? error.message : error);
    return redirectConnections(origin, { error: 'connection_store_failed' });
  }

  const sync = await kickInitialSync(origin, amazonAccountId, statePayload.workspaceId);
  const redirect = new URL(CONNECTIONS_PATH, origin);
  redirect.searchParams.set('connected', sellingPartnerId);
  redirect.searchParams.set('sync', sync);
  const response = NextResponse.redirect(redirect);
  clearOAuthCookie(response);
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
