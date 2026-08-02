import { BadRequestException } from '@nestjs/common';
import { PublicOutreachRegisterSchema } from '@church-hub/shared-types';
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

  it('rejects outreach phone with letters as 400, not 500', () => {
    const registerPipe = new ZodValidationPipe(PublicOutreachRegisterSchema);
    try {
      registerPipe.transform({
        firstName: 'Iyanuasele',
        lastName: 'Olufemi',
        phone: '8384826482dhxb',
        email: 'omphalosbc@gmail.com',
      });
      fail('expected BadRequestException');
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      const response = (err as BadRequestException).getResponse() as { message?: string };
      expect(String(response.message ?? '')).toMatch(/letter|phone|UK/i);
    }
  });
});
