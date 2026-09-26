import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { AmazonConfigError } from './errors.js';

const VERSION = 'v1';
const KEY_BYTES = 32;
const IV_BYTES = 12;

export function createEncryptionKey(): string {
  return randomBytes(KEY_BYTES).toString('base64');
}

export function decodeEncryptionKey(value: string): Buffer | null {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return null;
  const decoded = Buffer.from(value, 'base64');
  if (decoded.length !== KEY_BYTES) return null;
  return decoded;
}

function requireKey(key: Buffer): void {
  if (!Buffer.isBuffer(key) || key.length !== KEY_BYTES) {
    throw new AmazonConfigError('Encryption key must be exactly 32 bytes.');
  }
}

export function encrypt(plaintext: string, key: Buffer): string {
  requireKey(key);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join('.');
}

export function decrypt(payload: string, key: Buffer): string {
  requireKey(key);
  const parts = payload.split('.');
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new AmazonConfigError('Encrypted payload has an unrecognized format.');
  }
  const [, ivRaw, tagRaw, dataRaw] = parts as [string, string, string, string];
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivRaw, 'base64'));
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataRaw, 'base64')), decipher.final()]).toString('utf8');
}

export function fingerprint(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
