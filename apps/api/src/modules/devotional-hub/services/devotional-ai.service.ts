import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  DevotionalAiArtifactType,
  DevotionalPlanSourceType,
  DevotionalPlanTone,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.module';
import {
  buildOutlineDays,
  buildSourceLabel,
  OutlineDayInput,
  resolveDurationDays,
} from '../devotional-plan-outline.util';
import {
  artifactTypeForReadingLevel,
  buildFullStudyOutline,
  buildPrayerPoints,
  buildScriptureAnswer,
  PdfReadingLevel,
  PrayerPointSource,
  resolveStudyTopic,
  ScriptureDepthMode,
  simplifyText,
  stubPdfExtractedText,
} from '../devotional-ai-tools.util';

export interface AiGenerateInput {
  churchId: string;
  planId?: string;
  dayId?: string;
  pdfImportId?: string;
  type: DevotionalAiArtifactType;
  prompt: string;
  context?: string;
}

export interface StudyOutlineGenerateInput {
  churchId: string;
  planId?: string;
  sourceType?: DevotionalPlanSourceType | null;
  sourceLabel?: string | null;
  topicalBook?: string | null;
  bibleBook?: string | null;
  customTopic?: string | null;
  tone?: DevotionalPlanTone | null;
  durationDays?: number;
  durationWeeks?: number;
  pdfFileName?: string;
}

