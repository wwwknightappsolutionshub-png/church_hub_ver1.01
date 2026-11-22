/**
 * Phase 0 — Option C baseline lock (updated Phase 2: keys from winners_default flags, not Prisma enum).
 */
import { FOLLOW_UP_STAGE_ORDER } from './follow-up.constants';
import {
  ASSIGNMENT_SLA_PIPELINE_STAGES,
  GRADUATED_FOLLOW_UP_STAGES,
} from './follow-up-assignment-sla';
import { WINNERS_DEFAULT_STAGES } from './pipeline-template.seed';

describe('Pipeline Option C Phase 0 baseline', () => {
  it('locks winners_default stage order to the Winners default journey', () => {
    expect(FOLLOW_UP_STAGE_ORDER).toEqual([
      'NEW_LEAD',
      'CONTACTED',
      'VISITED',
      'ATTENDED',
      'JOINED_GROUP',
      'ENLISTED_FOR_BAPTISM',
    ]);
    expect(FOLLOW_UP_STAGE_ORDER).toEqual(WINNERS_DEFAULT_STAGES.map((s) => s.key));
    expect(FOLLOW_UP_STAGE_ORDER).toHaveLength(6);
  });

  it('locks SLA active vs graduated stage sets from flags', () => {
    expect(ASSIGNMENT_SLA_PIPELINE_STAGES).toEqual([
      'NEW_LEAD',
      'CONTACTED',
      'VISITED',
      'ATTENDED',
    ]);
    expect(GRADUATED_FOLLOW_UP_STAGES).toEqual(['JOINED_GROUP', 'ENLISTED_FOR_BAPTISM']);
    const overlap = ASSIGNMENT_SLA_PIPELINE_STAGES.filter((s) =>
      GRADUATED_FOLLOW_UP_STAGES.includes(s),
    );
    expect(overlap).toEqual([]);
  });

  it('covers every winners_default stage exactly once across SLA sets', () => {
    const combined = [...ASSIGNMENT_SLA_PIPELINE_STAGES, ...GRADUATED_FOLLOW_UP_STAGES];
    expect([...combined].sort()).toEqual([...FOLLOW_UP_STAGE_ORDER].sort());
  });
});
