import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.module';
import {
  PREFERRED_PIPELINE_TEMPLATE_SETTINGS_KEY,
  SYSTEM_PIPELINE_TEMPLATE_KEYS,
  WINNERS_DEFAULT_PIPELINE_KEY,
  ensureSystemPipelineTemplates,
} from './pipeline-template.seed';
import {
  PipelineResolveService,
  type ResolvedPipeline,
} from './pipeline-resolve.service';
import { PIPELINE_FORK_SNAPSHOT_KEY, PIPELINE_UPDATE_DISMISSED_KEY } from './pipeline-merge.service';
import {
  assertLabel,
  assertOptionalPhaseFields,
  assertStageKey,
} from './pipeline-stage-validation';

export type PipelineTemplateSummary = {
  key: string;
  name: string;
  description: string | null;
  version: number;
  stageCount: number;
  stageKeys: string[];
  isPreferred: boolean;
};

/** Church-facing stage PATCH — labels only (structure/flags via add-stage / product templates). */
export type PatchStageInput = {
  label?: string;
  shortLabel?: string;
};

export type AddStageInput = {
  key: string;
  label: string;
  shortLabel?: string;
  sortOrder?: number;
  phaseKey?: string;
  phaseStep?: number;
  phaseTitle?: string;
  colorToken?: string | null;
  isEntry?: boolean;
  isEnabled?: boolean;
};

