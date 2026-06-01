import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DevotionalPrayerListScope, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.module';
import { buildPrayerPoints } from '../devotional-ai-tools.util';
import {
  computeStreakFromLogs,
  dateKey,
  startOfUtcDay,
} from '../devotional-prayer-streak.util';
import { isoWeekKey, weekRangeFromKey } from '../devotional-week.util';
import {
  CreatePrayerListDto,
  PrayerBoosterDto,
  UpdatePrayerItemDto,
  UpdatePrayerListDto,
} from '../dto/prayer-list.dto';

@Injectable()
export class DevotionalPrayerListsService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireMember(churchId: string, userId: string) {
    const member = await this.prisma.member.findFirst({
      where: { churchId, userId },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!member) throw new BadRequestException('Member profile required');
    return member;
  }

  private async assertGroupMember(groupId: string, memberId: string) {
    const m = await this.prisma.devotionalGroupMember.findUnique({
      where: { groupId_memberId: { groupId, memberId } },
    });
    if (!m || m.status !== 'ACTIVE') {
      throw new ForbiddenException('Active group membership required');
    }
  }

  private serializeItem(item: {
    id: string;
    body: string;
    dayId: string | null;
    isAnswered: boolean;
    answeredAt: Date | null;
    aiBooster: Prisma.JsonValue;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: item.id,
      body: item.body,
      dayId: item.dayId,
      isAnswered: item.isAnswered,
      answeredAt: item.answeredAt?.toISOString() ?? null,
      aiBooster: item.aiBooster ?? null,
      sortOrder: item.sortOrder,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  private serializeList(
    list: {
      id: string;
      title: string;
      scope: DevotionalPrayerListScope;
      groupId: string | null;
      planId: string | null;
      memberId: string | null;
      createdAt: Date;
      updatedAt: Date;
      items: Array<Parameters<DevotionalPrayerListsService['serializeItem']>[0]>;
      group?: { id: string; name: string } | null;
      member?: { firstName: string; lastName: string } | null;
    },
    viewerMemberId: string,
  ) {
    const open = list.items.filter((i) => !i.isAnswered).length;
    return {
      id: list.id,
      title: list.title,
      scope: list.scope,
      groupId: list.groupId,
      planId: list.planId,
      group: list.group,
      authorName: list.member
        ? `${list.member.firstName} ${list.member.lastName}`.trim()
        : null,
      isOwner: list.memberId === viewerMemberId,
      openCount: open,
      itemCount: list.items.length,
      items: list.items.map((i) => this.serializeItem(i)),
      createdAt: list.createdAt.toISOString(),
      updatedAt: list.updatedAt.toISOString(),
    };
  }

  private listInclude() {
    return {
      items: { orderBy: { sortOrder: 'asc' as const } },
      group: { select: { id: true, name: true } },
      member: { select: { firstName: true, lastName: true } },
    };
  }

  async listMine(churchId: string, userId: string) {
    const member = await this.requireMember(churchId, userId);
    const rows = await this.prisma.devotionalPrayerList.findMany({
      where: { churchId, memberId: member.id },
      include: this.listInclude(),
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((r) => this.serializeList(r, member.id));
  }

  async listForGroup(churchId: string, userId: string, groupId: string) {
    const member = await this.requireMember(churchId, userId);
    await this.assertGroupMember(groupId, member.id);
    const rows = await this.prisma.devotionalPrayerList.findMany({
      where: { churchId, groupId, scope: 'GROUP' },
      include: this.listInclude(),
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((r) => this.serializeList(r, member.id));
  }

  async getOne(churchId: string, userId: string, listId: string) {
    const member = await this.requireMember(churchId, userId);
    const list = await this.loadList(churchId, listId);
    await this.assertCanView(list, member.id);
    return this.serializeList(list, member.id);
  }

  private async loadList(churchId: string, listId: string) {
    const list = await this.prisma.devotionalPrayerList.findFirst({
      where: { id: listId, churchId },
      include: this.listInclude(),
    });
    if (!list) throw new NotFoundException('Prayer list not found');
    return list;
  }

  private async assertCanView(
    list: { memberId: string | null; scope: DevotionalPrayerListScope; groupId: string | null },
    memberId: string,
  ) {
    if (list.memberId === memberId) return;
    if (list.scope === 'GROUP' && list.groupId) {
      await this.assertGroupMember(list.groupId, memberId);
      return;
    }
    throw new ForbiddenException('Cannot access this prayer list');
  }

  private async assertOwner(list: { memberId: string | null }, memberId: string) {
    if (list.memberId !== memberId) throw new ForbiddenException('Only the list owner can edit');
  }

  async create(churchId: string, userId: string, data: CreatePrayerListDto) {
    const member = await this.requireMember(churchId, userId);
    const scope = data.scope ?? 'PERSONAL';
    if (scope === 'GROUP') {
      if (!data.groupId) throw new BadRequestException('groupId required for group lists');
      await this.assertGroupMember(data.groupId, member.id);
    }

    const row = await this.prisma.devotionalPrayerList.create({
      data: {
        churchId,
        memberId: member.id,
        groupId: scope === 'GROUP' ? data.groupId : null,
        planId: data.planId,
        scope,
        title: data.title.trim(),
        items: {
          create: (data.items ?? []).map((item, i) => ({
            body: item.body.trim(),
            dayId: item.dayId,
            sortOrder: i,
          })),
        },
      },
      include: this.listInclude(),
    });
    return this.serializeList(row, member.id);
  }

  async updateList(
    churchId: string,
    userId: string,
    listId: string,
    dto: UpdatePrayerListDto,
  ) {
    const member = await this.requireMember(churchId, userId);
    const existing = await this.loadList(churchId, listId);
    await this.assertOwner(existing, member.id);

    const data: Prisma.DevotionalPrayerListUpdateInput = { title: dto.title?.trim() };
    if (dto.shareWithGroup && dto.groupId) {
      await this.assertGroupMember(dto.groupId, member.id);
      data.scope = 'GROUP';
      data.group = { connect: { id: dto.groupId } };
    }

    const row = await this.prisma.devotionalPrayerList.update({
      where: { id: listId },
      data,
      include: this.listInclude(),
    });
    return this.serializeList(row, member.id);
  }

  async deleteList(churchId: string, userId: string, listId: string) {
    const member = await this.requireMember(churchId, userId);
    const existing = await this.loadList(churchId, listId);
    await this.assertOwner(existing, member.id);
    await this.prisma.devotionalPrayerList.delete({ where: { id: listId } });
    return { ok: true };
  }

  async addItem(
    churchId: string,
    userId: string,
    listId: string,
    body: string,
    dayId?: string,
  ) {
    const member = await this.requireMember(churchId, userId);
    const list = await this.loadList(churchId, listId);
    await this.assertOwner(list, member.id);
    if (!body.trim()) throw new BadRequestException('Prayer text required');

    const maxOrder = list.items.reduce((m, i) => Math.max(m, i.sortOrder), -1);
    const item = await this.prisma.devotionalPrayerListItem.create({
      data: {
        listId,
        body: body.trim(),
        dayId,
        sortOrder: maxOrder + 1,
      },
    });
    await this.prisma.devotionalPrayerList.update({
      where: { id: listId },
      data: { updatedAt: new Date() },
    });
    return this.serializeItem(item);
  }

  async updateItem(
    churchId: string,
    userId: string,
    itemId: string,
    dto: UpdatePrayerItemDto,
  ) {
    const member = await this.requireMember(churchId, userId);
    const item = await this.prisma.devotionalPrayerListItem.findFirst({
      where: { id: itemId },
      include: { list: true },
    });
    if (!item || item.list.churchId !== churchId) throw new NotFoundException('Item not found');
    await this.assertOwner(item.list, member.id);

    const row = await this.prisma.devotionalPrayerListItem.update({
      where: { id: itemId },
      data: { body: dto.body?.trim() },
    });
    return this.serializeItem(row);
  }

  async deleteItem(churchId: string, userId: string, itemId: string) {
    const member = await this.requireMember(churchId, userId);
    const item = await this.prisma.devotionalPrayerListItem.findFirst({
      where: { id: itemId },
      include: { list: true },
    });
    if (!item || item.list.churchId !== churchId) throw new NotFoundException('Item not found');
    await this.assertOwner(item.list, member.id);
    await this.prisma.devotionalPrayerListItem.delete({ where: { id: itemId } });
    return { ok: true };
  }

  async setAnswered(
    churchId: string,
    userId: string,
    itemId: string,
    answered: boolean,
  ) {
    const member = await this.requireMember(churchId, userId);
    const item = await this.prisma.devotionalPrayerListItem.findFirst({
      where: { id: itemId },
      include: { list: true },
    });
    if (!item || item.list.churchId !== churchId) throw new NotFoundException('Item not found');
    await this.assertCanView(item.list, member.id);

    const row = await this.prisma.devotionalPrayerListItem.update({
      where: { id: itemId },
      data: {
        isAnswered: answered,
        answeredAt: answered ? new Date() : null,
      },
    });
    return this.serializeItem(row);
  }

  async generateBooster(
    churchId: string,
    userId: string,
    itemId: string,
    dto: PrayerBoosterDto,
  ) {
    const member = await this.requireMember(churchId, userId);
    const item = await this.prisma.devotionalPrayerListItem.findFirst({
      where: { id: itemId },
      include: { list: true },
    });
    if (!item || item.list.churchId !== churchId) throw new NotFoundException('Item not found');
    await this.assertCanView(item.list, member.id);

    const booster = buildPrayerPoints({
      source: 'TOPIC',
      prompt: item.body,
      context: dto.context,
    });

    await this.prisma.devotionalPrayerListItem.update({
      where: { id: itemId },
      data: { aiBooster: booster as unknown as Prisma.InputJsonValue },
    });

    return { itemId, booster };
  }

  async getStreak(churchId: string, userId: string) {
    const member = await this.requireMember(churchId, userId);
    const streak = await this.prisma.devotionalPrayerStreak.findUnique({
      where: { memberId: member.id },
    });
    const prayedToday = await this.prisma.devotionalPrayerDailyLog.findFirst({
      where: {
        memberId: member.id,
        prayedOn: startOfUtcDay(),
      },
    });

    return {
      streakDays: streak?.streakDays ?? 0,
      longestStreak: streak?.longestStreak ?? 0,
      lastPrayedOn: streak?.lastPrayedOn?.toISOString() ?? null,
      prayedToday: !!prayedToday,
    };
  }

  async recordPrayedToday(churchId: string, userId: string) {
    const member = await this.requireMember(churchId, userId);
    const today = startOfUtcDay();

    await this.prisma.devotionalPrayerDailyLog.upsert({
      where: { memberId_prayedOn: { memberId: member.id, prayedOn: today } },
      create: { churchId, memberId: member.id, prayedOn: today },
      update: {},
    });

    const logs = await this.prisma.devotionalPrayerDailyLog.findMany({
      where: { memberId: member.id },
      select: { prayedOn: true },
      orderBy: { prayedOn: 'desc' },
      take: 400,
    });

    const stats = computeStreakFromLogs(logs.map((l) => l.prayedOn));
    await this.prisma.devotionalPrayerStreak.upsert({
      where: { memberId: member.id },
      create: {
        churchId,
        memberId: member.id,
        streakDays: stats.streakDays,
        longestStreak: stats.longestStreak,
        lastPrayedOn: stats.lastPrayedOn,
      },
      update: {
        streakDays: stats.streakDays,
        longestStreak: stats.longestStreak,
        lastPrayedOn: stats.lastPrayedOn,
      },
    });

    return this.getStreak(churchId, userId);
  }

  async weeklyDigest(churchId: string, userId: string, weekKey?: string) {
    const member = await this.requireMember(churchId, userId);
    const key = weekKey ?? isoWeekKey();
    const { start, end } = weekRangeFromKey(key);

    const [answered, added, streak, openItems] = await Promise.all([
      this.prisma.devotionalPrayerListItem.findMany({
        where: {
          list: { churchId, OR: [{ memberId: member.id }, { scope: 'GROUP' }] },
          isAnswered: true,
          answeredAt: { gte: start, lt: end },
        },
        select: { id: true, body: true, answeredAt: true, list: { select: { title: true } } },
      }),
      this.prisma.devotionalPrayerListItem.findMany({
        where: {
          list: { churchId, memberId: member.id },
          createdAt: { gte: start, lt: end },
        },
        select: { id: true, body: true, createdAt: true, list: { select: { title: true } } },
      }),
      this.getStreak(churchId, userId),
      this.prisma.devotionalPrayerListItem.count({
        where: {
          list: { churchId, memberId: member.id },
          isAnswered: false,
        },
      }),
    ]);

    const prayedDays = await this.prisma.devotionalPrayerDailyLog.count({
      where: {
        memberId: member.id,
        prayedOn: { gte: start, lt: end },
      },
    });

    return {
      weekKey: key,
      range: { start: start.toISOString(), end: end.toISOString() },
      streak,
      prayedDaysThisWeek: prayedDays,
      answered: answered.map((a) => ({
        id: a.id,
        body: a.body,
        listTitle: a.list.title,
        answeredAt: a.answeredAt?.toISOString(),
      })),
      added: added.map((a) => ({
        id: a.id,
        body: a.body,
        listTitle: a.list.title,
        createdAt: a.createdAt.toISOString(),
      })),
      openCount: openItems,
      summary: `This week you prayed on ${prayedDays} day(s), marked ${answered.length} request(s) answered, and added ${added.length} new item(s). ${openItems} still open.`,
    };
  }
}
