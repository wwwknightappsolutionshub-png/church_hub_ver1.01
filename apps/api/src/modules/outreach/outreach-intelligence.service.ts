import { Injectable } from '@nestjs/common';
import type { OutreachCaptureSource } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  assignmentSlaCutoff,
  assignmentStaleWhereBranches,
  GRADUATED_FOLLOW_UP_STAGES,
} from '../follow-up/follow-up-assignment-sla';
import { isGraduatedStageKey } from '../follow-up/pipeline-stage-flags';

const STUCK_MS = 7 * 24 * 60 * 60 * 1000;
const PROGRESS_SLA_MS = 72 * 60 * 60 * 1000;

function parseRange(from?: string, to?: string) {
  const end = to ? new Date(to) : new Date();
  const start = from
    ? new Date(from)
    : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    const now = new Date();
    return { start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), end: now };
  }
  return { start, end };
}

function hoursBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / (60 * 60 * 1000));
}

function isStuck(
  capturedAt: Date,
  followUp: {
    stage: string;
    lastProgressAt: Date | null;
    createdAt: Date;
    assignedAt: Date | null;
  } | null,
  now = Date.now(),
) {
  if (!followUp) return true;
  if (isGraduatedStageKey(followUp.stage)) return false;
  const anchor = followUp.lastProgressAt ?? followUp.assignedAt ?? followUp.createdAt;
  return now - anchor.getTime() >= STUCK_MS || now - capturedAt.getTime() >= STUCK_MS;
}

@Injectable()
export class OutreachIntelligenceService {
  constructor(private readonly prisma: PrismaService) {}

