export const FOLLOW_UP_STAGES = [
  'NEW_LEAD',
  'CONTACTED',
  'VISITED',
  'ATTENDED',
  'JOINED_GROUP',
  'ENLISTED_FOR_BAPTISM',
] as const;

export const STAGE_LABELS: Record<string, string> = {
  NEW_LEAD: 'New Contacts',
  CONTACTED: 'Contacted',
  VISITED: 'Attended Service',
  ATTENDED: 'Engrafted In WSF',
  JOINED_GROUP: 'Joined Group',
  ENLISTED_FOR_BAPTISM: 'Enlisted for Baptism',
};

export const STAGE_SHORT: Record<string, string> = {
  NEW_LEAD: 'Fresh',
  CONTACTED: 'Contacted',
  VISITED: 'Service',
  ATTENDED: 'WSF',
  JOINED_GROUP: 'Joined',
  ENLISTED_FOR_BAPTISM: 'Baptism',
};

/**
 * Journey status pill colors — shared by pipeline cards and Outreach Directory.
 */
export const STAGE_BADGE_CLASS: Record<string, string> = {
  NEW_LEAD: 'border-transparent bg-[#2f3ba7]/15 text-[#2f3ba7]',
  CONTACTED: 'border-transparent bg-[#e0f2fe] text-sky-900 dark:bg-sky-950/80 dark:text-sky-200',
  VISITED: 'border-transparent bg-[#fef3c7] text-amber-950 dark:bg-amber-950/70 dark:text-amber-100',
  ATTENDED: 'border-transparent bg-[#b58b62]/30 text-[#5c4030] dark:text-amber-100',
  JOINED_GROUP:
    'border-transparent bg-[#d1fae5] text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-100',
  ENLISTED_FOR_BAPTISM:
    'border-transparent bg-violet-100 text-violet-900 dark:bg-violet-950/80 dark:text-violet-100',
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
      NEW_LEAD: 'border-t-[#7d3d19]',
      CONTACTED: 'border-t-sky-400',
    },
  },
  {
    id: 'engagement',
    step: 2,
    title: 'Growing Engagement',
    subtitle: 'Service attendance & WSF',
    accent: 'amber',
    headerClass: 'bg-amber-100 border-amber-200 dark:bg-amber-950 dark:border-amber-800',
    titleClass: 'text-amber-950 dark:text-amber-50',
    subtitleClass: 'text-amber-900 dark:text-amber-200',
    dotClass: 'bg-amber-600',
    stages: ['VISITED', 'ATTENDED'] as const,
    stageAccent: {
      VISITED: 'border-t-amber-400',
      ATTENDED: 'border-t-[#b58b62]',
    },
  },
  {
    id: 'belonging',
    step: 3,
    title: 'Belonging & Discipleship',
    subtitle: 'Cell group, maturity & baptism',
    accent: 'emerald',
    headerClass: 'bg-emerald-100 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800',
    titleClass: 'text-emerald-950 dark:text-emerald-50',
    subtitleClass: 'text-emerald-900 dark:text-emerald-200',
    dotClass: 'bg-emerald-600',
    stages: ['JOINED_GROUP', 'ENLISTED_FOR_BAPTISM'] as const,
    stageAccent: {
      JOINED_GROUP: 'border-t-emerald-500',
      ENLISTED_FOR_BAPTISM: 'border-t-violet-500',
    },
  },
] as const;

/** Full-row backgrounds for pipeline cards and Outreach Directory (stage tint). */
export const STAGE_ROW_CLASS: Record<string, string> = {
  NEW_LEAD: 'bg-[#7d3d19]/15 text-[#2f3ba7] border-[#2f3ba7]/30',
  CONTACTED: 'bg-[#e0f2fe] text-sky-950 border-sky-200 dark:bg-sky-950/50 dark:text-sky-50',
  VISITED: 'bg-[#fef3c7] text-amber-950 border-amber-200 dark:bg-amber-950/40 dark:text-amber-50',
  ATTENDED: 'bg-[#b58b62] text-amber-50 border-[#b58b62]',
  JOINED_GROUP:
    'bg-[#d1fae5] text-emerald-950 border-emerald-200 dark:bg-emerald-950/45 dark:text-emerald-50',
  ENLISTED_FOR_BAPTISM:
    'bg-violet-100 text-violet-950 border-violet-200 dark:bg-violet-950/45 dark:text-violet-50',
};

/** Muted text on stage rows. */
export const STAGE_ROW_MUTED_CLASS: Record<string, string> = {
  NEW_LEAD: 'text-[#2f3ba7]/80',
  CONTACTED: 'text-sky-800/80 dark:text-sky-200/80',
  VISITED: 'text-amber-900/75 dark:text-amber-100/75',
  ATTENDED: 'text-amber-50/85',
  JOINED_GROUP: 'text-emerald-900/75 dark:text-emerald-100/75',
  ENLISTED_FOR_BAPTISM: 'text-violet-900/75 dark:text-violet-100/75',
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

export function formatCapturedAt(createdAt?: string | null) {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function sortByNewestFirst<T extends { createdAt?: string | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });
}

export function phaseForStage(stage: string): (typeof PIPELINE_COLUMNS)[number]['id'] {
  for (const col of PIPELINE_COLUMNS) {
    if ((col.stages as readonly string[]).includes(stage)) return col.id;
  }
  return 'outreach';
}

/** Stages that block archive (must convert / progress instead). */
export function isArchiveBlockedStage(stage: string): boolean {
  return stage === 'JOINED_GROUP';
}
