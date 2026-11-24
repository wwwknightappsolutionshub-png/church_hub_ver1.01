import { decryptSecret, encryptSecret, isEncryptedSecret } from './secret-box';

/** Dedicated pastoral key in prod; non-prod may fall back to outreach / integration / JWT. */
export function pastoralNotesKeyMaterial(): string | undefined {
  const dedicated = process.env.PASTORAL_NOTES_KEY?.trim();
  if (dedicated) return dedicated;

  const isProd = (process.env.NODE_ENV ?? '').toLowerCase() === 'production';
  if (isProd) {
    throw new Error('PASTORAL_NOTES_KEY must be set in production');
  }

  return (
    process.env.OUTREACH_PII_KEY?.trim() ||
    process.env.INTEGRATION_SECRETS_KEY?.trim() ||
    process.env.JWT_ACCESS_SECRET?.trim() ||
    undefined
  );
}

/** Encrypt pastoral note body for DB storage (v1: envelope). Empty → empty string. */
export function encryptPastoralNoteContent(plain: string): string {
  const s = plain == null ? '' : String(plain);
  if (!s) return s;
  if (isEncryptedSecret(s)) return s;
  return encryptSecret(s, pastoralNotesKeyMaterial());
}

/**
 * Dual-read: decrypt v1 envelopes; return legacy plaintext as-is.
 * Invalid ciphertext returns a safe placeholder so list endpoints do not crash.
 */
export function decryptPastoralNoteContent(value: string | null | undefined): string {
  if (value == null || value === '') return '';
  if (!isEncryptedSecret(value)) return value;
  try {
    return decryptSecret(value, pastoralNotesKeyMaterial());
  } catch {
    return '[unable to decrypt pastoral note]';
  }
}

export function mapPastoralNoteRow<T extends { content?: string | null }>(row: T): T {
  if (!row || row.content == null) return row;
  return { ...row, content: decryptPastoralNoteContent(row.content) };
}
