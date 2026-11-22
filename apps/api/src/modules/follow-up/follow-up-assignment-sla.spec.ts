import {
  ASSIGNMENT_STAGE_SLA_MS,
  DUE_TODAY_AFTER_MS,
  DUE_TODAY_UNTIL_MS,
  assignmentSlaCutoff,
  assignmentStaleWhereBranches,
  isAssignmentStageOverdue,
  isDueTodayByProgress,
} from './follow-up-assignment-sla';

describe('assignment stage SLA (72h)', () => {
  const now = new Date('2026-11-22T12:00:00.000Z');

  it('builds Prisma branches for unchanged stage past cutoff', () => {
    const cutoff = assignmentSlaCutoff(now);
    const branches = assignmentStaleWhereBranches(cutoff);
    expect(branches.length).toBeGreaterThan(0);
    expect(branches.every((b) => b.stage === b.stageAtAssignment)).toBe(true);
    expect(branches[0].assignedAt).toEqual({ lte: cutoff });
  });

  it('flags overdue when stage unchanged 72h+ after assign', () => {
    expect(
      isAssignmentStageOverdue(
        {
          assignedToId: 'u1',
          assignedAt: new Date(now.getTime() - ASSIGNMENT_STAGE_SLA_MS - 1000),
          stageAtAssignment: 'NEW_LEAD',
          stage: 'NEW_LEAD',
        },
        now.getTime(),
      ),
    ).toBe(true);
  });

  it('clears overdue once stage advances after assignment', () => {
    expect(
      isAssignmentStageOverdue(
        {
          assignedToId: 'u1',
          assignedAt: new Date(now.getTime() - ASSIGNMENT_STAGE_SLA_MS - 1000),
          stageAtAssignment: 'NEW_LEAD',
          stage: 'CONTACTED',
        },
        now.getTime(),
      ),
    ).toBe(false);
  });

  it('still flags past dueAt independently', () => {
    expect(
      isAssignmentStageOverdue(
        {
          assignedToId: 'u1',
          assignedAt: now,
          stageAtAssignment: 'NEW_LEAD',
          stage: 'CONTACTED',
          dueAt: new Date(now.getTime() - 60_000),
        },
        now.getTime(),
      ),
    ).toBe(true);
  });

  it('Due today is only the 12–24h window after progress', () => {
    const t = now.getTime();
    expect(isDueTodayByProgress(new Date(t - DUE_TODAY_AFTER_MS - 1000), t)).toBe(true);
    expect(isDueTodayByProgress(new Date(t - DUE_TODAY_UNTIL_MS + 1000), t)).toBe(true);
    expect(isDueTodayByProgress(new Date(t - 60 * 60 * 1000), t)).toBe(false);
    expect(isDueTodayByProgress(new Date(t - DUE_TODAY_UNTIL_MS - 1000), t)).toBe(false);
  });
});
