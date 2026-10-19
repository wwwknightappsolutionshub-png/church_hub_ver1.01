import { decryptSecret, encryptSecret, isEncryptedSecret } from '../../common/crypto/secret-box';

/** Prefer dedicated PII key; fall back to integration / JWT secrets (same as secret-box). */
function outreachPiiKeyMaterial(): string | undefined {
  return (
    process.env.OUTREACH_PII_KEY?.trim() ||
    process.env.INTEGRATION_SECRETS_KEY?.trim() ||
    process.env.JWT_ACCESS_SECRET?.trim() ||
    undefined
  );
}

/** Encrypt plaintext for outreach DB columns. Empty → null. */
export function encryptOutreachPii(plain: string | null | undefined): string | null {
  const s = plain == null ? '' : String(plain);
  if (!s) return null;
  if (isEncryptedSecret(s)) return s;
  return encryptSecret(s, outreachPiiKeyMaterial());
}

/**
 * Decrypt outreach DB value. Legacy plaintext (pre-encryption) returned as-is.
 * Invalid envelopes return null so callers do not crash list endpoints.
 */
export function decryptOutreachPii(value: string | null | undefined): string | null {
  if (value == null || value === '') return null;
  if (!isEncryptedSecret(value)) return value;
  try {
    return decryptSecret(value, outreachPiiKeyMaterial());
  } catch {
    return null;
  }
}

export const OUTREACH_PII_FIELDS = [
  'phone',
  'email',
  'locationLabel',
  'addressStreet',
  'addressCity',
  'addressState',
  'addressCountry',
  'addressPostal',
  'pickupAddress',
  'busPickupNotes',
  'notes',
  'voiceNotes',
  'referredBy',
] as const;

export type OutreachPiiField = (typeof OUTREACH_PII_FIELDS)[number];

export type OutreachPiiRecord = Partial<Record<OutreachPiiField, string | null | undefined>>;

/** Encrypt a subset of outreach contact fields for Prisma create/update. */
export function encryptOutreachContactFields<T extends OutreachPiiRecord>(data: T): T {
  const out = { ...data };
  for (const key of OUTREACH_PII_FIELDS) {
    if (key in out && out[key] !== undefined) {
      (out as OutreachPiiRecord)[key] = encryptOutreachPii(out[key] as string | null | undefined);
    }
  }
  return out;
}

/** Decrypt PII fields on a contact row (or payload) for API responses / downstream use. */
export function decryptOutreachContactFields<T extends OutreachPiiRecord>(data: T): T {
  const out = { ...data };
  for (const key of OUTREACH_PII_FIELDS) {
    if (key in out && out[key] != null) {
      (out as OutreachPiiRecord)[key] = decryptOutreachPii(out[key] as string);
    }
  }
  return out;
}
