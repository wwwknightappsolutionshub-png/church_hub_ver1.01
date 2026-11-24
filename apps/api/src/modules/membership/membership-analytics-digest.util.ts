import { BadRequestException } from '@nestjs/common';

export const MAX_DIGEST_RECIPIENT_EMAILS = 20;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function sanitizeDigestRecipientEmails(emails: unknown): string[] {
  if (!Array.isArray(emails)) {
    throw new BadRequestException('recipientEmails must be an array');
  }
  if (emails.length > MAX_DIGEST_RECIPIENT_EMAILS) {
    throw new BadRequestException(
      `At most ${MAX_DIGEST_RECIPIENT_EMAILS} digest recipients allowed`,
    );
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of emails) {
    if (typeof raw !== 'string') {
      throw new BadRequestException('recipientEmails must contain only strings');
    }
    const normalized = raw.trim().toLowerCase();
    if (!normalized || normalized.length > 254) {
      throw new BadRequestException('Invalid email in recipientEmails');
    }
    if (!EMAIL_RE.test(normalized)) {
      throw new BadRequestException('Invalid email in recipientEmails');
    }
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

export function validateDigestWeekday(weekday: unknown): number {
  if (typeof weekday !== 'number' || !Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    throw new BadRequestException('weekday must be an integer from 0 (Sun) to 6 (Sat)');
  }
  return weekday;
}

export function validateDigestHourUtc(hourUtc: unknown): number {
  if (typeof hourUtc !== 'number' || !Number.isInteger(hourUtc) || hourUtc < 0 || hourUtc > 23) {
    throw new BadRequestException('hourUtc must be an integer from 0 to 23');
  }
  return hourUtc;
}