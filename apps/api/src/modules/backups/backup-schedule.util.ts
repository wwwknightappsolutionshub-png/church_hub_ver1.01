import { Injectable } from '@nestjs/common';
import { BackupFrequency } from '@prisma/client';

/** Compute next run after `from` (exclusive) in UTC wall clock. */
export function computeNextRunAt(params: {
  frequency: BackupFrequency;
  hourUtc: number;
  minuteUtc: number;
  dayOfPeriod?: number | null;
  from?: Date;
}): Date {
  const from = params.from ?? new Date();
  const hour = clamp(params.hourUtc, 0, 23);
  const minute = clamp(params.minuteUtc, 0, 59);

  if (params.frequency === 'DAILY') {
    const candidate = new Date(
      Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), hour, minute, 0, 0),
    );
    if (candidate.getTime() <= from.getTime()) {
      candidate.setUTCDate(candidate.getUTCDate() + 1);
    }
    return candidate;
  }

  if (params.frequency === 'WEEKLY') {
    const targetDow = clamp(params.dayOfPeriod ?? 0, 0, 6); // 0=Sun
    const candidate = new Date(
      Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), hour, minute, 0, 0),
    );
    for (let i = 0; i < 8; i++) {
      if (candidate.getUTCDay() === targetDow && candidate.getTime() > from.getTime()) {
        return candidate;
      }
      candidate.setUTCDate(candidate.getUTCDate() + 1);
    }
    return candidate;
  }

  // MONTHLY — dayOfPeriod 1–28
  const day = clamp(params.dayOfPeriod ?? 1, 1, 28);
  let year = from.getUTCFullYear();
  let month = from.getUTCMonth();
  let candidate = new Date(Date.UTC(year, month, day, hour, minute, 0, 0));
  if (candidate.getTime() <= from.getTime()) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
    candidate = new Date(Date.UTC(year, month, day, hour, minute, 0, 0));
  }
  return candidate;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.trunc(n)));
}
