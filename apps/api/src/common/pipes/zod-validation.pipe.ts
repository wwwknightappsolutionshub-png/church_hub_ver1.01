import { BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodSchema } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) {
      const message =
        parsed.error.issues.map((e) => `${e.path.join('.') || 'body'}: ${e.message}`).join('; ') ||
        'Validation failed';
      throw new BadRequestException(message);
    }
    return parsed.data;
  }
}
