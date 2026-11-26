import {
  isExactHourDue,
  isFromHourDue,
  readOperationalEmailSchedules,
} from './operational-email-schedule';

describe('operational email schedules', () => {
  it('keeps the previous hardcoded defaults when a church has no settings', () => {
    const schedules = readOperationalEmailSchedules({}, 'Africa/Lagos');
    expect(schedules.departmentDigest).toEqual({
      enabled: true,
      weekday: 1,
      hour: 10,
      timeZone: 'Europe/London',
    });
    expect(schedules.cellDigest.weekday).toBe(6);
    expect(schedules.cellDigest.hour).toBe(21);
    expect(schedules.sundayAttendance.timeZone).toBe('Africa/Lagos');
    expect(schedules.sundayAttendance.hour).toBe(15);
    expect(schedules.membershipWeekly).toMatchObject({ weekday: 1, hour: 0, timeZone: 'UTC' });
  });

  it('uses a saved weekday and hour for one church only', () => {
    const schedules = readOperationalEmailSchedules(
      {
        operationalEmailSchedules: {
          departmentDigest: { enabled: false, weekday: 3, hour: 8, timeZone: 'Africa/Lagos' },
        },
      },
      'UTC',
    );
    expect(schedules.departmentDigest.enabled).toBe(false);
    expect(schedules.departmentDigest.hour).toBe(8);
    expect(schedules.cellDigest.timeZone).toBe('Europe/London');
  });

  it('matches Monday 10:00 in London and not an hour later', () => {
    const schedule = readOperationalEmailSchedules({}, 'UTC').departmentDigest;
    const during = isExactHourDue(new Date('2026-11-23T10:15:00.000Z'), schedule);
    const after = isExactHourDue(new Date('2026-11-23T11:15:00.000Z'), schedule);
    expect(during.due).toBe(true);
    expect(after.due).toBe(false);
  });

  it('treats Sunday attendance as due from the configured hour onward', () => {
    const schedule = readOperationalEmailSchedules({}, 'UTC').sundayAttendance;
    const before = isFromHourDue(new Date('2026-11-22T14:30:00.000Z'), schedule);
    const after = isFromHourDue(new Date('2026-11-22T15:05:00.000Z'), schedule);
    expect(before.due).toBe(false);
    expect(after.due).toBe(true);
  });
});
