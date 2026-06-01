import { z } from 'zod';

export const CreateRideRequestSchema = z.object({
  memberId: z.string().uuid(),
  pickupAddress: z.string().min(1).max(500),
  pickupLat: z.number().optional(),
  pickupLng: z.number().optional(),
  dropoffAddress: z.string().min(1).max(500),
  dropoffLat: z.number().optional(),
  dropoffLng: z.number().optional(),
  scheduledAt: z.string().datetime(),
  isRecurring: z.boolean().default(false),
  recurringRule: z.string().optional(),
  notes: z.string().max(500).optional(),
});
export type CreateRideRequestInput = z.infer<typeof CreateRideRequestSchema>;

export const DriverLocationUpdateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).optional(),
  speed: z.number().min(0).optional(),
});
export type DriverLocationUpdate = z.infer<typeof DriverLocationUpdateSchema>;

export const RouteOptimizeRequestSchema = z.object({
  startLat: z.number(),
  startLng: z.number(),
  stops: z.array(
    z.object({
      id: z.string(),
      lat: z.number(),
      lng: z.number(),
      label: z.string().optional(),
    }),
  ).min(1),
});
export type RouteOptimizeRequest = z.infer<typeof RouteOptimizeRequestSchema>;
