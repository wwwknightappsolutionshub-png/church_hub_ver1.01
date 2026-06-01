import {
  DevotionalAudience,
  DevotionalPlanSourceType,
  DevotionalPlanTone,
} from '@prisma/client';

export type OutlineDayInput = {
  dayNumber: number;
  title: string;
  scriptureRef?: string;
  scriptureText?: string;
  reflection?: string;
  prayerPrompt?: string;
  actionPoint?: string;
};

export function resolveDurationDays(durationDays?: number, durationWeeks?: number): number {
  if (durationDays && durationDays > 0) return Math.min(durationDays, 365);
  if (durationWeeks && durationWeeks > 0) return Math.min(durationWeeks * 7, 365);
  return 7;
}

export function toneToAudience(tone?: DevotionalPlanTone | null): DevotionalAudience {
  switch (tone) {
    case 'YOUTH':
      return 'YOUTH';
    case 'ADULT':
      return 'ADULT';
    case 'FAMILY':
      return 'FAMILY';
    case 'NEW_BELIEVER':
      return 'ALL';
    default:
      return 'ALL';
  }
}

export function buildSourceLabel(input: {
  sourceType?: DevotionalPlanSourceType | null;
  sourceLabel?: string | null;
  topicalBook?: string | null;
  bibleBook?: string | null;
  customTopic?: string | null;
}): string {
  if (input.sourceLabel?.trim()) return input.sourceLabel.trim();
  switch (input.sourceType) {
    case 'BIBLE_BOOK':
      return input.bibleBook?.trim() || 'Scripture';
    case 'TOPICAL_BOOK':
      return input.topicalBook?.trim() || 'Topical study';
    case 'CUSTOM_TOPIC':
      return input.customTopic?.trim() || 'Custom topic';
    case 'PDF_IMPORT':
      return 'Imported PDF study';
    default:
      return 'Devotional study';
  }
}

const TONE_INTROS: Record<DevotionalPlanTone, string> = {
  YOUTH: 'Keep language energetic and relatable for teens.',
  ADULT: 'Use thoughtful, application-focused language for adults.',
  FAMILY: 'Include all-ages discussion prompts families can share.',
  NEW_BELIEVER: 'Explain terms simply and focus on foundations of faith.',
};

export function buildOutlineDays(input: {
  sourceType?: DevotionalPlanSourceType | null;
  sourceLabel: string;
  tone?: DevotionalPlanTone | null;
  durationDays: number;
}): OutlineDayInput[] {
  const tone = input.tone ?? 'ADULT';
  const intro = TONE_INTROS[tone];
  const count = input.durationDays;
  const topic = input.sourceLabel;

  return Array.from({ length: count }, (_, i) => {
    const dayNumber = i + 1;
    const segment =
      input.sourceType === 'BIBLE_BOOK'
        ? `exploring ${topic}`
        : input.sourceType === 'PDF_IMPORT'
          ? `from your imported material on ${topic}`
          : `on ${topic}`;
    return {
      dayNumber,
      title: `Day ${dayNumber}: ${topic}`,
      scriptureRef:
        input.sourceType === 'BIBLE_BOOK' && dayNumber === 1
          ? topic
          : `Study focus — ${topic} (Day ${dayNumber})`,
      reflection: `${intro} Today we continue ${segment}. Reflect on how this applies to daily life.`,
      prayerPrompt: `Pray for wisdom and courage as you walk through day ${dayNumber} of this plan.`,
      actionPoint: `Share one insight from today with someone in your circle.`,
    };
  });
}
