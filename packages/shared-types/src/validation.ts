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

/**
 * Strip to a dialable string while typing (digits, +, spaces, dashes, parentheses only).
 * Letters and other symbols are removed immediately.
 */
export function filterPhoneTyping(value: unknown): string {
  return String(value ?? '')
    .replace(/[^\d+\s()-]/g, '')
    .slice(0, 24);
}

/** Keep leading +, digits only otherwise (legacy helper — prefer normalizeUkPhoneToE164). */
export function sanitizePhone(value: unknown): string {
  const raw = sanitizeText(value, 40);
  if (!raw) return '';
  if (/[a-zA-Z]/.test(raw)) return '';
  const plus = raw.startsWith('+') ? '+' : '';
  return `${plus}${raw.replace(/[^\d]/g, '')}`.slice(0, 20);
}

const UK_E164_REGEX = /^\+44[1-9]\d{8,9}$/;

/**
 * Normalize a UK phone to E.164 (`+44…`).
 * Accepts `07…`, `447…`, `+44…`, with spaces/dashes. Rejects letters and non-UK shapes.
 */
export function normalizeUkPhoneToE164(value: unknown): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  if (/[a-zA-Z]/.test(raw)) return null;

  let digits = raw.replace(/[^\d]/g, '');
  if (!digits) return null;
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('44')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = digits.slice(1);

  // National significant number: 9–10 digits, not starting with 0.
  if (!/^[1-9]\d{8,9}$/.test(digits)) return null;
  // UK mobiles are 10 digits starting with 7 (07xxx xxx xxx).
  if (digits.startsWith('7') && digits.length !== 10) return null;

  return `+44${digits}`;
}

export function isValidUkPhone(value: unknown): boolean {
  return normalizeUkPhoneToE164(value) != null;
}

export const UK_PHONE_HINT = 'Enter a valid UK phone (e.g. 07123 456789 or +44 7123 456789)';

export function sanitizeSlug(value: unknown): string {
  return sanitizeText(value, 64)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** UK outward+inward postcode (loose, allows optional space). */
export const UK_POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

/** UK outward code only (e.g. N1, SW1A) — used for province coverage areas. */
export const UK_OUTWARD_POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?$/i;

export function sanitizeUkPostcode(value: unknown): string {
  const raw = sanitizeText(value, 12).toUpperCase().replace(/\s+/g, '');
  if (raw.length < 5) return raw;
  return `${raw.slice(0, -3)} ${raw.slice(-3)}`;
}

/** Compact uppercase key with no spaces (for storage / equality). */
export function normalizeUkPostcodeKey(value: unknown): string {
  return sanitizeText(value, 12).toUpperCase().replace(/\s+/g, '');
}

/** Outward portion of a full postcode key, or the key itself if already outward-only. */
export function ukPostcodeOutward(value: unknown): string {
  const key = normalizeUkPostcodeKey(value);
  if (!key) return '';
  if (UK_OUTWARD_POSTCODE_REGEX.test(key) && !UK_POSTCODE_REGEX.test(sanitizeUkPostcode(key))) {
    return key;
  }
  const spaced = sanitizeUkPostcode(key);
  if (UK_POSTCODE_REGEX.test(spaced)) {
    return spaced.split(/\s+/)[0] ?? key;
  }
  return key;
}

export function isUkOutwardOnlyPostcode(value: unknown): boolean {
  const key = normalizeUkPostcodeKey(value);
  return UK_OUTWARD_POSTCODE_REGEX.test(key) && !UK_POSTCODE_REGEX.test(sanitizeUkPostcode(key));
}

/**
 * Cell matches province coverage when:
 * - normalized cell postcode equals a coverage entry, OR
 * - coverage entry is outward-only and equals the cell's outward code.
 */
export function cellPostcodeMatchesCoverage(
  cellPostcode: unknown,
  coverageEntries: readonly string[],
): boolean {
  const cellKey = normalizeUkPostcodeKey(cellPostcode);
  if (!cellKey) return false;
  const cellOut = ukPostcodeOutward(cellKey);
  for (const entry of coverageEntries) {
    const e = normalizeUkPostcodeKey(entry);
    if (!e) continue;
    if (cellKey === e) return true;
    if (isUkOutwardOnlyPostcode(e) && cellOut === e) return true;
  }
  return false;
}

/** Accept full UK postcode or outward-only code for province coverage lists. */
export function sanitizeProvincePostcodeEntry(value: unknown): string {
  const key = normalizeUkPostcodeKey(value);
  if (!key) return '';
  if (isUkOutwardOnlyPostcode(key)) return key;
  const spaced = sanitizeUkPostcode(key);
  if (UK_POSTCODE_REGEX.test(spaced)) return normalizeUkPostcodeKey(spaced);
  return '';
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
  .trim()
  .min(1, 'Enter a phone number')
  .refine((v) => !/[a-zA-Z]/.test(v), {
    message: 'Phone number cannot contain letters',
  })
  .transform((v) => normalizeUkPhoneToE164(v) ?? '')
  .refine((v) => UK_E164_REGEX.test(v), { message: UK_PHONE_HINT });

export const optionalPhoneSchema = z
  .union([z.string(), z.literal(''), z.undefined(), z.null()])
  .superRefine((v, ctx) => {
    const raw = String(v ?? '').trim();
    if (!raw) return;
    if (/[a-zA-Z]/.test(raw)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Phone number cannot contain letters',
      });
      return;
    }
    if (!normalizeUkPhoneToE164(raw)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: UK_PHONE_HINT,
      });
    }
  })
  .transform((v) => {
    const raw = String(v ?? '').trim();
    if (!raw) return undefined;
    return normalizeUkPhoneToE164(raw) ?? undefined;
  });

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
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the Terms of Service' }),
  }),
  acceptedPrivacy: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the Privacy Policy' }),
  }),
  acceptedMarketing: z.boolean().optional().default(false),
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

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(16).max(512),
});
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;

