import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.module';

export type TimelineEventType =
  | 'ACTIVITY'
  | 'CLASS'
  | 'ATTENDANCE'
  | 'FOLLOW_UP'
  | 'OUTREACH'
  | 'STATUS';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  title: string;
  summary: string;
  at: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class MembershipTimelineService {
  constructor(private readonly prisma: PrismaService) {}

  async getMemberTimeline(churchId: string, memberId: string, limit = 80): Promise<TimelineEvent[]> {
    const member = await this.prisma.member.findFirst({ where: { id: memberId, churchId } });
    if (!member) throw new NotFoundException('Member not found');

    const [activities, enrollments, attendance, followUps, outreach] = await Promise.all([
      this.prisma.memberActivityLog.findMany({
        where: { churchId, memberId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.classEnrollment.findMany({
        where: { churchId, memberId },
        include: { classDefinition: true },
        orderBy: { enrolledAt: 'desc' },
        take: 30,
      }),
      this.prisma.attendanceRecord.findMany({
        where: { churchId, memberId },
        include: { churchService: true, serviceUnit: true },
        orderBy: { serviceDate: 'desc' },
        take: 40,
      }),
      this.prisma.followUp.findMany({
        where: { churchId, memberId },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),
      this.prisma.outreachContact.findMany({
        where: { churchId, evangelistId: memberId },
        orderBy: { capturedAt: 'desc' },
        take: 15,
      }),
    ]);

    const events: TimelineEvent[] = [];

    for (const a of activities) {
      events.push({
        id: `activity-${a.id}`,
        type: 'ACTIVITY',
        title: a.type.replace(/_/g, ' '),
        summary: a.summary,
        at: a.createdAt.toISOString(),
        metadata: (a.metadata as Record<string, unknown>) ?? undefined,
      });
    }

    for (const e of enrollments) {
      events.push({
        id: `class-${e.id}`,
        type: 'CLASS',
        title: `Class ${e.classDefinition.code}`,
        summary: `${e.classDefinition.name} — ${e.status}`,
        at: (e.completedAt ?? e.enrolledAt).toISOString(),
      });
    }

    for (const r of attendance) {
      const label =
        r.churchService?.name ?? r.serviceUnit?.name ?? r.scope;
      events.push({
        id: `attendance-${r.id}`,
        type: 'ATTENDANCE',
        title: r.present ? 'Present' : 'Absent',
        summary: `${label} · ${r.scope}`,
        at: r.serviceDate.toISOString(),
      });
    }

    for (const f of followUps) {
      events.push({
        id: `followup-${f.id}`,
        type: 'FOLLOW_UP',
        title: 'Follow-up',
        summary: `${f.contactName} — ${f.stage}`,
        at: f.updatedAt.toISOString(),
      });
    }

    for (const o of outreach) {
      events.push({
        id: `outreach-${o.id}`,
        type: 'OUTREACH',
        title: 'Outreach contact',
        summary: `${o.firstName} ${o.lastName ?? ''}`.trim(),
        at: o.capturedAt.toISOString(),
      });
    }

    events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return events.slice(0, limit);
  }
}