@Injectable()
export class DevotionalAiService {
  private readonly logger = new Logger(DevotionalAiService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generate(input: AiGenerateInput) {
    const content = this.buildLegacyPlaceholder(input);
    const artifact = await this.prisma.devotionalAiArtifact.create({
      data: {
        churchId: input.churchId,
        planId: input.planId,
        dayId: input.dayId,
        pdfImportId: input.pdfImportId,
        type: input.type,
        prompt: input.prompt,
        content: content as Prisma.InputJsonValue,
        model: process.env.DEVOTIONAL_AI_MODEL ?? 'stub',
      },
    });
    this.logger.debug(`AI artifact ${artifact.id} type=${input.type}`);
    return artifact;
  }

  async generateFullStudyOutline(input: {
    churchId: string;
    planId?: string;
    sourceType?: DevotionalPlanSourceType | null;
    topic?: string;
    bibleBook?: string;
    topicalBook?: string;
    customTopic?: string;
    tone?: DevotionalPlanTone | null;
    durationDays?: number;
    durationWeeks?: number;
  }) {
    const sourceLabel = resolveStudyTopic({
      sourceType: input.sourceType,
      topic: input.topic,
      bibleBook: input.bibleBook,
      topicalBook: input.topicalBook,
      customTopic: input.customTopic,
    });

    const outline = buildFullStudyOutline({
      sourceType: input.sourceType,
      sourceLabel,
      tone: input.tone,
      durationDays: input.durationDays,
      durationWeeks: input.durationWeeks,
    });

    const artifact = await this.prisma.devotionalAiArtifact.create({
      data: {
        churchId: input.churchId,
        planId: input.planId,
        type: 'STUDY_OUTLINE',
        prompt: `Study outline: ${sourceLabel}`,
        content: outline as Prisma.InputJsonValue,
        model: process.env.DEVOTIONAL_AI_MODEL ?? 'stub',
      },
    });
    this.logger.debug(`AI artifact ${artifact.id} type=STUDY_OUTLINE`);

    return { ...outline, artifactId: artifact.id };
  }

  async generatePrayerPoints(input: {
    churchId: string;
    source: PrayerPointSource;
    prompt: string;
    context?: string;
    planId?: string;
    dayId?: string;
    pdfImportId?: string;
  }) {
    const content = buildPrayerPoints({
      source: input.source,
      prompt: input.prompt,
      context: input.context,
    });

    const artifact = await this.generate({
      churchId: input.churchId,
      planId: input.planId,
      dayId: input.dayId,
      pdfImportId: input.pdfImportId,
      type: 'PRAYER_POINTS',
      prompt: input.prompt,
      context: JSON.stringify(content),
    });

    return { ...content, artifactId: artifact.id };
  }

  async askScripture(input: {
    churchId: string;
    question: string;
    passage?: string;
    depth?: ScriptureDepthMode;
    planId?: string;
    dayId?: string;
  }) {
    const content = buildScriptureAnswer(
      input.question,
      input.passage,
      input.depth ?? 'SIMPLE',
    );

    const artifact = await this.generate({
      churchId: input.churchId,
      planId: input.planId,
      dayId: input.dayId,
      type: 'SCRIPTURE_ASK',
      prompt: input.question,
      context: JSON.stringify(content),
    });

    return { ...content, artifactId: artifact.id };
  }

  async simplifyPdfContent(input: {
    churchId: string;
    pdfImportId: string;
    readingLevel: PdfReadingLevel;
    pageNumber?: number;
  }) {
    const row = await this.prisma.devotionalPdfImport.findFirst({
      where: { id: input.pdfImportId, churchId: input.churchId },
    });
    if (!row) throw new NotFoundException('PDF import not found');

    const meta =
      (row.metadata as {
        pages?: Array<{ pageNumber: number; text: string }>;
        simplifications?: Record<string, unknown>;
      }) ?? {};
    const pages = meta.pages ?? [];
    const target = input.pageNumber
      ? pages.find((p) => p.pageNumber === input.pageNumber)
      : pages[0];
    const text = target?.text ?? `Content from ${row.fileName}`;

    const simplified = simplifyText(text, input.readingLevel);
    const artifact = await this.generate({
      churchId: input.churchId,
      pdfImportId: input.pdfImportId,
      type: artifactTypeForReadingLevel(input.readingLevel),
      prompt: `Simplify page ${input.pageNumber ?? 1} to ${input.readingLevel}`,
      context: JSON.stringify(simplified),
    });

    const existing = (meta.simplifications as Record<string, unknown>) ?? {};
    await this.prisma.devotionalPdfImport.update({
      where: { id: row.id },
      data: {
        metadata: {
          ...meta,
          simplifications: {
            ...existing,
            [input.readingLevel]: simplified,
          },
        } as Prisma.InputJsonValue,
      },
    });

    return { ...simplified, artifactId: artifact.id };
  }

  /** Legacy plan day generator */
  async generateStudyOutline(input: StudyOutlineGenerateInput): Promise<{
    days: OutlineDayInput[];
    artifactId: string;
    sourceLabel: string;
  }> {
    const full = await this.generateFullStudyOutline({
      churchId: input.churchId,
      planId: input.planId,
      sourceType: input.sourceType,
      topic: input.sourceLabel ?? undefined,
      bibleBook: input.bibleBook ?? undefined,
      topicalBook: input.topicalBook ?? undefined,
      customTopic: input.customTopic ?? undefined,
      tone: input.tone,
      durationDays: input.durationDays,
      durationWeeks: input.durationWeeks,
    });
    return {
      days: full.days,
      artifactId: full.artifactId,
      sourceLabel: full.sourceLabel,
    };
  }

  async listArtifacts(
    churchId: string,
    opts?: { type?: DevotionalAiArtifactType; limit?: number; planId?: string },
  ) {
    const limit = Math.min(opts?.limit ?? 24, 50);
    const rows = await this.prisma.devotionalAiArtifact.findMany({
      where: {
        churchId,
        ...(opts?.type ? { type: opts.type } : {}),
        ...(opts?.planId ? { planId: opts.planId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        type: true,
        prompt: true,
        content: true,
        planId: true,
        dayId: true,
        pdfImportId: true,
        createdAt: true,
      },
    });

    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      prompt: r.prompt,
      content: r.content,
      planId: r.planId,
      dayId: r.dayId,
      pdfImportId: r.pdfImportId,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async getArtifact(churchId: string, artifactId: string) {
    const row = await this.prisma.devotionalAiArtifact.findFirst({
      where: { id: artifactId, churchId },
    });
    if (!row) throw new NotFoundException('Artifact not found');
    return {
      id: row.id,
      type: row.type,
      prompt: row.prompt,
      content: row.content,
      planId: row.planId,
      dayId: row.dayId,
      pdfImportId: row.pdfImportId,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private buildLegacyPlaceholder(input: AiGenerateInput) {
    switch (input.type) {
      case 'STUDY_OUTLINE':
        return {
          sections: [
            { heading: 'Context', body: input.context ?? 'Configure AI provider for full outlines.' },
            { heading: 'Discussion', body: input.prompt },
          ],
        };
      case 'PRAYER_POINTS':
        return buildPrayerPoints({ source: 'TOPIC', prompt: input.prompt, context: input.context });
      case 'SCRIPTURE_ASK':
        return buildScriptureAnswer(input.prompt, input.context, 'SIMPLE');
      default:
        return { summary: input.prompt };
    }
  }
}
