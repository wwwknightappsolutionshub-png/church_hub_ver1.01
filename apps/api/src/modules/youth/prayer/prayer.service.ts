import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, YouthPrayerCategory, YouthPrayerSupportType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.module';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { scanYouthContent } from '../common/moderation.util';
import { YOUTH_GAMIFICATION_INTEGRATIONS } from '../gamification/gamification.integrations';
import { YouthAccessService } from '../common/youth-access.service';
import { YouthGamificationService } from '../gamification/gamification.service';
import { PRAYER_CATEGORY_LABELS, PRAYER_NOTIFICATION_TYPE } from './prayer.constants';

const prayerInclude = {
  member: { select: { id: true, firstName: true, lastName: true, userId: true } },
  supports: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      member: { select: { id: true, firstName: true, lastName: true } },
    },
  },
} satisfies Prisma.YouthPrayerRequestInclude;

type PrayerRow = Prisma.YouthPrayerRequestGetPayload<{
  include: typeof prayerInclude;
}>;

@Injectable()
export class YouthPrayerService {
  static readonly MODULE_KEY = 'youth/prayer' as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    private readonly gamification: YouthGamificationService,
    private readonly access: YouthAccessService,
  ) {}

  private async requireMember(churchId: string, userId: string) {
    const member = await this.prisma.member.findFirst({
      where: { churchId, userId },
      select: { id: true, firstName: true, lastName: true, userId: true },
    });
    if (!member) {
      throw new BadRequestException(
        'Link your account to a member profile to use the prayer wall',
      );
    }
    return member;
  }

  private displayName(row: PrayerRow) {
    if (row.isAnonymous) return row.alias?.trim() || 'Anonymous';
    if (row.member) return row.member.firstName;
    return row.alias?.trim() || 'Youth';
  }

  private serializePrayer(
    row: PrayerRow,
    viewerMemberId?: string,
    opts?: { includeEncouragements?: boolean },
  ) {
    const prayers = row.supports.filter((s) => s.supportType === 'PRAY');
    const encouragements = row.supports.filter(
      (s) => s.supportType === 'ENCOURAGEMENT',
    );
    const hasPrayed = viewerMemberId
      ? prayers.some((s) => s.memberId === viewerMemberId)
      : false;

    return {
      id: row.id,
      category: row.category,
      content: row.content,
      isAnonymous: row.isAnonymous,
      displayName: this.displayName(row),
      prayCount: row.prayCount,
      encouragementCount: encouragements.length,
      allowComments: row.allowComments,
      status: row.status,
      isOwner: viewerMemberId ? row.memberId === viewerMemberId : false,
      hasPrayed,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      encouragements: opts?.includeEncouragements
        ? encouragements.map((e) => ({
            id: e.id,
            body: e.body ?? '',
            createdAt: e.createdAt.toISOString(),
            author: row.isAnonymous
              ? { firstName: e.member.firstName, lastName: '' }
              : {
                  firstName: e.member.firstName,
                  lastName: e.member.lastName,
                },
          }))
        : undefined,
    };
  }

  private async notifyPrayedForYou(
    churchId: string,
    prayer: PrayerRow,
    prayMember: { firstName: string; lastName: string },
  ) {
    const ownerUserId = prayer.member?.userId;
    if (!ownerUserId) return;

    const title = 'Someone prayed for you';
    const body = `${prayMember.firstName} prayed for your ${PRAYER_CATEGORY_LABELS[prayer.category] ?? 'prayer'} request`;

    await this.prisma.notification.create({
      data: {
        churchId,
        userId: ownerUserId,
        title,
        body,
        type: PRAYER_NOTIFICATION_TYPE,
        data: {
          prayerId: prayer.id,
          kind: 'prayed',
        } as Prisma.InputJsonValue,
      },
    });

    this.realtime.server
      ?.to(`church:${churchId}`)
      .emit('youth:notification', {
        userId: ownerUserId,
        title,
        body,
        type: PRAYER_NOTIFICATION_TYPE,
        prayerId: prayer.id,
      });
  }

  async listFeed(
    churchId: string,
    userId: string,
    filters?: { category?: YouthPrayerCategory; limit?: number },
  ) {
    let viewerMemberId: string | undefined;
    try {
      const m = await this.requireMember(churchId, userId);
      viewerMemberId = m.id;
    } catch {
      viewerMemberId = undefined;
    }

    const rows = await this.prisma.youthPrayerRequest.findMany({
      where: {
        churchId,
        status: 'ACTIVE',
        ...(filters?.category ? { category: filters.category } : {}),
      },
      include: prayerInclude,
      orderBy: { createdAt: 'desc' },
      take: Math.min(filters?.limit ?? 50, 100),
    });

    return rows.map((r) => this.serializePrayer(r, viewerMemberId));
  }

  async listMine(churchId: string, userId: string) {
    const member = await this.requireMember(churchId, userId);
    const rows = await this.prisma.youthPrayerRequest.findMany({
      where: { churchId, memberId: member.id },
      include: prayerInclude,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) =>
      this.serializePrayer(r, member.id, { includeEncouragements: true }),
    );
  }

  async listPrayedForMeNotifications(churchId: string, userId: string) {
    return this.prisma.notification.findMany({
      where: {
        churchId,
        userId,
        type: PRAYER_NOTIFICATION_TYPE,
      },
      orderBy: { sentAt: 'desc' },
      take: 30,
    });
  }

  async getRequest(churchId: string, userId: string, prayerId: string) {
    const row = await this.prisma.youthPrayerRequest.findFirst({
      where: { id: prayerId, churchId },
      include: prayerInclude,
    });
    if (!row) throw new NotFoundException('Prayer request not found');
    if (row.status === 'HIDDEN') {
      const isLeader = await this.access.isLeader(userId);
      let viewerMemberId: string | undefined;
      try {
        const m = await this.requireMember(churchId, userId);
        viewerMemberId = m.id;
      } catch {
        viewerMemberId = undefined;
      }
      if (!isLeader && row.memberId !== viewerMemberId) {
        throw new NotFoundException('Prayer request not found');
      }
    }

    let viewerMemberId: string | undefined;
    try {
      const m = await this.requireMember(churchId, userId);
      viewerMemberId = m.id;
    } catch {
      viewerMemberId = undefined;
    }

    return this.serializePrayer(row, viewerMemberId, {
      includeEncouragements: true,
    });
  }

  async createRequest(
    churchId: string,
    userId: string,
    data: {
      content: string;
      category?: YouthPrayerCategory;
      isAnonymous?: boolean;
      alias?: string;
      allowComments?: boolean;
    },
  ) {
    const trimmed = data.content?.trim();
    if (!trimmed || trimmed.length < 5) {
      throw new BadRequestException('Prayer request must be at least 5 characters');
    }

    const isLeader = await this.access.isLeader(userId);
    const hit = scanYouthContent(trimmed, { strictSafeMode: !isLeader });
    if (hit) throw new BadRequestException(`Request blocked: ${hit}`);

    const member = await this.prisma.member.findFirst({
      where: { churchId, userId },
      select: { id: true },
    });
    const isAnonymous = data.isAnonymous !== false;

    if (!isAnonymous && !member) {
      throw new BadRequestException(
        'Link your account to a member profile to post with your name',
      );
    }

    const memberId = member?.id ?? null;

    const row = await this.prisma.youthPrayerRequest.create({
      data: {
        churchId,
        memberId,
        content: trimmed,
        category: data.category ?? 'OTHER',
        isAnonymous,
        alias: isAnonymous ? data.alias?.trim() || 'Anonymous' : undefined,
        allowComments: data.allowComments !== false,
        status: 'ACTIVE',
      },
      include: prayerInclude,
    });

    if (memberId) {
      const { source, reason } = YOUTH_GAMIFICATION_INTEGRATIONS.prayer.request;
      await this.gamification.scoreEvent(churchId, memberId, source, {
        reason,
        sourceId: row.id,
      }).catch(() => undefined);
    }

    return this.serializePrayer(row, memberId ?? undefined, {
      includeEncouragements: true,
    });
  }

  async updateRequest(
    churchId: string,
    userId: string,
    prayerId: string,
    data: {
      content?: string;
      category?: YouthPrayerCategory;
      allowComments?: boolean;
      isAnonymous?: boolean;
      alias?: string;
    },
  ) {
    const member = await this.requireMember(churchId, userId);
    const existing = await this.prisma.youthPrayerRequest.findFirst({
      where: { id: prayerId, churchId },
    });
    if (!existing) throw new NotFoundException('Prayer request not found');
    const isLeader = await this.access.isLeader(userId);
    if (!isLeader && existing.memberId !== member.id) {
      throw new ForbiddenException('You can only edit your own requests');
    }

    const trimmed = data.content?.trim();
    if (trimmed) {
      const isLeader = await this.access.isLeader(userId);
      const hit = scanYouthContent(trimmed, { strictSafeMode: !isLeader });
      if (hit) throw new BadRequestException(`Request blocked: ${hit}`);
    }

    const row = await this.prisma.youthPrayerRequest.update({
      where: { id: prayerId },
      data: {
        ...(trimmed ? { content: trimmed } : {}),
        ...(data.category ? { category: data.category } : {}),
        ...(data.allowComments !== undefined
          ? { allowComments: data.allowComments }
          : {}),
        ...(data.isAnonymous !== undefined
          ? {
              isAnonymous: data.isAnonymous,
              alias: data.isAnonymous
                ? data.alias?.trim() || existing.alias || 'Anonymous'
                : null,
            }
          : {}),
      },
      include: prayerInclude,
    });

    return this.serializePrayer(row, member.id, { includeEncouragements: true });
  }

  async archiveRequest(churchId: string, userId: string, prayerId: string) {
    const member = await this.requireMember(churchId, userId);
    const existing = await this.prisma.youthPrayerRequest.findFirst({
      where: { id: prayerId, churchId },
    });
    if (!existing) throw new NotFoundException('Prayer request not found');
    const isLeader = await this.access.isLeader(userId);
    if (!isLeader && existing.memberId !== member.id) {
      throw new ForbiddenException('You can only remove your own requests');
    }

    const row = await this.prisma.youthPrayerRequest.update({
      where: { id: prayerId },
      data: { status: 'ARCHIVED' },
      include: prayerInclude,
    });
    return this.serializePrayer(row, member.id);
  }

  async tapPray(churchId: string, userId: string, prayerId: string) {
    const prayMember = await this.requireMember(churchId, userId);
    const row = await this.prisma.youthPrayerRequest.findFirst({
      where: { id: prayerId, churchId, status: 'ACTIVE' },
      include: prayerInclude,
    });
    if (!row) throw new NotFoundException('Prayer request not found');

    const existing = await this.prisma.youthPrayerSupport.findUnique({
      where: {
        prayerId_memberId_supportType: {
          prayerId,
          memberId: prayMember.id,
          supportType: 'PRAY',
        },
      },
    });

    if (existing) {
      return this.serializePrayer(row, prayMember.id);
    }

    await this.prisma.$transaction([
      this.prisma.youthPrayerSupport.create({
        data: {
          prayerId,
          memberId: prayMember.id,
          supportType: 'PRAY',
        },
      }),
      this.prisma.youthPrayerRequest.update({
        where: { id: prayerId },
        data: { prayCount: { increment: 1 } },
      }),
    ]);

    const updated = await this.prisma.youthPrayerRequest.findFirst({
      where: { id: prayerId },
      include: prayerInclude,
    });
    if (!updated) throw new NotFoundException('Prayer request not found');

    if (row.memberId && row.memberId !== prayMember.id) {
      await this.notifyPrayedForYou(churchId, updated, prayMember);
    }

    const tap = YOUTH_GAMIFICATION_INTEGRATIONS.prayer.tapPray;
    await this.gamification
      .scoreEvent(churchId, prayMember.id, tap.source, {
        reason: tap.reason,
        sourceId: prayerId,
      })
      .catch(() => undefined);

    return this.serializePrayer(updated, prayMember.id);
  }

  async addEncouragement(
    churchId: string,
    userId: string,
    prayerId: string,
    body: string,
  ) {
    const member = await this.requireMember(churchId, userId);
    const trimmed = body?.trim();
    if (!trimmed) throw new BadRequestException('Encouragement message is required');

    const isLeader = await this.access.isLeader(userId);
    const hit = scanYouthContent(trimmed, { strictSafeMode: !isLeader });
    if (hit) throw new BadRequestException(`Message blocked: ${hit}`);

    const row = await this.prisma.youthPrayerRequest.findFirst({
      where: { id: prayerId, churchId, status: 'ACTIVE' },
      include: { member: { select: { userId: true } } },
    });
    if (!row) throw new NotFoundException('Prayer request not found');
    if (!row.allowComments) {
      throw new BadRequestException('Comments are disabled on this request');
    }

    await this.prisma.youthPrayerSupport.upsert({
      where: {
        prayerId_memberId_supportType: {
          prayerId,
          memberId: member.id,
          supportType: 'ENCOURAGEMENT',
        },
      },
      create: {
        prayerId,
        memberId: member.id,
        supportType: 'ENCOURAGEMENT',
        body: trimmed,
      },
      update: { body: trimmed },
    });

    const updated = await this.prisma.youthPrayerRequest.findFirst({
      where: { id: prayerId },
      include: prayerInclude,
    });
    if (!updated) throw new NotFoundException('Prayer request not found');

    const enc = YOUTH_GAMIFICATION_INTEGRATIONS.prayer.encourage;
    await this.gamification
      .scoreEvent(churchId, member.id, enc.source, {
        reason: enc.reason,
        sourceId: prayerId,
      })
      .catch(() => undefined);

    if (row.memberId && row.memberId !== member.id) {
      const ownerUserId = updated.member?.userId;
      if (ownerUserId) {
        await this.prisma.notification.create({
          data: {
            churchId,
            userId: ownerUserId,
            title: 'New encouragement on your prayer',
            body: `${member.firstName} left an encouraging message`,
            type: PRAYER_NOTIFICATION_TYPE,
            data: { prayerId, kind: 'encouragement' } as Prisma.InputJsonValue,
          },
        });
        this.realtime.server
          ?.to(`church:${churchId}`)
          .emit('youth:notification', {
            userId: ownerUserId,
            title: 'New encouragement',
            prayerId,
          });
      }
    }

    return this.serializePrayer(updated, member.id, {
      includeEncouragements: true,
    });
  }

  async hideRequest(churchId: string, prayerId: string) {
    const row = await this.prisma.youthPrayerRequest.update({
      where: { id: prayerId },
      data: { status: 'HIDDEN' },
      include: prayerInclude,
    });
    return this.serializePrayer(row);
  }
}
