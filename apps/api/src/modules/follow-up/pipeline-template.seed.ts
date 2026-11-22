import type { PrismaClient } from '@prisma/client';

/** System template key for the Winners Chapel default journey (Phase 0 baseline). */
export const WINNERS_DEFAULT_PIPELINE_KEY = 'winners_default';

/** Shorter journey — subset of winners_default keys/labels only (Phase 6). */
export const SIMPLE_VISITOR_PIPELINE_KEY = 'simple_visitor';

export const SYSTEM_PIPELINE_TEMPLATE_KEYS = [
  WINNERS_DEFAULT_PIPELINE_KEY,
  SIMPLE_VISITOR_PIPELINE_KEY,
] as const;

export type PipelineStageSeed = {
  key: string;
  label: string;
  shortLabel: string;
  sortOrder: number;
  phaseKey: string;
  phaseStep: number;
  phaseTitle: string;
  colorToken: string;
  isEntry: boolean;
  blocksArchive: boolean;
  graduatesSla: boolean;
  isEnabled: boolean;
};

/** Exact Phase 0 baseline — do not invent stages here. */
export const WINNERS_DEFAULT_STAGES: PipelineStageSeed[] = [
  {
    key: 'NEW_LEAD',
    label: 'New Contacts',
    shortLabel: 'Fresh',
    sortOrder: 1,
    phaseKey: 'outreach',
    phaseStep: 1,
    phaseTitle: 'Initial Outreach',
    colorToken: 'sky',
    isEntry: true,
    blocksArchive: false,
    graduatesSla: false,
    isEnabled: true,
  },
  {
    key: 'CONTACTED',
    label: 'Contacted',
    shortLabel: 'Contacted',
    sortOrder: 2,
    phaseKey: 'outreach',
    phaseStep: 1,
    phaseTitle: 'Initial Outreach',
    colorToken: 'sky',
    isEntry: false,
    blocksArchive: false,
    graduatesSla: false,
    isEnabled: true,
  },
  {
    key: 'VISITED',
    label: 'Attended Service',
    shortLabel: 'Service',
    sortOrder: 3,
    phaseKey: 'engagement',
    phaseStep: 2,
    phaseTitle: 'Growing Engagement',
    colorToken: 'amber',
    isEntry: false,
    blocksArchive: false,
    graduatesSla: false,
    isEnabled: true,
  },
  {
    key: 'ATTENDED',
    label: 'Engrafted In WSF',
    shortLabel: 'WSF',
    sortOrder: 4,
    phaseKey: 'engagement',
    phaseStep: 2,
    phaseTitle: 'Growing Engagement',
    colorToken: 'amber',
    isEntry: false,
    blocksArchive: false,
    graduatesSla: false,
    isEnabled: true,
  },
  {
    key: 'JOINED_GROUP',
    label: 'Joined Group',
    shortLabel: 'Joined',
    sortOrder: 5,
    phaseKey: 'belonging',
    phaseStep: 3,
    phaseTitle: 'Belonging & Discipleship',
    colorToken: 'emerald',
    isEntry: false,
    blocksArchive: true,
    graduatesSla: true,
    isEnabled: true,
  },
  {
    key: 'ENLISTED_FOR_BAPTISM',
    label: 'Enlisted for Baptism',
    shortLabel: 'Baptism',
    sortOrder: 6,
    phaseKey: 'belonging',
    phaseStep: 3,
    phaseTitle: 'Belonging & Discipleship',
    colorToken: 'violet',
    isEntry: false,
    blocksArchive: false,
    graduatesSla: true,
    isEnabled: true,
  },
];

/** Keys from winners_default only — no new stage inventions in Phase 6. */
export const SIMPLE_VISITOR_STAGE_KEYS = [
  'NEW_LEAD',
  'CONTACTED',
  'VISITED',
  'JOINED_GROUP',
] as const;

export const SIMPLE_VISITOR_STAGES: PipelineStageSeed[] = WINNERS_DEFAULT_STAGES.filter(
  (s) => (SIMPLE_VISITOR_STAGE_KEYS as readonly string[]).includes(s.key),
).map((s, idx) => ({ ...s, sortOrder: idx + 1 }));

