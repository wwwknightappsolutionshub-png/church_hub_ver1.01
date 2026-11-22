import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import {
  PREFERRED_PIPELINE_TEMPLATE_SETTINGS_KEY,
  WINNERS_DEFAULT_PIPELINE_KEY,
  ensureSystemPipelineTemplates,
  ensureWinnersDefaultPipelineTemplate,
} from './pipeline-template.seed';

export type ResolvedPipelineStage = {
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

export type ResolvedPipelinePhase = {
  key: string;
  step: number;
  title: string;
  stageKeys: string[];
};

export type ResolvedPipeline = {
  source: 'template' | 'definition';
  templateKey: string | null;
  templateVersion: number | null;
  definitionId: string | null;
  name: string;
  stages: ResolvedPipelineStage[];
  phases: ResolvedPipelinePhase[];
};

function buildPhases(stages: ResolvedPipelineStage[]): ResolvedPipelinePhase[] {
  const map = new Map<string, ResolvedPipelinePhase>();
  for (const s of stages.filter((x) => x.isEnabled)) {
    const existing = map.get(s.phaseKey);
    if (existing) {
      existing.stageKeys.push(s.key);
    } else {
      map.set(s.phaseKey, {
        key: s.phaseKey,
        step: s.phaseStep,
        title: s.phaseTitle,
        stageKeys: [s.key],
      });
    }
  }
  return [...map.values()].sort((a, b) => a.step - b.step);
}

function preferredTemplateKeyFromSettings(settings: unknown): string | null {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return null;
  const raw = (settings as Record<string, unknown>)[PREFERRED_PIPELINE_TEMPLATE_SETTINGS_KEY];
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

@Injectable()
export class PipelineResolveService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve the membership pipeline for a church.
   * Active definition if present, else preferred system template, else winners_default.
   */
  async resolveForChurch(churchId: string): Promise<ResolvedPipeline> {
    const church = await this.prisma.church.findFirst({
      where: { id: churchId },
      select: { id: true, settings: true },
    });
    if (!church) throw new NotFoundException('Church not found');

    const definition = await this.prisma.pipelineDefinition.findFirst({
      where: { churchId, isActive: true },
      include: {
        stages: { orderBy: { sortOrder: 'asc' } },
        template: { select: { key: true, version: true } },
      },
    });

    if (definition && definition.stages.length > 0) {
      const stages: ResolvedPipelineStage[] = definition.stages.map((s) => ({
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
      }));
      return {
        source: 'definition',
        templateKey: definition.template?.key ?? null,
        templateVersion: definition.template?.version ?? definition.forkedFromVersion,
        definitionId: definition.id,
        name: definition.name,
        stages,
        phases: buildPhases(stages),
      };
    }

    const preferred =
      preferredTemplateKeyFromSettings(church.settings) ?? WINNERS_DEFAULT_PIPELINE_KEY;
    return this.resolveTemplateByKey(preferred);
  }

  /** Read preferred template key from church settings (pre-fork). */
  getPreferredTemplateKey(settings: unknown): string {
    return preferredTemplateKeyFromSettings(settings) ?? WINNERS_DEFAULT_PIPELINE_KEY;
  }

  async resolveTemplateByKey(templateKey: string): Promise<ResolvedPipeline> {
    await ensureSystemPipelineTemplates(this.prisma);

    let template = await this.prisma.pipelineTemplate.findUnique({
      where: { key: templateKey },
      include: { stages: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!template || template.stages.length === 0) {
      if (templateKey === WINNERS_DEFAULT_PIPELINE_KEY) {
        await ensureWinnersDefaultPipelineTemplate(this.prisma);
      } else {
        await ensureSystemPipelineTemplates(this.prisma);
      }
      template = await this.prisma.pipelineTemplate.findUnique({
        where: { key: templateKey },
        include: { stages: { orderBy: { sortOrder: 'asc' } } },
      });
    }

    if (!template || template.stages.length === 0) {
      // Fall back safely rather than 500 on bad preference
      return this.resolveSystemDefault();
    }

    const stages: ResolvedPipelineStage[] = template.stages.map((s) => ({
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
    }));

    return {
      source: 'template',
      templateKey: template.key,
      templateVersion: template.version,
      definitionId: null,
      name: template.name,
      stages,
      phases: buildPhases(stages),
    };
  }

  /** Ensure seed exists, then return system default template as resolved pipeline. */
  async resolveSystemDefault(): Promise<ResolvedPipeline> {
    return this.resolveTemplateByKey(WINNERS_DEFAULT_PIPELINE_KEY);
  }

  async mergeChurchSettings(
    churchId: string,
    patch: Record<string, unknown>,
  ): Promise<Prisma.JsonObject> {
    const church = await this.prisma.church.findFirst({
      where: { id: churchId },
      select: { settings: true },
    });
    if (!church) throw new NotFoundException('Church not found');
    const current =
      church.settings && typeof church.settings === 'object' && !Array.isArray(church.settings)
        ? { ...(church.settings as Record<string, unknown>) }
        : {};
    const next = { ...current };
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) delete next[k];
      else next[k] = v;
    }
    await this.prisma.church.update({
      where: { id: churchId },
      data: { settings: next as Prisma.InputJsonValue },
    });
    return next as Prisma.JsonObject;
  }
}
