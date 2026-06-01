import { z } from 'zod';

export const outreachCaptureSchema = z.object({
  firstName: z.string().min(1).max(120),
  lastName: z.string().max(120).optional(),
  phone: z.string().max(40).optional(),
  email: z
    .union([z.string().email().max(200), z.literal('')])
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  evangelistId: z.string().uuid().optional(),
  qrCodeId: z.string().uuid().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  locationLabel: z.string().max(300).optional(),
  photoConsent: z.boolean().optional(),
  photoUrl: z.string().url().max(2000).optional(),
  notes: z.string().max(5000).optional(),
  voiceNotes: z.string().max(5000).optional(),
  needsBusPickup: z.boolean().optional(),
  pickupAddress: z.string().max(500).optional(),
  busPickupNotes: z.string().max(1000).optional(),
  clientId: z.string().min(8).max(64).optional(),
  capturedAt: z.string().datetime().optional(),
  sendWelcome: z.boolean().optional(),
});

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
  mergedPayload: outreachCaptureSchema.partial().optional(),
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

export const publicRegisterSchema = z.object({
  firstName: z.string().min(1).max(120),
  lastName: z.string().max(120).optional(),
  phone: z.string().max(40).optional(),
  email: z.string().email().max(200).optional(),
  notes: z.string().max(2000).optional(),
});