async function upsertTemplateWithStages(
  prisma: PrismaClient,
  opts: {
    key: string;
    name: string;
    description: string;
    stages: PipelineStageSeed[];
  },
): Promise<{ id: string; key: string; version: number; stageCount: number }> {
  const template = await prisma.pipelineTemplate.upsert({
    where: { key: opts.key },
    update: {
      name: opts.name,
      description: opts.description,
      isSystem: true,
    },
    create: {
      key: opts.key,
      name: opts.name,
      description: opts.description,
      version: 1,
      isSystem: true,
    },
  });

  for (const stage of opts.stages) {
    // Do not clobber labels/flags on update — Phase 7 bumps must persist across ensure*() calls.
    // Re-seed from scratch only via explicit bump/admin tools or a dedicated reset.
    await prisma.pipelineTemplateStage.upsert({
      where: {
        templateId_key: { templateId: template.id, key: stage.key },
      },
      update: {},
      create: {
        templateId: template.id,
        ...stage,
      },
    });
  }

  const stageCount = await prisma.pipelineTemplateStage.count({
    where: { templateId: template.id },
  });

  return {
    id: template.id,
    key: template.key,
    version: template.version,
    stageCount,
  };
}

/**
 * Idempotent upsert of `winners_default` template + stages.
 * Safe to re-run from seed or Phase 1 QA scripts.
 */
export async function ensureWinnersDefaultPipelineTemplate(
  prisma: PrismaClient,
): Promise<{ id: string; key: string; version: number; stageCount: number }> {
  return upsertTemplateWithStages(prisma, {
    key: WINNERS_DEFAULT_PIPELINE_KEY,
    name: 'Winners Chapel Default',
    description:
      'Default membership pipeline: New Contact → Contacted → Attended Service → Engrafted In WSF → Joined Group → Enlisted for Baptism',
    stages: WINNERS_DEFAULT_STAGES,
  });
}

/** Idempotent upsert of `simple_visitor` (4-stage subset of winners keys). */
export async function ensureSimpleVisitorPipelineTemplate(
  prisma: PrismaClient,
): Promise<{ id: string; key: string; version: number; stageCount: number }> {
  return upsertTemplateWithStages(prisma, {
    key: SIMPLE_VISITOR_PIPELINE_KEY,
    name: 'Simple Visitor',
    description:
      'Shorter membership pipeline: New Contact → Contacted → Attended Service → Joined Group',
    stages: SIMPLE_VISITOR_STAGES,
  });
}

/** Ensure all Phase 6 system templates exist. */
export async function ensureSystemPipelineTemplates(prisma: PrismaClient) {
  const winners = await ensureWinnersDefaultPipelineTemplate(prisma);
  const simple = await ensureSimpleVisitorPipelineTemplate(prisma);
  return { winners, simple };
}

/**
 * Force-rewrite a system template from seed (labels + prune extra stages).
 * Used by Phase 8 regression / admin repair after QA bumps.
 */
export async function resyncSystemPipelineTemplateFromSeed(
  prisma: PrismaClient,
  templateKey: string,
): Promise<{ id: string; key: string; version: number; stageCount: number }> {
  const catalog: Record<
    string,
    { name: string; description: string; stages: PipelineStageSeed[] }
  > = {
    [WINNERS_DEFAULT_PIPELINE_KEY]: {
      name: 'Winners Chapel Default',
      description:
        'Default membership pipeline: New Contact → Contacted → Attended Service → Engrafted In WSF → Joined Group → Enlisted for Baptism',
      stages: WINNERS_DEFAULT_STAGES,
    },
    [SIMPLE_VISITOR_PIPELINE_KEY]: {
      name: 'Simple Visitor',
      description:
        'Shorter membership pipeline: New Contact → Contacted → Attended Service → Joined Group',
      stages: SIMPLE_VISITOR_STAGES,
    },
  };
  const spec = catalog[templateKey];
  if (!spec) {
    throw new Error(`Unknown system template for resync: ${templateKey}`);
  }

  const template = await prisma.pipelineTemplate.upsert({
    where: { key: templateKey },
    update: {
      name: spec.name,
      description: spec.description,
      isSystem: true,
      version: 1,
    },
    create: {
      key: templateKey,
      name: spec.name,
      description: spec.description,
      version: 1,
      isSystem: true,
    },
  });

  const keep = new Set(spec.stages.map((s) => s.key));
  await prisma.pipelineTemplateStage.deleteMany({
    where: { templateId: template.id, key: { notIn: [...keep] } },
  });

  for (const stage of spec.stages) {
    await prisma.pipelineTemplateStage.upsert({
      where: { templateId_key: { templateId: template.id, key: stage.key } },
      update: { ...stage },
      create: { templateId: template.id, ...stage },
    });
  }

  const stageCount = await prisma.pipelineTemplateStage.count({
    where: { templateId: template.id },
  });
  return { id: template.id, key: template.key, version: 1, stageCount };
}

export const PREFERRED_PIPELINE_TEMPLATE_SETTINGS_KEY = 'preferredPipelineTemplateKey';
