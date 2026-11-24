import { BadRequestException } from '@nestjs/common';
import {
  sanitizeDigestRecipientEmails,
  validateDigestHourUtc,
  validateDigestWeekday,
} from './membership-analytics-digest.util';

describe('membership analytics digest validation', () => {
  it('normalizes and dedupes valid emails', () => {
    expect(sanitizeDigestRecipientEmails([' Admin@Demo.Church ', 'admin@demo.church'])).toEqual([
      'admin@demo.church',
    ]);
  });

  it('rejects invalid and oversized lists', () => {
    expect(() => sanitizeDigestRecipientEmails('not-array')).toThrow(BadRequestException);
    expect(() => sanitizeDigestRecipientEmails(['not-an-email'])).toThrow(BadRequestException);
    expect(() => sanitizeDigestRecipientEmails(Array(25).fill('a@b.co'))).toThrow(BadRequestException);
  });

  it('validates weekday and hourUtc bounds', () => {
    expect(validateDigestWeekday(1)).toBe(1);
    expect(validateDigestHourUtc(8)).toBe(8);
    expect(() => validateDigestWeekday(7)).toThrow(BadRequestException);
    expect(() => validateDigestHourUtc(24)).toThrow(BadRequestException);
  });
});