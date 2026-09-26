import { createHmac, timingSafeEqual } from 'node:crypto';
import { decodeEncryptionKey } from './crypto.js';

export interface OAuthStatePayload {
  workspaceId: string;
  nonce: string;
  issuedAt: number;
}

const STATE_VERSION = 'v1';
const STATE_TTL_MS = 10 * 60 * 1000;

function hmac(data: string, key: Buffer): string {
  return createHmac('sha256', key).update(data).digest('base64url');
}

export function createSignedState(payload: Omit<OAuthStatePayload, 'issuedAt'>, encryptionKeyBase64: string): string {
  const key = decodeEncryptionKey(encryptionKeyBase64);
  if (!key) throw new Error('AMAZON_TOKEN_ENCRYPTION_KEY is not a valid 32-byte base64 key.');
  const body = Buffer.from(JSON.stringify({ ...payload, issuedAt: Date.now() } satisfies OAuthStatePayload)).toString('base64url');
  return `${STATE_VERSION}.${body}.${hmac(body, key)}`;
}

export function verifySignedState(state: string | null, encryptionKeyBase64: string, now = Date.now()): OAuthStatePayload | null {
  if (!state) return null;
  const key = decodeEncryptionKey(encryptionKeyBase64);
  if (!key) return null;
  const parts = state.split('.');
  if (parts.length !== 3 || parts[0] !== STATE_VERSION) return null;
  const [, body, signature] = parts as [string, string, string];
  const expected = hmac(body, key);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as OAuthStatePayload;
    if (typeof payload.workspaceId !== 'string' || typeof payload.nonce !== 'string' || typeof payload.issuedAt !== 'number') return null;
    if (now - payload.issuedAt > STATE_TTL_MS) return null;
    return payload;
  } catch {
    return null;
  }
}
