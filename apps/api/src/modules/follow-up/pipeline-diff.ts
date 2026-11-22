/** Pure diff helpers for church definition vs system template (Phase 7). */

export type StageSnapshot = {
  key: string;
  label: string;
  shortLabel: string;
  sortOrder: number;
  phaseKey: string;
  phaseStep: number;
  phaseTitle: string;
  colorToken: string | null;
  isEntry: boolean;
  blocksArchive: boolean;
  graduatesSla: boolean;
  isEnabled: boolean;
};

export type StageFieldChange = {
  field: keyof Omit<StageSnapshot, 'key'>;
  from: string | number | boolean | null;
  to: string | number | boolean | null;
};

export type PipelineDiffResult = {
  added: StageSnapshot[];
  removed: StageSnapshot[];
  changed: Array<{ key: string; church: StageSnapshot; template: StageSnapshot; fields: StageFieldChange[] }>;
  custom: StageSnapshot[];
  conflicts: Array<{ key: string; reason: string; church: StageSnapshot; template: StageSnapshot | null }>;
};

const COMPARE_FIELDS: Array<keyof Omit<StageSnapshot, 'key'>> = [
  'label',
  'shortLabel',
  'sortOrder',
  'phaseKey',
  'phaseStep',
  'phaseTitle',
  'colorToken',
  'isEntry',
  'blocksArchive',
  'graduatesSla',
  'isEnabled',
];

export function stageFieldDiffs(
  church: StageSnapshot,
  template: StageSnapshot,
): StageFieldChange[] {
  const fields: StageFieldChange[] = [];
  for (const field of COMPARE_FIELDS) {
    if (church[field] !== template[field]) {
      fields.push({ field, from: church[field], to: template[field] });
    }
  }
  return fields;
}

/**
 * Diff church stages vs current template stages.
 * - added: on template, missing from church
 * - removed: on church and was a template key historically (passed as templateKeysNow ∪ knownSystemKeys), not custom
 * - custom: on church, never on template (not in templateKeySet)
 * - changed: same key, field differences → also listed as conflicts (church diverged from template)
 */
export function diffPipelineStages(
  churchStages: StageSnapshot[],
  templateStages: StageSnapshot[],
): PipelineDiffResult {
  const churchMap = new Map(churchStages.map((s) => [s.key, s]));
  const templateMap = new Map(templateStages.map((s) => [s.key, s]));

  const added: StageSnapshot[] = [];
  const removed: StageSnapshot[] = [];
  const custom: StageSnapshot[] = [];
  const changed: PipelineDiffResult['changed'] = [];
  const conflicts: PipelineDiffResult['conflicts'] = [];

  for (const t of templateStages) {
    const c = churchMap.get(t.key);
    if (!c) {
      added.push(t);
      continue;
    }
    const fields = stageFieldDiffs(c, t);
    if (fields.length) {
      changed.push({ key: t.key, church: c, template: t, fields });
      conflicts.push({
        key: t.key,
        reason: 'Church stage differs from template — choose keep church or take template',
        church: c,
        template: t,
      });
    }
  }

  for (const c of churchStages) {
    if (templateMap.has(c.key)) continue;
    // Present only on church → treat as custom (preserved on merge).
    // If product removed a system stage, it still shows as custom/removed-from-template
    // via `removed` when caller marks it; here we classify as custom for preservation.
    custom.push(c);
  }

  // Stages that exist on an older template snapshot aren't available; "removed"
  // means: was on template before and gone now. Callers may pass previous keys.
  // Without previous snapshot, removed stays empty unless we infer from custom
  // keys that match known system keys no longer on template — left empty here;
  // `markRemovedKeys` can refine.
  void removed;

  return { added, removed, changed, custom, conflicts };
}

/** Mark church-only stages whose keys appear in `priorTemplateKeys` as removed (not custom). */
export function classifyRemoved(
  diff: PipelineDiffResult,
  priorTemplateKeys: string[],
): PipelineDiffResult {
  const prior = new Set(priorTemplateKeys);
  const removed: StageSnapshot[] = [];
  const custom: StageSnapshot[] = [];
  for (const s of diff.custom) {
    if (prior.has(s.key)) removed.push(s);
    else custom.push(s);
  }
  return { ...diff, removed, custom };
}
