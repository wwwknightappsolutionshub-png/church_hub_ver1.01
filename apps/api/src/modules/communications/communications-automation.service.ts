import { Injectable, Inject, Logger, forwardRef } from '@nestjs/common';
import { CommunicationQueueKind } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { MembershipCelebrationsService } from '../membership/membership-celebrations.service';
import { ChildrenMinistryService } from '../departments/children-ministry.service';
import { isChildrenChurchChild } from '../departments/children.constants';
import {
  applyCelebrationTemplate,
  CelebrationEmailTemplatesService,
  type CelebrationTemplateKind,
} from './celebration-email-templates.service';
import { CommunicationsQueueService } from './communications-queue.service';

function startOfUtcDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

@Injectable()
export class CommunicationsAutomationService {
  private readonly logger = new Logger(CommunicationsAutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: CommunicationsQueueService,
    private readonly celebrations: MembershipCelebrationsService,
    private readonly celebrationTemplates: CelebrationEmailTemplatesService,
    @Inject(forwardRef(() => ChildrenMinistryService))
    private readonly childrenMinistry: ChildrenMinistryService,
  ) {}

  /** Members present last service week but absent/missing this week → queued follow-up. */
  async runAbsenteeFollowUp(churchId: string) {
    const today = startOfUtcDay(new Date());
    const thisWeekStart = addDays(today, -7);
    const prevWeekStart = addDays(today, -14);

    const presentLastWeek = await this.prisma.attendanceRecord.findMany({
      where: {
        churchId,
        scope: 'SERVICE',
        present: true,
        serviceDate: { gte: prevWeekStart, lt: thisWeekStart },
      },
      select: { memberId: true },
      distinct: ['memberId'],
    });

    let enqueued = 0;
    for (const { memberId } of presentLastWeek) {
      const attendedThisWeek = await this.prisma.attendanceRecord.findFirst({
        where: {
          churchId,
          memberId,
          scope: 'SERVICE',
          present: true,
          serviceDate: { gte: thisWeekStart, lt: today },
        },
      });
      if (attendedThisWeek) continue;

      const member = await this.prisma.member.findFirst({
        where: { id: memberId, churchId },
        select: { firstName: true, lastName: true, userId: true },
      });
      if (!member) continue;

      const dup = await this.prisma.communicationQueueItem.findFirst({
        where: {
          churchId,
          kind: 'ABSENTEE_FOLLOWUP',
          targetMemberId: memberId,
          createdAt: { gte: thisWeekStart },
          status: { in: ['PENDING', 'SENT', 'PROCESSING'] },
        },
      });
      if (dup) continue;

      const name = [member.firstName, member.lastName].filter(Boolean).join(' ');
      await this.queue.enqueue(churchId, {
        kind: 'ABSENTEE_FOLLOWUP',
        title: 'We missed you at service',
        body: `Hi ${name}, we noticed you were not with us at the latest service. We are praying for you and would love to see you again soon.`,
        channels: ['IN_APP', 'WHATSAPP', 'EMAIL'],
        targetMemberId: memberId,
        targetUserId: member.userId ?? undefined,
        metadata: { memberId },
      });
      enqueued++;
    }

    this.logger.log(`Absentee follow-up: ${enqueued} queued for church ${churchId}`);
    return { enqueued };
  }

  /** Remind members about services happening tomorrow (by church service catalog). */
  async runServiceReminders(churchId: string) {
    const tomorrow = addDays(startOfUtcDay(new Date()), 1);
    const tomorrowDow = tomorrow.getUTCDay();

    const services = await this.prisma.churchService.findMany({
      where: { churchId, isActive: true, dayOfWeek: tomorrowDow },
    });

    if (!services.length) return { enqueued: 0, services: [] };

    let enqueued = 0;
    for (const svc of services) {
      const dup = await this.prisma.communicationQueueItem.findFirst({
        where: {
          churchId,
          kind: 'SERVICE_REMINDER',
          title: `Reminder: ${svc.name}`,
          createdAt: { gte: startOfUtcDay(new Date()) },
        },
      });
      if (dup) continue;

      const timeLabel = svc.startTime ? ` at ${svc.startTime}` : '';
      await this.queue.enqueue(churchId, {
        kind: 'SERVICE_REMINDER',
        title: `Reminder: ${svc.name}`,
        body: `Join us tomorrow for ${svc.name}${timeLabel}. We look forward to worshipping together!`,
        channels: ['IN_APP', 'EMAIL'],
        scheduledAt: new Date(),
        metadata: { churchServiceId: svc.id, serviceName: svc.name },
      });
      enqueued++;
    }

    return { enqueued, services: services.map((s) => s.name) };
  }

