import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.module';
import {
  PREFERRED_PIPELINE_TEMPLATE_SETTINGS_KEY,
  SYSTEM_PIPELINE_TEMPLATE_KEYS,
  ensureSystemPipelineTemplates,
  resyncSystemPipelineTemplateFromSeed,
} from './pipeline-template.seed';
import {
  PipelineResolveService,
  type ResolvedPipeline,
} from './pipeline-resolve.service';
import {
  classifyRemoved,
  diffPipelineStages,
  type PipelineDiffResult,
  type StageSnapshot,
} from './pipeline-diff';
import {
  assertLabel,
  assertOptionalPhaseFields,
  assertPipelineQaToolsEnabled,
  assertStageKey,
} from './pipeline-stage-validation';

export const PIPELINE_FORK_SNAPSHOT_KEY = 'pipelineForkSnapshot';
export const PIPELINE_UPDATE_DISMISSED_KEY = 'pipelineUpdateDismissed';

type ForkSnapshot = {
  templateKey: string;
  version: number;
  stageKeys: string[];
};

type DismissedUpdate = {
  templateKey: string;
  version: number;
};

function asRecord(settings: unknown): Record<string, unknown> {
  if (settings && typeof settings === 'object' && !Array.isArray(settings)) {
    return { ...(settings as Record<string, unknown>) };
  }
  return {};
}

function readSnapshot(settings: unknown): ForkSnapshot | null {
  const raw = asRecord(settings)[PIPELINE_FORK_SNAPSHOT_KEY];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.templateKey !== 'string' || typeof o.version !== 'number') return null;
  const stageKeys = Array.isArray(o.stageKeys)
    ? o.stageKeys.filter((k): k is string => typeof k === 'string')
    : [];
  return { templateKey: o.templateKey, version: o.version, stageKeys };
}

function readDismissed(settings: unknown): DismissedUpdate | null {
  const raw = asRecord(settings)[PIPELINE_UPDATE_DISMISSED_KEY];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.templateKey !== 'string' || typeof o.version !== 'number') return null;
  return { templateKey: o.templateKey, version: o.version };
}

function toSnapshot(s: {
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
}): StageSnapshot {
  return {
    key: s.key,
    label: s.label,
    shortLabel: s.shortLabel,
    sortOrder: s.sortOrder,
    phaseKey: s.phaseKey,
    phaseStep: s.phaseStep,
    phaseTitle: s.phaseTitle,
    colorToken: s.colorToken,
    isEntry: s.isEntry,
    blocksArchive: s.blocksArchive,
    graduatesSla: s.graduatesSla,
    isEnabled: s.isEnabled,
  };
}

export type PipelineUpdatesPayload = {
  updatesAvailable: boolean;
  forked: boolean;
  templateKey: string | null;
  forkedFromVersion: number | null;
  templateVersion: number | null;
  dismissedVersion: number | null;
  diff: PipelineDiffResult | null;
};

