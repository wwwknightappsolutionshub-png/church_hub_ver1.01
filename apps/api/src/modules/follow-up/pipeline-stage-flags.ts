import {
  WINNERS_DEFAULT_STAGES,
  type PipelineStageSeed,
} from './pipeline-template.seed';

/** Minimal stage flag shape (template seed or resolved pipeline stage). */
export type StageFlagRow = {
  key: string;
  isEntry: boolean;
  blocksArchive: boolean;
  graduatesSla: boolean;
  isEnabled: boolean;
};

export function stageFlagRowsFromDefault(
  stages: PipelineStageSeed[] = WINNERS_DEFAULT_STAGES,
): StageFlagRow[] {
  return stages.map((s) => ({
    key: s.key,
    isEntry: s.isEntry,
    blocksArchive: s.blocksArchive,
    graduatesSla: s.graduatesSla,
    isEnabled: s.isEnabled,
  }));
}

export function enabledStageKeys(stages: StageFlagRow[] = stageFlagRowsFromDefault()): string[] {
  return stages.filter((s) => s.isEnabled).map((s) => s.key);
}

export function entryStageKey(stages: StageFlagRow[] = stageFlagRowsFromDefault()): string {
  return stages.find((s) => s.isEnabled && s.isEntry)?.key ?? 'NEW_LEAD';
}

export function graduatedStageKeys(stages: StageFlagRow[] = stageFlagRowsFromDefault()): string[] {
  return stages.filter((s) => s.isEnabled && s.graduatesSla).map((s) => s.key);
}

/** Active SLA pipeline = enabled and not graduated. */
export function assignmentSlaStageKeys(
  stages: StageFlagRow[] = stageFlagRowsFromDefault(),
): string[] {
  return stages.filter((s) => s.isEnabled && !s.graduatesSla).map((s) => s.key);
}

export function archiveBlockedStageKeys(
  stages: StageFlagRow[] = stageFlagRowsFromDefault(),
): string[] {
  return stages.filter((s) => s.isEnabled && s.blocksArchive).map((s) => s.key);
}

export function isArchiveBlockedStageKey(
  stage: string,
  stages: StageFlagRow[] = stageFlagRowsFromDefault(),
): boolean {
  return stages.some((s) => s.key === stage && s.isEnabled && s.blocksArchive);
}

export function isGraduatedStageKey(
  stage: string,
  stages: StageFlagRow[] = stageFlagRowsFromDefault(),
): boolean {
  return stages.some((s) => s.key === stage && s.isEnabled && s.graduatesSla);
}

export function assertStageAllowed(
  stage: string,
  stages: StageFlagRow[] = stageFlagRowsFromDefault(),
): void {
  const allowed = enabledStageKeys(stages);
  if (!allowed.includes(stage)) {
    throw new Error(`Unknown or disabled pipeline stage: ${stage}`);
  }
}

/**
 * Map Outreach convert pipeline stage → Follow-up stage key using resolved flags.
 * Prefers matching keys when present; CAPTURED→entry; CONVERTED→blocksArchive (else last stage).
 */
export function mapOutreachConvertToFollowUpStage(
  convertStage: string,
  stages: StageFlagRow[] = stageFlagRowsFromDefault(),
): string | null {
  const keys = new Set(enabledStageKeys(stages));
  const preferred: Record<string, string> = {
    CAPTURED: entryStageKey(stages),
    CONTACTED: 'CONTACTED',
    VISITED: 'VISITED',
    READY_FOR_MEMBERSHIP: 'ATTENDED',
    CONVERTED: archiveBlockedStageKeys(stages)[0] ?? enabledStageKeys(stages).at(-1) ?? 'JOINED_GROUP',
  };
  const candidate = preferred[convertStage];
  if (!candidate) return null;
  if (keys.has(candidate)) return candidate;
  if (convertStage === 'CAPTURED') return entryStageKey(stages);
  if (convertStage === 'CONVERTED') {
    return archiveBlockedStageKeys(stages)[0] ?? enabledStageKeys(stages).at(-1) ?? null;
  }
  return null;
}