export const ResetPasswordSchema = z.object({
  token: z.string().min(32).max(128),
  newPassword: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

export const CHURCH_ASSIGNABLE_ROLE_VALUES = [
  'ADMIN',
  'PASTOR',
  'LEADER',
  'PROVINCIAL_LEADER',
  'MEMBER',
  'DRIVER',
] as const;

export const CreateChurchStaffSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z
    .string()
    .transform((v) => sanitizeText(v, 80))
    .pipe(z.string().min(1, 'Required').max(80)),
  lastName: z
    .string()
    .transform((v) => sanitizeText(v, 80))
    .pipe(z.string().min(1, 'Required').max(80)),
  phone: optionalPhoneSchema,
  roles: z
    .array(z.enum(CHURCH_ASSIGNABLE_ROLE_VALUES))
    .min(1, 'Select at least one role'),
});
export type CreateChurchStaffInput = z.infer<typeof CreateChurchStaffSchema>;

export const UpdateChurchStaffSchema = z.object({
  email: emailSchema.optional(),
  password: passwordSchema.optional(),
  firstName: z
    .string()
    .transform((v) => sanitizeText(v, 80))
    .pipe(z.string().min(1).max(80))
    .optional(),
  lastName: z
    .string()
    .transform((v) => sanitizeText(v, 80))
    .pipe(z.string().min(1).max(80))
    .optional(),
  phone: optionalPhoneSchema,
  roles: z.array(z.enum(CHURCH_ASSIGNABLE_ROLE_VALUES)).min(1).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateChurchStaffInput = z.infer<typeof UpdateChurchStaffSchema>;

export const CreatePlatformChurchSchema = z.object({
  name: z
    .string()
    .transform((v) => sanitizeText(v, 120))
    .pipe(z.string().min(2, 'Church name is required').max(120)),
  slug: churchSlugSchema,
  adminEmail: emailSchema,
  pastorEmail: optionalEmailSchema,
  city: z
    .union([z.string(), z.literal(''), z.undefined()])
    .transform((v) => {
      const s = sanitizeText(v ?? '', 120);
      return s || undefined;
    })
    .pipe(z.union([z.string().max(120), z.undefined()])),
  country: z
    .union([z.string(), z.literal(''), z.undefined()])
    .transform((v) => {
      const s = sanitizeText(v ?? '', 120);
      return s || undefined;
    })
    .pipe(z.union([z.string().max(120), z.undefined()])),
  timezone: z
    .union([z.string(), z.literal(''), z.undefined()])
    .transform((v) => {
      const s = sanitizeText(v ?? '', 64);
      return s || undefined;
    })
    .pipe(z.union([z.string().max(64), z.undefined()])),
  isActive: z.boolean().optional(),
});
export type CreatePlatformChurchInput = z.infer<typeof CreatePlatformChurchSchema>;

export const ResetTenantUserPasswordSchema = z.object({
  newPassword: passwordSchema.optional(),
  mustChangePassword: z.boolean().optional(),
  notifyUser: z.boolean().optional(),
});
export type ResetTenantUserPasswordInput = z.infer<typeof ResetTenantUserPasswordSchema>;

/** Optional location / address string (empty → undefined). */
const optionalLocationSchema = z
  .union([z.string(), z.literal(''), z.undefined(), z.null()])
  .transform((v) => {
    const s = sanitizeText(v ?? '', 200);
    return s || undefined;
  });

/** Optional user id; empty string → undefined. */
const optionalLeaderUserIdSchema = z
  .union([z.string(), z.literal(''), z.undefined()])
  .transform((v) => {
    const s = sanitizeText(v ?? '', 64);
    return s || undefined;
  });

/**
 * Province coverage list — same rules as API `normalizeCoveragePostcodes`
 * (sanitizeProvincePostcodeEntry + dedupe).
 */
export const provinceCoveragePostcodesSchema = z
  .array(z.unknown())
  .min(1, 'Province must include at least one postcode')
  .superRefine((raw, ctx) => {
    for (let i = 0; i < raw.length; i++) {
      if (!sanitizeProvincePostcodeEntry(raw[i])) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [i],
          message: `Invalid province postcode "${String(raw[i])}" — use a UK postcode or outward code (e.g. N1)`,
        });
      }
    }
  })
  .transform((raw) => {
    const keys: string[] = [];
    const seen = new Set<string>();
    for (const item of raw) {
      const key = sanitizeProvincePostcodeEntry(item);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      keys.push(key);
    }
    return keys;
  })
  .pipe(z.array(z.string()).min(1, 'Province must include at least one postcode'));

