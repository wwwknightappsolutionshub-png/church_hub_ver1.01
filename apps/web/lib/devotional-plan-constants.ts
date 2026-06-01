import type { DevotionalPlanSourceType, DevotionalPlanTone } from '@church-hub/shared-types';

export const DEVOTIONAL_SOURCE_OPTIONS: Array<{
  type: DevotionalPlanSourceType;
  label: string;
  description: string;
}> = [
  {
    type: 'TOPICAL_BOOK',
    label: 'Topical book',
    description: 'Study based on a Christian living or discipleship book',
  },
  {
    type: 'BIBLE_BOOK',
    label: 'Book of the Bible',
    description: 'Walk through a whole book or major section of Scripture',
  },
  {
    type: 'CUSTOM_TOPIC',
    label: 'Custom topic',
    description: 'Any theme you want to explore with your group',
  },
  {
    type: 'PDF_IMPORT',
    label: 'Imported PDF',
    description: 'Build a plan from uploaded study material (URL)',
  },
];

export const DEVOTIONAL_TONE_OPTIONS: Array<{
  value: DevotionalPlanTone;
  label: string;
  hint: string;
}> = [
  { value: 'YOUTH', label: 'Youth', hint: 'Energetic, relatable language for teens' },
  { value: 'ADULT', label: 'Adult', hint: 'Thoughtful application for adults' },
  { value: 'FAMILY', label: 'Family', hint: 'All-ages prompts to discuss together' },
  { value: 'NEW_BELIEVER', label: 'New believer', hint: 'Simple foundations of faith' },
];

export const BIBLE_BOOKS = [
  'Genesis',
  'Exodus',
  'Psalms',
  'Proverbs',
  'Isaiah',
  'Matthew',
  'Mark',
  'Luke',
  'John',
  'Acts',
  'Romans',
  '1 Corinthians',
  'Ephesians',
  'Philippians',
  'James',
  '1 Peter',
  'Revelation',
] as const;

export const TOPICAL_BOOK_SUGGESTIONS = [
  'The Purpose Driven Life',
  'Mere Christianity',
  'Celebration of Discipline',
  'Knowing God',
  'The Cost of Discipleship',
] as const;
