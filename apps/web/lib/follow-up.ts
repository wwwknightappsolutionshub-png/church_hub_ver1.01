export const FOLLOW_UP_STAGES = [
  'NEW_LEAD',
  'CONTACTED',
  'VISITED',
  'ATTENDED',
  'JOINED_GROUP',
] as const;

export const STAGE_LABELS: Record<string, string> = {
  NEW_LEAD: 'Fresh Contact',
  CONTACTED: 'Contacted',
  VISITED: 'Visited',
  ATTENDED: 'Attended',
  JOINED_GROUP: 'Joined Group',
};

export const STAGE_SHORT: Record<string, string> = {
  NEW_LEAD: 'Fresh',
  CONTACTED: 'Contacted',
  VISITED: 'Visited',
  ATTENDED: 'Attended',
  JOINED_GROUP: 'Joined',
};

/**
 * Journey status pill colors — shared by pipeline cards and Outreach Directory.
 * Fresh (NEW_LEAD) matches the gold/peach card badge.
 */
export const STAGE_BADGE_CLASS: Record<string, string> = {
  NEW_LEAD:
    'border-transparent bg-amber-100/90 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200',
  CONTACTED:
    'border-transparent bg-sky-100 text-sky-900 dark:bg-sky-950/80 dark:text-sky-200',
  VISITED:
    'border-transparent bg-yellow-100 text-amber-950 dark:bg-amber-950/70 dark:text-amber-100',
  ATTENDED:
    'border-transparent bg-orange-100 text-orange-900 dark:bg-orange-950/70 dark:text-orange-100',
  JOINED_GROUP:
    'border-transparent bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-100',
};

export function stageStatusLabel(stage: string): string {
  return STAGE_SHORT[stage] ?? STAGE_LABELS[stage] ?? stage;
}

/** Macro phases grouping pipeline stages */
export const PIPELINE_COLUMNS = [
  {
    id: 'outreach',
    step: 1,
    title: 'Initial Outreach',
    subtitle: 'First contact & connection',
    accent: 'sky',
    headerClass: 'bg-sky-100 border-sky-200 dark:bg-sky-950 dark:border-sky-800',
    titleClass: 'text-sky-950 dark:text-sky-50',
    subtitleClass: 'text-sky-800 dark:text-sky-200',
    dotClass: 'bg-sky-600',
    stages: ['NEW_LEAD', 'CONTACTED'] as const,
    stageAccent: {
      NEW_LEAD: 'border-t-sky-500',
      CONTACTED: 'border-t-blue-500',
    },
  },
  {
    id: 'engagement',
    step: 2,
    title: 'Growing Engagement',
    subtitle: 'Visits & service attendance',
    accent: 'amber',
    headerClass: 'bg-amber-100 border-amber-200 dark:bg-amber-950 dark:border-amber-800',
    titleClass: 'text-amber-950 dark:text-amber-50',
    subtitleClass: 'text-amber-900 dark:text-amber-200',
    dotClass: 'bg-amber-600',
    stages: ['VISITED', 'ATTENDED'] as const,
    stageAccent: {
      VISITED: 'border-t-amber-500',
      ATTENDED: 'border-t-orange-500',
    },
  },
  {
    id: 'belonging',
    step: 3,
    title: 'Belonging & Discipleship',
    subtitle: 'Cell group & maturity',
    accent: 'emerald',
    headerClass: 'bg-emerald-100 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800',
    titleClass: 'text-emerald-950 dark:text-emerald-50',
    subtitleClass: 'text-emerald-900 dark:text-emerald-200',
    dotClass: 'bg-emerald-600',
    stages: ['JOINED_GROUP'] as const,
    stageAccent: {
      JOINED_GROUP: 'border-t-emerald-500',
    },
  },
] as const;

/** Distinctive row backgrounds for Outreach Directory — keyed by journey phase. */
export const PHASE_ROW_CLASS: Record<(typeof PIPELINE_COLUMNS)[number]['id'], string> = {
  outreach:
    'bg-sky-50/95 border-l-4 border-l-sky-500 dark:bg-sky-950/45 dark:border-l-sky-400',
  engagement:
    'bg-amber-50/95 border-l-4 border-l-amber-500 dark:bg-amber-950/45 dark:border-l-amber-400',
  belonging:
    'bg-emerald-50/95 border-l-4 border-l-emerald-600 dark:bg-emerald-950/45 dark:border-l-emerald-400',
};

/** Distinctive row backgrounds for Outreach Directory table (stage → phase tint). */
export const STAGE_ROW_CLASS: Record<string, string> = {
  NEW_LEAD: PHASE_ROW_CLASS.outreach,
  CONTACTED: PHASE_ROW_CLASS.outreach,
  VISITED: PHASE_ROW_CLASS.engagement,
  ATTENDED: PHASE_ROW_CLASS.engagement,
  JOINED_GROUP: PHASE_ROW_CLASS.belonging,
};

export const CHANNEL_LABELS: Record<string, string> = {
  EMAIL: 'Email',
  WHATSAPP: 'WhatsApp',
  SMS: 'SMS (fallback)',
  IN_APP: 'In-app',
};

export function nextStage(current: string): string | null {
  const idx = FOLLOW_UP_STAGES.indexOf(current as (typeof FOLLOW_UP_STAGES)[number]);
  if (idx < 0 || idx >= FOLLOW_UP_STAGES.length - 1) return null;
  return FOLLOW_UP_STAGES[idx + 1];
}

export function formatDue(dueAt?: string | null) {
  if (!dueAt) return null;
  const d = new Date(dueAt);
  const now = new Date();
  const overdue = d < now;
  return {
    label: d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    overdue,
  };
}

export function phaseForStage(stage: string): (typeof PIPELINE_COLUMNS)[number]['id'] {
  for (const col of PIPELINE_COLUMNS) {
    if ((col.stages as readonly string[]).includes(stage)) return col.id;
  }
  return 'outreach';
}
