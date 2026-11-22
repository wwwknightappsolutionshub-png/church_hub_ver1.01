/**
 * Phase 6 — simple_visitor is a subset of winners keys; system catalog has both templates.
 */
import {
  SIMPLE_VISITOR_PIPELINE_KEY,
  SIMPLE_VISITOR_STAGE_KEYS,
  SIMPLE_VISITOR_STAGES,
  SYSTEM_PIPELINE_TEMPLATE_KEYS,
  WINNERS_DEFAULT_PIPELINE_KEY,
  WINNERS_DEFAULT_STAGES,
} from './pipeline-template.seed';

describe('Pipeline Option C Phase 6 — extra templates', () => {
  it('catalog includes winners_default and simple_visitor', () => {
    expect(SYSTEM_PIPELINE_TEMPLATE_KEYS).toEqual([
      WINNERS_DEFAULT_PIPELINE_KEY,
      SIMPLE_VISITOR_PIPELINE_KEY,
    ]);
  });

  it('simple_visitor uses only winners_default keys/labels (no inventions)', () => {
    const winnersKeys = new Set(WINNERS_DEFAULT_STAGES.map((s) => s.key));
    expect([...SIMPLE_VISITOR_STAGE_KEYS].every((k) => winnersKeys.has(k))).toBe(true);
    expect(SIMPLE_VISITOR_STAGES).toHaveLength(4);
    expect(SIMPLE_VISITOR_STAGES.map((s) => s.key)).toEqual([
      'NEW_LEAD',
      'CONTACTED',
      'VISITED',
      'JOINED_GROUP',
    ]);
    for (const stage of SIMPLE_VISITOR_STAGES) {
      const base = WINNERS_DEFAULT_STAGES.find((s) => s.key === stage.key)!;
      expect(stage.label).toBe(base.label);
      expect(stage.shortLabel).toBe(base.shortLabel);
      expect(stage.isEntry).toBe(base.isEntry);
      expect(stage.blocksArchive).toBe(base.blocksArchive);
      expect(stage.graduatesSla).toBe(base.graduatesSla);
    }
  });

  it('simple_visitor is shorter than winners_default', () => {
    expect(SIMPLE_VISITOR_STAGES.length).toBeLessThan(WINNERS_DEFAULT_STAGES.length);
  });
});
