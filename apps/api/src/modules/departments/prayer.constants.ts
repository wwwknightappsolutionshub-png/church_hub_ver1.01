export const PRAYER_BURDEN_TYPES = [
  { value: 'WEEKLY_BURDEN', label: 'Prayer burdens for the week' },
  { value: 'CHURCH_WIDE', label: 'Church-wide issues' },
  { value: 'MEMBER_NEED', label: 'Member-related needs' },
] as const;

export const PRAYER_CONFIDENTIALITY = [
  { value: 'PUBLIC', label: 'Public (unit visible)' },
  { value: 'LEADERS_ONLY', label: 'Leaders only' },
  { value: 'INTERCESSORS_ONLY', label: 'Intercessors only' },
  { value: 'PASTORS_ONLY', label: 'Pastors only' },
] as const;

export const PRAYER_INTAKE_CATEGORIES = [
  { value: 'URGENT', label: 'Urgent' },
  { value: 'HEALING', label: 'Healing' },
  { value: 'FAMILY', label: 'Family' },
  { value: 'FINANCIAL', label: 'Financial' },
  { value: 'SALVATION', label: 'Salvation' },
  { value: 'THANKSGIVING', label: 'Thanksgiving' },
  { value: 'OTHER', label: 'Other' },
] as const;

export const PRAYER_SCHEDULE_TYPES = [
  { value: 'MIDNIGHT_CHAIN', label: 'Midnight chain prayer' },
  { value: 'DAILY_WATCH', label: 'Daily watch session' },
  { value: 'WEEKLY_MEETING', label: 'Weekly prayer meeting' },
] as const;

export { parseWeekStartInput, weekStartUtc, isoWeekKey } from './children.constants';

export function generatePrayerPoints(scriptureRef: string, devotionTieIn?: string): string {
  const ref = scriptureRef.trim() || 'Scripture of the day';
  const lines = [
    `Scripture: ${ref}`,
    '',
    'Suggested prayer points:',
    `• Thank God for the truth revealed in ${ref}.`,
    '• Pray for hearts to receive and obey this word today.',
    '• Intercede for families and leaders in our church.',
    '• Ask the Holy Spirit to bring healing, unity, and salvation where needed.',
  ];
  if (devotionTieIn?.trim()) {
    lines.push('', `Group devotion tie-in: ${devotionTieIn.trim()}`);
  }
  return lines.join('\n');
}
