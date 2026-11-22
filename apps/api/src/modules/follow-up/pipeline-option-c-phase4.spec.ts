/**
 * Phase 4 — Outreach convert mapping + entry stage from resolved flags (no hardcode).
 */
import {
  entryStageKey,
  mapOutreachConvertToFollowUpStage,
  type StageFlagRow,
} from './pipeline-stage-flags';

const winners = undefined; // default winners_default rows

describe('Pipeline Option C Phase 4 — outreach convert map', () => {
  it('CAPTURED maps to entry stage key', () => {
    expect(mapOutreachConvertToFollowUpStage('CAPTURED', winners)).toBe('NEW_LEAD');
    expect(entryStageKey()).toBe('NEW_LEAD');
  });

  it('CONVERTED maps to archive-blocked (JOINED_GROUP) on winners_default', () => {
    expect(mapOutreachConvertToFollowUpStage('CONVERTED')).toBe('JOINED_GROUP');
  });

  it('READY_FOR_MEMBERSHIP maps to ATTENDED when present', () => {
    expect(mapOutreachConvertToFollowUpStage('READY_FOR_MEMBERSHIP')).toBe('ATTENDED');
  });

  it('custom entry stage is used for CAPTURED', () => {
    const custom: StageFlagRow[] = [
      {
        key: 'FIRST_TOUCH',
        isEntry: true,
        blocksArchive: false,
        graduatesSla: false,
        isEnabled: true,
      },
      {
        key: 'BELONGING',
        isEntry: false,
        blocksArchive: true,
        graduatesSla: true,
        isEnabled: true,
      },
    ];
    expect(mapOutreachConvertToFollowUpStage('CAPTURED', custom)).toBe('FIRST_TOUCH');
    expect(mapOutreachConvertToFollowUpStage('CONVERTED', custom)).toBe('BELONGING');
  });
});
