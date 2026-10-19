import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';

function encryptionKey(keyMaterial?: string): Buffer {
  const raw =
    keyMaterial?.trim() ||
    process.env.INTEGRATION_SECRETS_KEY?.trim() ||
    process.env.JWT_ACCESS_SECRET?.trim() ||
    'church-hub-dev-integration-secret-change-me';
  return createHash('sha256').update(raw).digest();
}

/** Encrypt a secret for DB storage. Format: v1:iv:tag:ciphertext (base64 parts). */
export function encryptSecret(plain: string, keyMaterial?: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, encryptionKey(keyMaterial), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

export function decryptSecret(payload: string, keyMaterial?: string): string {
  const parts = payload.split(':');
  if (parts.length !== 4 || parts[0] !== 'v1') {
    throw new Error('Invalid encrypted secret format');
  }
  const [, ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64!, 'base64');
  const tag = Buffer.from(tagB64!, 'base64');
  const data = Buffer.from(dataB64!, 'base64');
  const decipher = createDecipheriv(ALGO, encryptionKey(keyMaterial), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

export function isEncryptedSecret(payload: string | null | undefined): boolean {
  if (!payload) return false;
  const parts = payload.split(':');
  return parts.length === 4 && parts[0] === 'v1';
}

export function maskSecretHint(plain: string | null | undefined): string | null {
  if (!plain) return null;
  const s = plain.trim();
  if (s.length <= 8) return '••••••••';
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}
