import { z } from 'zod';
import {
  flexiblePhoneSchema,
  optionalEmailSchema,
  optionalPhoneSchema,
  optionalPostalCodeSchema,
  personNameSchema,
  sanitizeText,
} from './validation';

const optionalAddressLine = (max: number) =>
  z
    .union([z.string(), z.literal(''), z.undefined(), z.null()])
    .transform((v) => {
      const s = sanitizeText(v ?? '', max);
      return s || undefined;
    })
    .optional();

/** Shared capture fields (before API-only extras). */
export const OutreachCaptureBaseSchema = z.object({
  firstName: personNameSchema,
  lastName: z
    .union([z.string(), z.literal(''), z.undefined()])
    .transform((v) => {
      const s = sanitizeText(v ?? '', 100);
      return s || undefined;
    })
    .optional(),
  phone: flexiblePhoneSchema,
  email: optionalEmailSchema,
  evangelistId: z.string().uuid().optional(),
  qrCodeId: z.string().uuid().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  locationLabel: optionalAddressLine(300),
  postcode: optionalPostalCodeSchema,
  /** Structured address — required when phone is not UK (+44). */
  addressStreet: optionalAddressLine(200),
  addressCity: optionalAddressLine(100),
  addressState: optionalAddressLine(100),
  addressCountry: optionalAddressLine(100),
  addressPostal: optionalPostalCodeSchema,
  photoConsent: z.boolean().default(false),
  photoUrl: z.string().max(600_000).optional(),
  notes: z.string().max(2000).optional(),
  voiceNotes: z.string().max(5000).optional(),
  referredBy: z
    .union([z.string(), z.literal(''), z.undefined()])
    .transform((v) => {
      const s = sanitizeText(v ?? '', 200);
      return s || undefined;
    })
    .optional(),
  needsBusPickup: z.boolean().optional(),
  pickupAddress: optionalAddressLine(500),
  busPickupNotes: z.string().max(1000).optional(),
  clientId: z.string().uuid().optional(),
  capturedAt: z.string().datetime().optional(),
});

/** Require street/city/country when phone is not UK E.164 (+44…). */
export function refineInternationalAddress(
  data: {
    phone: string;
    addressStreet?: string;
    addressCity?: string;
    addressCountry?: string;
  },
  ctx: z.RefinementCtx,
) {
  if (data.phone.startsWith('+44')) return;
  if (!data.addressStreet) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['addressStreet'],
      message: 'Street address is required for international contacts',
    });
  }
  if (!data.addressCity) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['addressCity'],
      message: 'City is required for international contacts',
    });
  }
  if (!data.addressCountry) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['addressCountry'],
      message: 'Country is required for international contacts',
    });
  }
}

export const OutreachCaptureSchema = OutreachCaptureBaseSchema.superRefine(refineInternationalAddress);

/** Public QR/NFC self-registration (no GPS/postcode required). */
export const PublicOutreachRegisterSchema = z.object({
  firstName: personNameSchema,
  lastName: z
    .union([z.string(), z.literal(''), z.undefined()])
    .transform((v) => {
      const s = sanitizeText(v ?? '', 100);
      return s || undefined;
    })
    .optional(),
  phone: optionalPhoneSchema,
  email: optionalEmailSchema,
  notes: z
    .union([z.string(), z.literal(''), z.undefined()])
    .transform((v) => {
      const s = sanitizeText(v ?? '', 2000);
      return s || undefined;
    })
    .optional(),
  referredBy: z
    .union([z.string(), z.literal(''), z.undefined()])
    .transform((v) => {
      const s = sanitizeText(v ?? '', 200);
      return s || undefined;
    })
    .optional(),
  /** Set after the registrant confirms they own an email already on file. */
  confirmSameOwner: z.boolean().optional(),
});
export type PublicOutreachRegisterInput = z.infer<typeof PublicOutreachRegisterSchema>;

export const OutreachConvertStageSchema = z.enum([
  'CAPTURED',
  'CONTACTED',
  'VISITED',
  'READY_FOR_MEMBERSHIP',
  'CONVERTED',
  'ARCHIVED',
]);
export type OutreachConvertStage = z.infer<typeof OutreachConvertStageSchema>;
export type OutreachCaptureInput = z.infer<typeof OutreachCaptureSchema>;

export const SyncQueueItemSchema = z.object({
  clientId: z.string().uuid(),
  entityType: z.enum(['OUTREACH_CAPTURE', 'RIDE_UPDATE', 'ATTENDANCE']),
  payload: z.record(z.unknown()),
  capturedAt: z.string().datetime(),
});
export type SyncQueueItem = z.infer<typeof SyncQueueItemSchema>;
