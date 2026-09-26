import './env.js';
import { decodeEncryptionKey } from './crypto.js';
import { AmazonConfigError } from './errors.js';

export const DEFAULT_MARKETPLACE_ID = 'ATVPDKIKX0DER';
export const DEFAULT_REGION = 'NA';

export const REQUIRED_CONFIG_KEYS = [
  'AMAZON_LWA_CLIENT_ID',
  'AMAZON_LWA_CLIENT_SECRET',
  'AMAZON_SP_API_APP_ID',
  'AMAZON_REDIRECT_URI',
  'AMAZON_TOKEN_ENCRYPTION_KEY',
] as const;

const OPTIONAL_CONFIG_KEYS = ['AMAZON_MARKETPLACE_ID', 'AMAZON_REGION', 'AMAZON_APP_VERSION'] as const;

export interface AmazonConfig {
  lwaClientId: string;
  lwaClientSecret: string;
  spApiAppId: string;
  redirectUri: string;
  encryptionKey: Buffer;
  marketplaceId: string;
  region: string;
  appVersion?: string;
}

export function missingAmazonConfig(): string[] {
  const missing: string[] = [];
  for (const key of REQUIRED_CONFIG_KEYS) {
    if (!process.env[key]) missing.push(key);
  }
  if (process.env.AMAZON_TOKEN_ENCRYPTION_KEY && decodeEncryptionKey(process.env.AMAZON_TOKEN_ENCRYPTION_KEY) === null) {
    missing.push('AMAZON_TOKEN_ENCRYPTION_KEY (must be base64-encoded 32 bytes)');
  }
  return missing;
}

export function isAmazonConfigured(): boolean {
  return missingAmazonConfig().length === 0;
}

export function getAmazonConfig(): AmazonConfig {
  const missing = missingAmazonConfig();
  if (missing.length > 0) {
    throw new AmazonConfigError(`Amazon configuration is incomplete. Missing: ${missing.join(', ')}`, missing);
  }
  const encryptionKey = decodeEncryptionKey(process.env.AMAZON_TOKEN_ENCRYPTION_KEY!);
  if (!encryptionKey) {
    throw new AmazonConfigError('AMAZON_TOKEN_ENCRYPTION_KEY must be base64-encoded and decode to exactly 32 bytes.');
  }
  const appVersion = process.env.AMAZON_APP_VERSION;
  return {
    lwaClientId: process.env.AMAZON_LWA_CLIENT_ID!,
    lwaClientSecret: process.env.AMAZON_LWA_CLIENT_SECRET!,
    spApiAppId: process.env.AMAZON_SP_API_APP_ID!,
    redirectUri: process.env.AMAZON_REDIRECT_URI!,
    encryptionKey,
    marketplaceId: process.env.AMAZON_MARKETPLACE_ID || DEFAULT_MARKETPLACE_ID,
    region: process.env.AMAZON_REGION || DEFAULT_REGION,
    appVersion: appVersion && appVersion !== 'production' ? appVersion : undefined,
  };
}

export function getSyncApiUrl(): string {
  return process.env.SYNC_API_URL ?? 'http://localhost:4000';
}

export function getPublicBaseUrl(fallback: string): string {
  return process.env.APP_BASE_URL ?? process.env.BETTER_AUTH_URL ?? fallback;
}

export { OPTIONAL_CONFIG_KEYS };
