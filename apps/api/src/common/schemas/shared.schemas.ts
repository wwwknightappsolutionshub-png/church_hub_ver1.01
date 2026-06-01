import { z } from 'zod';

export const uuidSchema = z.string().uuid();

export const paginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const recordBodySchema = z.record(z.unknown());
