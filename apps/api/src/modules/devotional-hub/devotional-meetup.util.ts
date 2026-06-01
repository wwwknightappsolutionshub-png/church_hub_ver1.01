import { DevotionalMeetupRecurrence } from '@prisma/client';

export const DEFAULT_MEETUP_REMINDER_OFFSETS = [1440, 60, 10] as const;

export function parseReminderOffsets(value: unknown): number[] {
  if (!Array.isArray(value)) return [...DEFAULT_MEETUP_REMINDER_OFFSETS];
  const nums = value.filter((v): v is number => typeof v === 'number' && v > 0);
  return nums.length ? nums : [...DEFAULT_MEETUP_REMINDER_OFFSETS];
}

export function addRecurrenceInterval(date: Date, recurrence: DevotionalMeetupRecurrence): Date {
  const next = new Date(date);
  switch (recurrence) {
    case 'WEEKLY':
      next.setDate(next.getDate() + 7);
      break;
    case 'BIWEEKLY':
      next.setDate(next.getDate() + 14);
      break;
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      next.setDate(next.getDate() + 7);
  }
  return next;
}

export function memberLabel(m: { firstName: string; lastName: string }) {
  return `${m.firstName} ${m.lastName}`.trim();
}
