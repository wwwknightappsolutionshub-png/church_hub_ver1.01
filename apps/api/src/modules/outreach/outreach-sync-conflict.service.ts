import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SyncConflictResolution } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { OutreachService } from './outreach.service';
import {
  mergeCapturePayloads,
  outreachPayloadsConflict,
  type OutreachCapturePayload,
} from './outreach-sync.util';

@Injectable()
export class OutreachSyncConflictService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => OutreachService))
    private readonly outreach: OutreachService,
  ) {}

  async listOpenConflicts(churchId: string) {
    return this.prisma.syncConflict.findMany({
      where: { churchId, status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        outreachContact: {
          select: { id: true, firstName: true, lastName: true, phone: true, email: true, capturedAt: true },
        },
      },
    });
  }

  async recordConflict(
    churchId: string,
    clientId: string,
    entityType: string,
    serverPayload: OutreachCapturePayload,
    clientPayload: OutreachCapturePayload,
    outreachContactId?: string,
  ) {
    return this.prisma.syncConflict.upsert({
      where: {
        churchId_clientId_entityType: { churchId, clientId, entityType },
      },
      create: {
        churchId,
        clientId,
        entityType,
        serverPayload: serverPayload as Prisma.InputJsonValue,
        clientPayload: clientPayload as Prisma.InputJsonValue,
        outreachContactId,
        status: 'OPEN',
      },
      update: {
        serverPayload: serverPayload as Prisma.InputJsonValue,
        clientPayload: clientPayload as Prisma.InputJsonValue,
        outreachContactId,
        status: 'OPEN',
        resolution: null,
        resolvedAt: null,
        resolvedByUserId: null,
        mergedPayload: Prisma.JsonNull,
      },
    });
  }

  async resolveConflict(
    churchId: string,
    conflictId: string,
    userId: string,
    strategy: SyncConflictResolution,
    mergedPayload?: OutreachCapturePayload,
  ) {
    const conflict = await this.prisma.syncConflict.findFirst({
      where: { id: conflictId, churchId },
    });
    if (!conflict) throw new NotFoundException('Sync conflict not found');
    if (conflict.status === 'RESOLVED') {
      throw new BadRequestException('Conflict already resolved');
    }
    if (strategy === 'MERGED' && !mergedPayload) {
      mergedPayload = mergeCapturePayloads(
        conflict.serverPayload as OutreachCapturePayload,
        conflict.clientPayload as OutreachCapturePayload,
      );
    }

    let applyPayload: OutreachCapturePayload;
    switch (strategy) {
      case 'CLIENT_WINS':
        applyPayload = conflict.clientPayload as OutreachCapturePayload;
        break;
      case 'SERVER_WINS':
        applyPayload = conflict.serverPayload as OutreachCapturePayload;
        break;
      case 'MERGED':
        applyPayload = mergedPayload!;
        break;
      default:
        throw new BadRequestException('Invalid resolution strategy');
    }

    if (conflict.entityType === 'OUTREACH_CAPTURE') {
      await this.outreach.captureContact(churchId, {
        ...(applyPayload as Parameters<OutreachService['captureContact']>[1]),
        clientId: conflict.clientId,
        sendWelcome: false,
      });
    }

    await this.prisma.syncQueueItem.updateMany({
      where: {
        churchId,
        clientId: conflict.clientId,
        entityType: conflict.entityType,
      },
      data: { status: 'SYNCED', syncedAt: new Date(), lastError: null },
    });

    return this.prisma.syncConflict.update({
      where: { id: conflictId },
      data: {
        status: 'RESOLVED',
        resolution: strategy,
        mergedPayload:
          strategy === 'MERGED' ? (applyPayload as Prisma.InputJsonValue) : undefined,
        resolvedByUserId: userId,
        resolvedAt: new Date(),
      },
    });
  }

  detectConflict(
    server: OutreachCapturePayload,
    client: OutreachCapturePayload,
  ): boolean {
    return outreachPayloadsConflict(server, client);
  }
}
