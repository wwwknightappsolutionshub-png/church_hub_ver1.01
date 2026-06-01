import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const schema = z.object({ name: z.string().min(2) });
  const pipe = new ZodValidationPipe(schema);

  it('returns parsed data on success', () => {
    expect(pipe.transform({ name: 'Ann' })).toEqual({ name: 'Ann' });
  });

  it('throws BadRequestException on invalid input', () => {
    expect(() => pipe.transform({ name: 'A' })).toThrow(BadRequestException);
  });
});
