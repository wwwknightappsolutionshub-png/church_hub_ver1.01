import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.module';
import { DevotionalAiService } from './devotional-ai.service';
import {
  pdfPagesToDevotionalDays,
  stubPdfExtractedText,
} from '../devotional-ai-tools.util';

@Injectable()
export class DevotionalPdfService {
  private readonly logger = new Logger(DevotionalPdfService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: DevotionalAiService,
  ) {}

  async registerImport(
    churchId: string,
    uploadedById: string | undefined,
    data: { fileName: string; fileUrl: string; planId?: string },
  ) {
    const row = await this.prisma.devotionalPdfImport.create({
      data: {
        churchId,
        uploadedById,
        planId: data.planId,
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        status: 'PENDING',
      },
    });
    if (data.planId) {
      await this.prisma.devotionalPlan.update({
        where: { id: data.planId },
        data: { pdfImportId: row.id, sourceType: 'PDF_IMPORT' },
      });
    }
    void this.processImport(churchId, row.id);
    return row;
  }

  async getImport(churchId: string, importId: string) {
    const row = await this.prisma.devotionalPdfImport.findFirst({
      where: { id: importId, churchId },
      include: {
        aiArtifacts: { orderBy: { createdAt: 'desc' }, take: 10 },
        plan: { select: { id: true, title: true } },
      },
    });
    if (!row) throw new NotFoundException('PDF import not found');
    return row;
  }

  /** Extract pages, build devotional days, persist metadata */
  async processImport(churchId: string, importId: string) {
    const row = await this.prisma.devotionalPdfImport.findFirst({
      where: { id: importId, churchId },
    });
    if (!row) throw new NotFoundException('PDF import not found');

    try {
      await this.prisma.devotionalPdfImport.update({
        where: { id: importId },
        data: { status: 'PROCESSING' },
      });

      const pageCount = row.pageCount ?? 7;
      const extracted = stubPdfExtractedText(row.fileName, pageCount);
      const devotionalDays = pdfPagesToDevotionalDays(extracted.pages, row.fileName);

      const metadata = {
        extractedAt: new Date().toISOString(),
        pages: extracted.pages,
        devotionalDays,
        simplifications: {},
      };

      await this.ai.generate({
        churchId,
        pdfImportId: importId,
        planId: row.planId ?? undefined,
        type: 'STUDY_OUTLINE',
        prompt: `PDF processed: ${row.fileName}`,
        context: JSON.stringify({ summary: `Extracted ${pageCount} pages`, dayCount: devotionalDays.length }),
      });

      if (row.planId) {
        await this.syncDaysToPlan(row.planId, devotionalDays);
      }

      return this.prisma.devotionalPdfImport.update({
        where: { id: importId },
        data: {
          status: 'READY',
          pageCount: extracted.pageCount,
          chunkCount: extracted.pages.length,
          metadata: metadata as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      this.logger.error(`PDF import ${importId} failed`, err);
      return this.prisma.devotionalPdfImport.update({
        where: { id: importId },
        data: {
          status: 'FAILED',
          errorMessage: err instanceof Error ? err.message : 'Processing failed',
        },
      });
    }
  }

  private async syncDaysToPlan(
    planId: string,
    days: Array<{
      dayNumber: number;
      title: string;
      scriptureRef?: string;
      scriptureText?: string;
      reflection?: string;
      prayerPrompt?: string;
      actionPoint?: string;
    }>,
  ) {
    await this.prisma.devotionalPlanDay.deleteMany({ where: { planId } });
    if (days.length === 0) return;
    await this.prisma.devotionalPlanDay.createMany({
      data: days.map((d, i) => ({
        planId,
        dayNumber: d.dayNumber,
        title: d.title,
        scriptureRef: d.scriptureRef,
        scriptureText: d.scriptureText,
        reflection: d.reflection,
        prayerPrompt: d.prayerPrompt,
        actionPoint: d.actionPoint,
        sortOrder: i,
      })),
    });
  }

  private async processAsync(importId: string, churchId: string) {
    void this.processImport(churchId, importId);
  }
}
