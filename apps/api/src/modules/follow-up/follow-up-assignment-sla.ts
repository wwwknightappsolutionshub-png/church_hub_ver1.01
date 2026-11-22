import {
  assignmentSlaStageKeys,
  graduatedStageKeys,
  isGraduatedStageKey,
} from './pipeline-stage-flags';

/** Hours after assignment before an unchanged stage is overdue. */
export const ASSIGNMENT_STAGE_SLA_HOURS = (() => {
  const raw = Number(process.env.FOLLOW_UP_ASSIGNMENT_SLA_HOURS ?? '72');
  return Number.isFinite(raw) && raw > 0 ? raw : 72;
})();

export const ASSIGNMENT_STAGE_SLA_MS = ASSIGNMENT_STAGE_SLA_HOURS * 60 * 60 * 1000;

/** “Due today” window after assign / stage move (hours elapsed). */
export const DUE_TODAY_AFTER_HOURS = 12;
export const DUE_TODAY_UNTIL_HOURS = 24;
export const DUE_TODAY_AFTER_MS = DUE_TODAY_AFTER_HOURS * 60 * 60 * 1000;
export const DUE_TODAY_UNTIL_MS = DUE_TODAY_UNTIL_HOURS * 60 * 60 * 1000;

/** Derived from winners_default `graduatesSla` flags (Phase 2). */
export const GRADUATED_FOLLOW_UP_STAGES: string[] = graduatedStageKeys();

/** Derived from winners_default enabled && !graduatesSla (Phase 2). */
export const ASSIGNMENT_SLA_PIPELINE_STAGES: string[] = assignmentSlaStageKeys();

export function assignmentSlaCutoff(now = new Date()): Date {
  return new Date(now.getTime() - ASSIGNMENT_STAGE_SLA_MS);
}

/** Prisma OR branches: still on the same stage as when assigned, past SLA. */
export function assignmentStaleWhereBranches(cutoff: Date) {
  return ASSIGNMENT_SLA_PIPELINE_STAGES.map((stage) => ({
    stage,
    stageAtAssignment: stage,
    assignedToId: { not: null } as { not: null },
    assignedAt: { lte: cutoff },
  }));
}

export function isAssignmentStageOverdue(
  row: {
    assignedToId?: string | null;
    assignedAt?: string | Date | null;
    stageAtAssignment?: string | null;
    stage: string;
    archivedAt?: string | Date | null;
    dueAt?: string | Date | null;
  },
  now = Date.now(),
): boolean {
  if (row.archivedAt) return false;
  if (isGraduatedStageKey(row.stage)) return false;

  if (row.dueAt) {
    const due = new Date(row.dueAt).getTime();
    if (!Number.isNaN(due) && due < now) return true;
  }

  if (!row.assignedToId || !row.assignedAt || !row.stageAtAssignment) return false;
  if (row.stage !== row.stageAtAssignment) return false;
  const assignedAt = new Date(row.assignedAt).getTime();
  if (Number.isNaN(assignedAt)) return false;
  return now - assignedAt >= ASSIGNMENT_STAGE_SLA_MS;
}

export function dueTodayProgressWindow(now = new Date()) {
  const t = now.getTime();
  return {
    /** Oldest progress still in the 12–24h “due today” window */
    from: new Date(t - DUE_TODAY_UNTIL_MS),
    /** Newest progress that has crossed the 12h threshold */
    to: new Date(t - DUE_TODAY_AFTER_MS),
  };
}

/** True when lastProgressAt falls in the 12–24h window. */
export function isDueTodayByProgress(
  lastProgressAt: Date | string | null | undefined,
  now = Date.now(),
): boolean {
  if (!lastProgressAt) return false;
  const t = new Date(lastProgressAt).getTime();
  if (Number.isNaN(t)) return false;
  const elapsed = now - t;
  return elapsed >= DUE_TODAY_AFTER_MS && elapsed <= DUE_TODAY_UNTIL_MS;
}

/** Default dueAt = now + 24h when progress/assign happens without an explicit due. */
export function dueAtFromProgress(from = new Date()): Date {
  return new Date(from.getTime() + DUE_TODAY_UNTIL_MS);
}
