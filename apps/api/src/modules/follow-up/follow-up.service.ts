import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FollowUpStage } from '@prisma/client';
import {
  CreateFollowUpSchema,
  optionalEmailSchema,
  optionalPhoneSchema,
} from '@church-hub/shared-types';
import { PrismaService } from '../../prisma/prisma.module';
import { NotificationsQueueService } from '../notifications/notifications-queue.service';
import { EmailAdapter } from '../notifications/adapters/email.adapter';
import { SmsAdapter } from '../notifications/adapters/sms.adapter';
import {
  DEFAULT_FOLLOW_UP_TEMPLATES,
  FOLLOW_UP_STAGE_ORDER,
} from './follow-up.constants';
import { FollowUpTeamNotifyService } from './follow-up-team-notify.service';
import { FollowUpAutomationService } from './follow-up-automation.service';

const followUpInclude = {
  member: { select: { id: true, firstName: true, lastName: true, email: true } },
  assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
  archivedBy: { select: { id: true, firstName: true, lastName: true } },
  archiveRequestedBy: { select: { id: true, firstName: true, lastName: true } },
  reminders: { orderBy: { remindAt: 'asc' as const } },
};

@Injectable()
export class FollowUpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsQueueService,
    private readonly sms: SmsAdapter,
    private readonly email: EmailAdapter,
    private readonly teamNotify: FollowUpTeamNotifyService,
    private readonly automation: FollowUpAutomationService,
  ) {}

  async list(
    churchId: string,
    stage?: FollowUpStage,
    assignedToId?: string,
    opts?: { archived?: boolean },
  ) {
    const archived = opts?.archived === true;
    return this.prisma.followUp.findMany({
      where: {
        churchId,
        ...(stage ? { stage } : {}),
        ...(assignedToId ? { assignedToId } : {}),
        ...(archived ? { archivedAt: { not: null } } : { archivedAt: null }),
      },
      include: followUpInclude,
      orderBy: archived
        ? [{ archivedAt: 'desc' }, { createdAt: 'desc' }]
        : [{ createdAt: 'desc' }],
    });
  }

  async listCalendar(
    churchId: string,
    from: Date,
    to: Date,
  ) {
    const items = await this.prisma.followUp.findMany({
      where: {
        churchId,
        archivedAt: null,
        dueAt: { gte: from, lte: to },
      },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { dueAt: 'asc' },
    });

    return items.map((f) => ({
      id: f.id,
      contactName: f.contactName,
      stage: f.stage,
      dueAt: f.dueAt,
      nextAction: f.nextAction,
      contactPhone: f.contactPhone,
      contactEmail: f.contactEmail,
      assignedTo: f.assignedTo,
      archiveRequestedAt: f.archiveRequestedAt,
    }));
  }

  async getOne(churchId: string, id: string) {
    const row = await this.prisma.followUp.findFirst({
      where: { id, churchId },
      include: {
        ...followUpInclude,
        pastoralNotes: {
          include: { author: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!row) throw new NotFoundException('Follow-up not found');
    return row;
  }

  async getStats(churchId: string) {
    const grouped = await this.prisma.followUp.groupBy({
      by: ['stage'],
      where: { churchId, archivedAt: null },
      _count: { id: true },
    });
    const byStage = Object.fromEntries(
      FOLLOW_UP_STAGE_ORDER.map((s) => [s, grouped.find((g) => g.stage === s)?._count.id ?? 0]),
    ) as Record<FollowUpStage, number>;

    const [pending, overdue, remindersDue, archived, archiveRequested] = await Promise.all([
      this.prisma.followUp.count({
        where: {
          churchId,
          archivedAt: null,
          stage: { notIn: ['JOINED_GROUP', 'ENLISTED_FOR_BAPTISM'] },
        },
      }),
      this.prisma.followUp.count({
        where: {
          churchId,
          archivedAt: null,
          stage: { notIn: ['JOINED_GROUP', 'ENLISTED_FOR_BAPTISM'] },
          dueAt: { lt: new Date() },
        },
      }),
      this.prisma.followUpReminder.count({
        where: {
          sentAt: null,
          remindAt: { lte: new Date(Date.now() + 24 * 60 * 60 * 1000) },
          followUp: { churchId, archivedAt: null },
        },
      }),
      this.prisma.followUp.count({
        where: { churchId, archivedAt: { not: null } },
      }),
      this.prisma.followUp.count({
        where: {
          churchId,
          archivedAt: null,
          archiveRequestedAt: { not: null },
        },
      }),
    ]);

    return { byStage, pending, overdue, remindersDue, archived, archiveRequested };
  }

  async listAssignees(churchId: string) {
    return this.prisma.user.findMany({
      where: {
        churchId,
        isActive: true,
        roles: {
          some: {
            role: { name: { in: ['ADMIN', 'PASTOR', 'LEADER'] } },
          },
        },
      },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: { firstName: 'asc' },
    });
  }

  async create(
    churchId: string,
    data: {
      memberId?: string;
      contactName: string;
      contactPhone?: string;
      contactEmail?: string;
      stage?: FollowUpStage;
      assignedToId?: string;
      dueAt?: string;
      notes?: string;
      referredBy?: string;
      scheduleReminder?: boolean;
      reminderChannel?: string;
    },
  ) {
    const contact = CreateFollowUpSchema.safeParse({
      memberId: data.memberId,
      contactName: data.contactName,
      contactPhone: data.contactPhone || undefined,
      contactEmail: data.contactEmail || undefined,
      stage: data.stage,
      assignedToId: data.assignedToId || undefined,
      dueAt: data.dueAt || undefined,
      notes: data.notes,
    });
    if (!contact.success) {
      throw new BadRequestException(contact.error.issues[0]?.message ?? 'Invalid follow-up details');
    }

    const followUp = await this.prisma.followUp.create({
      data: {
        churchId,
        memberId: contact.data.memberId,
        contactName: contact.data.contactName,
        contactPhone: contact.data.contactPhone,
        contactEmail: contact.data.contactEmail,
        stage: contact.data.stage ?? 'NEW_LEAD',
        assignedToId: contact.data.assignedToId ?? data.assignedToId,
        dueAt: data.dueAt ? new Date(data.dueAt) : undefined,
        notes: contact.data.notes,
        referredBy: data.referredBy?.trim() || null,
      },
      include: followUpInclude,
    });

    if (data.scheduleReminder !== false && followUp.dueAt) {
      await this.scheduleReminder(churchId, followUp.id, {
        remindAt: followUp.dueAt.toISOString(),
        channel: data.reminderChannel ?? 'WHATSAPP',
        message: `Follow-up reminder: ${data.contactName}`,
      });
    }

    await this.automation.onFollowUpEvent(churchId, followUp.id, 'NEW_LEAD');

    return this.getOne(churchId, followUp.id);
  }

  async update(
    churchId: string,
    id: string,
    data: Partial<{
      contactName: string;
      contactPhone: string;
      contactEmail: string;
      assignedToId: string | null;
      dueAt: string | null;
      notes: string;
      memberId: string | null;
    }>,
  ) {
    await this.getOne(churchId, id);
    const { dueAt, ...rest } = data;
    return this.prisma.followUp.update({
      where: { id },
      data: {
        ...rest,
        dueAt: dueAt === null ? null : dueAt ? new Date(dueAt) : undefined,
      },
      include: followUpInclude,
    });
  }

  async linkMember(
    churchId: string,
    followUpId: string,
    memberId: string,
    actorId?: string,
  ) {
    await this.getOne(churchId, followUpId);
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, churchId },
    });
    if (!member) throw new NotFoundException('Member not found');

    const updated = await this.prisma.followUp.update({
      where: { id: followUpId },
      data: {
        memberId: member.id,
        contactName: `${member.firstName} ${member.lastName}`.trim(),
        contactPhone: member.phone ?? undefined,
        contactEmail: member.email ?? undefined,
      },
      include: followUpInclude,
    });

    if (updated.stage === 'JOINED_GROUP' && !updated.archivedAt) {
      return this.completeJoinedGroupAsMember(churchId, followUpId, actorId ?? null);
    }
    return updated;
  }

  async createMemberFromLead(churchId: string, followUpId: string, actorId?: string) {
    const followUp = await this.getOne(churchId, followUpId);
    if (followUp.memberId) {
      throw new BadRequestException('This lead is already linked to a member');
    }

    const parts = followUp.contactName.trim().split(/\s+/);
    const firstName = parts[0] ?? 'Unknown';
    const lastName = parts.slice(1).join(' ') || 'Guest';

    const member = await this.prisma.member.create({
      data: {
        churchId,
        firstName,
        lastName,
        email: followUp.contactEmail,
        phone: followUp.contactPhone,
        status: 'VISITOR',
        roles: ['ADULT'],
        ministryInterests: ['Follow-up & Discipleship'],
        notes: followUp.notes,
        onboardingStep: 0,
        gamification: { create: {} },
      },
    });

    const updated = await this.prisma.followUp.update({
      where: { id: followUpId },
      data: { memberId: member.id },
      include: followUpInclude,
    });

    if (updated.stage === 'JOINED_GROUP' && !updated.archivedAt) {
      return this.completeJoinedGroupAsMember(churchId, followUpId, actorId ?? null);
    }
    return updated;
  }

  /** Leave Joined Group after conversion to Membership (bypasses archive block). */
  private async completeJoinedGroupAsMember(
    churchId: string,
    id: string,
    actorId: string | null,
  ) {
    const existing = await this.prisma.followUp.findFirst({ where: { id, churchId } });
    if (!existing || existing.stage !== 'JOINED_GROUP' || existing.archivedAt) {
      return this.getOne(churchId, id);
    }

    return this.prisma.$transaction(async (tx) => {
      const row = await tx.followUp.update({
        where: { id },
        data: {
          archivedAt: new Date(),
          archivedById: actorId,
          archiveReason: 'Converted to Member from Joined Group',
          archiveRequestedAt: null,
          archiveRequestedById: null,
          archiveRequestReason: null,
          dueAt: null,
          completedAt: new Date(),
        },
        include: followUpInclude,
      });

      if (actorId) {
        await tx.pastoralNote.create({
          data: {
            churchId,
            authorId: actorId,
            followUpId: id,
            memberId: row.memberId,
            content: 'Converted to Member — left Joined Group phase.',
            isConfidential: false,
            stageAtTime: existing.stage,
            kind: 'ARCHIVE',
          },
        });
      }

      await tx.followUpReminder.updateMany({
        where: { followUpId: id, sentAt: null },
        data: { sentAt: new Date() },
      });

      return row;
    });
  }

  async updateStage(
    churchId: string,
    id: string,
    authorId: string,
    data: {
      stage: FollowUpStage;
      notes?: string;
      whatWasDone?: string;
      whatNext?: string;
      dueAt?: string | null;
    },
  ) {
    const existing = await this.prisma.followUp.findFirst({ where: { id, churchId } });
    if (!existing) throw new NotFoundException('Follow-up not found');
    if (existing.archivedAt) {
      throw new BadRequestException('Archived leads cannot progress in the pipeline');
    }

    const whatWasDone = data.whatWasDone?.trim() ?? '';
    const whatNext = data.whatNext?.trim() ?? '';
    let dueAt: Date | null | undefined = undefined;
    if (data.dueAt === null) dueAt = null;
    else if (typeof data.dueAt === 'string' && data.dueAt.trim()) {
      const parsed = new Date(data.dueAt);
      if (Number.isNaN(parsed.getTime())) throw new BadRequestException('Invalid due date');
      dueAt = parsed;
    }

    const progressNoteParts: string[] = [];
    if (whatWasDone) progressNoteParts.push(`What was done:\n${whatWasDone}`);
    if (whatNext) progressNoteParts.push(`What should be done next:\n${whatNext}`);
    if (dueAt) {
      progressNoteParts.push(
        `When it should be done:\n${dueAt.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}`,
      );
    }
    const progressNote = progressNoteParts.join('\n\n');

    const enteringJoinedGroup =
      data.stage === 'JOINED_GROUP' && existing.stage !== 'JOINED_GROUP';
    const leavingJoinedGroup =
      existing.stage === 'JOINED_GROUP' && data.stage !== 'JOINED_GROUP';

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.followUp.update({
        where: { id },
        data: {
          stage: data.stage,
          notes: data.notes ?? (progressNote || existing.notes),
          ...(dueAt !== undefined ? { dueAt } : {}),
          ...(whatNext ? { nextAction: whatNext } : {}),
          ...(enteringJoinedGroup
            ? { completedAt: new Date(), joinedGroupDay6NotifiedAt: null }
            : leavingJoinedGroup
              ? { completedAt: null, joinedGroupDay6NotifiedAt: null }
              : {}),
        },
        include: followUpInclude,
      });

      if (progressNote) {
        await tx.pastoralNote.create({
          data: {
            churchId,
            authorId,
            followUpId: id,
            memberId: existing.memberId,
            content: progressNote,
            isConfidential: false,
            stageAtTime: data.stage,
            kind: 'STAGE_PROGRESS',
          },
        });
      }

      return row;
    });

    if (dueAt) {
      await this.scheduleStaffDueReminder(churchId, id, dueAt, whatNext || undefined);
    }

    await this.automation.onFollowUpEvent(churchId, id, { stage: data.stage });

    return updated;
  }

  /** In-app (+ queue) reminder for assignee and unit leaders when next action is due. */
  private async scheduleStaffDueReminder(
    churchId: string,
    followUpId: string,
    dueAt: Date,
    nextAction?: string,
  ) {
    const followUp = await this.getOne(churchId, followUpId);
    if (followUp.archivedAt) return;

    const message = [
      `Next action due for ${followUp.contactName}.`,
      nextAction ? `Action: ${nextAction}` : null,
      `Open Outreach pipeline to follow up.`,
    ]
      .filter(Boolean)
      .join('\n');

    const reminder = await this.prisma.followUpReminder.create({
      data: {
        followUpId,
        remindAt: dueAt,
        channel: 'IN_APP',
        message,
      },
    });

    await this.notifications.scheduleFollowUpReminder({
      churchId,
      followUpId,
      reminderId: reminder.id,
      body: message,
      subject: `Action due: ${followUp.contactName}`,
      remindAt: dueAt,
      contactEmail: null,
      contactPhone: null,
      assignedToId: followUp.assignedToId,
      notifyLeaders: true,
    });
  }

  async scheduleReminder(
    churchId: string,
    followUpId: string,
    data: { remindAt: string; channel: string; message: string; templateId?: string },
  ) {
    const followUp = await this.getOne(churchId, followUpId);
    const remindAt = new Date(data.remindAt);
    if (Number.isNaN(remindAt.getTime())) throw new BadRequestException('Invalid remindAt');

    let message = data.message;
    if (data.templateId) {
      const tpl = await this.prisma.followUpTemplate.findFirst({
        where: { id: data.templateId, churchId },
      });
      if (tpl) message = this.applyTemplate(tpl.body, followUp.contactName, churchId);
    }

    const reminder = await this.prisma.followUpReminder.create({
      data: {
        followUpId,
        remindAt,
        channel: data.channel,
        message,
      },
    });

    if (followUp.contactEmail || followUp.contactPhone || followUp.assignedToId) {
      await this.notifications.scheduleFollowUpReminder({
        churchId,
        followUpId,
        reminderId: reminder.id,
        body: message,
        subject: `Follow-up: ${followUp.contactName}`,
        remindAt,
        contactEmail: followUp.contactEmail,
        contactPhone: followUp.contactPhone,
        assignedToId: followUp.assignedToId,
        notifyLeaders: true,
      });
    }

    return reminder;
  }

  async createFromOutreach(
    churchId: string,
    data: {
      firstName: string;
      lastName?: string;
      phone?: string;
      email?: string;
      notes?: string;
      outreachContactId?: string;
      evangelistMemberId?: string | null;
      capturedByUserId?: string | null;
      referredBy?: string;
    },
  ) {
    const contactName = [data.firstName, data.lastName].filter(Boolean).join(' ').trim();
    const phoneParsed = optionalPhoneSchema.safeParse(data.phone);
    const emailParsed = optionalEmailSchema.safeParse(data.email);
    const phone = phoneParsed.success ? phoneParsed.data : undefined;
    const email = emailParsed.success ? emailParsed.data : undefined;

    const orConditions: Array<{ contactPhone?: string; contactEmail?: string }> = [];
    if (phone) orConditions.push({ contactPhone: phone });
    if (email) orConditions.push({ contactEmail: email });

    if (orConditions.length > 0) {
      const existing = await this.prisma.followUp.findFirst({
        where: { churchId, archivedAt: null, OR: orConditions },
      });
      if (existing) {
        const referredBy = data.referredBy?.trim() || null;
        const noteExtra = [
          referredBy && !existing.referredBy ? `Referred by: ${referredBy}.` : null,
          data.notes?.trim() || null,
        ]
          .filter(Boolean)
          .join(' ');

        const updated = await this.prisma.followUp.update({
          where: { id: existing.id },
          data: {
            ...(referredBy && !existing.referredBy ? { referredBy } : {}),
            ...(noteExtra
              ? {
                  notes: existing.notes
                    ? `${existing.notes} ${noteExtra}`.trim()
                    : noteExtra,
                }
              : {}),
          },
          include: followUpInclude,
        });

        if (data.outreachContactId) {
          await this.prisma.outreachContact.update({
            where: { id: data.outreachContactId },
            data: { followUpId: updated.id },
          });
        }

        return updated;
      }
    }

    const assignedToId = await this.teamNotify.resolveAssigneeForCapture(churchId, {
      evangelistMemberId: data.evangelistMemberId,
      capturedByUserId: data.capturedByUserId,
    });

    const evangelistName = await this.teamNotify.getEvangelistDisplayName(
      churchId,
      data.evangelistMemberId,
    );

    const noteParts = ['Created from Outreach capture.'];
    if (data.outreachContactId) noteParts.push(`Outreach ID: ${data.outreachContactId}.`);
    if (evangelistName) noteParts.push(`Evangelist: ${evangelistName}.`);
    if (data.referredBy?.trim()) noteParts.push(`Referred by: ${data.referredBy.trim()}.`);
    if (data.notes?.trim()) noteParts.push(data.notes.trim());

    const followUp = await this.create(churchId, {
      contactName,
      contactPhone: phone,
      contactEmail: email,
      stage: 'NEW_LEAD',
      assignedToId,
      notes: noteParts.join(' '),
      referredBy: data.referredBy,
      scheduleReminder: false,
    });

    try {
      await this.teamNotify.notifyTeamOnNewLead({
        churchId,
        followUpId: followUp.id,
        contactName,
        contactPhone: phone,
        contactEmail: email,
        assignedToId: followUp.assignedToId,
        evangelistName,
      });
    } catch (err) {
      // Non-fatal — lead is already in the pipeline
      console.warn(
        `Team notify failed for follow-up ${followUp.id}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
    if (data.outreachContactId) {
      await this.prisma.outreachContact.update({
        where: { id: data.outreachContactId },
        data: { followUpId: followUp.id },
      });
    }

    return followUp;
  }

  async listReminders(churchId: string, followUpId: string) {
    await this.getOne(churchId, followUpId);
    return this.prisma.followUpReminder.findMany({
      where: { followUpId },
      orderBy: { remindAt: 'asc' },
    });
  }

  async listTemplates(churchId: string) {
    const existing = await this.prisma.followUpTemplate.count({ where: { churchId } });
    if (existing === 0) {
      await this.prisma.followUpTemplate.createMany({
        data: DEFAULT_FOLLOW_UP_TEMPLATES.map((t) => ({
          churchId,
          name: t.name,
          channel: t.channel,
          subject: 'subject' in t ? t.subject : null,
          body: t.body,
        })),
      });
    }
    return this.prisma.followUpTemplate.findMany({
      where: { churchId, isActive: true },
      orderBy: [{ channel: 'asc' }, { name: 'asc' }],
    });
  }

  async createTemplate(
    churchId: string,
    data: { name: string; channel: string; body: string; subject?: string },
  ) {
    return this.prisma.followUpTemplate.create({
      data: { churchId, ...data },
    });
  }

  async sendTemplateNow(
    churchId: string,
    followUpId: string,
    templateId: string,
  ) {
    const followUp = await this.getOne(churchId, followUpId);
    const tpl = await this.prisma.followUpTemplate.findFirst({
      where: { id: templateId, churchId, isActive: true },
    });
    if (!tpl) throw new NotFoundException('Template not found');

    const church = await this.prisma.church.findUnique({ where: { id: churchId } });
    const body = this.applyTemplate(tpl.body, followUp.contactName, church?.name ?? 'Our church');
    const subject = tpl.subject
      ? this.applyTemplate(tpl.subject, followUp.contactName, church?.name ?? 'Our church')
      : 'Message from your church';

    if (tpl.channel === 'EMAIL') {
      if (!followUp.contactEmail) throw new BadRequestException('No email on this follow-up');
      await this.email.send({
        to: followUp.contactEmail,
        subject,
        body,
        churchId,
      });
    } else {
      if (!followUp.contactPhone) throw new BadRequestException('No phone on this follow-up');
      await this.sms.sendWhatsApp({ to: followUp.contactPhone, body, churchId });
    }

    return { success: true, channel: tpl.channel, preview: body };
  }

  private applyTemplate(text: string, contactName: string, churchName: string) {
    return text
      .replace(/\{\{name\}\}/gi, contactName)
      .replace(/\{\{church\}\}/gi, churchName);
  }

  async addPastoralNote(
    churchId: string,
    authorId: string,
    data: {
      content: string;
      isConfidential?: boolean;
      memberId?: string;
      followUpId?: string;
      stageAtTime?: FollowUpStage;
      kind?: string;
    },
  ) {
    if (!data.memberId && !data.followUpId) {
      throw new BadRequestException('memberId or followUpId required');
    }
    let stageAtTime = data.stageAtTime;
    if (data.followUpId) {
      const fu = await this.getOne(churchId, data.followUpId);
      if (!data.memberId && fu.memberId) data.memberId = fu.memberId;
      if (!stageAtTime) stageAtTime = fu.stage;
    }

    return this.prisma.pastoralNote.create({
      data: {
        churchId,
        authorId,
        memberId: data.memberId,
        followUpId: data.followUpId,
        content: data.content,
        isConfidential: data.isConfidential ?? true,
        stageAtTime: stageAtTime ?? null,
        kind: data.kind ?? 'NOTE',
      },
      include: { author: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async archive(
    churchId: string,
    id: string,
    actorId: string,
    reason: string,
  ) {
    const existing = await this.prisma.followUp.findFirst({ where: { id, churchId } });
    if (!existing) throw new NotFoundException('Follow-up not found');
    if (existing.archivedAt) throw new BadRequestException('This lead is already archived');
    if (existing.stage === 'JOINED_GROUP') {
      throw new BadRequestException(
        'Joined Group contacts cannot be archived. Convert them to Members within 7 days.',
      );
    }

    const trimmed = reason.trim();
    if (trimmed.length < 3) throw new BadRequestException('Enter a reason for archiving');

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.followUp.update({
        where: { id },
        data: {
          archivedAt: new Date(),
          archivedById: actorId,
          archiveReason: trimmed,
          archiveRequestedAt: null,
          archiveRequestedById: null,
          archiveRequestReason: null,
          dueAt: null,
          completedAt: new Date(),
        },
        include: followUpInclude,
      });

      await tx.pastoralNote.create({
        data: {
          churchId,
          authorId: actorId,
          followUpId: id,
          memberId: existing.memberId,
          content: `Archived from membership journey.\nReason: ${trimmed}`,
          isConfidential: false,
          stageAtTime: existing.stage,
          kind: 'ARCHIVE',
        },
      });

      await tx.followUpReminder.updateMany({
        where: { followUpId: id, sentAt: null },
        data: { sentAt: new Date() },
      });

      return row;
    });

    return updated;
  }

  async requestArchive(
    churchId: string,
    id: string,
    actorId: string,
    reason: string,
  ) {
    const existing = await this.prisma.followUp.findFirst({ where: { id, churchId } });
    if (!existing) throw new NotFoundException('Follow-up not found');
    if (existing.archivedAt) throw new BadRequestException('This lead is already archived');
    if (existing.stage === 'JOINED_GROUP') {
      throw new BadRequestException(
        'Joined Group contacts cannot be archived. Convert them to Members within 7 days.',
      );
    }

    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      throw new BadRequestException('Explain why this lead should be archived');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.followUp.update({
        where: { id },
        data: {
          archiveRequestedAt: new Date(),
          archiveRequestedById: actorId,
          archiveRequestReason: trimmed,
        },
        include: followUpInclude,
      });

      await tx.pastoralNote.create({
        data: {
          churchId,
          authorId: actorId,
          followUpId: id,
          memberId: existing.memberId,
          content: `Archive requested (DND).\nReason: ${trimmed}`,
          isConfidential: false,
          stageAtTime: existing.stage,
          kind: 'ARCHIVE_REQUEST',
        },
      });

      return row;
    });

    const requester = await this.prisma.user.findFirst({
      where: { id: actorId },
      select: { firstName: true, lastName: true },
    });
    const requesterName = requester
      ? `${requester.firstName} ${requester.lastName}`.trim()
      : 'A team member';

    await this.teamNotify.notifyTeamOnArchiveRequest({
      churchId,
      followUpId: id,
      contactName: existing.contactName,
      reason: trimmed,
      requesterName,
    });

    return updated;
  }

  async declineArchiveRequest(
    churchId: string,
    id: string,
    actorId: string,
    note?: string,
  ) {
    const existing = await this.prisma.followUp.findFirst({ where: { id, churchId } });
    if (!existing) throw new NotFoundException('Follow-up not found');
    if (existing.archivedAt) throw new BadRequestException('This lead is already archived');
    if (!existing.archiveRequestedAt) {
      throw new BadRequestException('No pending archive request');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.followUp.update({
        where: { id },
        data: {
          archiveRequestedAt: null,
          archiveRequestedById: null,
          archiveRequestReason: null,
        },
        include: followUpInclude,
      });

      await tx.pastoralNote.create({
        data: {
          churchId,
          authorId: actorId,
          followUpId: id,
          memberId: existing.memberId,
          content: [
            'Archive request declined — lead stays in the pipeline.',
            note?.trim() ? `Note: ${note.trim()}` : null,
          ]
            .filter(Boolean)
            .join('\n'),
          isConfidential: false,
          stageAtTime: existing.stage,
          kind: 'ARCHIVE_DECLINED',
        },
      });

      return row;
    });

    return updated;
  }

  async recontactArchived(
    churchId: string,
    id: string,
    actorId: string,
    data: { subject: string; body: string },
  ) {
    const followUp = await this.prisma.followUp.findFirst({ where: { id, churchId } });
    if (!followUp) throw new NotFoundException('Follow-up not found');
    if (!followUp.archivedAt) {
      throw new BadRequestException('Only archived leads can be re-contacted this way');
    }
    if (!followUp.contactEmail) {
      throw new BadRequestException('No email on this archived lead');
    }

    const subject = data.subject.trim();
    const body = data.body.trim();
    if (!subject || !body) throw new BadRequestException('Subject and message are required');

    await this.email.send({
      to: followUp.contactEmail,
      subject,
      body,
      churchId,
    });

    await this.prisma.pastoralNote.create({
      data: {
        churchId,
        authorId: actorId,
        followUpId: id,
        memberId: followUp.memberId,
        content: `Re-contacted by email.\nSubject: ${subject}\n\n${body}`,
        isConfidential: false,
        stageAtTime: followUp.stage,
        kind: 'RECONTACT',
      },
    });

    return { success: true, to: followUp.contactEmail };
  }

  async getPastoralNotes(
    churchId: string,
    requesterId: string,
    filters: { memberId?: string; followUpId?: string },
  ) {
    const notes = await this.prisma.pastoralNote.findMany({
      where: {
        churchId,
        ...(filters.memberId ? { memberId: filters.memberId } : {}),
        ...(filters.followUpId ? { followUpId: filters.followUpId } : {}),
      },
      include: { author: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const isStaff = await this.userIsStaff(requesterId);
    return notes.filter((n) => isStaff || !n.isConfidential || n.authorId === requesterId);
  }

  private async userIsStaff(userId: string) {
    const roles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    const names = roles.map((r) => r.role.name);
    return names.includes('ADMIN') || names.includes('PASTOR') || names.includes('LEADER');
  }
}
