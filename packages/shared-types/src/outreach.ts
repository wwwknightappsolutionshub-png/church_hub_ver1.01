import { z } from 'zod';
import {
  optionalEmailSchema,
  optionalPhoneSchema,
  optionalUkPostcodeSchema,
  personNameSchema,
  sanitizeText,
} from './validation';

export const OutreachCaptureSchema = z.object({
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
  evangelistId: z.string().uuid().optional(),
  qrCodeId: z.string().uuid().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  locationLabel: z
    .union([z.string(), z.literal(''), z.undefined()])
    .transform((v) => {
      const s = sanitizeText(v ?? '', 300);
      return s || undefined;
    })
    .optional(),
  postcode: optionalUkPostcodeSchema,
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
  pickupAddress: z
    .union([z.string(), z.literal(''), z.undefined()])
    .transform((v) => {
      const s = sanitizeText(v ?? '', 500);
      return s || undefined;
    })
    .optional(),
  busPickupNotes: z.string().max(1000).optional(),
  clientId: z.string().uuid().optional(),
  capturedAt: z.string().datetime().optional(),
});

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
