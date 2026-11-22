/**
 * Phase 8 — Option C complete contracts: system templates + flags still aligned.
 */
import {
  SIMPLE_VISITOR_PIPELINE_KEY,
  SIMPLE_VISITOR_STAGES,
  SYSTEM_PIPELINE_TEMPLATE_KEYS,
  WINNERS_DEFAULT_PIPELINE_KEY,
  WINNERS_DEFAULT_STAGES,
} from './pipeline-template.seed';
import { entryStageKey, graduatedStageKeys, archiveBlockedStageKeys } from './pipeline-stage-flags';

describe('Pipeline Option C Phase 8 — completion contracts', () => {
  it('ships both system templates', () => {
    expect(SYSTEM_PIPELINE_TEMPLATE_KEYS).toContain(WINNERS_DEFAULT_PIPELINE_KEY);
    expect(SYSTEM_PIPELINE_TEMPLATE_KEYS).toContain(SIMPLE_VISITOR_PIPELINE_KEY);
    expect(WINNERS_DEFAULT_STAGES.length).toBeGreaterThan(SIMPLE_VISITOR_STAGES.length);
  });

  it('default flags still derive entry / archive / graduated', () => {
    expect(entryStageKey()).toBe('NEW_LEAD');
    expect(archiveBlockedStageKeys()).toContain('JOINED_GROUP');
    expect(graduatedStageKeys()).toEqual(
      expect.arrayContaining(['JOINED_GROUP', 'ENLISTED_FOR_BAPTISM']),
    );
  });

  it('simple_visitor is a strict subset of winners keys', () => {
    const winners = new Set(WINNERS_DEFAULT_STAGES.map((s) => s.key));
    for (const s of SIMPLE_VISITOR_STAGES) {
      expect(winners.has(s.key)).toBe(true);
    }
    expect(SIMPLE_VISITOR_STAGES.map((s) => s.key)).not.toContain('ATTENDED');
  });
});
