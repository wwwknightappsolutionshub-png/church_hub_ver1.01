/**
 * Phase 1 — Option C: winners_default seed shape + resolve mapping (unit, no DB).
 */
import {
  WINNERS_DEFAULT_PIPELINE_KEY,
  WINNERS_DEFAULT_STAGES,
} from './pipeline-template.seed';
import { FOLLOW_UP_STAGE_ORDER } from './follow-up.constants';

describe('Pipeline Option C Phase 1', () => {
  it('seeds winners_default keys in Phase 0 order', () => {
    expect(WINNERS_DEFAULT_PIPELINE_KEY).toBe('winners_default');
    expect(WINNERS_DEFAULT_STAGES.map((s) => s.key)).toEqual([...FOLLOW_UP_STAGE_ORDER]);
  });

  it('marks NEW_LEAD as entry and JOINED_GROUP as blocksArchive', () => {
    const entry = WINNERS_DEFAULT_STAGES.filter((s) => s.isEntry);
    expect(entry).toHaveLength(1);
    expect(entry[0].key).toBe('NEW_LEAD');

    const blocked = WINNERS_DEFAULT_STAGES.filter((s) => s.blocksArchive);
    expect(blocked.map((s) => s.key)).toEqual(['JOINED_GROUP']);
  });

  it('marks graduated SLA stages per Phase 0 baseline', () => {
    const graduated = WINNERS_DEFAULT_STAGES.filter((s) => s.graduatesSla).map((s) => s.key);
    expect(graduated).toEqual(['JOINED_GROUP', 'ENLISTED_FOR_BAPTISM']);
  });

  it('groups into three phases with expected titles', () => {
    const phases = new Map<string, { step: number; title: string; keys: string[] }>();
    for (const s of WINNERS_DEFAULT_STAGES) {
      const cur = phases.get(s.phaseKey) ?? { step: s.phaseStep, title: s.phaseTitle, keys: [] };
      cur.keys.push(s.key);
      phases.set(s.phaseKey, cur);
    }
    expect([...phases.keys()]).toEqual(['outreach', 'engagement', 'belonging']);
    expect(phases.get('outreach')?.title).toBe('Initial Outreach');
    expect(phases.get('engagement')?.title).toBe('Growing Engagement');
    expect(phases.get('belonging')?.title).toBe('Belonging & Discipleship');
    expect(phases.get('outreach')?.keys).toEqual(['NEW_LEAD', 'CONTACTED']);
    expect(phases.get('engagement')?.keys).toEqual(['VISITED', 'ATTENDED']);
    expect(phases.get('belonging')?.keys).toEqual(['JOINED_GROUP', 'ENLISTED_FOR_BAPTISM']);
  });
});