  async commandCentre(
    churchId: string,
    from?: string,
    to?: string,
    campaignId?: string,
  ) {
    const { start, end } = parseRange(from, to);
    const rows = await this.prisma.outreachContact.findMany({
      where: {
        churchId,
        capturedAt: { gte: start, lte: end },
        ...(campaignId ? { campaignId } : {}),
      },
      include: {
        campaign: { select: { id: true, name: true } },
        followUp: {
          select: {
            id: true,
            stage: true,
            createdAt: true,
            lastProgressAt: true,
            assignedAt: true,
            assignedTo: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { capturedAt: 'desc' },
      take: 500,
    });

    const bySource: Record<OutreachCaptureSource, number> = {
      MANUAL: 0,
      SYNC: 0,
      IMPORT: 0,
      PUBLIC_QR: 0,
    };

    let withFollowUp = 0;
    let stuck = 0;

    const mapped = rows.map((r) => {
      bySource[r.captureSource] += 1;
      if (r.followUpId) withFollowUp += 1;
      const stuckFlag = isStuck(r.capturedAt, r.followUp);
      if (stuckFlag) stuck += 1;
      const assignee = r.followUp?.assignedTo;
      return {
        id: r.id,
        firstName: r.firstName,
        lastName: r.lastName,
        capturedAt: r.capturedAt.toISOString(),
        captureSource: r.captureSource,
        campaignId: r.campaignId,
        campaignName: r.campaign?.name ?? null,
        followUpId: r.followUpId,
        establishmentStage: r.followUp?.stage ?? null,
        assignedToName: assignee
          ? `${assignee.firstName} ${assignee.lastName}`.trim()
          : null,
        handoffHours:
          r.followUp != null
            ? hoursBetween(r.capturedAt, r.followUp.createdAt)
            : null,
        stuck: stuckFlag,
        welcomeSent: r.welcomeSentAt != null,
        hasGeo: r.latitude != null && r.longitude != null,
      };
    });

    return {
      from: start.toISOString(),
      to: end.toISOString(),
      summary: {
        total: rows.length,
        withFollowUp,
        stuck,
        bySource,
      },
      rows: mapped,
    };
  }

  async teamScorecard(
    churchId: string,
    from?: string,
    to?: string,
    campaignId?: string,
  ) {
    const { start, end } = parseRange(from, to);
    const contacts = await this.prisma.outreachContact.findMany({
      where: {
        churchId,
        capturedAt: { gte: start, lte: end },
        ...(campaignId ? { campaignId } : {}),
      },
      select: {
        id: true,
        evangelistId: true,
        qrCodeId: true,
        welcomeSentAt: true,
        followUpId: true,
        capturedAt: true,
        evangelist: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const followUpIds = contacts.map((c) => c.followUpId).filter((id): id is string => !!id);
    const audits =
      followUpIds.length > 0
        ? await this.prisma.followUpStageAudit.findMany({
            where: { churchId, followUpId: { in: followUpIds } },
            orderBy: { createdAt: 'asc' },
            select: { followUpId: true, createdAt: true },
          })
        : [];
    const firstAuditByFollowUp = new Map<string, Date>();
    for (const a of audits) {
      if (!firstAuditByFollowUp.has(a.followUpId)) {
        firstAuditByFollowUp.set(a.followUpId, a.createdAt);
      }
    }

    type Bucket = {
      key: string;
      label: string;
      captures: number;
      qrAttributed: number;
      welcomeSent: number;
      withFollowUp: number;
      firstProgressWithin72h: number;
    };

    const buckets = new Map<string, Bucket>();

    for (const c of contacts) {
      const key = c.evangelistId ?? '__unassigned__';
      const label = c.evangelist
        ? `${c.evangelist.firstName} ${c.evangelist.lastName}`.trim()
        : 'Unassigned / team';
      let b = buckets.get(key);
      if (!b) {
        b = {
          key,
          label,
          captures: 0,
          qrAttributed: 0,
          welcomeSent: 0,
          withFollowUp: 0,
          firstProgressWithin72h: 0,
        };
        buckets.set(key, b);
      }
      b.captures += 1;
      if (c.qrCodeId) b.qrAttributed += 1;
      if (c.welcomeSentAt) b.welcomeSent += 1;
      if (c.followUpId) {
        b.withFollowUp += 1;
        const first = firstAuditByFollowUp.get(c.followUpId);
        if (first && first.getTime() - c.capturedAt.getTime() <= PROGRESS_SLA_MS) {
          b.firstProgressWithin72h += 1;
        }
      }
    }

    const rows = [...buckets.values()]
      .map((b) => ({
        evangelistId: b.key === '__unassigned__' ? null : b.key,
        label: b.label,
        captures: b.captures,
        qrAttributed: b.qrAttributed,
        welcomeSent: b.welcomeSent,
        withFollowUp: b.withFollowUp,
        firstProgressWithin72h: b.firstProgressWithin72h,
        firstProgressRate:
          b.captures > 0 ? Math.round((b.firstProgressWithin72h / b.captures) * 1000) / 1000 : 0,
      }))
      .sort((a, b) => b.captures - a.captures);

    return {
      from: start.toISOString(),
      to: end.toISOString(),
      rows,
    };
  }

  async mapPoints(
    churchId: string,
    from?: string,
    to?: string,
    campaignId?: string,
    minLat?: number,
    maxLat?: number,
    minLng?: number,
    maxLng?: number,
  ) {
    const { start, end } = parseRange(from, to);
    const rows = await this.prisma.outreachContact.findMany({
      where: {
        churchId,
        capturedAt: { gte: start, lte: end },
        latitude: { not: null },
        longitude: { not: null },
        ...(campaignId ? { campaignId } : {}),
        ...(minLat != null && maxLat != null
          ? { latitude: { gte: minLat, lte: maxLat } }
          : {}),
        ...(minLng != null && maxLng != null
          ? { longitude: { gte: minLng, lte: maxLng } }
          : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        latitude: true,
        longitude: true,
        locationLabel: true,
        capturedAt: true,
        followUpId: true,
        followUp: { select: { stage: true } },
      },
      take: 2000,
      orderBy: { capturedAt: 'desc' },
    });

    return rows
      .filter((r) => r.latitude != null && r.longitude != null)
      .map((r) => ({
        id: r.id,
        latitude: r.latitude as number,
        longitude: r.longitude as number,
        locationLabel: r.locationLabel,
        capturedAt: r.capturedAt.toISOString(),
        followUpId: r.followUpId,
        establishmentStage: r.followUp?.stage ?? null,
        firstName: r.firstName,
        lastName: r.lastName,
      }));
  }

  /** Manager-grade establishment ops counts for analytics dashboard (B2). */
  async establishmentOpsCounts(churchId: string) {
    const now = new Date();
    const slaCutoff = assignmentSlaCutoff(now);
    const base = { churchId, archivedAt: null };

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date();
    dayEnd.setHours(23, 59, 59, 999);

    const [overdue, dueToday, archiveRequested, joinedGroupDay6] = await Promise.all([
      this.prisma.followUp.count({
        where: {
          ...base,
          stage: { notIn: [...GRADUATED_FOLLOW_UP_STAGES] },
          OR: [{ dueAt: { lt: now } }, ...assignmentStaleWhereBranches(slaCutoff)],
        },
      }),
      this.prisma.followUp.count({
        where: {
          ...base,
          stage: { notIn: [...GRADUATED_FOLLOW_UP_STAGES] },
          dueAt: { gte: dayStart, lte: dayEnd },
        },
      }),
      this.prisma.followUp.count({
        where: {
          ...base,
          archiveRequestedAt: { not: null },
        },
      }),
      this.prisma.followUp.count({
        where: {
          ...base,
          stage: 'JOINED_GROUP',
          joinedGroupDay6NotifiedAt: null,
          createdAt: { lte: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return {
      overdue,
      dueToday,
      archiveRequested,
      joinedGroupDay6,
    };
  }
}