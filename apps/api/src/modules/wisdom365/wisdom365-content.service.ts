import { Injectable, NotFoundException } from '@nestjs/common';
import { Wisdom365ContentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Wisdom365AccessService } from './wisdom365-access.service';
import type { AuthUser } from '../auth/current-user.decorator';

@Injectable()
export class Wisdom365ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: Wisdom365AccessService,
  ) {}

  private personalize(
    firstName: string,
    day: {
      theme: string;
      reference: string;
      passage: string;
      wisdom: string;
      application: string;
      prayer: string;
      bibleTranslationLabel: string;
    },
  ) {
    const name = firstName.trim() || 'friend';
    const themeLower = day.theme.toLowerCase();
    const greeting = `Hello ${name}, how are you today?`;
    const focusLine = `Your wisdom focus for today is ${themeLower}.`;
    const personalWisdom = day.wisdom.replace(/\bAs a \w[\w\s]*/i, '').trim() || day.wisdom;
    const personalApplication = day.application;
    const personalPrayer = day.prayer.replace(/^/i, `${name}, `);

    const audioScript = [
      greeting,
      focusLine,
      `Today I'm sharing ${day.reference} with you from the ${day.bibleTranslationLabel}.`,
      day.passage,
      personalWisdom,
      personalApplication,
      personalPrayer,
    ].join(' ');

    return {
      greeting,
      focusLine,
      personalWisdom,
      personalApplication,
      personalPrayer,
      audioScript,
    };
  }

  async assertEntitlement(userId: string, variantId: string) {
    const assignment = await this.prisma.wisdom365LicenseAssignment.findFirst({
      where: { userId, variantId, isActive: true },
      include: {
        subscription: true,
        variant: true,
      },
    });
    if (!assignment || assignment.subscription.status !== 'ACTIVE') {
      throw new NotFoundException('You do not have access to this journey');
    }
    return assignment;
  }

  async getDayForUser(
    user: AuthUser,
    variantSlug: string,
    dayOfYear?: number,
    firstName = 'friend',
  ) {
    const variant = await this.prisma.wisdom365Variant.findUnique({
      where: { slug: variantSlug as never },
    });
    if (!variant) throw new NotFoundException('Variant not found');

    await this.assertEntitlement(user.userId, variant.id);

    const today = this.access.dayOfYear();
    const requestedDay = dayOfYear ?? today;
    this.access.assertDayAccess(requestedDay, today);

    const entry = await this.prisma.wisdom365ContentEntry.findFirst({
      where: {
        variantId: variant.id,
        dayOfYear: requestedDay,
        status: Wisdom365ContentStatus.PUBLISHED,
      },
    });
    if (!entry) throw new NotFoundException('Content not yet published for this day');

    const personal = this.personalize(firstName, {
      theme: entry.theme,
      reference: entry.reference,
      passage: entry.passage,
      wisdom: entry.wisdom,
      application: entry.application,
      prayer: entry.prayer,
      bibleTranslationLabel: variant.bibleTranslationLabel,
    });

    return {
      dayOfYear: entry.dayOfYear,
      dateKey: this.access.dateKey(),
      title: entry.title,
      reference: entry.reference,
      passage: entry.passage,
      wisdom: entry.wisdom,
      application: entry.application,
      prayer: entry.prayer,
      theme: entry.theme,
      imageUrl: entry.imageUrl ?? variant.imageUrl,
      bibleTranslationLabel: variant.bibleTranslationLabel,
      ...personal,
      canView: true,
      isToday: requestedDay === today,
      isFuture: requestedDay > today,
    };
  }

  async listHistory(user: AuthUser, variantSlug: string) {
    const variant = await this.prisma.wisdom365Variant.findUnique({
      where: { slug: variantSlug as never },
    });
    if (!variant) throw new NotFoundException('Variant not found');
    await this.assertEntitlement(user.userId, variant.id);

    const today = this.access.dayOfYear();
    const minDay = Math.max(1, today - 29);

    const entries = await this.prisma.wisdom365ContentEntry.findMany({
      where: {
        variantId: variant.id,
        dayOfYear: { gte: minDay, lte: today },
        status: Wisdom365ContentStatus.PUBLISHED,
      },
      orderBy: { dayOfYear: 'desc' },
      select: {
        dayOfYear: true,
        title: true,
        reference: true,
        theme: true,
        imageUrl: true,
      },
    });

    return entries.map((e) => ({
      ...e,
      imageUrl: e.imageUrl ?? variant.imageUrl,
      isToday: e.dayOfYear === today,
    }));
  }

  async markComplete(user: AuthUser, variantSlug: string, journalText?: string) {
    const variant = await this.prisma.wisdom365Variant.findUnique({
      where: { slug: variantSlug as never },
    });
    if (!variant) throw new NotFoundException('Variant not found');
    await this.assertEntitlement(user.userId, variant.id);

    const todayKey = this.access.dateKey();
    const todayDay = this.access.dayOfYear();

    await this.prisma.wisdom365MemberProgress.upsert({
      where: {
        userId_variantId_dateKey: {
          userId: user.userId,
          variantId: variant.id,
          dateKey: todayKey,
        },
      },
      create: {
        userId: user.userId,
        variantId: variant.id,
        dateKey: todayKey,
        completedAt: new Date(),
        journalText: journalText ?? null,
      },
      update: {
        completedAt: new Date(),
        journalText: journalText ?? undefined,
      },
    });

    const prefs = await this.prisma.wisdom365MemberPrefs.findUnique({
      where: { userId_variantId: { userId: user.userId, variantId: variant.id } },
    });

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);
    const hadYesterday = await this.prisma.wisdom365MemberProgress.findUnique({
      where: {
        userId_variantId_dateKey: {
          userId: user.userId,
          variantId: variant.id,
          dateKey: yesterdayKey,
        },
      },
    });

    const streak = hadYesterday?.completedAt ? (prefs?.streakCount ?? 0) + 1 : 1;

    await this.prisma.wisdom365MemberPrefs.upsert({
      where: { userId_variantId: { userId: user.userId, variantId: variant.id } },
      create: {
        userId: user.userId,
        variantId: variant.id,
        streakCount: streak,
      },
      update: { streakCount: streak },
    });

    return { streak, dayOfYear: todayDay, completed: true };
  }

  async getProgress(user: AuthUser, variantSlug: string) {
    const variant = await this.prisma.wisdom365Variant.findUnique({
      where: { slug: variantSlug as never },
    });
    if (!variant) throw new NotFoundException('Variant not found');
    await this.assertEntitlement(user.userId, variant.id);

    const prefs = await this.prisma.wisdom365MemberPrefs.findUnique({
      where: { userId_variantId: { userId: user.userId, variantId: variant.id } },
    });

    const todayKey = this.access.dateKey();
    const todayProgress = await this.prisma.wisdom365MemberProgress.findUnique({
      where: {
        userId_variantId_dateKey: {
          userId: user.userId,
          variantId: variant.id,
          dateKey: todayKey,
        },
      },
    });

    return {
      streak: prefs?.streakCount ?? 0,
      completedToday: Boolean(todayProgress?.completedAt),
      reminder: prefs
        ? {
            hour: prefs.reminderHour,
            minute: prefs.reminderMinute,
            alarmEnabled: prefs.alarmEnabled,
            timezone: prefs.timezone,
          }
        : null,
      dayOfYear: this.access.dayOfYear(),
    };
  }

  async upsertReminder(
    user: AuthUser,
    variantSlug: string,
    data: { hour: number; minute: number; alarmEnabled: boolean; timezone: string },
  ) {
    const variant = await this.prisma.wisdom365Variant.findUnique({
      where: { slug: variantSlug as never },
    });
    if (!variant) throw new NotFoundException('Variant not found');
    await this.assertEntitlement(user.userId, variant.id);

    return this.prisma.wisdom365MemberPrefs.upsert({
      where: { userId_variantId: { userId: user.userId, variantId: variant.id } },
      create: {
        userId: user.userId,
        variantId: variant.id,
        reminderHour: data.hour,
        reminderMinute: data.minute,
        alarmEnabled: data.alarmEnabled,
        timezone: data.timezone,
      },
      update: {
        reminderHour: data.hour,
        reminderMinute: data.minute,
        alarmEnabled: data.alarmEnabled,
        timezone: data.timezone,
      },
    });
  }

  async listRemindersForUser(userId: string) {
    const assignments = await this.prisma.wisdom365LicenseAssignment.findMany({
      where: { userId, isActive: true },
      include: {
        variant: { select: { slug: true, name: true } },
        subscription: { select: { status: true } },
      },
    });

    const active = assignments.filter((a) => a.subscription.status === 'ACTIVE');
    const prefs = await this.prisma.wisdom365MemberPrefs.findMany({
      where: {
        userId,
        variantId: { in: active.map((a) => a.variantId) },
      },
      include: { variant: { select: { slug: true, name: true } } },
    });

    return prefs.map((p) => ({
      variantSlug: p.variant.slug,
      variantName: p.variant.name,
      hour: p.reminderHour,
      minute: p.reminderMinute,
      alarmEnabled: p.alarmEnabled,
      timezone: p.timezone,
    }));
  }
}
