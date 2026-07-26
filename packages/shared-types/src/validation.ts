import { z } from 'zod';

/** Trim + collapse internal whitespace; strip control characters. */
export function sanitizeText(value: unknown, maxLen = 500): string {
  if (value == null) return '';
  return String(value)
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLen);
}

export function sanitizeEmail(value: unknown): string {
  return sanitizeText(value, 255).toLowerCase();
}

/** Keep leading +, digits only otherwise. */
export function sanitizePhone(value: unknown): string {
  const raw = sanitizeText(value, 40);
  if (!raw) return '';
  const plus = raw.startsWith('+') ? '+' : '';
  return `${plus}${raw.replace(/[^\d]/g, '')}`.slice(0, 20);
}

export function sanitizeSlug(value: unknown): string {
  return sanitizeText(value, 64)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** UK outward+inward postcode (loose, allows optional space). */
export const UK_POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

export function sanitizeUkPostcode(value: unknown): string {
  const raw = sanitizeText(value, 12).toUpperCase().replace(/\s+/g, '');
  if (raw.length < 5) return raw;
  return `${raw.slice(0, -3)} ${raw.slice(-3)}`;
}

export const emailSchema = z
  .string()
  .transform(sanitizeEmail)
  .pipe(z.string().email('Enter a valid email').max(255));

export const optionalEmailSchema = z
  .union([z.string(), z.literal(''), z.undefined(), z.null()])
  .transform((v) => {
    const s = sanitizeEmail(v ?? '');
    return s || undefined;
  })
  .pipe(z.union([z.string().email().max(255), z.undefined()]));

export const phoneSchema = z
  .string()
  .transform(sanitizePhone)
  .pipe(
    z
      .string()
      .min(7, 'Enter a valid phone number')
      .max(20)
      .regex(/^\+?\d{7,15}$/, 'Enter a valid phone number'),
  );

export const optionalPhoneSchema = z
  .union([z.string(), z.literal(''), z.undefined(), z.null()])
  .transform((v) => {
    const s = sanitizePhone(v ?? '');
    return s || undefined;
  })
  .pipe(z.union([phoneSchema, z.undefined()]));

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128);

export const personNameSchema = z
  .string()
  .transform((v) => sanitizeText(v, 100))
  .pipe(z.string().min(1, 'Required').max(100));

export const churchNameSchema = z
  .string()
  .transform((v) => sanitizeText(v, 200))
  .pipe(z.string().min(2, 'Church name is required').max(200));

export const churchSlugSchema = z
  .string()
  .transform(sanitizeSlug)
  .pipe(
    z
      .string()
      .min(2, 'Slug is required')
      .max(64)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens'),
  );

export const ukPostcodeSchema = z
  .string()
  .transform(sanitizeUkPostcode)
  .pipe(z.string().regex(UK_POSTCODE_REGEX, 'Enter a valid UK postcode'));

export const optionalUkPostcodeSchema = z
  .union([z.string(), z.literal(''), z.undefined(), z.null()])
  .transform((v) => {
    const s = sanitizeUkPostcode(v ?? '');
    return s || undefined;
  })
  .pipe(z.union([ukPostcodeSchema, z.undefined()]));

export const RegisterStartSchema = z.object({
  churchName: churchNameSchema,
  churchSlug: z
    .union([z.string(), z.literal(''), z.undefined()])
    .transform((v) => {
      const s = sanitizeSlug(v ?? '');
      return s || undefined;
    })
    .pipe(z.union([churchSlugSchema, z.undefined()])),
  firstName: personNameSchema,
  lastName: personNameSchema,
  email: emailSchema,
  password: passwordSchema,
});
export type RegisterStartInput = z.infer<typeof RegisterStartSchema>;

export const RegisterVerifySchema = z.object({
  registrationId: z.string().uuid(),
  otp: z
    .string()
    .transform((v) => String(v).replace(/\D/g, '').slice(0, 6))
    .pipe(z.string().length(6, 'Enter the 6-digit code')),
});
export type RegisterVerifyInput = z.infer<typeof RegisterVerifySchema>;

export const LoginCredentialsSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});
export type LoginCredentialsInput = z.infer<typeof LoginCredentialsSchema>;

export const MagicLinkRequestSchema = z.object({
  email: emailSchema,
});
