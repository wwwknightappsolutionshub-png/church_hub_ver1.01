/**
 * Client types + UI helpers for GET /follow-up/pipeline (Option C Phase 3).
 */

export type ResolvedPipelineStage = {
  key: string;
  label: string;
  shortLabel: string;
  sortOrder: number;
  phaseKey: string;
  phaseStep: number;
  phaseTitle: string;
  colorToken: string | null;
  isEntry: boolean;
  blocksArchive: boolean;
  graduatesSla: boolean;
  isEnabled: boolean;
};

export type ResolvedPipelinePhase = {
  key: string;
  step: number;
  title: string;
  stageKeys: string[];
};

export type ResolvedPipeline = {
  source: 'template' | 'definition';
  templateKey: string | null;
  templateVersion: number | null;
  definitionId: string | null;
  name: string;
  stages: ResolvedPipelineStage[];
  phases: ResolvedPipelinePhase[];
};

/** Phase / token → filter tab + badge styles (matches winners_default color tokens). */
const TOKEN_STYLES: Record<
  string,
  { tab: string; tabActive: string; badge: string; accentBorder: string; header: string; title: string; subtitle: string; dot: string }
> = {
  sky: {
    tab: 'border-sky-300 bg-sky-100 text-sky-950 hover:bg-sky-200/80 dark:border-sky-700 dark:bg-sky-950/70 dark:text-sky-100',
    tabActive: 'ring-2 ring-sky-400/60 shadow-sm',
    badge: 'border-transparent bg-[#e0f2fe] text-sky-900 dark:bg-sky-950/80 dark:text-sky-200',
    accentBorder: 'border-l-sky-400',
    header: 'bg-sky-100 border-sky-200 dark:bg-sky-950 dark:border-sky-800',
    title: 'text-sky-950 dark:text-sky-50',
    subtitle: 'text-sky-800 dark:text-sky-200',
    dot: 'bg-sky-600',
  },
  amber: {
    tab: 'border-amber-300 bg-amber-100 text-amber-950 hover:bg-amber-200/80 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-50',
    tabActive: 'ring-2 ring-amber-400/60 shadow-sm',
    badge: 'border-transparent bg-[#fef3c7] text-amber-950 dark:bg-amber-950/70 dark:text-amber-100',
    accentBorder: 'border-l-amber-400',
    header: 'bg-amber-100 border-amber-200 dark:bg-amber-950 dark:border-amber-800',
    title: 'text-amber-950 dark:text-amber-50',
    subtitle: 'text-amber-900 dark:text-amber-200',
    dot: 'bg-amber-600',
  },
  emerald: {
    tab: 'border-emerald-300 bg-emerald-100 text-emerald-950 hover:bg-emerald-200/80 dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-50',
    tabActive: 'ring-2 ring-emerald-400/60 shadow-sm',
    badge: 'border-transparent bg-[#d1fae5] text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-100',
    accentBorder: 'border-l-emerald-500',
    header: 'bg-emerald-100 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800',
    title: 'text-emerald-950 dark:text-emerald-50',
    subtitle: 'text-emerald-900 dark:text-emerald-200',
    dot: 'bg-emerald-600',
  },
  violet: {
    tab: 'border-violet-300 bg-violet-100 text-violet-950 hover:bg-violet-200/80 dark:border-violet-700 dark:bg-violet-950/60 dark:text-violet-50',
    tabActive: 'ring-2 ring-violet-400/60 shadow-sm',
    badge: 'border-transparent bg-violet-100 text-violet-900 dark:bg-violet-950/80 dark:text-violet-100',
    accentBorder: 'border-l-violet-500',
    header: 'bg-violet-100 border-violet-200 dark:bg-violet-950 dark:border-violet-800',
    title: 'text-violet-950 dark:text-violet-50',
    subtitle: 'text-violet-900 dark:text-violet-200',
    dot: 'bg-violet-600',
  },
};

/** Per-stage overrides for winners_default entry / WSF brown tokens. */
const STAGE_STYLE_OVERRIDE: Record<string, Partial<(typeof TOKEN_STYLES)[string]>> = {
  NEW_LEAD: {
    tab: 'border-[#2f3ba7]/35 bg-[#2f3ba7]/15 text-[#2f3ba7] hover:bg-[#2f3ba7]/25',
    tabActive: 'ring-2 ring-[#2f3ba7]/50 shadow-sm',
    badge: 'border-transparent bg-[#2f3ba7]/15 text-[#2f3ba7]',
    accentBorder: 'border-l-[#2f3ba7]',
  },
  ATTENDED: {
    tab: 'border-[#b58b62]/60 bg-[#b58b62]/25 text-[#5c4030] hover:bg-[#b58b62]/35 dark:text-amber-100',
    tabActive: 'ring-2 ring-[#b58b62]/55 shadow-sm',
    badge: 'border-transparent bg-[#b58b62]/30 text-[#5c4030] dark:text-amber-100',
    accentBorder: 'border-l-[#b58b62]',
  },
};

