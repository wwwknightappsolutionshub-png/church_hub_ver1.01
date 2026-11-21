import {
  FLEXIBLE_PHONE_HINT,
  filterPhoneTyping,
  isValidFlexiblePhone,
  isValidUkPhone,
  normalizeFlexiblePhone,
  normalizeUkPhoneToE164,
  PublicOutreachRegisterSchema,
  sanitizeEmail,
  UK_PHONE_HINT,
} from '@church-hub/shared-types';

export {
  filterPhoneTyping,
  isValidFlexiblePhone,
  isValidUkPhone,
  normalizeFlexiblePhone,
  normalizeUkPhoneToE164,
  PublicOutreachRegisterSchema,
  sanitizeEmail,
  FLEXIBLE_PHONE_HINT,
  UK_PHONE_HINT,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** True when empty or a well-formed email address. */
export function isValidEmailFormat(value: string): boolean {
  const s = sanitizeEmail(value);
  if (!s) return true;
  return EMAIL_RE.test(s) && s.length <= 255;
}

export function emailFormatError(value: string): string | null {
  const s = sanitizeEmail(value);
  if (!s) return null;
  if (!isValidEmailFormat(s)) return 'Enter a valid email address';
  return null;
}

/** UK phone format error (empty is OK). */
export function phoneFormatError(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  if (/[a-zA-Z]/.test(raw)) return 'Phone number cannot contain letters';
  if (!isValidUkPhone(raw)) return UK_PHONE_HINT;
  return null;
}

/** Multi-country phone format error (empty is OK) — use for staff / unit / settings forms. */
export function flexiblePhoneFormatError(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  if (/[a-zA-Z]/.test(raw)) return 'Phone number cannot contain letters';
  if (!isValidFlexiblePhone(raw)) return FLEXIBLE_PHONE_HINT;
  return null;
}

/** Normalize optional flexible phone for API payloads; undefined when empty. */
export function parseOptionalFlexiblePhone(value: string): string | undefined {
  const raw = value.trim();
  if (!raw) return undefined;
  return normalizeFlexiblePhone(raw) ?? undefined;
}

/** Normalize optional UK phone for API payloads; undefined when empty. */
export function parseOptionalUkPhone(value: string): string | undefined {
  const raw = value.trim();
  if (!raw) return undefined;
  return normalizeUkPhoneToE164(raw) ?? undefined;
}
