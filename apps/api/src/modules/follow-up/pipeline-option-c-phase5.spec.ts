/**
 * Phase 5 — fork + rename + add stage guards (unit-level helpers / key rules).
 */
import {
  WINNERS_DEFAULT_PIPELINE_KEY,
  WINNERS_DEFAULT_STAGES,
} from './pipeline-template.seed';

const STAGE_KEY_RE = /^[A-Z][A-Z0-9_]{1,47}$/;

describe('Pipeline Option C Phase 5 — fork contracts', () => {
  it('winners_default is the fork source template', () => {
    expect(WINNERS_DEFAULT_PIPELINE_KEY).toBe('winners_default');
    expect(WINNERS_DEFAULT_STAGES).toHaveLength(6);
    expect(WINNERS_DEFAULT_STAGES.filter((s) => s.isEntry)).toHaveLength(1);
  });

  it('custom stage keys must be UPPER_SNAKE_CASE', () => {
    expect(STAGE_KEY_RE.test('CUSTOM_TOUCH')).toBe(true);
    expect(STAGE_KEY_RE.test('custom')).toBe(false);
    expect(STAGE_KEY_RE.test('1BAD')).toBe(false);
    expect(STAGE_KEY_RE.test('A')).toBe(false);
  });

  it('fork clone payload mirrors template stage keys', () => {
    const keys = WINNERS_DEFAULT_STAGES.map((s) => s.key);
    expect(keys).toEqual([
      'NEW_LEAD',
      'CONTACTED',
      'VISITED',
      'ATTENDED',
      'JOINED_GROUP',
      'ENLISTED_FOR_BAPTISM',
    ]);
  });
});
