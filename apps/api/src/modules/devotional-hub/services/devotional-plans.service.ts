import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.module';
import { CreateDevotionalPlanDto } from '../dto/create-plan.dto';
import { UpdateDevotionalPlanDayDto } from '../dto/update-plan-day.dto';
import { UpsertDevotionalPlanDraftDto } from '../dto/upsert-plan-draft.dto';
import { PaginatedResult } from '../dto/pagination.dto';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../devotional-hub.constants';
import {
  buildSourceLabel,
  OutlineDayInput,
  resolveDurationDays,
  toneToAudience,
} from '../devotional-plan-outline.util';
import { DevotionalAiService } from './devotional-ai.service';

type LegacyEntry = {
  day?: number;
  title?: string;
  scripture?: string;
  scriptureRef?: string;
  scriptureText?: string;
  reflection?: string;
  prayerPrompt?: string;
  actionPoint?: string;
};

@Injectable()
export class DevotionalPlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: DevotionalAiService,
  ) {}

  private clampLimit(limit?: number) {
    return Math.min(Math.max(limit ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  }

  private dayIndexFromStart(startDate: Date): number {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.floor((today.getTime() - start.getTime()) / 86_400_000);
    return Math.max(1, diff + 1);
  }

  private normalizeDaysFromDto(
    days?: UpsertDevotionalPlanDraftDto['days'],
    entries?: CreateDevotionalPlanDto['entries'],
  ): LegacyEntry[] {
    if (days?.length) {
      return days.map((d, i) => ({
        day: d.dayNumber ?? i + 1,
        title: d.title,
        scripture: d.scriptureRef ?? d.scriptureText,
        scriptureRef: d.scriptureRef,
        scriptureText: d.scriptureText,
        reflection: d.reflection,
        prayerPrompt: d.prayerPrompt,
        actionPoint: d.actionPoint,
      }));
    }
    return (entries ?? []) as LegacyEntry[];
  }

  private async assertCanEditPlan(
    plan: { createdById: string | null; status: string },
    userId: string,
    isLeader: boolean,
  ) {
    if (isLeader) return;
    if (!plan.createdById || plan.createdById !== userId) {
      throw new ForbiddenException('You can only edit your own devotional plans');
    }
  }

  private computeEndDate(startDate: Date, durationDays: number): Date {
    const end = new Date(startDate);
    end.setDate(end.getDate() + durationDays - 1);
    return end;
  }

  private daysToCreateInput(entries: LegacyEntry[]) {
    return entries.map((e, i) => ({
      dayNumber: e.day ?? i + 1,
      title: e.title ?? `Day ${e.day ?? i + 1}`,
      scriptureRef: e.scriptureRef ?? e.scripture ?? undefined,
      scriptureText: e.scriptureText ?? undefined,
      reflection: e.reflection ?? undefined,
      prayerPrompt: e.prayerPrompt ?? undefined,
      actionPoint: e.actionPoint ?? undefined,
      sortOrder: i,
    }));
  }

  private async replacePlanDays(planId: string, entries: LegacyEntry[]) {
    await this.prisma.devotionalPlanDay.deleteMany({ where: { planId } });
    if (entries.length === 0) return;
    await this.prisma.devotionalPlanDay.createMany({
      data: this.daysToCreateInput(entries).map((d) => ({ ...d, planId })),
    });
  }

  private snapshotDays(
    days: Array<{
      dayNumber: number;
      title: string;
      scriptureRef: string | null;
      scriptureText: string | null;
      reflection: string | null;
      prayerPrompt: string | null;
      actionPoint: string | null;
    }>,
  ) {
    return days.map((d) => ({
      dayNumber: d.dayNumber,
      title: d.title,
      scriptureRef: d.scriptureRef,
      scriptureText: d.scriptureText,
      reflection: d.reflection,
      prayerPrompt: d.prayerPrompt,
      actionPoint: d.actionPoint,
    }));
  }

  async list(
    churchId: string,
    opts?: {
      activeOnly?: boolean;
      page?: number;
      limit?: number;
      userId?: string;
      includeDrafts?: boolean;
      mineOnly?: boolean;
    },
  ): Promise<PaginatedResult<unknown>> {
    const limit = this.clampLimit(opts?.limit);
    const page = Math.max(opts?.page ?? 1, 1);

    const visibility: Prisma.DevotionalPlanWhereInput = opts?.mineOnly
      ? { churchId, createdById: opts.userId }
      : {
          churchId,
          OR: [
            { status: 'PUBLISHED', ...(opts?.activeOnly !== false ? { isActive: true } : {}) },
            ...(opts?.includeDrafts && opts.userId
              ? [{ status: 'DRAFT' as const, createdById: opts.userId }]
              : []),
          ],
        };

    const [total, rows] = await Promise.all([
      this.prisma.devotionalPlan.count({ where: visibility }),
      this.prisma.devotionalPlan.findMany({
        where: visibility,
        orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { days: true } } },
      }),
    ]);

    return {
      items: rows.map((r) => ({
        ...r,
        dayCount: r._count.days,
      })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      nextCursor: page * limit < total ? String(page + 1) : null,
    };
  }

  listActive(churchId: string) {
    return this.prisma.devotionalPlan.findMany({
      where: { churchId, isActive: true, status: 'PUBLISHED' },
      orderBy: { startDate: 'desc' },
      include: { _count: { select: { days: true } } },
    });
  }

  async getOne(churchId: string, planId: string, userId?: string, isLeader = false) {
    const plan = await this.prisma.devotionalPlan.findFirst({
      where: { id: planId, churchId },
      include: {
        days: { orderBy: { sortOrder: 'asc' } },
        outlineVersions: { orderBy: { version: 'desc' }, take: 10 },
      },
    });
    if (!plan) throw new NotFoundException('Devotional plan not found');
    if (plan.status === 'DRAFT' && userId && !isLeader && plan.createdById !== userId) {
      throw new ForbiddenException('Draft not accessible');
    }
    return this.hydratePlanDays(plan);
  }

  private hydratePlanDays(
    plan: Prisma.DevotionalPlanGetPayload<{ include: { days: true } }>,
  ) {
    if (plan.days.length > 0) return plan;
    const legacy = (plan.entries as LegacyEntry[]) ?? [];
    return {
      ...plan,
      days: legacy.map((e, i) => ({
        id: `legacy-${i}`,
        planId: plan.id,
        dayNumber: e.day ?? i + 1,
        title: e.title ?? `Day ${e.day ?? i + 1}`,
        scriptureRef: e.scripture ?? null,
        scriptureText: null,
        reflection: e.reflection ?? null,
        prayerPrompt: e.prayerPrompt ?? null,
        actionPoint: e.actionPoint ?? null,
        simplifiedYouth: null,
        simplifiedChild: null,
        sortOrder: i,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
      })),
    };
  }

  async getToday(churchId: string, planId: string) {
    const plan = await this.getOne(churchId, planId);
    if (plan.status === 'DRAFT') {
      throw new BadRequestException('Plan is not published yet');
    }
    const dayNumber = this.dayIndexFromStart(new Date(plan.startDate));
    const day =
      plan.days.find((d) => d.dayNumber === dayNumber) ??
      plan.days[plan.days.length - 1];
    return { planId: plan.id, dayNumber, day, planTitle: plan.title };
  }

  async upsertDraft(
    churchId: string,
    userId: string,
    dto: UpsertDevotionalPlanDraftDto,
  ) {
    const duration = resolveDurationDays(dto.durationDays, dto.durationWeeks);
    const sourceLabel = buildSourceLabel({
      sourceType: dto.sourceType,
      sourceLabel: dto.sourceLabel,
      topicalBook: dto.topicalBook,
      bibleBook: dto.bibleBook,
      customTopic: dto.customTopic,
    });

    let entries = this.normalizeDaysFromDto(dto.days);
    if (dto.generateOutline && entries.length === 0) {
      const outline = await this.ai.generateStudyOutline({
        churchId,
        planId: dto.planId,
        sourceType: dto.sourceType,
        topicalBook: dto.topicalBook,
        bibleBook: dto.bibleBook,
        customTopic: dto.customTopic,
        tone: dto.tone,
        durationDays: dto.durationDays,
        durationWeeks: dto.durationWeeks,
      });
      entries = outline.days.map((d) => ({
        day: d.dayNumber,
        title: d.title,
        scripture: d.scriptureRef,
        reflection: d.reflection,
        prayerPrompt: d.prayerPrompt,
        actionPoint: d.actionPoint,
      }));
    }

    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const audience = dto.audience ?? toneToAudience(dto.tone);
    const baseData = {
      title: dto.title.trim(),
      description: dto.description?.trim(),
      startDate,
      endDate: this.computeEndDate(startDate, duration),
      audience,
      coverImageUrl: dto.coverImageUrl?.trim() || null,
      sourceType: dto.sourceType,
      sourceLabel,
      topicalBook: dto.topicalBook?.trim(),
      bibleBook: dto.bibleBook?.trim(),
      customTopic: dto.customTopic?.trim(),
      tone: dto.tone,
      durationDays: dto.durationDays,
      durationWeeks: dto.durationWeeks,
      pdfImportId: dto.pdfImportId,
      entries: entries as Prisma.InputJsonValue,
      status: 'DRAFT' as const,
      isActive: false,
    };

    if (dto.planId) {
      const existing = await this.prisma.devotionalPlan.findFirst({
        where: { id: dto.planId, churchId },
      });
      if (!existing) throw new NotFoundException('Devotional plan not found');
      if (existing.createdById && existing.createdById !== userId) {
        throw new ForbiddenException('Cannot edit this draft');
      }
      await this.replacePlanDays(dto.planId, entries);
      return this.prisma.devotionalPlan.update({
        where: { id: dto.planId },
        data: baseData,
        include: { days: { orderBy: { sortOrder: 'asc' } } },
      });
    }

    return this.prisma.devotionalPlan.create({
      data: {
        churchId,
        createdById: userId,
        ...baseData,
        days: { create: this.daysToCreateInput(entries) },
      },
      include: { days: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async publish(
    churchId: string,
    planId: string,
    userId: string,
    isLeader: boolean,
  ) {
    const plan = await this.prisma.devotionalPlan.findFirst({
      where: { id: planId, churchId },
      include: { days: true },
    });
    if (!plan) throw new NotFoundException('Devotional plan not found');
    await this.assertCanEditPlan(plan, userId, isLeader);
    if (plan.days.length === 0) {
      throw new BadRequestException('Add at least one day before publishing');
    }
    return this.prisma.devotionalPlan.update({
      where: { id: planId },
      data: { status: 'PUBLISHED', isActive: true },
      include: { days: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async regenerateOutline(
    churchId: string,
    planId: string,
    userId: string,
    isLeader: boolean,
    tone?: string,
  ) {
    const plan = await this.prisma.devotionalPlan.findFirst({
      where: { id: planId, churchId },
      include: { days: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!plan) throw new NotFoundException('Devotional plan not found');
    await this.assertCanEditPlan(plan, userId, isLeader);

    if (plan.days.length > 0) {
      await this.prisma.devotionalPlanOutlineVersion.create({
        data: {
          planId,
          version: plan.outlineVersion,
          tone: plan.tone,
          sourceLabel: plan.sourceLabel,
          daysSnapshot: this.snapshotDays(plan.days),
          createdById: userId,
        },
      });
    }

    const pdf = plan.pdfImportId
      ? await this.prisma.devotionalPdfImport.findUnique({
          where: { id: plan.pdfImportId },
          select: { fileName: true },
        })
      : null;

    const outline = await this.ai.generateStudyOutline({
      churchId,
      planId,
      sourceType: plan.sourceType,
      sourceLabel: plan.sourceLabel,
      topicalBook: plan.topicalBook,
      bibleBook: plan.bibleBook,
      customTopic: plan.customTopic,
      tone: (tone as typeof plan.tone) ?? plan.tone,
      durationDays: plan.durationDays ?? undefined,
      durationWeeks: plan.durationWeeks ?? undefined,
      pdfFileName: pdf?.fileName,
    });

    const entries: LegacyEntry[] = outline.days.map((d) => ({
      day: d.dayNumber,
      title: d.title,
      scripture: d.scriptureRef,
      reflection: d.reflection,
      prayerPrompt: d.prayerPrompt,
      actionPoint: d.actionPoint,
    }));

    await this.replacePlanDays(planId, entries);
    return this.prisma.devotionalPlan.update({
      where: { id: planId },
      data: {
        outlineVersion: plan.outlineVersion + 1,
        tone: (tone as typeof plan.tone) ?? plan.tone,
        audience: toneToAudience((tone as typeof plan.tone) ?? plan.tone),
        sourceLabel: outline.sourceLabel,
        entries: entries as Prisma.InputJsonValue,
      },
      include: {
        days: { orderBy: { sortOrder: 'asc' } },
        outlineVersions: { orderBy: { version: 'desc' }, take: 10 },
      },
    });
  }

  async restoreOutlineVersion(
    churchId: string,
    planId: string,
    versionId: string,
    userId: string,
    isLeader: boolean,
  ) {
    const plan = await this.prisma.devotionalPlan.findFirst({
      where: { id: planId, churchId },
      include: { days: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!plan) throw new NotFoundException('Devotional plan not found');
    await this.assertCanEditPlan(plan, userId, isLeader);

    const version = await this.prisma.devotionalPlanOutlineVersion.findFirst({
      where: { id: versionId, planId },
    });
    if (!version) throw new NotFoundException('Outline version not found');

    const snapshot = version.daysSnapshot as OutlineDayInput[];
    const entries: LegacyEntry[] = snapshot.map((d) => ({
      day: d.dayNumber,
      title: d.title,
      scripture: d.scriptureRef,
      reflection: d.reflection,
      prayerPrompt: d.prayerPrompt,
      actionPoint: d.actionPoint,
    }));

    if (plan.days.length > 0) {
      await this.prisma.devotionalPlanOutlineVersion.create({
        data: {
          planId,
          version: plan.outlineVersion,
          tone: plan.tone,
          sourceLabel: plan.sourceLabel,
          daysSnapshot: this.snapshotDays(plan.days),
          createdById: userId,
        },
      });
    }

    await this.replacePlanDays(planId, entries);
    return this.prisma.devotionalPlan.update({
      where: { id: planId },
      data: {
        outlineVersion: plan.outlineVersion + 1,
        entries: entries as Prisma.InputJsonValue,
      },
      include: {
        days: { orderBy: { sortOrder: 'asc' } },
        outlineVersions: { orderBy: { version: 'desc' }, take: 10 },
      },
    });
  }

  async updateDay(
    churchId: string,
    planId: string,
    dayId: string,
    userId: string,
    isLeader: boolean,
    data: UpdateDevotionalPlanDayDto,
  ) {
    const plan = await this.prisma.devotionalPlan.findFirst({
      where: { id: planId, churchId },
    });
    if (!plan) throw new NotFoundException('Devotional plan not found');
    await this.assertCanEditPlan(plan, userId, isLeader);

    const day = await this.prisma.devotionalPlanDay.findFirst({
      where: { id: dayId, planId },
    });
    if (!day) throw new NotFoundException('Day not found');

    return this.prisma.devotionalPlanDay.update({
      where: { id: dayId },
      data: {
        ...(data.title ? { title: data.title.trim() } : {}),
        ...(data.scriptureRef !== undefined ? { scriptureRef: data.scriptureRef } : {}),
        ...(data.scriptureText !== undefined ? { scriptureText: data.scriptureText } : {}),
        ...(data.reflection !== undefined ? { reflection: data.reflection } : {}),
        ...(data.prayerPrompt !== undefined ? { prayerPrompt: data.prayerPrompt } : {}),
        ...(data.actionPoint !== undefined ? { actionPoint: data.actionPoint } : {}),
      },
    });
  }

  async create(churchId: string, userId: string | undefined, dto: CreateDevotionalPlanDto) {
    const legacyEntries = this.normalizeDaysFromDto(dto.days, dto.entries);
    const plan = await this.prisma.devotionalPlan.create({
      data: {
        churchId,
        title: dto.title.trim(),
        description: dto.description?.trim(),
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        audience: dto.audience ?? 'ALL',
        createdById: userId,
        status: 'PUBLISHED',
        entries: legacyEntries as Prisma.InputJsonValue,
        days: {
          create: this.daysToCreateInput(legacyEntries),
        },
      },
      include: { days: { orderBy: { sortOrder: 'asc' } } },
    });
    return plan;
  }

  async update(
    churchId: string,
    planId: string,
    data: Partial<{
      title: string;
      description: string;
      isActive: boolean;
      endDate: string;
      coverImageUrl: string;
    }>,
  ) {
    const existing = await this.prisma.devotionalPlan.findFirst({
      where: { id: planId, churchId },
    });
    if (!existing) throw new NotFoundException('Devotional plan not found');
    return this.prisma.devotionalPlan.update({
      where: { id: planId },
      data: {
        ...(data.title ? { title: data.title.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.endDate ? { endDate: new Date(data.endDate) } : {}),
        ...(data.coverImageUrl !== undefined ? { coverImageUrl: data.coverImageUrl } : {}),
      },
      include: { days: { orderBy: { sortOrder: 'asc' } } },
    });
  }
}
