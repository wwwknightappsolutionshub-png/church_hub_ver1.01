/**
 * Phase 7 — diff helpers: added / changed / custom / removed classification.
 */
import { classifyRemoved, diffPipelineStages, type StageSnapshot } from './pipeline-diff';

function snap(partial: Partial<StageSnapshot> & { key: string; label: string }): StageSnapshot {
  return {
    shortLabel: partial.shortLabel ?? partial.label,
    sortOrder: partial.sortOrder ?? 1,
    phaseKey: partial.phaseKey ?? 'outreach',
    phaseStep: partial.phaseStep ?? 1,
    phaseTitle: partial.phaseTitle ?? 'Initial Outreach',
    colorToken: partial.colorToken ?? 'sky',
    isEntry: partial.isEntry ?? false,
    blocksArchive: partial.blocksArchive ?? false,
    graduatesSla: partial.graduatesSla ?? false,
    isEnabled: partial.isEnabled ?? true,
    ...partial,
  };
}

describe('Pipeline Option C Phase 7 — diff', () => {
  it('detects added, changed, and custom stages', () => {
    const church = [
      snap({ key: 'NEW_LEAD', label: 'Fresh Leads', isEntry: true }),
      snap({ key: 'CUSTOM_TOUCH', label: 'Custom touch' }),
    ];
    const template = [
      snap({ key: 'NEW_LEAD', label: 'New Contacts', isEntry: true }),
      snap({ key: 'CONTACTED', label: 'Contacted', sortOrder: 2 }),
    ];
    const diff = diffPipelineStages(church, template);
    expect(diff.added.map((s) => s.key)).toEqual(['CONTACTED']);
    expect(diff.custom.map((s) => s.key)).toEqual(['CUSTOM_TOUCH']);
    expect(diff.changed.map((c) => c.key)).toEqual(['NEW_LEAD']);
    expect(diff.conflicts.map((c) => c.key)).toEqual(['NEW_LEAD']);
  });

  it('classifyRemoved moves prior template keys out of custom', () => {
    const church = [
      snap({ key: 'NEW_LEAD', label: 'New Contacts', isEntry: true }),
      snap({ key: 'OLD_STAGE', label: 'Old' }),
      snap({ key: 'CUSTOM_TOUCH', label: 'Custom' }),
    ];
    const template = [snap({ key: 'NEW_LEAD', label: 'New Contacts', isEntry: true })];
    const base = diffPipelineStages(church, template);
    const refined = classifyRemoved(base, ['NEW_LEAD', 'OLD_STAGE']);
    expect(refined.removed.map((s) => s.key)).toEqual(['OLD_STAGE']);
    expect(refined.custom.map((s) => s.key)).toEqual(['CUSTOM_TOUCH']);
  });
});