  /** Auto-send birthday and anniversary emails using church templates. */
  async runCelebrationEmails(churchId: string) {
    const todayStart = startOfUtcDay(new Date());
    let birthdayCount = 0;
    let anniversaryCount = 0;

    const birthdayTpl = await this.celebrationTemplates.getActive(churchId, 'BIRTHDAY');
    if (birthdayTpl) {
      const birthdays = await this.celebrations.getBirthdaysToday(churchId);
      for (const m of birthdays) {
        if (isChildrenChurchChild(m)) continue;
        const dup = await this.prisma.communicationQueueItem.findFirst({
          where: {
            churchId,
            kind: 'BIRTHDAY_GREETING' as CommunicationQueueKind,
            targetMemberId: m.id,
            createdAt: { gte: todayStart },
            status: { in: ['PENDING', 'SENT', 'PROCESSING'] },
          },
        });
        if (dup) continue;

        const fullName = [m.firstName, m.lastName].filter(Boolean).join(' ');
        const vars = {
          firstName: m.firstName,
          lastName: m.lastName,
          fullName,
          occasionName: 'Birthday',
          occasionDate: todayStart.toLocaleDateString(),
          age: m.hideAge ? '' : String(new Date().getFullYear() - new Date(m.dateOfBirth!).getFullYear()),
        };
        await this.queue.enqueue(churchId, {
          kind: 'BIRTHDAY_GREETING' as CommunicationQueueKind,
          title: applyCelebrationTemplate(birthdayTpl.subject, vars),
          body: applyCelebrationTemplate(birthdayTpl.bodyHtml, vars),
          channels: ['EMAIL', 'IN_APP'],
          targetMemberId: m.id,
          metadata: { templateKind: 'BIRTHDAY' },
        });
        birthdayCount++;
      }

      const parentBirthdays = await this.childrenMinistry.runBirthdayParentEmails(churchId);
      birthdayCount += parentBirthdays.queued;
    }

    const anniversaryTpl = await this.celebrationTemplates.getActive(churchId, 'ANNIVERSARY');
    if (anniversaryTpl) {
      const anniversaries = await this.celebrations.getAnniversariesToday(churchId);
      for (const row of anniversaries) {
        const dup = await this.prisma.communicationQueueItem.findFirst({
          where: {
            churchId,
            kind: 'ANNIVERSARY_GREETING' as CommunicationQueueKind,
            ...(row.memberId ? { targetMemberId: row.memberId } : {}),
            createdAt: { gte: todayStart },
            status: { in: ['PENDING', 'SENT', 'PROCESSING'] },
          },
        });
        if (dup) continue;

        const fullName = [row.firstName, row.lastName].filter(Boolean).join(' ');
        const vars = {
          firstName: row.firstName,
          lastName: row.lastName,
          fullName,
          occasionName: row.occasionName,
          occasionDate: todayStart.toLocaleDateString(),
          age: '',
        };
        await this.queue.enqueue(churchId, {
          kind: 'ANNIVERSARY_GREETING' as CommunicationQueueKind,
          title: applyCelebrationTemplate(anniversaryTpl.subject, vars),
          body: applyCelebrationTemplate(anniversaryTpl.bodyHtml, vars),
          channels: ['EMAIL', 'IN_APP'],
          targetMemberId: row.memberId ?? undefined,
          metadata: { templateKind: 'ANNIVERSARY', familyId: row.familyId },
        });
        anniversaryCount++;
      }
    }

    return { birthdayCount, anniversaryCount };
  }

  async runAllChurchesAutomations() {
    const churches = await this.prisma.church.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    let absentee = 0;
    let reminders = 0;
    let birthdays = 0;
    let anniversaries = 0;
    for (const c of churches) {
      absentee += (await this.runAbsenteeFollowUp(c.id)).enqueued;
      reminders += (await this.runServiceReminders(c.id)).enqueued;
      const celeb = await this.runCelebrationEmails(c.id);
      birthdays += celeb.birthdayCount;
      anniversaries += celeb.anniversaryCount;
    }
    return { churches: churches.length, absentee, reminders, birthdays, anniversaries };
  }
}
