import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { OutreachService } from '../outreach/outreach.service';
import { MembershipAttendanceService } from '../membership/membership-attendance.service';

const MAX_PER_TICK = 15;

@Injectable()
export class AutomationSyncService {
  private readonly logger = new Logger(AutomationSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outreach: OutreachService,
    private readonly attendance: MembershipAttendanceService,
  ) {}

  async processPending(churchId?: string) {
    const pending = await this.prisma.syncQueueItem.findMany({
      where: {
        status: { in: ['PENDING', 'FAILED'] },
        attempts: { lt: 5 },
        ...(churchId ? { churchId } : {}),
      },
      orderBy: { capturedAt: 'asc' },
      take: MAX_PER_TICK,
    });

    let synced = 0;
    let failed = 0;

    for (const item of pending) {
      await this.prisma.syncQueueItem.update({
        where: { id: item.id },
        data: { status: 'SYNCING' },
      });

      try {
        await this.processOne(item);
        await this.prisma.syncQueueItem.update({
          where: { id: item.id },
          data: { status: 'SYNCED', syncedAt: new Date(), lastError: null },
        });
        synced++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Sync failed';
        await this.prisma.syncQueueItem.update({
          where: { id: item.id },
          data: {
            status: 'FAILED',
            attempts: { increment: 1 },
            lastError: msg,
          },
        });
        failed++;
        this.logger.warn(`Sync ${item.id} (${item.entityType}): ${msg}`);
      }
    }

    return { processed: pending.length, synced, failed };
  }

  private async processOne(item: {
    id: string;
    churchId: string;
    entityType: string;
    payload: Prisma.JsonValue;
    clientId: string;
  }) {
    const payload = item.payload as Record<string, unknown>;

    switch (item.entityType) {
      case 'OUTREACH_CAPTURE': {
        await this.outreach.captureContact(
          item.churchId,
          {
            ...(payload as Parameters<OutreachService['captureContact']>[1]),
            clientId: item.clientId,
          },
        );
        return;
      }
      case 'ATTENDANCE_BULK': {
        const data = payload as {
          scope: 'SERVICE' | 'DEPARTMENT' | 'FAMILY';
          serviceDate: string;
          churchServiceId?: string;
          serviceUnitId?: string;
          familyId?: string;
          recordedById?: string;
          entries: Array<{ memberId: string; present: boolean; notes?: string }>;
        };
        await this.attendance.recordBulk(item.churchId, data, data.recordedById);
        return;
      }
      default:
        throw new Error(`Unsupported sync entity type: ${item.entityType}`);
    }
  }

  async queueStats(churchId: string) {
    const [pending, failed, synced] = await Promise.all([
      this.prisma.syncQueueItem.count({
        where: { churchId, status: 'PENDING' },
      }),
      this.prisma.syncQueueItem.count({
        where: { churchId, status: 'FAILED', attempts: { lt: 5 } },
      }),
      this.prisma.syncQueueItem.count({
        where: { churchId, status: 'SYNCED' },
      }),
    ]);
    return { pending, failed, synced };
  }
}
