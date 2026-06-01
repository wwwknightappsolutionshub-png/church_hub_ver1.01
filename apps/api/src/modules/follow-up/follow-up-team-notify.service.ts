import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.module';
import { EmailAdapter } from '../notifications/adapters/email.adapter';

const TEAM_ROLES = ['ADMIN', 'PASTOR', 'LEADER'] as const;

export interface NewLeadTeamAlertParams {
  churchId: string;
  followUpId: string;
  contactName: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
  assignedToId?: string | null;
  evangelistName?: string | null;
}

@Injectable()
export class FollowUpTeamNotifyService {
  private readonly logger = new Logger(FollowUpTeamNotifyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailAdapter,
  ) {}

  /** Map evangelist Member → linked User (staff account). */
  async resolveUserIdFromMember(churchId: string, memberId?: string | null): Promise<string | undefined> {
    if (!memberId) return undefined;
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, churchId },
      select: { userId: true, firstName: true, lastName: true },
    });
    if (!member?.userId) return undefined;
    const user = await this.prisma.user.findFirst({
      where: { id: member.userId, churchId, isActive: true },
      select: { id: true },
    });
    return user?.id;
  }

  /** Prefer QR evangelist's user; else capturing staff if they are on the follow-up team. */
  async resolveAssigneeForCapture(
    churchId: string,
    opts: { evangelistMemberId?: string | null; capturedByUserId?: string | null },
  ): Promise<string | undefined> {
    const fromEvangelist = await this.resolveUserIdFromMember(churchId, opts.evangelistMemberId);
    if (fromEvangelist) return fromEvangelist;

    if (!opts.capturedByUserId) return undefined;

    const capturer = await this.prisma.user.findFirst({
      where: { id: opts.capturedByUserId, churchId, isActive: true },
      include: { roles: { include: { role: true } } },
    });
    if (!capturer) return undefined;

    const roleNames = capturer.roles.map((r) => r.role.name);
    if (TEAM_ROLES.some((r) => roleNames.includes(r))) {
      return capturer.id;
    }
    return undefined;
  }

  async getEvangelistDisplayName(churchId: string, memberId?: string | null): Promise<string | null> {
    if (!memberId) return null;
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, churchId },
      select: { firstName: true, lastName: true },
    });
    if (!member) return null;
    return `${member.firstName} ${member.lastName}`.trim();
  }

  /** In-app notification + email to every follow-up team user (ADMIN / PASTOR / LEADER). */
  async notifyTeamOnNewLead(params: NewLeadTeamAlertParams): Promise<void> {
    const team = await this.prisma.user.findMany({
      where: {
        churchId: params.churchId,
        isActive: true,
        roles: { some: { role: { name: { in: [...TEAM_ROLES] } } } },
      },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    if (team.length === 0) {
      this.logger.warn(`No follow-up team users for church ${params.churchId}`);
      return;
    }

    const church = await this.prisma.church.findUnique({
      where: { id: params.churchId },
      select: { name: true },
    });
    const churchName = church?.name ?? 'Your church';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';

    const assignee = params.assignedToId
      ? team.find((u) => u.id === params.assignedToId)
      : undefined;
    const assigneeLabel = assignee
      ? `${assignee.firstName} ${assignee.lastName}`
      : 'Unassigned';

    const contactLines = [
      params.contactPhone ? `Phone: ${params.contactPhone}` : null,
      params.contactEmail ? `Email: ${params.contactEmail}` : null,
      params.evangelistName ? `Captured by: ${params.evangelistName}` : null,
      `Assigned to: ${assigneeLabel}`,
    ]
      .filter(Boolean)
      .join('\n');

    const title = `New outreach lead: ${params.contactName}`;
    const body = `A fast capture was added to Follow-Up as New Lead.\n\n${contactLines}\n\nOpen the pipeline: ${appUrl}/dashboard/follow-up`;

    await Promise.all(
      team.map(async (user) => {
        await this.prisma.notification.create({
          data: {
            churchId: params.churchId,
            userId: user.id,
            title,
            body,
            type: 'FOLLOW_UP_NEW_LEAD',
            data: {
              followUpId: params.followUpId,
              assignedToId: params.assignedToId ?? null,
            },
          },
        });

        if (user.email) {
          await this.email.send({
            to: user.email,
            subject: `[${churchName}] ${title}`,
            body: `Hi ${user.firstName},\n\n${body}`,
            churchId: params.churchId,
          });
        }
      }),
    );

    this.logger.log(
      `Notified ${team.length} follow-up team member(s) for lead ${params.followUpId}`,
    );
  }
}
