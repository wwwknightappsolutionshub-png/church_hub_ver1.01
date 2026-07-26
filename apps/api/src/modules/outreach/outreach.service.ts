import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import * as QRCode from 'qrcode';
import { PrismaService } from '../../prisma/prisma.module';
import { FollowUpService } from '../follow-up/follow-up.service';
import { SmsAdapter } from '../notifications/adapters/sms.adapter';
import { EmailAdapter } from '../notifications/adapters/email.adapter';
import {
  DEFAULT_WELCOME_EMAIL_BODY,
  DEFAULT_WELCOME_EMAIL_SUBJECT,
  DEFAULT_WELCOME_SMS,
} from './outreach.constants';
import { OutreachSyncConflictService } from './outreach-sync-conflict.service';
import {
  outreachPayloadsConflict,
  type OutreachCapturePayload,
} from './outreach-sync.util';

@Injectable()
export class OutreachService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly followUp: FollowUpService,
    private readonly sms: SmsAdapter,
    private readonly email: EmailAdapter,
    @Inject(forwardRef(() => OutreachSyncConflictService))
    private readonly syncConflicts: OutreachSyncConflictService,
  ) {}

  private contactToPayload(contact: {
    firstName: string;
    lastName: string | null;
    phone: string | null;
    email: string | null;
    notes: string | null;
    evangelistId: string | null;
    latitude: number | null;
    longitude: number | null;
    locationLabel: string | null;
  }): OutreachCapturePayload {
    return {
      firstName: contact.firstName,
      lastName: contact.lastName ?? undefined,
      phone: contact.phone ?? undefined,
      email: contact.email ?? undefined,
      notes: contact.notes ?? undefined,
      evangelistId: contact.evangelistId ?? undefined,
      latitude: contact.latitude ?? undefined,
      longitude: contact.longitude ?? undefined,
      locationLabel: contact.locationLabel ?? undefined,
    };
  }

  private applyTemplate(text: string, name: string, churchName: string) {
    return text.replace(/\{\{name\}\}/gi, name).replace(/\{\{church\}\}/gi, churchName);
  }

  async getStats(churchId: string) {
    const [total, today, welcomeSent, pendingSync, qrScans] = await Promise.all([
      this.prisma.outreachContact.count({ where: { churchId } }),
      this.prisma.outreachContact.count({
        where: {
          churchId,
          capturedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      this.prisma.outreachContact.count({
        where: { churchId, welcomeSentAt: { not: null } },
      }),
      this.prisma.syncQueueItem.count({
        where: { churchId, status: { in: ['PENDING', 'FAILED'] } },
      }),
      this.prisma.evangelistQrCode.aggregate({
        where: { churchId, isActive: true },
        _sum: { scanCount: true },
      }),
    ]);

    return {
      total,
      today,
      welcomeSent,
      pendingSync,
      qrScans: qrScans._sum.scanCount ?? 0,
    };
  }

  async captureContact(
    churchId: string,
    data: {
      firstName: string;
      lastName?: string;
      phone?: string;
      email?: string;
      evangelistId?: string;
      qrCodeId?: string;
      latitude?: number;
      longitude?: number;
      locationLabel?: string;
      postcode?: string;
      photoConsent?: boolean;
      photoUrl?: string;
      notes?: string;
      voiceNotes?: string;
      needsBusPickup?: boolean;
      pickupAddress?: string;
      busPickupNotes?: string;
      clientId?: string;
      capturedAt?: string;
      sendWelcome?: boolean;
      capturedByUserId?: string;
    },
  ) {
    if (data.photoUrl && !data.photoConsent) {
      throw new BadRequestException('Photo consent is required before uploading a photo');
    }

    if (data.clientId) {
      const dup = await this.prisma.outreachContact.findUnique({
        where: { clientId: data.clientId },
      });
      if (dup) {
        const serverPayload = this.contactToPayload(dup);
        const clientPayload = data as OutreachCapturePayload;
        if (outreachPayloadsConflict(serverPayload, clientPayload)) {
          await this.syncConflicts.recordConflict(
            churchId,
            data.clientId,
            'OUTREACH_CAPTURE',
            serverPayload,
            clientPayload,
            dup.id,
          );
          await this.prisma.outreachContact.update({
            where: { id: dup.id },
            data: { syncStatus: 'CONFLICT' },
          });
          await this.prisma.syncQueueItem.updateMany({
            where: {
              churchId,
              clientId: data.clientId,
              entityType: 'OUTREACH_CAPTURE',
            },
            data: { status: 'CONFLICT' },
          });
          throw new BadRequestException({
            message: 'Outreach capture conflict — resolve in sync conflicts',
            code: 'SYNC_CONFLICT',
            clientId: data.clientId,
          });
        }
        return dup;
      }
    }

    if (data.qrCodeId) {
      await this.prisma.evangelistQrCode.update({
        where: { id: data.qrCodeId },
        data: { scanCount: { increment: 1 } },
      });
    }

    const contact = await this.prisma.outreachContact.create({
      data: {
        churchId,
        clientId: data.clientId ?? randomBytes(12).toString('hex'),
        evangelistId: data.evangelistId,
        qrCodeId: data.qrCodeId,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        email: data.email,
        latitude: data.latitude,
        longitude: data.longitude,
        locationLabel: [data.postcode, data.locationLabel].filter(Boolean).join(' · ') || data.locationLabel,
        photoConsent: data.photoConsent ?? false,
        photoUrl: data.photoUrl,
        notes: data.notes,
        voiceNotes: data.voiceNotes,
        needsBusPickup: data.needsBusPickup ?? false,
        pickupAddress: data.pickupAddress,
        busPickupNotes: data.busPickupNotes,
        capturedAt: data.capturedAt ? new Date(data.capturedAt) : new Date(),
        syncStatus: 'SYNCED',
        convertStage: 'CAPTURED',
      },
      include: {
        evangelist: { select: { firstName: true, lastName: true } },
      },
    });

    await this.followUp.createFromOutreach(churchId, {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      email: data.email,
      notes: [data.notes, data.voiceNotes].filter(Boolean).join(' '),
      outreachContactId: contact.id,
      evangelistMemberId: data.evangelistId,
      capturedByUserId: data.capturedByUserId,
    });

    if (data.sendWelcome !== false) {
      await this.sendWelcomeMessage(churchId, contact.id);
    }

    return this.prisma.outreachContact.findUnique({
      where: { id: contact.id },
      include: { evangelist: { select: { firstName: true, lastName: true } } },
    });
  }

  async sendWelcomeMessage(churchId: string, contactId: string) {
    const contact = await this.prisma.outreachContact.findFirst({
      where: { id: contactId, churchId },
    });
    if (!contact) throw new NotFoundException('Contact not found');

    const church = await this.prisma.church.findUnique({ where: { id: churchId } });
    const churchName = church?.name ?? 'Our church';
    const name = contact.firstName;

    if (contact.email) {
      await this.email.send({
        to: contact.email,
        subject: this.applyTemplate(DEFAULT_WELCOME_EMAIL_SUBJECT, name, churchName),
        body: this.applyTemplate(DEFAULT_WELCOME_EMAIL_BODY, name, churchName),
        churchId,
      });
    }
    if (contact.phone) {
      await this.sms.sendWhatsApp({
        to: contact.phone,
        body: this.applyTemplate(DEFAULT_WELCOME_SMS, name, churchName),
        churchId,
      });
    }

    return this.prisma.outreachContact.update({
      where: { id: contactId },
      data: { welcomeSentAt: new Date() },
    });
  }

  async queueOfflineCapture(
    churchId: string,
    items: Array<{
      clientId: string;
      entityType: string;
      payload: Record<string, unknown>;
      capturedAt: string;
    }>,
  ) {
    const results = [];
    for (const item of items) {
      const existing = await this.prisma.syncQueueItem.findUnique({
        where: {
          churchId_clientId_entityType: {
            churchId,
            clientId: item.clientId,
            entityType: item.entityType,
          },
        },
      });

      if (existing?.status === 'SYNCED') {
        results.push({ clientId: item.clientId, status: 'SYNCED', duplicate: true });
        continue;
      }

      const queueItem = await this.prisma.syncQueueItem.upsert({
        where: {
          churchId_clientId_entityType: {
            churchId,
            clientId: item.clientId,
            entityType: item.entityType,
          },
        },
        create: {
          churchId,
          clientId: item.clientId,
          entityType: item.entityType,
          payload: item.payload as Prisma.InputJsonValue,
          capturedAt: new Date(item.capturedAt),
          status: 'PENDING',
        },
        update: {
          payload: item.payload as Prisma.InputJsonValue,
          status: 'PENDING',
          attempts: { increment: 1 },
        },
      });

      try {
        if (item.entityType === 'OUTREACH_CAPTURE') {
          const payload = item.payload as Parameters<OutreachService['captureContact']>[1];
          await this.captureContact(churchId, {
            ...payload,
            clientId: item.clientId,
            capturedAt: item.capturedAt,
          });
        }
        await this.prisma.syncQueueItem.update({
          where: { id: queueItem.id },
          data: { status: 'SYNCED', syncedAt: new Date() },
        });
        results.push({ clientId: item.clientId, status: 'SYNCED' });
      } catch (err) {
        const isConflict =
          err instanceof BadRequestException &&
          typeof err.getResponse() === 'object' &&
          (err.getResponse() as { code?: string }).code === 'SYNC_CONFLICT';
        await this.prisma.syncQueueItem.update({
          where: { id: queueItem.id },
          data: {
            status: isConflict ? 'CONFLICT' : 'FAILED',
            attempts: { increment: 1 },
            lastError: err instanceof Error ? err.message : 'Sync failed',
          },
        });
        results.push({
          clientId: item.clientId,
          status: isConflict ? 'CONFLICT' : 'FAILED',
          error: err instanceof Error ? err.message : 'Sync failed',
        });
      }
    }
    return { results, synced: results.filter((r) => r.status === 'SYNCED').length, failed: results.filter((r) => r.status === 'FAILED').length };
  }

  async getSyncQueue(churchId: string) {
    return this.prisma.syncQueueItem.findMany({
      where: { churchId, status: { in: ['PENDING', 'FAILED', 'SYNCING'] } },
      orderBy: { capturedAt: 'asc' },
      take: 50,
    });
  }

  async generateEvangelistQr(churchId: string, memberId: string, baseUrl: string) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, churchId },
    });
    if (!member) throw new NotFoundException('Member not found');

    const code = randomBytes(8).toString('hex');
    const captureUrl = `${baseUrl}/outreach/capture?code=${code}`;

    const qr = await this.prisma.evangelistQrCode.create({
      data: {
        churchId,
        memberId,
        code,
        nfcUrl: captureUrl,
      },
      include: {
        church: { select: { name: true, slug: true } },
      },
    });

    const qrDataUrl = await QRCode.toDataURL(captureUrl, { width: 400, margin: 2, color: { dark: '#1e3a8a' } });

    return {
      ...qr,
      evangelistName: `${member.firstName} ${member.lastName}`,
      captureUrl,
      qrDataUrl,
      nfcInstructions: 'Program this URL to an NFC tag for tap-to-register outreach.',
    };
  }

  async getOrCreateMyQr(churchId: string, userId: string, baseUrl: string) {
    const member = await this.prisma.member.findFirst({
      where: { churchId, userId },
    });
    if (!member) throw new NotFoundException('Link your account to a member profile first');

    const existing = await this.prisma.evangelistQrCode.findFirst({
      where: { churchId, memberId: member.id, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      const captureUrl = existing.nfcUrl ?? `${baseUrl}/outreach/capture?code=${existing.code}`;
      const qrDataUrl = await QRCode.toDataURL(captureUrl, { width: 400, margin: 2 });
      return {
        ...existing,
        evangelistName: `${member.firstName} ${member.lastName}`,
        captureUrl,
        qrDataUrl,
        nfcInstructions: 'Program this URL to an NFC tag for tap-to-register outreach.',
      };
    }

    return this.generateEvangelistQr(churchId, member.id, baseUrl);
  }

  async resolveQrCode(code: string) {
    const qr = await this.prisma.evangelistQrCode.findUnique({
      where: { code },
      include: {
        church: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!qr || !qr.isActive) throw new NotFoundException('QR / NFC link not found');

    const member = await this.prisma.member.findUnique({
      where: { id: qr.memberId },
      select: { firstName: true, lastName: true },
    });

    return {
      ...qr,
      evangelistName: member ? `${member.firstName} ${member.lastName}` : 'Outreach team',
    };
  }

  async publicSelfRegister(
    code: string,
    data: {
      firstName: string;
      lastName?: string;
      phone?: string;
      email?: string;
      notes?: string;
    },
  ) {
    const qr = await this.resolveQrCode(code);
    return this.captureContact(qr.churchId, {
      ...data,
      qrCodeId: qr.id,
      evangelistId: qr.memberId,
      sendWelcome: true,
    });
  }

  async listContacts(churchId: string, evangelistId?: string, convertStage?: string) {
    return this.prisma.outreachContact.findMany({
      where: {
        churchId,
        ...(evangelistId ? { evangelistId } : {}),
        ...(convertStage ? { convertStage: convertStage as never } : {}),
      },
      include: {
        evangelist: { select: { firstName: true, lastName: true } },
        followUp: { select: { id: true, stage: true } },
        member: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { capturedAt: 'desc' },
      take: 100,
    });
  }

  async listTeamQrCodes(churchId: string) {
    const codes = await this.prisma.evangelistQrCode.findMany({
      where: { churchId, isActive: true },
      orderBy: { scanCount: 'desc' },
    });

    const members = await this.prisma.member.findMany({
      where: { id: { in: codes.map((c) => c.memberId) } },
      select: { id: true, firstName: true, lastName: true },
    });

    const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));

    return codes.map((c) => ({
      ...c,
      evangelistName: memberMap[c.memberId]
        ? `${memberMap[c.memberId].firstName} ${memberMap[c.memberId].lastName}`
        : 'Unknown',
    }));
  }
}
