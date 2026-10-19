import { z } from 'zod';
import {
  OutreachCaptureBaseSchema,
  PublicOutreachRegisterSchema,
  refineInternationalAddress,
  sanitizeText,
} from '@church-hub/shared-types';

const optionalAddressLine = (max: number) =>
  z
    .union([z.string(), z.literal(''), z.undefined()])
    .transform((v) => {
      const s = sanitizeText(v ?? '', max);
      return s || undefined;
    })
    .optional();

/** ZodObject (supports .partial) — API extras on top of shared capture fields. */
export const outreachCaptureObjectSchema = OutreachCaptureBaseSchema.extend({
  photoConsent: z.boolean().optional(),
  photoUrl: z
    .union([z.string().url().max(2000), z.string().startsWith('data:image/').max(600_000)])
    .optional(),
  clientId: z.string().min(8).max(64).optional(),
  sendWelcome: z.boolean().optional(),
  addressStreet: optionalAddressLine(200),
  addressCity: optionalAddressLine(100),
  addressState: optionalAddressLine(100),
  addressCountry: optionalAddressLine(100),
});

/** Full capture payload with international address refinement. */
export const outreachCaptureSchema = outreachCaptureObjectSchema.superRefine(
  refineInternationalAddress,
);

export const outreachSyncItemSchema = z.object({
  clientId: z.string().min(8).max(64),
  entityType: z.enum(['OUTREACH_CAPTURE']),
  payload: outreachCaptureSchema,
  capturedAt: z.string().datetime(),
  clientVersion: z.number().int().positive().optional(),
  serverVersion: z.number().int().positive().optional(),
});

export const outreachSyncSchema = z.object({
  items: z.array(outreachSyncItemSchema).min(1).max(100),
});

export const resolveSyncConflictSchema = z.object({
  strategy: z.enum(['CLIENT_WINS', 'SERVER_WINS', 'MERGED']),
  // .partial() requires ZodObject — not ZodEffects from superRefine
  mergedPayload: outreachCaptureObjectSchema.partial().optional(),
});

export const pipelineAdvanceSchema = z.object({
  convertStage: z.enum([
    'CAPTURED',
    'CONTACTED',
    'VISITED',
    'READY_FOR_MEMBERSHIP',
    'CONVERTED',
    'ARCHIVED',
  ]),
});

export const publicRegisterSchema = PublicOutreachRegisterSchema;
