import { Body } from '@nestjs/common';
import type { ZodSchema } from 'zod';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';

/** Validates request body with Zod (same pattern as bus module). */
export const ZodBody = (schema: ZodSchema) => Body(new ZodValidationPipe(schema));