export const CreateCellBranchSchema = z.object({
  name: z
    .string()
    .transform((v) => sanitizeText(v, 120))
    .pipe(z.string().min(1, 'Branch name is required').max(120)),
  location: optionalLocationSchema,
  postcode: ukPostcodeSchema,
  leaderUserId: optionalLeaderUserIdSchema,
});
export type CreateCellBranchInput = z.infer<typeof CreateCellBranchSchema>;

export const UpdateCellBranchSchema = z.object({
  name: z
    .string()
    .transform((v) => sanitizeText(v, 120))
    .pipe(z.string().min(1, 'Branch name is required').max(120))
    .optional(),
  location: z
    .union([z.string(), z.literal(''), z.null(), z.undefined()])
    .transform((v) => {
      if (v === undefined) return undefined;
      if (v === null) return null;
      const s = sanitizeText(v, 200);
      return s || null;
    })
    .optional(),
  postcode: ukPostcodeSchema.optional(),
  leaderUserId: z
    .union([z.string(), z.literal(''), z.null(), z.undefined()])
    .transform((v) => {
      if (v === undefined) return undefined;
      if (v === null) return null;
      const s = sanitizeText(v, 64);
      return s || null;
    })
    .optional(),
});
export type UpdateCellBranchInput = z.infer<typeof UpdateCellBranchSchema>;

export const CreateCellProvinceSchema = z.object({
  name: z
    .string()
    .transform((v) => sanitizeText(v, 120))
    .pipe(z.string().min(1, 'Province name is required').max(120)),
  leaderUserId: z
    .string()
    .transform((v) => sanitizeText(v, 64))
    .pipe(z.string().min(1, 'Province leader is required')),
  postcodes: provinceCoveragePostcodesSchema,
});
export type CreateCellProvinceInput = z.infer<typeof CreateCellProvinceSchema>;

export const UpdateCellProvinceSchema = z.object({
  name: z
    .string()
    .transform((v) => sanitizeText(v, 120))
    .pipe(z.string().min(1, 'Province name is required').max(120))
    .optional(),
  leaderUserId: z
    .string()
    .transform((v) => sanitizeText(v, 64))
    .pipe(z.string().min(1, 'Province leader is required'))
    .optional(),
  postcodes: provinceCoveragePostcodesSchema.optional(),
});
export type UpdateCellProvinceInput = z.infer<typeof UpdateCellProvinceSchema>;

export const MapBranchProvinceSchema = z.object({
  provinceId: z
    .string()
    .transform((v) => sanitizeText(v, 64))
    .pipe(z.string().min(1, 'Province is required')),
});
export type MapBranchProvinceInput = z.infer<typeof MapBranchProvinceSchema>;
