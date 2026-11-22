/**
 * Phase 2 — stage keys + flags drive archive/SLA (no JOINED_GROUP hardcoding in helpers).
 */
import {
  archiveBlockedStageKeys,
  entryStageKey,
  graduatedStageKeys,
  isArchiveBlockedStageKey,
  assignmentSlaStageKeys,
} from './pipeline-stage-flags';
import {
  ASSIGNMENT_SLA_PIPELINE_STAGES,
  GRADUATED_FOLLOW_UP_STAGES,
  isAssignmentStageOverdue,
} from './follow-up-assignment-sla';

describe('Pipeline Option C Phase 2 flags', () => {
  it('derives archive-blocked and graduated keys from flags', () => {
    expect(archiveBlockedStageKeys()).toEqual(['JOINED_GROUP']);
    expect(isArchiveBlockedStageKey('JOINED_GROUP')).toBe(true);
    expect(isArchiveBlockedStageKey('NEW_LEAD')).toBe(false);
    expect(graduatedStageKeys()).toEqual(GRADUATED_FOLLOW_UP_STAGES);
    expect(assignmentSlaStageKeys()).toEqual(ASSIGNMENT_SLA_PIPELINE_STAGES);
    expect(entryStageKey()).toBe('NEW_LEAD');
  });

  it('SLA overdue skips graduated stages via flag helper', () => {
    const now = Date.now();
    expect(
      isAssignmentStageOverdue(
        {
          assignedToId: 'u1',
          assignedAt: new Date(now - 80 * 60 * 60 * 1000),
          stageAtAssignment: 'JOINED_GROUP',
          stage: 'JOINED_GROUP',
        },
        now,
      ),
    ).toBe(false);
  });

  it('custom flag rows can block archive on a different key', () => {
    const custom = [
      {
        key: 'CUSTOM_HOLD',
        isEntry: false,
        blocksArchive: true,
        graduatesSla: false,
        isEnabled: true,
      },
    ];
    expect(isArchiveBlockedStageKey('CUSTOM_HOLD', custom)).toBe(true);
    expect(archiveBlockedStageKeys(custom)).toEqual(['CUSTOM_HOLD']);
  });
});