const FALLBACK = TOKEN_STYLES.sky;

function stylesForStage(stage: ResolvedPipelineStage) {
  const token = stage.colorToken ?? stage.phaseKey;
  const base = TOKEN_STYLES[token] ?? TOKEN_STYLES[stage.phaseKey] ?? FALLBACK;
  const override = STAGE_STYLE_OVERRIDE[stage.key] ?? {};
  return { ...base, ...override };
}

export function enabledStages(pipeline: ResolvedPipeline | null | undefined): ResolvedPipelineStage[] {
  if (!pipeline) return [];
  return [...pipeline.stages].filter((s) => s.isEnabled).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function stageLabelMap(pipeline: ResolvedPipeline | null | undefined): Record<string, string> {
  return Object.fromEntries(enabledStages(pipeline).map((s) => [s.key, s.label]));
}

export function stageShortMap(pipeline: ResolvedPipeline | null | undefined): Record<string, string> {
  return Object.fromEntries(enabledStages(pipeline).map((s) => [s.key, s.shortLabel]));
}

export function stageFilterTabClass(
  pipeline: ResolvedPipeline | null | undefined,
  stageKey: string,
): string {
  const stage = enabledStages(pipeline).find((s) => s.key === stageKey);
  if (!stage) return 'border-border bg-card text-foreground';
  return stylesForStage(stage).tab;
}

export function stageFilterTabActiveClass(
  pipeline: ResolvedPipeline | null | undefined,
  stageKey: string,
): string {
  const stage = enabledStages(pipeline).find((s) => s.key === stageKey);
  if (!stage) return 'ring-2 ring-primary/50';
  return stylesForStage(stage).tabActive;
}

export function stageBadgeClass(
  pipeline: ResolvedPipeline | null | undefined,
  stageKey: string,
): string {
  const stage = enabledStages(pipeline).find((s) => s.key === stageKey);
  if (!stage) return 'bg-muted text-muted-foreground';
  return stylesForStage(stage).badge;
}

export function stageAccentBorderClass(
  pipeline: ResolvedPipeline | null | undefined,
  stageKey: string,
): string {
  const stage = enabledStages(pipeline).find((s) => s.key === stageKey);
  if (!stage) return 'border-l-border';
  return stylesForStage(stage).accentBorder;
}

export function isArchiveBlockedInPipeline(
  pipeline: ResolvedPipeline | null | undefined,
  stageKey: string,
): boolean {
  return enabledStages(pipeline).some((s) => s.key === stageKey && s.blocksArchive);
}

export function isGraduatedStage(
  pipeline: ResolvedPipeline | null | undefined,
  stageKey: string,
): boolean {
  return enabledStages(pipeline).some((s) => s.key === stageKey && s.graduatesSla);
}

/** Next enabled stage by sortOrder; null at end of journey. */
export function nextStageFromPipeline(
  pipeline: ResolvedPipeline | null | undefined,
  current: string,
): string | null {
  const stages = enabledStages(pipeline);
  if (!stages.length) return null;
  const idx = stages.findIndex((s) => s.key === current);
  if (idx < 0 || idx >= stages.length - 1) return null;
  return stages[idx + 1]?.key ?? null;
}

export type PipelinePhaseColumn = {
  id: string;
  step: number;
  title: string;
  subtitle: string;
  headerClass: string;
  titleClass: string;
  subtitleClass: string;
  dotClass: string;
  stages: string[];
};

export function phaseColumnsFromPipeline(
  pipeline: ResolvedPipeline | null | undefined,
): PipelinePhaseColumn[] {
  if (!pipeline?.phases?.length) return [];
  return pipeline.phases.map((phase) => {
    const sample = enabledStages(pipeline).find((s) => s.phaseKey === phase.key);
    const styles = sample ? stylesForStage(sample) : FALLBACK;
    return {
      id: phase.key,
      step: phase.step,
      title: phase.title,
      subtitle: '',
      headerClass: styles.header,
      titleClass: styles.title,
      subtitleClass: styles.subtitle,
      dotClass: styles.dot,
      stages: phase.stageKeys,
    };
  });
}
