import { resolveMarketplace } from '../marketplace.js';

export interface AuthorizationUrlOptions {
  applicationId: string;
  state: string;
  marketplaceId: string;
  redirectUri?: string;
  appVersion?: string;
}

export function buildAuthorizationUrl(options: AuthorizationUrlOptions): string {
  const { sellerCentralBaseUrl } = resolveMarketplace(options.marketplaceId);
  const url = new URL('/apps/authorize/consent', sellerCentralBaseUrl);
  url.searchParams.set('application_id', options.applicationId);
  url.searchParams.set('state', options.state);
  if (options.redirectUri) url.searchParams.set('redirect_uri', options.redirectUri);
  if (options.appVersion) url.searchParams.set('version', options.appVersion);
  return url.toString();
}

const AMAZON_HOST_PATTERN = /(^|\.)amazon\.[a-z]{2,3}(\.[a-z]{2})?$/i;

export function isTrustedAmazonHost(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
  return AMAZON_HOST_PATTERN.test(hostname);
}

export function isTrustedAmazonUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isTrustedAmazonHost(url.hostname))) return false;
    if (url.username || url.password) return false;
    return isTrustedAmazonHost(url.hostname);
  } catch {
    return false;
  }
}
