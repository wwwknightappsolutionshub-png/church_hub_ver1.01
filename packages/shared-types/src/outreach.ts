import { z } from 'zod';

export const OutreachCaptureSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100).optional(),
  phone: z.string().min(7).max(20).optional(),
  email: z.string().email().optional(),
  evangelistId: z.string().uuid().optional(),
  qrCodeId: z.string().uuid().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  locationLabel: z.string().max(300).optional(),
  photoConsent: z.boolean().default(false),
  photoUrl: z.string().max(600_000).optional(),
  notes: z.string().max(2000).optional(),
  voiceNotes: z.string().max(5000).optional(),
  needsBusPickup: z.boolean().optional(),
  pickupAddress: z.string().max(500).optional(),
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
