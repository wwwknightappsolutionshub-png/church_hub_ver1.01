export const WISDOM365_TAGLINE =
  'Daily biblical wisdom with practical life application for every season.';

export const WISDOM365_ROUTES = {
  hub: '/dashboard/wisdom365',
} as const;

export type Wisdom365TabId = 'today' | 'journey' | 'apply' | 'library' | 'insights';

/** Mobile-first tab order: Today → My journey → Life application → Library */
export const WISDOM365_TABS: Array<{ id: Wisdom365TabId; label: string; shortLabel?: string }> = [
  { id: 'today', label: 'Today', shortLabel: 'Today' },
  { id: 'journey', label: 'My journey', shortLabel: 'Journey' },
  { id: 'apply', label: 'Life application', shortLabel: 'Apply' },
  { id: 'library', label: 'Library', shortLabel: 'Library' },
  { id: 'insights', label: 'Insights', shortLabel: 'Insights' },
];

export interface Wisdom365Day {
  dayOfYear: number;
  title: string;
  reference: string;
  passage: string;
  wisdom: string;
  application: string;
  prayer: string;
  theme: string;
  imageUrl: string;
}

export interface Wisdom365PersonalDay extends Wisdom365Day {
  greeting: string;
  focusLine: string;
  personalWisdom: string;
  personalApplication: string;
  personalPrayer: string;
  audioScript: string;
}

const THEMES = [
  'Trust',
  'Integrity',
  'Peace',
  'Generosity',
  'Discipline',
  'Courage',
  'Humility',
  'Hope',
  'Wisdom',
  'Love',
] as const;

const THEME_IMAGES: Record<(typeof THEMES)[number], string> = {
  Trust:
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80',
  Integrity:
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
  Peace:
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80',
  Generosity:
    'https://images.unsplash.com/photo-1418065460547-3c41a5a962b2?auto=format&fit=crop&w=1200&q=80',
  Discipline:
    'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=1200&q=80',
  Courage:
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
  Humility:
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80',
  Hope:
    'https://images.unsplash.com/photo-1495616811223-4d98c6e2470f?auto=format&fit=crop&w=1200&q=80',
  Wisdom:
    'https://images.unsplash.com/photo-1518173946687-a1263637735?auto=format&fit=crop&w=1200&q=80',
  Love:
    'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=1200&q=80',
};

const PASSAGES: Array<{ reference: string; passage: string }> = [
  {
    reference: 'Proverbs 3:5–6',
    passage:
      'Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.',
  },
  {
    reference: 'James 1:5',
    passage:
      'If any of you lacks wisdom, you should ask God, who gives generously to all without finding fault, and it will be given to you.',
  },
  {
    reference: 'Psalm 119:105',
    passage: 'Your word is a lamp for my feet, a light on my path.',
  },
  {
    reference: 'Micah 6:8',
    passage:
      'He has shown you, O mortal, what is good. And what does the Lord require of you? To act justly and to love mercy and to walk humbly with your God.',
  },
  {
    reference: 'Colossians 3:23',
    passage:
      'Whatever you do, work at it with all your heart, as working for the Lord, not for human masters.',
  },
  {
    reference: 'Philippians 4:6–7',
    passage:
      'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.',
  },
  {
    reference: 'Romans 12:2',
    passage:
      'Do not conform to the pattern of this world, but be transformed by the renewing of your mind.',
  },
];

export function dayOfYear(date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function wisdomForDay(date = new Date()): Wisdom365Day {
  const day = dayOfYear(date);
  const idx = day % PASSAGES.length;
  const theme = THEMES[day % THEMES.length];
  const { reference, passage } = PASSAGES[idx];

  return {
    dayOfYear: day,
    title: `Day ${day} · ${theme}`,
    reference,
    passage,
    theme,
    imageUrl: THEME_IMAGES[theme],
    wisdom: `Today's focus is ${theme.toLowerCase()}. Scripture invites you to pause before reacting—let God's word shape your priorities before the day's noise takes over.`,
    application: `Identify one decision today where you can choose ${theme.toLowerCase()} over convenience. Write it down, act on it once, and review this evening.`,
    prayer: `Lord, give me wisdom for today. Let your word guide my thoughts, my speech, and my actions. Amen.`,
  };
}

export function personalizeWisdomDay(day: Wisdom365Day, firstName: string): Wisdom365PersonalDay {
  const name = firstName.trim() || 'friend';
  const themeLower = day.theme.toLowerCase();

  const greeting = `Hello ${name}, how are you today?`;
  const focusLine = `Your wisdom focus for today is ${themeLower}.`;
  const personalWisdom = `I want you to know that ${themeLower} is your anchor today. Before you react to the noise around you, let ${day.reference} reshape your priorities. I'm walking with you in this.`;
  const personalApplication = `Here's what I'd love for you to do: pick one decision today where you choose ${themeLower} over what's easy. Write it down, follow through once, and check in with yourself this evening.`;
  const personalPrayer = `${name}, let's pray together: Lord, give me wisdom for today. Guide my thoughts, my speech, and my actions. Amen.`;

  const audioScript = [
    greeting,
    focusLine,
    `Today I'm sharing ${day.reference} with you.`,
    day.passage,
    personalWisdom,
    personalApplication,
    personalPrayer,
  ].join(' ');

  return {
    ...day,
    greeting,
    focusLine,
    personalWisdom,
    personalApplication,
    personalPrayer,
    audioScript,
  };
}

export const WISDOM365_LIBRARY = PASSAGES.map((p, i) => ({
  id: `lib-${i}`,
  ...p,
  theme: THEMES[i % THEMES.length],
  imageUrl: THEME_IMAGES[THEMES[i % THEMES.length]],
}));

export const WISDOM365_FEATURES = [
  {
    title: 'Daily word',
    description: 'A curated scripture, insight, and prayer every day—365 days a year.',
  },
  {
    title: 'Life application',
    description: 'Practical prompts that turn reading into obedience and habit.',
  },
  {
    title: 'Journey tracking',
    description: 'Streaks, milestones, and gentle accountability for spiritual growth.',
  },
  {
    title: 'Device reminders',
    description: 'Daily alarm and notifications so you never miss your moment with God.',
  },
] as const;

export const WISDOM365_STORAGE = {
  subscribed: 'wisdom365-subscribed',
  reminder: 'wisdom365-reminder',
  streak: 'wisdom365-streak',
  completed: 'wisdom365-completed-days',
  journal: 'wisdom365-journal',
  lastReminderFired: 'wisdom365-last-reminder-fired',
} as const;

export interface Wisdom365ReminderSettings {
  hour: number;
  minute: number;
  timezone: string;
  alarmEnabled: boolean;
}

export function defaultReminderSettings(): Wisdom365ReminderSettings {
  return {
    hour: 7,
    minute: 0,
    timezone:
      typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC',
    alarmEnabled: true,
  };
}
