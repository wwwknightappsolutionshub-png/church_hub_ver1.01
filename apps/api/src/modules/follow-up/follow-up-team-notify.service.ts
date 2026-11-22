import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.module';
import { EmailAdapter } from '../notifications/adapters/email.adapter';
import { SmsAdapter } from '../notifications/adapters/sms.adapter';
import { trySendWhatsApp } from '../notifications/try-send-whatsapp';
import {
  ESTABLISHMENT_MANAGER_UNIT_NAMES,
} from '../access/access.constants';
import { ASSIGNMENT_STAGE_SLA_HOURS } from './follow-up-assignment-sla';

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
    private readonly sms: SmsAdapter,
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
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
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
    const body = `A fast capture was added to Establishment as New Contact.\n\n${contactLines}\n\nOpen Establishment: ${appUrl}/dashboard/establishment`;

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
        await trySendWhatsApp(this.sms, this.logger, {
          to: user.phone,
          body: `Hi ${user.firstName},\n\n${body}`,
          churchId: params.churchId,
          label: 'Follow-up new lead team',
        });
      }),
    );

    this.logger.log(
      `Notified ${team.length} follow-up team member(s) for lead ${params.followUpId}`,
    );
  }

  /** In-app (+ email) alert when an outreach member requests archive (DND). */
  async notifyTeamOnArchiveRequest(params: {
    churchId: string;
    followUpId: string;
    contactName: string;
    reason: string;
    requesterName: string;
  }): Promise<void> {
    const team = await this.prisma.user.findMany({
      where: {
        churchId: params.churchId,
        isActive: true,
        roles: { some: { role: { name: { in: [...TEAM_ROLES] } } } },
      },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    });

    if (team.length === 0) {
      this.logger.warn(`No follow-up leaders for archive request church ${params.churchId}`);
      return;
    }

    const church = await this.prisma.church.findUnique({
      where: { id: params.churchId },
      select: { name: true },
    });
    const churchName = church?.name ?? 'Your church';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';

    const title = `Archive requested: ${params.contactName}`;
    const body = `${params.requesterName} requested this lead be archived (DND).\n\nReason: ${params.reason}\n\nReview in Establishment: ${appUrl}/dashboard/establishment`;

    await Promise.all(
      team.map(async (user) => {
        await this.prisma.notification.create({
          data: {
            churchId: params.churchId,
            userId: user.id,
            title,
            body,
            type: 'FOLLOW_UP_ARCHIVE_REQUEST',
            data: {
              followUpId: params.followUpId,
              channel: 'push',
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
        await trySendWhatsApp(this.sms, this.logger, {
          to: user.phone,
          body: `Hi ${user.firstName},\n\n${body}`,
          churchId: params.churchId,
          label: 'Follow-up archive request team',
        });
      }),
    );

    this.logger.log(
      `Notified ${team.length} leader(s) of archive request for ${params.followUpId}`,
    );
  }

  /** Day-6 alert: convert Joined Group leads to Members before the 7-day retention ends. */
  async notifyTeamOnJoinedGroupDay6(params: {
    churchId: string;
    followUpId: string;
    contactName: string;
    hasMemberLink: boolean;
  }): Promise<void> {
    const team = await this.prisma.user.findMany({
      where: {
        churchId: params.churchId,
        isActive: true,
        roles: { some: { role: { name: { in: [...TEAM_ROLES] } } } },
      },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    });

    if (team.length === 0) {
      this.logger.warn(
        `No follow-up leaders for Joined Group day-6 alert church ${params.churchId}`,
      );
      return;
    }

    const church = await this.prisma.church.findUnique({
      where: { id: params.churchId },
      select: { name: true },
    });
    const churchName = church?.name ?? 'Your church';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';

    const title = `Convert to Member: ${params.contactName}`;
    const body = params.hasMemberLink
      ? `${params.contactName} has been in Joined Group for 6 days and leaves this phase tomorrow.\n\nConfirm their Membership status in Establishment: ${appUrl}/dashboard/establishment`
      : `${params.contactName} has been in Joined Group for 6 days. Update their status to Members before day 7 (they leave this phase automatically).\n\nOpen Establishment: ${appUrl}/dashboard/establishment`;

    await Promise.all(
      team.map(async (user) => {
        await this.prisma.notification.create({
          data: {
            churchId: params.churchId,
            userId: user.id,
            title,
            body,
            type: 'FOLLOW_UP_JOINED_GROUP_DAY6',
            data: {
              followUpId: params.followUpId,
              channel: 'push',
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
        await trySendWhatsApp(this.sms, this.logger, {
          to: user.phone,
          body: `Hi ${user.firstName},\n\n${body}`,
          churchId: params.churchId,
          label: 'Follow-up joined-group day-6 team',
        });
      }),
    );

    this.logger.log(
      `Notified ${team.length} leader(s) of Joined Group day-6 for ${params.followUpId}`,
    );
  }

  /** Unit admins on Follow-up / Harvesters; falls back to church ADMIN/PASTOR. */
  async resolveEstablishmentUnitLeaderUserIds(churchId: string): Promise<string[]> {
    const unitLeaders = await this.prisma.serviceUnitLeader.findMany({
      where: {
        isUnitAdmin: true,
        serviceUnit: {
          churchId,
          name: { in: [...ESTABLISHMENT_MANAGER_UNIT_NAMES] },
        },
        member: { userId: { not: null } },
      },
      select: { member: { select: { userId: true } } },
    });
    const fromUnits = [
      ...new Set(
        unitLeaders
          .map((row) => row.member.userId)
          .filter((id): id is string => !!id),
      ),
    ];
    if (fromUnits.length > 0) return fromUnits;

    const staff = await this.prisma.user.findMany({
      where: {
        churchId,
        isActive: true,
        roles: { some: { role: { name: { in: ['ADMIN', 'PASTOR'] } } } },
      },
      select: { id: true },
    });
    return staff.map((u) => u.id);
  }

  /**
   * 72h assignment SLA breach — in-app to unit leaders; email reminder to assignee.
   */
  async notifyAssignmentStageOverdue(params: {
    churchId: string;
    followUpId: string;
    contactName: string;
    assignedToId: string;
  }): Promise<void> {
    const church = await this.prisma.church.findUnique({
      where: { id: params.churchId },
      select: { name: true },
    });
    const churchName = church?.name ?? 'Your church';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';
    const hours = ASSIGNMENT_STAGE_SLA_HOURS;

    const leaderIds = await this.resolveEstablishmentUnitLeaderUserIds(params.churchId);
    const title = `Overdue: ${params.contactName}`;
    const leaderBody = `${params.contactName} has had no stage update for ${hours}+ hours since assignment.\n\nOpen Establishment: ${appUrl}/dashboard/establishment`;

    await Promise.all(
      leaderIds.map(async (userId) => {
        await this.prisma.notification.create({
          data: {
            churchId: params.churchId,
            userId,
            title,
            body: leaderBody,
            type: 'FOLLOW_UP_ASSIGNMENT_OVERDUE',
            data: {
              followUpId: params.followUpId,
              assignedToId: params.assignedToId,
              channel: 'push',
            },
          },
        });
      }),
    );

    const assignee = await this.prisma.user.findFirst({
      where: { id: params.assignedToId, churchId: params.churchId, isActive: true },
      select: { id: true, firstName: true, email: true },
    });
    if (assignee?.email) {
      await this.email.send({
        to: assignee.email,
        subject: `[${churchName}] Reminder: update stage for ${params.contactName}`,
        body: `Hi ${assignee.firstName},\n\n${params.contactName} was assigned to you more than ${hours} hours ago and the Establishment stage has not changed yet.\n\nPlease update the contact status in Establishment:\n${appUrl}/dashboard/establishment\n`,
        churchId: params.churchId,
      });
    } else if (!assignee) {
      this.logger.warn(
        `Assignment overdue email skipped — assignee ${params.assignedToId} missing`,
      );
    } else {
      this.logger.warn(
        `Assignment overdue email skipped — assignee ${assignee.id} has no email`,
      );
    }

    this.logger.log(
      `Assignment overdue alerts for ${params.followUpId}: ${leaderIds.length} leader(s), assignee email=${!!assignee?.email}`,
    );
  }

  /**
   * Phase 4 — notify the assignee when a contact is assigned / reassigned to them.
   * In-app always; email + WhatsApp when configured contact details exist.
   */
  async notifyAssigneeOnAssignment(params: {
    churchId: string;
    followUpId: string;
    contactName: string;
    assignedToId: string;
    assignedByUserId?: string | null;
  }): Promise<void> {
    const assignee = await this.prisma.user.findFirst({
      where: { id: params.assignedToId, churchId: params.churchId, isActive: true },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    });
    if (!assignee) {
      this.logger.warn(
        `Assignment notify skipped — assignee ${params.assignedToId} not found in church ${params.churchId}`,
      );
      return;
    }

    let assignerLabel = 'a leader';
    if (params.assignedByUserId) {
      const assigner = await this.prisma.user.findFirst({
        where: { id: params.assignedByUserId, churchId: params.churchId },
        select: { firstName: true, lastName: true },
      });
      if (assigner) {
        assignerLabel = `${assigner.firstName} ${assigner.lastName}`.trim();
      }
    }

    const church = await this.prisma.church.findUnique({
      where: { id: params.churchId },
      select: { name: true },
    });
    const churchName = church?.name ?? 'Your church';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';

    const title = `Assigned: ${params.contactName}`;
    const body = `${assignerLabel} assigned ${params.contactName} to you in Establishment.\n\nOpen: ${appUrl}/dashboard/establishment`;

    await this.prisma.notification.create({
      data: {
        churchId: params.churchId,
        userId: assignee.id,
        title,
        body,
        type: 'FOLLOW_UP_ASSIGNED',
        data: {
          followUpId: params.followUpId,
          assignedToId: assignee.id,
          assignedByUserId: params.assignedByUserId ?? null,
        },
      },
    });

    if (assignee.email) {
      await this.email.send({
        to: assignee.email,
        subject: `[${churchName}] ${title}`,
        body: `Hi ${assignee.firstName},\n\n${body}`,
        churchId: params.churchId,
      });
    }
    await trySendWhatsApp(this.sms, this.logger, {
      to: assignee.phone,
      body: `Hi ${assignee.firstName},\n\n${body}`,
      churchId: params.churchId,
      label: 'Establishment assignment',
    });

    this.logger.log(
      `Assignment notification sent to ${assignee.id} for follow-up ${params.followUpId}`,
    );
  }
}
