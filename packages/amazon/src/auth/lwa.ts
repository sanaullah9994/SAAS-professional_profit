import { AmazonAuthError } from '../errors.js';
import { fingerprint } from '../crypto.js';

const LWA_TOKEN_ENDPOINT = 'https://api.amazon.com/auth/o2/token';
const ACCESS_TOKEN_SAFETY_MS = 60_000;

export interface LwaTokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken?: string;
}

interface LwaRawResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  error?: string;
  error_description?: string;
}

async function postTokenRequest(params: Record<string, string>): Promise<LwaRawResponse> {
  let response: Response;
  try {
    response = await fetch(LWA_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: new URLSearchParams(params).toString(),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (cause) {
    throw new AmazonAuthError('Unable to reach the Login with Amazon authorization server.', undefined, { cause });
  }
  const text = await response.text();
  let body: LwaRawResponse = {};
  try {
    body = text ? (JSON.parse(text) as LwaRawResponse) : {};
  } catch {
    body = {};
  }
  if (!response.ok) {
    const detail = body.error_description ?? body.error ?? `HTTP ${response.status}`;
    throw new AmazonAuthError(`LWA token request failed: ${detail}`, body.error);
  }
  if (!body.access_token) {
    throw new AmazonAuthError('LWA token response did not include an access token.', body.error);
  }
  return body;
}

export async function exchangeAuthorizationCode(input: { code: string; redirectUri: string; clientId: string; clientSecret: string }): Promise<LwaTokenResponse> {
  const body = await postTokenRequest({
    grant_type: 'authorization_code',
    code: input.code,
    redirect_uri: input.redirectUri,
    client_id: input.clientId,
    client_secret: input.clientSecret,
  });
  if (!body.refresh_token) {
    throw new AmazonAuthError('LWA authorization code exchange did not return a refresh token.');
  }
  return {
    accessToken: body.access_token!,
    tokenType: body.token_type ?? 'bearer',
    expiresIn: body.expires_in ?? 3600,
    refreshToken: body.refresh_token,
  };
}

export async function refreshAccessToken(input: { refreshToken: string; clientId: string; clientSecret: string }): Promise<LwaTokenResponse> {
  const body = await postTokenRequest({
    grant_type: 'refresh_token',
    refresh_token: input.refreshToken,
    client_id: input.clientId,
    client_secret: input.clientSecret,
  });
  return {
    accessToken: body.access_token!,
    tokenType: body.token_type ?? 'bearer',
    expiresIn: body.expires_in ?? 3600,
    refreshToken: body.refresh_token,
  };
}

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

export class AccessTokenProvider {
  private readonly cache = new Map<string, CachedToken>();
  private readonly inflight = new Map<string, Promise<string>>();
  constructor(
    private readonly credentials: { clientId: string; clientSecret: string },
    private readonly refreshToken: string,
  ) {}

  async getAccessToken(): Promise<string> {
    const key = fingerprint(this.refreshToken);
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt - ACCESS_TOKEN_SAFETY_MS > Date.now()) return cached.accessToken;
    const pending = this.inflight.get(key);
    if (pending) return pending;
    const promise = this.fetchToken(key);
    this.inflight.set(key, promise);
    try {
      return await promise;
    } finally {
      this.inflight.delete(key);
    }
  }

  invalidate(): void {
    this.cache.delete(fingerprint(this.refreshToken));
  }

  private async fetchToken(key: string): Promise<string> {
    const tokens = await refreshAccessToken({
      refreshToken: this.refreshToken,
      clientId: this.credentials.clientId,
      clientSecret: this.credentials.clientSecret,
    });
    this.cache.set(key, {
      accessToken: tokens.accessToken,
      expiresAt: Date.now() + tokens.expiresIn * 1000,
    });
    return tokens.accessToken;
  }
}