@Injectable()
export class PipelineDefinitionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resolve: PipelineResolveService,
  ) {}

  async listTemplates(churchId: string): Promise<{
    preferredTemplateKey: string;
    forked: boolean;
    templates: PipelineTemplateSummary[];
  }> {
    await ensureSystemPipelineTemplates(this.prisma);
    const church = await this.prisma.church.findFirst({
      where: { id: churchId },
      select: { settings: true },
    });
    if (!church) throw new NotFoundException('Church not found');

    const preferred = this.resolve.getPreferredTemplateKey(church.settings);
    const forked = !!(await this.prisma.pipelineDefinition.findFirst({
      where: { churchId, isActive: true },
      select: { id: true },
    }));

    const rows = await this.prisma.pipelineTemplate.findMany({
      where: { key: { in: [...SYSTEM_PIPELINE_TEMPLATE_KEYS] } },
      include: { stages: { orderBy: { sortOrder: 'asc' }, select: { key: true } } },
      orderBy: { key: 'asc' },
    });

    return {
      preferredTemplateKey: preferred,
      forked,
      templates: rows.map((t) => ({
        key: t.key,
        name: t.name,
        description: t.description,
        version: t.version,
        stageCount: t.stages.length,
        stageKeys: t.stages.map((s) => s.key),
        isPreferred: t.key === preferred,
      })),
    };
  }

  /**
   * Set base system template used by resolve before fork.
   * Rejected when an active church definition already exists.
   */
  async setBaseTemplate(churchId: string, templateKey: string): Promise<ResolvedPipeline> {
    const key = (templateKey ?? '').trim();
    if (!(SYSTEM_PIPELINE_TEMPLATE_KEYS as readonly string[]).includes(key)) {
      throw new BadRequestException(`Unknown system template: ${key}`);
    }

    const active = await this.prisma.pipelineDefinition.findFirst({
      where: { churchId, isActive: true },
      select: { id: true },
    });
    if (active) {
      throw new BadRequestException(
        'Discard the church definition before switching the base system template',
      );
    }

    await ensureSystemPipelineTemplates(this.prisma);
    await this.resolve.mergeChurchSettings(churchId, {
      [PREFERRED_PIPELINE_TEMPLATE_SETTINGS_KEY]: key,
    });
    return this.resolve.resolveForChurch(churchId);
  }

  /** Deactivate active definition so the church can pick a base template again. */
  async discardDefinition(churchId: string): Promise<ResolvedPipeline> {
    const active = await this.prisma.pipelineDefinition.findMany({
      where: { churchId, isActive: true },
      select: { id: true },
    });
    if (active.length) {
      await this.prisma.pipelineDefinition.updateMany({
        where: { churchId, isActive: true },
        data: { isActive: false },
      });
    }
    return this.resolve.resolveForChurch(churchId);
  }

  /**
   * Clone system template → church-owned definition.
   * Idempotent: returns existing active definition if already forked.
   * Uses body templateKey, else preferred settings key, else winners_default.
   */
  async fork(churchId: string, templateKey?: string): Promise<ResolvedPipeline> {
    const existing = await this.prisma.pipelineDefinition.findFirst({
      where: { churchId, isActive: true },
      select: { id: true },
    });
    if (existing) {
      return this.resolve.resolveForChurch(churchId);
    }

    await ensureSystemPipelineTemplates(this.prisma);

    const church = await this.prisma.church.findFirst({
      where: { id: churchId },
      select: { settings: true },
    });
    if (!church) throw new NotFoundException('Church not found');

    const resolvedKey =
      (templateKey?.trim() || this.resolve.getPreferredTemplateKey(church.settings)) ??
      WINNERS_DEFAULT_PIPELINE_KEY;

    if (!(SYSTEM_PIPELINE_TEMPLATE_KEYS as readonly string[]).includes(resolvedKey)) {
      throw new BadRequestException(`Unknown system template: ${resolvedKey}`);
    }

    const template = await this.prisma.pipelineTemplate.findUnique({
      where: { key: resolvedKey },
      include: { stages: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!template || template.stages.length === 0) {
      throw new NotFoundException(`Pipeline template not found: ${resolvedKey}`);
    }

    await this.prisma.pipelineDefinition.create({
      data: {
        churchId,
        templateId: template.id,
        name: template.name,
        forkedFromVersion: template.version,
        isActive: true,
        stages: {
          create: template.stages.map((s) => ({
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
          })),
        },
      },
    });

    await this.resolve.mergeChurchSettings(churchId, {
      [PREFERRED_PIPELINE_TEMPLATE_SETTINGS_KEY]: resolvedKey,
      [PIPELINE_FORK_SNAPSHOT_KEY]: {
        templateKey: resolvedKey,
        version: template.version,
        stageKeys: template.stages.map((s) => s.key),
      },
      [PIPELINE_UPDATE_DISMISSED_KEY]: undefined,
    });

    return this.resolve.resolveForChurch(churchId);
  }

  async renameDefinition(churchId: string, name: string): Promise<ResolvedPipeline> {
    const trimmed = name?.trim();
    if (!trimmed || trimmed.length > 120) {
      throw new BadRequestException('Definition name must be 1–120 characters');
    }
    const def = await this.requireActiveDefinition(churchId);
    await this.prisma.pipelineDefinition.update({
      where: { id: def.id },
      data: { name: trimmed },
    });
    return this.resolve.resolveForChurch(churchId);
  }

  async patchStage(
    churchId: string,
    stageKey: string,
    patch: PatchStageInput,
  ): Promise<ResolvedPipeline> {
    const key = assertStageKey(stageKey);
    const def = await this.requireActiveDefinition(churchId);
    const stage = await this.prisma.pipelineStage.findUnique({
      where: { definitionId_key: { definitionId: def.id, key } },
    });
    if (!stage) throw new NotFoundException(`Stage not found: ${key}`);

    // Mass-assignment harden: church PATCH may only rename presentation labels.
    const raw = patch as Record<string, unknown>;
    const blocked = [
      'blocksArchive',
      'graduatesSla',
      'isEntry',
      'isEnabled',
      'sortOrder',
      'phaseKey',
      'phaseStep',
      'phaseTitle',
      'colorToken',
      'key',
    ];
    if (blocked.some((field) => raw[field] !== undefined)) {
      throw new BadRequestException(
        'Stage PATCH only accepts label and shortLabel on church definitions',
      );
    }

    const data: Record<string, unknown> = {};
    if (patch.label !== undefined) data.label = assertLabel(patch.label, 'label');
    if (patch.shortLabel !== undefined) {
      data.shortLabel = assertLabel(patch.shortLabel, 'shortLabel');
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No stage fields to update');
    }

    await this.prisma.pipelineStage.update({
      where: { id: stage.id },
      data,
    });

    return this.resolve.resolveForChurch(churchId);
  }

  async addStage(churchId: string, input: AddStageInput): Promise<ResolvedPipeline> {
    const def = await this.requireActiveDefinition(churchId);
    const key = assertStageKey(input.key ?? '');

    const label = assertLabel(input.label, 'label');

    const dup = await this.prisma.pipelineStage.findUnique({
      where: { definitionId_key: { definitionId: def.id, key } },
    });
    if (dup) throw new BadRequestException(`Stage key already exists: ${key}`);

    const last = await this.prisma.pipelineStage.findFirst({
      where: { definitionId: def.id },
      orderBy: { sortOrder: 'desc' },
    });

    const sortOrder = input.sortOrder ?? (last?.sortOrder ?? 0) + 1;
    if (!Number.isInteger(sortOrder) || sortOrder < 1 || sortOrder > 999) {
      throw new BadRequestException('sortOrder must be an integer from 1–999');
    }

    const phase = assertOptionalPhaseFields({
      phaseKey: input.phaseKey ?? last?.phaseKey ?? 'custom',
      phaseStep: input.phaseStep ?? last?.phaseStep ?? 1,
      phaseTitle: input.phaseTitle ?? last?.phaseTitle ?? 'Custom',
      colorToken: input.colorToken ?? last?.colorToken ?? 'sky',
    });

    const shortLabel = input.shortLabel
      ? assertLabel(input.shortLabel, 'shortLabel')
      : label.slice(0, 40);
    const makeEntry = input.isEntry === true;

    if (makeEntry) {
      await this.prisma.pipelineStage.updateMany({
        where: { definitionId: def.id, isEntry: true },
        data: { isEntry: false },
      });
    }

    await this.prisma.pipelineStage.create({
      data: {
        definitionId: def.id,
        key,
        label,
        shortLabel,
        sortOrder,
        phaseKey: phase.phaseKey!,
        phaseStep: phase.phaseStep!,
        phaseTitle: phase.phaseTitle!,
        colorToken: phase.colorToken ?? 'sky',
        isEntry: makeEntry,
        // Policy flags are product-owned; custom stages default off.
        blocksArchive: false,
        graduatesSla: false,
        isEnabled: input.isEnabled !== false,
      },
    });

    await this.assertExactlyOneEntry(def.id);
    return this.resolve.resolveForChurch(churchId);
  }

  private async requireActiveDefinition(churchId: string) {
    const def = await this.prisma.pipelineDefinition.findFirst({
      where: { churchId, isActive: true },
    });
    if (!def) {
      throw new BadRequestException(
        'Fork the system template before editing (POST /follow-up/pipeline/fork)',
      );
    }
    return def;
  }

  private async assertExactlyOneEntry(definitionId: string) {
    const entries = await this.prisma.pipelineStage.count({
      where: { definitionId, isEnabled: true, isEntry: true },
    });
    if (entries !== 1) {
      throw new BadRequestException('Pipeline must have exactly one enabled entry stage');
    }
  }
}
