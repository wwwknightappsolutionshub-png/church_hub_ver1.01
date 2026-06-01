import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.module';
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

  async runAllChurchesAutomations() {
    const churches = await this.prisma.church.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    let absentee = 0;
    let reminders = 0;
    for (const c of churches) {
      absentee += (await this.runAbsenteeFollowUp(c.id)).enqueued;
      reminders += (await this.runServiceReminders(c.id)).enqueued;
    }
    return { churches: churches.length, absentee, reminders };
  }
}
