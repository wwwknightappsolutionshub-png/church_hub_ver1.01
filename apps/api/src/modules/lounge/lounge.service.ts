import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.module';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { MemberProfileService } from '../member-profile/member-profile.service';

const ONLINE_TTL_MS = 90_000;
const CONNECT_SUBJECT = 'Connection request — Church Lounge';

type LoungePresenceDelegate = {
  upsert: (args: object) => Promise<{ memberId: string }>;
  findMany: (args: object) => Promise<{ memberId: string }[]>;
};

@Injectable()
export class LoungeService {
  private get loungeDb(): LoungePresenceDelegate {
    return (this.prisma as PrismaService & { loungePresence: LoungePresenceDelegate })
      .loungePresence;
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    private readonly profiles: MemberProfileService,
  ) {}

  async viewerMemberId(churchId: string, userId: string) {
    const m = await this.prisma.member.findFirst({
      where: { churchId, userId },
      select: { id: true },
    });
    return m?.id ?? null;
  }

  async listMembers(churchId: string, viewerMemberId: string | null) {
    const members = await this.prisma.member.findMany({
      where: {
        churchId,
        status: { in: ['ACTIVE_MEMBER', 'DISCIPLED', 'NEW_MEMBER'] },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        status: true,
        userId: true,
        businessProfile: {
          select: { category: true, tagline: true, businessName: true },
        },
        serviceUnitMemberships: {
          include: { serviceUnit: { select: { name: true } } },
          take: 4,
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      take: 120,
    });

    const onlineIds = await this.resolveOnlineMemberIds(churchId);

    return members.map((m) => ({
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      displayName: `${m.firstName} ${m.lastName}`.trim(),
      membershipStatus: m.status,
      userId: m.userId,
      profession: this.professionLabel(m.businessProfile),
      serviceUnits: m.serviceUnitMemberships.map((su) => su.serviceUnit.name),
      isOnline: onlineIds.has(m.id),
      isSelf: m.id === viewerMemberId,
      canConnect: !!m.userId && m.id !== viewerMemberId,
    }));
  }

  async heartbeat(churchId: string, memberId: string) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, churchId },
    });
    if (!member) throw new NotFoundException('Member not found');

    const record = await this.loungeDb.upsert({
      where: { churchId_memberId: { churchId, memberId } },
      create: { churchId, memberId, isOnline: true, lastSeenAt: new Date() },
      update: { isOnline: true, lastSeenAt: new Date() },
    });
    this.realtime.setLoungeMemberOnline(churchId, memberId);
    return record;
  }

  async getPresence(churchId: string) {
    const onlineMemberIds = await this.resolveOnlineMemberIds(churchId);
    return { onlineMemberIds: [...onlineMemberIds] };
  }

  async requestConnect(
    churchId: string,
    senderUserId: string,
    targetMemberId: string,
  ) {
    const senderMember = await this.prisma.member.findFirst({
      where: { churchId, userId: senderUserId },
      select: { id: true, firstName: true, lastName: true },
    });
    const target = await this.prisma.member.findFirst({
      where: { id: targetMemberId, churchId },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
      },
    });
    if (!target) throw new NotFoundException('Member not found');
    if (!target.userId) {
      throw new BadRequestException('This member has not linked a login account yet');
    }
    if (target.userId === senderUserId) {
      throw new BadRequestException('You cannot connect with yourself');
    }

    const senderName = senderMember
      ? `${senderMember.firstName} ${senderMember.lastName}`
      : 'A church member';

    const body = `Hi ${target.firstName},\n\nI'd like to connect with you through the Church Lounge. Would you be open to getting to know each other in our church community?\n\nBlessings,\n${senderName}`;

    return this.profiles.sendMessage(churchId, senderUserId, {
      recipientId: target.userId,
      subject: CONNECT_SUBJECT,
      body,
    });
  }

  private professionLabel(
    profile: {
      category: string | null;
      tagline: string | null;
      businessName: string | null;
    } | null,
  ): string {
    if (!profile) return 'Church member';
    return (
      profile.category?.trim() ||
      profile.tagline?.trim() ||
      profile.businessName?.trim() ||
      'Church member'
    );
  }

  private async resolveOnlineMemberIds(churchId: string): Promise<Set<string>> {
    const cutoff = new Date(Date.now() - ONLINE_TTL_MS);
    const fromDb = await this.loungeDb.findMany({
      where: {
        churchId,
        isOnline: true,
        lastSeenAt: { gte: cutoff },
      },
      select: { memberId: true },
    });
    const fromSocket = this.realtime.getLoungeOnlineMembers(churchId);
    return new Set([
      ...fromDb.map((r: { memberId: string }) => r.memberId),
      ...fromSocket,
    ]);
  }
}
