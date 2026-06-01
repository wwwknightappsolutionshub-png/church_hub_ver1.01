import { z } from 'zod';

export const createRideSchema = z.object({
  memberId: z.string().uuid(),
  pickupAddress: z.string().min(3).max(500),
  pickupLat: z.number().min(-90).max(90).optional(),
  pickupLng: z.number().min(-180).max(180).optional(),
  dropoffAddress: z.string().min(3).max(500),
  dropoffLat: z.number().min(-90).max(90).optional(),
  dropoffLng: z.number().min(-180).max(180).optional(),
  scheduledAt: z.string().datetime(),
  isRecurring: z.boolean().optional(),
  recurringRule: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});

export const updateRideStatusSchema = z.object({
  status: z.enum([
    'REQUESTED',
    'SCHEDULED',
    'IN_TRANSIT',
    'PICKED_UP',
    'DROPPED_OFF',
    'NO_SHOW',
    'CANCELLED',
  ]),
});

export const assignRideSchema = z.object({
  driverId: z.string().uuid(),
  busId: z.string().uuid().optional(),
});

export const driverLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  heading: z.number().optional(),
  speed: z.number().optional(),
});

export const optimizeRouteSchema = z.object({
  startLat: z.number().min(-90).max(90),
  startLng: z.number().min(-180).max(180),
  stops: z
    .array(
      z.object({
        id: z.string().min(1),
        lat: z.number(),
        lng: z.number(),
        label: z.string().optional(),
      }),
    )
    .min(0)
    .max(50),
});

export const emergencySchema = z.object({
  driverId: z.string().uuid(),
  message: z.string().min(1).max(1000),
});
