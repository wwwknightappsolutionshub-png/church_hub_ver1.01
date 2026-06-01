import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SermonNoteSourceType, SermonNoteStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { DevotionalPlansService } from '../devotional-hub/services/devotional-plans.service';
import { DevotionalHubAccessService } from '../devotional-hub/devotional-hub-access.service';
import { CommunicationsService } from '../communications/communications.service';
import { stubPdfExtractedText } from '../devotional-hub/devotional-ai-tools.util';
import { CreateSermonNoteDto } from './dto/create-sermon-note.dto';
import { UpdateSermonNoteDto } from './dto/update-sermon-note.dto';
import {
  buildSermonDevotionalDays,
  buildSermonSummary,
} from './sermon-devotional.util';

@Injectable()
export class SermonNotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plans: DevotionalPlansService,
    private readonly devotionalAccess: DevotionalHubAccessService,
    private readonly communications: CommunicationsService,
  ) {}

  list(churchId: string) {
    return this.prisma.sermonNote.findMany({
      where: { churchId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        devotionalPlan: { select: { id: true, title: true, status: true, startDate: true } },
      },
      take: 50,
    });
  }

  async getOne(churchId: string, id: string) {
    const row = await this.prisma.sermonNote.findFirst({
      where: { id, churchId },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        devotionalPlan: {
          include: { days: { orderBy: { sortOrder: 'asc' } } },
        },
      },
    });
    if (!row) throw new NotFoundException('Sermon note not found');
    return row;
  }

  create(churchId: string, userId: string, dto: CreateSermonNoteDto) {
    if (dto.sourceType === 'TEXT' && !dto.sourceText?.trim()) {
      throw new BadRequestException('Paste sermon text or notes');
    }
    if ((dto.sourceType === 'AUDIO' || dto.sourceType === 'PDF') && !dto.sourceUrl?.trim()) {
      throw new BadRequestException('Upload a file from your device first');
    }
    return this.prisma.sermonNote.create({
      data: {
        churchId,
        createdById: userId,
        title: dto.title.trim(),
        speakerName: dto.speakerName?.trim(),
        sundayDate: dto.sundayDate ? new Date(dto.sundayDate) : undefined,
        sourceType: dto.sourceType,
        sourceUrl: dto.sourceUrl?.trim(),
        sourceText: dto.sourceText?.trim(),
        pastorContext: dto.pastorContext?.trim(),
        status: 'DRAFT',
      },
    });
  }

  async update(churchId: string, id: string, dto: UpdateSermonNoteDto) {
    const row = await this.getOne(churchId, id);
    if (row.status === 'PUBLISHED') {
      throw new BadRequestException('Published sermon notes cannot be edited');
    }
    return this.prisma.sermonNote.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        speakerName: dto.speakerName?.trim(),
        sundayDate: dto.sundayDate ? new Date(dto.sundayDate) : undefined,
        sourceUrl: dto.sourceUrl?.trim(),
        sourceText: dto.sourceText?.trim(),
        pastorContext: dto.pastorContext?.trim(),
        summary: dto.summary?.trim(),
      },
    });
  }

  async process(churchId: string, id: string, userId: string) {
    const note = await this.getOne(churchId, id);
    if (note.status === 'PUBLISHED') {
      throw new BadRequestException('Already published');
    }

    await this.prisma.sermonNote.update({
      where: { id },
      data: { status: 'PROCESSING' },
    });

    const { transcript, summary } = await this.extractAndSummarize(note);

    const startDate = note.sundayDate ?? new Date();
    const planTitle = `Weekly devotional — ${note.title}`;
    const days = buildSermonDevotionalDays({
      sermonTitle: note.title,
      speakerName: note.speakerName,
      transcript,
      pastorContext: note.pastorContext,
      summary,
      durationDays: 7,
    });

    const hubCtx = await this.devotionalAccess.getContext(churchId, userId);
    const plan = await this.plans.upsertDraft(churchId, userId, {
      planId: note.devotionalPlanId ?? undefined,
      title: planTitle,
      description: summary,
      startDate: startDate.toISOString().slice(0, 10),
      sourceType: 'CUSTOM_TOPIC',
      customTopic: note.title,
      tone: 'ADULT',
      durationDays: 7,
      days,
      sourceLabel: `Sermon: ${note.title}`,
    });

    const updated = await this.prisma.sermonNote.update({
      where: { id },
      data: {
        transcript,
        summary,
        status: 'READY',
        devotionalPlanId: plan.id,
      },
      include: {
        devotionalPlan: { include: { days: { orderBy: { sortOrder: 'asc' } } } },
      },
    });

    void hubCtx;
    return updated;
  }

  async publish(churchId: string, id: string, userId: string) {
    const note = await this.getOne(churchId, id);
    if (!note.devotionalPlanId) {
      throw new BadRequestException('Process the sermon note into a devotional plan first');
    }
    if (note.status === 'PUBLISHED') {
      throw new BadRequestException('Already published');
    }

    const hubCtx = await this.devotionalAccess.getContext(churchId, userId);
    await this.plans.publish(
      churchId,
      note.devotionalPlanId,
      userId,
      hubCtx.isLeader || note.createdById === userId,
    );

    const appUrl =
      process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';
    const planUrl = `${appUrl}/dashboard/devotional-hub?plan=${note.devotionalPlanId}`;

    await this.communications.sendBroadcast(churchId, {
      title: `New weekly devotional: ${note.title}`,
      body: `Your church published a new devotional from Sunday's teaching. Open Devotional Hub to start today's reading.\n\n${planUrl}`,
      sendPush: true,
      sendEmail: false,
      type: 'SERMON_NOTE_DEVOTIONAL',
    });

    return this.prisma.sermonNote.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
      include: {
        devotionalPlan: { include: { days: { orderBy: { sortOrder: 'asc' } } } },
      },
    });
  }

  private async extractAndSummarize(note: {
    sourceType: SermonNoteSourceType;
    sourceUrl: string | null;
    sourceText: string | null;
    pastorContext: string | null;
    title: string;
  }) {
    let transcript = note.sourceText?.trim() ?? '';

    if (note.sourceType === 'AUDIO' && note.sourceUrl) {
      transcript =
        transcript ||
        `[Audio message] Sunday teaching audio uploaded for "${note.title}". ` +
          'Use pastor voice notes below for additional context until live transcription is configured.';
    }

    if (note.sourceType === 'PDF' && note.sourceUrl) {
      const fileName = note.sourceUrl.split('/').pop() ?? 'sermon.pdf';
      const extracted = stubPdfExtractedText(fileName, 7);
      transcript = extracted.pages.map((p) => p.text).join('\n\n');
    }

    if (!transcript && !note.pastorContext?.trim()) {
      throw new BadRequestException(
        'No content to process — add sermon text, upload a file, or record pastor context',
      );
    }

    if (!transcript && note.pastorContext?.trim()) {
      transcript = note.pastorContext.trim();
    }

    const summary = buildSermonSummary({
      title: note.title,
      transcript,
      pastorContext: note.pastorContext,
    });

    return { transcript, summary };
  }
}