@Injectable()
export class PipelineMergeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resolve: PipelineResolveService,
  ) {}

  async getUpdates(churchId: string): Promise<PipelineUpdatesPayload> {
    await ensureSystemPipelineTemplates(this.prisma);
    const church = await this.prisma.church.findFirst({
      where: { id: churchId },
      select: { settings: true },
    });
    if (!church) throw new NotFoundException('Church not found');

    const definition = await this.prisma.pipelineDefinition.findFirst({
      where: { churchId, isActive: true },
      include: {
        stages: { orderBy: { sortOrder: 'asc' } },
        template: { include: { stages: { orderBy: { sortOrder: 'asc' } } } },
      },
    });

    if (!definition?.template) {
      return {
        updatesAvailable: false,
        forked: false,
        templateKey: null,
        forkedFromVersion: null,
        templateVersion: null,
        dismissedVersion: null,
        diff: null,
      };
    }

    const template = definition.template;
    const forkedFromVersion = definition.forkedFromVersion ?? 0;
    const dismissed = readDismissed(church.settings);
    const dismissedVersion =
      dismissed?.templateKey === template.key ? dismissed.version : null;
    const updatesAvailable =
      template.version > forkedFromVersion && dismissedVersion !== template.version;

    const snapshot = readSnapshot(church.settings);
    let diff = diffPipelineStages(
      definition.stages.map(toSnapshot),
      template.stages.map(toSnapshot),
    );
    if (snapshot?.stageKeys?.length) {
      diff = classifyRemoved(diff, snapshot.stageKeys);
      // removed stages that are also "custom" after classify — add conflict if in use later at merge
    }

    return {
      updatesAvailable,
      forked: true,
      templateKey: template.key,
      forkedFromVersion,
      templateVersion: template.version,
      dismissedVersion,
      diff,
    };
  }

  async dismissUpdates(churchId: string): Promise<PipelineUpdatesPayload> {
    const updates = await this.getUpdates(churchId);
    if (!updates.forked || updates.templateKey == null || updates.templateVersion == null) {
      throw new BadRequestException('No forked pipeline to dismiss updates for');
    }
    await this.resolve.mergeChurchSettings(churchId, {
      [PIPELINE_UPDATE_DISMISSED_KEY]: {
        templateKey: updates.templateKey,
        version: updates.templateVersion,
      },
    });
    return this.getUpdates(churchId);
  }

  /**
   * Merge template into church definition.
   * - added → create
   * - custom → preserve
   * - removed → disable if unused; conflict if contacts still on stage
   * - changed → require resolveConflicts[key] = keep_church | take_template (default keep_church)
   */
  async merge(
    churchId: string,
    resolveConflicts: Record<string, 'keep_church' | 'take_template'> = {},
  ): Promise<{ pipeline: ResolvedPipeline; updates: PipelineUpdatesPayload; applied: string[] }> {
    const updates = await this.getUpdates(churchId);
    if (!updates.forked || !updates.diff || !updates.templateKey) {
      throw new BadRequestException('Fork a pipeline before merging template updates');
    }
    if (!updates.updatesAvailable && updates.templateVersion === updates.forkedFromVersion) {
      // Allow merge even if dismissed, as long as versions differ or diff has work
    }

    const definition = await this.prisma.pipelineDefinition.findFirst({
      where: { churchId, isActive: true },
      include: {
        stages: true,
        template: { include: { stages: { orderBy: { sortOrder: 'asc' } } } },
      },
    });
    if (!definition?.template) {
      throw new BadRequestException('Active definition with template required');
    }

    const applied: string[] = [];
    const diff = updates.diff;

    for (const stage of diff.added) {
      await this.prisma.pipelineStage.create({
        data: {
          definitionId: definition.id,
          key: stage.key,
          label: stage.label,
          shortLabel: stage.shortLabel,
          sortOrder: stage.sortOrder,
          phaseKey: stage.phaseKey,
          phaseStep: stage.phaseStep,
          phaseTitle: stage.phaseTitle,
          colorToken: stage.colorToken,
          isEntry: false, // never steal entry on add; entry stays on church
          blocksArchive: stage.blocksArchive,
          graduatesSla: stage.graduatesSla,
          isEnabled: stage.isEnabled,
        },
      });
      applied.push(`added:${stage.key}`);
    }

    for (const stage of diff.removed) {
      const inUse = await this.prisma.followUp.count({
        where: { churchId, stage: stage.key, archivedAt: null },
      });
      if (inUse > 0) {
        throw new BadRequestException(
          `Cannot remove stage "${stage.key}" — ${inUse} active contact(s) still use it`,
        );
      }
      const row = definition.stages.find((s) => s.key === stage.key);
      if (row) {
        await this.prisma.pipelineStage.update({
          where: { id: row.id },
          data: { isEnabled: false },
        });
        applied.push(`disabled:${stage.key}`);
      }
    }

    for (const change of diff.changed) {
      const choice = resolveConflicts[change.key] ?? 'keep_church';
      if (choice === 'keep_church') {
        applied.push(`kept:${change.key}`);
        continue;
      }
      if (change.church.isEntry && !change.template.isEntry) {
        // keep church as entry if template tries to clear entry on this key
        await this.prisma.pipelineStage.updateMany({
          where: { definitionId: definition.id, key: change.key },
          data: {
            label: change.template.label,
            shortLabel: change.template.shortLabel,
            sortOrder: change.template.sortOrder,
            phaseKey: change.template.phaseKey,
            phaseStep: change.template.phaseStep,
            phaseTitle: change.template.phaseTitle,
            colorToken: change.template.colorToken,
            blocksArchive: change.template.blocksArchive,
            graduatesSla: change.template.graduatesSla,
            isEnabled: change.template.isEnabled,
            isEntry: true,
          },
        });
      } else {
        if (change.template.isEntry) {
          await this.prisma.pipelineStage.updateMany({
            where: { definitionId: definition.id, isEntry: true },
            data: { isEntry: false },
          });
        }
        await this.prisma.pipelineStage.updateMany({
          where: { definitionId: definition.id, key: change.key },
          data: {
            label: change.template.label,
            shortLabel: change.template.shortLabel,
            sortOrder: change.template.sortOrder,
            phaseKey: change.template.phaseKey,
            phaseStep: change.template.phaseStep,
            phaseTitle: change.template.phaseTitle,
            colorToken: change.template.colorToken,
            isEntry: change.template.isEntry,
            blocksArchive: change.template.blocksArchive,
            graduatesSla: change.template.graduatesSla,
            isEnabled: change.template.isEnabled,
          },
        });
      }
      applied.push(`took_template:${change.key}`);
    }

    // custom stages preserved implicitly

    await this.prisma.pipelineDefinition.update({
      where: { id: definition.id },
      data: { forkedFromVersion: definition.template.version },
    });

    await this.resolve.mergeChurchSettings(churchId, {
      [PIPELINE_FORK_SNAPSHOT_KEY]: {
        templateKey: definition.template.key,
        version: definition.template.version,
        stageKeys: definition.template.stages.map((s) => s.key),
      },
      [PIPELINE_UPDATE_DISMISSED_KEY]: undefined,
      [PREFERRED_PIPELINE_TEMPLATE_SETTINGS_KEY]: definition.template.key,
    });

    // Ensure the definition we merged is still the active one (guards parallel discard races in tests).
    const stillActive = await this.prisma.pipelineDefinition.findFirst({
      where: { id: definition.id, isActive: true },
      select: { id: true },
    });
    if (!stillActive) {
      throw new BadRequestException(
        'Church definition was deactivated during merge — retry after re-forking',
      );
    }

    const pipeline = await this.resolve.resolveForChurch(churchId);
    if (pipeline.source !== 'definition') {
      throw new BadRequestException('Merge completed but resolve did not return a church definition');
    }
    const nextUpdates = await this.getUpdates(churchId);
    return { pipeline, updates: nextUpdates, applied };
  }

  /**
   * Rewrite system template stages from seed (prune QA bumps).
   * Requires PIPELINE_QA_TOOLS=true — mutates shared templates (cross-tenant).
   */
  async resyncTemplate(templateKey: string) {
    assertPipelineQaToolsEnabled();
    if (!(SYSTEM_PIPELINE_TEMPLATE_KEYS as readonly string[]).includes(templateKey)) {
      throw new BadRequestException(`Unknown system template: ${templateKey}`);
    }
    return resyncSystemPipelineTemplateFromSeed(this.prisma, templateKey);
  }

  /**
   * Bump system template version and optionally upsert stages (product update / QA).
   * Requires PIPELINE_QA_TOOLS=true — mutates shared templates (cross-tenant).
   */
  async bumpTemplate(
    templateKey: string,
    opts?: {
      name?: string;
      description?: string;
      stages?: Array<Partial<StageSnapshot> & { key: string }>;
    },
  ) {
    assertPipelineQaToolsEnabled();
    if (!(SYSTEM_PIPELINE_TEMPLATE_KEYS as readonly string[]).includes(templateKey)) {
      throw new BadRequestException(`Unknown system template: ${templateKey}`);
    }

    await ensureSystemPipelineTemplates(this.prisma);
    const template = await this.prisma.pipelineTemplate.findUnique({
      where: { key: templateKey },
      include: { stages: true },
    });
    if (!template) throw new NotFoundException(`Template not found: ${templateKey}`);

    let name: string | undefined;
    if (opts?.name !== undefined) {
      name = opts.name.trim();
      if (!name || name.length > 80) {
        throw new BadRequestException('Template name must be 1–80 characters');
      }
    }
    let description: string | undefined;
    if (opts?.description !== undefined) {
      description = opts.description.trim();
      if (description.length > 500) {
        throw new BadRequestException('description must be at most 500 characters');
      }
    }

    const nextVersion = template.version + 1;
    await this.prisma.pipelineTemplate.update({
      where: { id: template.id },
      data: {
        version: nextVersion,
        ...(name ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
      },
    });

    for (const stage of opts?.stages ?? []) {
      const stageKey = assertStageKey(stage.key);
      const existing = template.stages.find((s) => s.key === stageKey);
      const phase = assertOptionalPhaseFields({
        phaseKey: stage.phaseKey,
        phaseStep: stage.phaseStep,
        phaseTitle: stage.phaseTitle,
        colorToken: stage.colorToken,
      });
      if (stage.sortOrder !== undefined) {
        if (!Number.isInteger(stage.sortOrder) || stage.sortOrder < 1 || stage.sortOrder > 999) {
          throw new BadRequestException('sortOrder must be an integer from 1–999');
        }
      }

      if (existing) {
        await this.prisma.pipelineTemplateStage.update({
          where: { id: existing.id },
          data: {
            ...(stage.label !== undefined ? { label: assertLabel(stage.label, 'label') } : {}),
            ...(stage.shortLabel !== undefined
              ? { shortLabel: assertLabel(stage.shortLabel, 'shortLabel') }
              : {}),
            ...(stage.sortOrder !== undefined ? { sortOrder: stage.sortOrder } : {}),
            ...phase,
            ...(stage.isEntry !== undefined ? { isEntry: stage.isEntry } : {}),
            ...(stage.blocksArchive !== undefined ? { blocksArchive: stage.blocksArchive } : {}),
            ...(stage.graduatesSla !== undefined ? { graduatesSla: stage.graduatesSla } : {}),
            ...(stage.isEnabled !== undefined ? { isEnabled: stage.isEnabled } : {}),
          },
        });
      } else {
        const lastOrder = Math.max(0, ...template.stages.map((s) => s.sortOrder));
        const label = stage.label
          ? assertLabel(stage.label, 'label')
          : stageKey;
        const shortLabel = stage.shortLabel
          ? assertLabel(stage.shortLabel, 'shortLabel')
          : label.slice(0, 40);
        const createPhase = assertOptionalPhaseFields({
          phaseKey: stage.phaseKey ?? 'custom',
          phaseStep: stage.phaseStep ?? 9,
          phaseTitle: stage.phaseTitle ?? 'Updates',
          colorToken: stage.colorToken ?? 'sky',
        });
        await this.prisma.pipelineTemplateStage.create({
          data: {
            templateId: template.id,
            key: stageKey,
            label,
            shortLabel,
            sortOrder: stage.sortOrder ?? lastOrder + 1,
            phaseKey: createPhase.phaseKey!,
            phaseStep: createPhase.phaseStep!,
            phaseTitle: createPhase.phaseTitle!,
            colorToken: createPhase.colorToken ?? 'sky',
            isEntry: stage.isEntry ?? false,
            blocksArchive: stage.blocksArchive ?? false,
            graduatesSla: stage.graduatesSla ?? false,
            isEnabled: stage.isEnabled ?? true,
          },
        });
      }
    }

    const refreshed = await this.prisma.pipelineTemplate.findUniqueOrThrow({
      where: { id: template.id },
      include: { stages: { orderBy: { sortOrder: 'asc' } } },
    });
    return {
      key: refreshed.key,
      version: refreshed.version,
      stageKeys: refreshed.stages.map((s) => s.key),
      stages: refreshed.stages.map(toSnapshot),
    };
  }
}
