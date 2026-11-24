import type { OutreachCaptureSource } from '@prisma/client';

/** Server-controlled flags — never accept from client JSON / offline payload. */
export type CaptureContactTrustOptions = {
  allowDuplicateOverride?: boolean;
  capturedByUserId?: string;
  captureSource?: OutreachCaptureSource;
  /** Leaders only — hide journey holder name from duplicate responses for regular evangelists. */
  exposeDuplicatePii?: boolean;
};

export type OutreachCaptureInput = {
  firstName: string;
  lastName?: string;
  phone?: string;
  email?: string;
  evangelistId?: string;
  qrCodeId?: string;
  latitude?: number;
  longitude?: number;
  locationLabel?: string;
  postcode?: string;
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressCountry?: string;
  addressPostal?: string;
  photoConsent?: boolean;
  gdprConsent?: boolean;
  photoUrl?: string;
  notes?: string;
  voiceNotes?: string;
  referredBy?: string;
  needsBusPickup?: boolean;
  pickupAddress?: string;
  busPickupNotes?: string;
  clientId?: string;
  capturedAt?: string;
  sendWelcome?: boolean;
  campaignId?: string;
  /** Ignored if present — use CaptureContactTrustOptions instead. */
  allowDuplicateOverride?: boolean;
  capturedByUserId?: string;
  captureSource?: OutreachCaptureSource;
};

/** Strip privilege fields that must not be mass-assigned from sync/offline payloads. */
export function stripUntrustedCaptureFlags<T extends OutreachCaptureInput>(data: T): Omit<T, 'allowDuplicateOverride' | 'capturedByUserId' | 'captureSource'> {
  const { allowDuplicateOverride: _a, capturedByUserId: _b, captureSource: _c, ...rest } = data;
  return rest;
}