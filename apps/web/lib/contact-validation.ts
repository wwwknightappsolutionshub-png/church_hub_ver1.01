import {
  filterPhoneTyping,
  isValidUkPhone,
  normalizeUkPhoneToE164,
  PublicOutreachRegisterSchema,
  sanitizeEmail,
  UK_PHONE_HINT,
} from '@church-hub/shared-types';

export {
  filterPhoneTyping,
  isValidUkPhone,
  normalizeUkPhoneToE164,
  PublicOutreachRegisterSchema,
  sanitizeEmail,
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

export function phoneFormatError(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  if (/[a-zA-Z]/.test(raw)) return 'Phone number cannot contain letters';
  if (!isValidUkPhone(raw)) return UK_PHONE_HINT;
  return null;
}
