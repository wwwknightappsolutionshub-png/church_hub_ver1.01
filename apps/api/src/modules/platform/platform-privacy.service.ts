import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ConsentType,
  DsarRequestStatus,
  DsarRequestType,
  MemberGender,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes, randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { PlatformCmsService } from './platform-cms.service';
import { RecordConsentDto, UpdateDsarDto } from './dto/platform-cms.dto';

@Injectable()
export class PlatformPrivacyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cms: PlatformCmsService,
  ) {}

  async recordConsents(input: {
    userId?: string | null;
    churchId?: string | null;
    email?: string | null;
    consents: Array<{
      consentType: ConsentType;
      documentSlug: string;
      documentVersion?: number;
      accepted?: boolean;
    }>;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    const rows = [];
    for (const c of input.consents) {
      const version =
        c.documentVersion ?? (await this.cms.resolveDocumentVersion(c.documentSlug));
      rows.push(
        await this.prisma.userConsentRecord.create({
          data: {
            userId: input.userId ?? null,
            churchId: input.churchId ?? null,
            email: input.email?.trim().toLowerCase() || null,
            consentType: c.consentType,
            documentSlug: c.documentSlug,
            documentVersion: version,
            accepted: c.accepted ?? true,
            ipAddress: input.ipAddress ?? null,
            userAgent: input.userAgent ?? null,
          },
        }),
      );
    }
    return rows;
  }

  async recordConsentForUser(
    userId: string,
    churchId: string | null,
    email: string,
    body: RecordConsentDto,
    meta?: { ipAddress?: string; userAgent?: string },
  ) {
    return this.recordConsents({
      userId,
      churchId,
      email,
      consents: [
        {
          consentType: body.consentType as ConsentType,
          documentSlug: body.documentSlug,
          documentVersion: body.documentVersion,
          accepted: body.accepted,
        },
      ],
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });
  }

  /** Public / anonymous cookie banner decisions (COOKIES consent type). */
  async recordCookieConsent(input: {
    choice: 'accepted' | 'essential';
    userId?: string | null;
    churchId?: string | null;
    email?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    return this.recordConsents({
      userId: input.userId,
      churchId: input.churchId,
      email: input.email,
      consents: [
        {
          consentType: ConsentType.COOKIES,
          documentSlug: 'cookie-policy',
          accepted: input.choice === 'accepted',
        },
      ],
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });
  }

  listMyConsents(userId: string) {
    return this.prisma.userConsentRecord.findMany({
      where: { userId },
      orderBy: { acceptedAt: 'desc' },
    });
  }

  async exportMyData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        churchId: true,
        email: true,
        firstName: true,
        lastName: true,
        nickname: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        anonymizedAt: true,
        roles: { include: { role: { select: { name: true, scope: true } } } },
        member: {
          include: {
            customFieldValues: true,
            businessProfile: true,
            serviceUnitMemberships: {
              include: { serviceUnit: { select: { id: true, name: true } } },
            },
            serviceUnitLeaderships: {
              include: { serviceUnit: { select: { id: true, name: true } } },
            },
            serviceUnitJoinRequests: {
              select: {
                id: true,
                status: true,
                motivation: true,
                createdAt: true,
                serviceUnitId: true,
              },
            },
          },
        },
        consentRecords: { orderBy: { acceptedAt: 'desc' } },
        dsarRequests: { orderBy: { createdAt: 'desc' } },
        notifications: {
          orderBy: { sentAt: 'desc' },
          take: 200,
          select: {
            id: true,
            title: true,
            body: true,
            type: true,
            readAt: true,
            sentAt: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.anonymizedAt) {
      throw new BadRequestException('Account has already been anonymized');
    }

    const memberId = user.member?.id;

    const [
      pastoralNotes,
      attendance,
      chatMessages,
      sentInApp,
      receivedInApp,
    ] = await Promise.all([
      memberId
        ? this.prisma.pastoralNote.findMany({
            where: { memberId },
            orderBy: { createdAt: 'desc' },
            take: 200,
            select: {
              id: true,
              content: true,
              isConfidential: true,
              createdAt: true,
              updatedAt: true,
            },
          })
        : Promise.resolve([]),
      memberId
        ? this.prisma.attendanceRecord.findMany({
            where: { memberId },
            orderBy: { serviceDate: 'desc' },
            take: 500,
            select: {
              id: true,
              present: true,
              serviceDate: true,
              scope: true,
              notes: true,
              churchServiceId: true,
              serviceUnitId: true,
              createdAt: true,
            },
          })
        : Promise.resolve([]),
      this.prisma.message.findMany({
        where: { senderId: userId },
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: {
          id: true,
          content: true,
          messageType: true,
          channelId: true,
          createdAt: true,
          editedAt: true,
        },
      }),
      this.prisma.inAppMessage.findMany({
        where: { senderId: userId },
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: {
          id: true,
          subject: true,
          body: true,
          readAt: true,
          createdAt: true,
          recipientId: true,
        },
      }),
      this.prisma.inAppMessage.findMany({
        where: { recipientId: userId },
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: {
          id: true,
          subject: true,
          body: true,
          readAt: true,
          createdAt: true,
          senderId: true,
        },
      }),
    ]);

    await this.prisma.platformDsarRequest.create({
      data: {
        churchId: user.churchId,
        userId: user.id,
        requesterEmail: user.email,
        requesterName: `${user.firstName} ${user.lastName}`.trim(),
        type: DsarRequestType.ACCESS,
        status: DsarRequestStatus.COMPLETED,
        notes: 'Self-service data export',
        completedAt: new Date(),
      },
    });

    return {
      exportedAt: new Date().toISOString(),
      schemaVersion: 2,
      subject: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        nickname: user.nickname,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        churchId: user.churchId,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        roles: user.roles.map((r) => r.role.name),
      },
      member: user.member,
      consents: user.consentRecords,
      priorRequests: user.dsarRequests,
      notifications: user.notifications,
      pastoralNotes,
      attendance,
      communications: {
        chatMessages,
        inAppSent: sentInApp,
        inAppReceived: receivedInApp,
      },
    };
  }

  async requestErasure(userId: string, opts?: { executeNow?: boolean; notes?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        churchId: true,
        email: true,
        firstName: true,
        lastName: true,
        anonymizedAt: true,
        roles: { include: { role: { select: { name: true, scope: true } } } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.anonymizedAt) {
      throw new BadRequestException('Account has already been anonymized');
    }

    const isPlatformAdmin = user.roles.some((r) => r.role.name === 'PLATFORM_ADMIN');
    if (isPlatformAdmin) {
      throw new BadRequestException(
        'Platform admin accounts cannot self-erase. Contact another owner to handle this request.',
      );
    }

    const request = await this.prisma.platformDsarRequest.create({
      data: {
        churchId: user.churchId,
        userId: user.id,
        requesterEmail: user.email,
        requesterName: `${user.firstName} ${user.lastName}`.trim(),
        type: DsarRequestType.ERASURE,
        status: opts?.executeNow ? DsarRequestStatus.IN_PROGRESS : DsarRequestStatus.OPEN,
        notes: opts?.notes ?? 'Self-service erasure request',
      },
    });

    if (opts?.executeNow) {
      await this.anonymizeUser(user.id, user.id);
      return this.prisma.platformDsarRequest.update({
        where: { id: request.id },
        data: {
          status: DsarRequestStatus.COMPLETED,
          completedAt: new Date(),
          handledById: user.id,
          notes: `${request.notes ?? ''}\nErasure executed immediately by subject.`.trim(),
          requesterEmail: 'redacted@anonymized.invalid',
          requesterName: 'Deleted User',
        },
      });
    }

    return request;
  }

  listDsar(status?: DsarRequestStatus) {
    return this.prisma.platformDsarRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        church: { select: { id: true, name: true, slug: true } },
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, anonymizedAt: true },
        },
        handledBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      take: 200,
    });
  }

  async updateDsar(handlerId: string, id: string, body: UpdateDsarDto) {
    const existing = await this.prisma.platformDsarRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Request not found');

    if (body.executeErasure) {
      if (!existing.userId) {
        throw new BadRequestException('No linked user to erase');
      }
      if (existing.type !== DsarRequestType.ERASURE) {
        throw new BadRequestException('executeErasure only applies to ERASURE requests');
      }
      await this.anonymizeUser(existing.userId, handlerId);
      return this.prisma.platformDsarRequest.update({
        where: { id },
        data: {
          status: DsarRequestStatus.COMPLETED,
          completedAt: new Date(),
          handledById: handlerId,
          notes: body.notes?.trim() || existing.notes,
          requesterEmail: 'redacted@anonymized.invalid',
          requesterName: 'Deleted User',
        },
      });
    }

    const status = body.status as DsarRequestStatus | undefined;

    // Prevent marking ERASURE complete without actually anonymizing.
    if (
      status === DsarRequestStatus.COMPLETED &&
      existing.type === DsarRequestType.ERASURE
    ) {
      const linked = existing.userId
        ? await this.prisma.user.findUnique({
            where: { id: existing.userId },
            select: { anonymizedAt: true },
          })
        : null;
      if (!linked?.anonymizedAt) {
        throw new BadRequestException(
          'Cannot complete an ERASURE request without executing erasure. Use executeErasure: true.',
        );
      }
    }

    return this.prisma.platformDsarRequest.update({
      where: { id },
      data: {
        status,
        notes: body.notes !== undefined ? body.notes.trim() : undefined,
        handledById: handlerId,
        completedAt:
          status === DsarRequestStatus.COMPLETED || status === DsarRequestStatus.REJECTED
            ? new Date()
            : status
              ? null
              : undefined,
      },
    });
  }

  async anonymizeUser(userId: string, actorId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { member: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.anonymizedAt) return { ok: true, already: true };

    const token = randomUUID().replace(/-/g, '').slice(0, 12);
    const anonEmail = `deleted+${token}@anonymized.invalid`;
    const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
    const originalEmail = user.email.toLowerCase();
    const memberId = user.member?.id;

    await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.deleteMany({ where: { userId } });
      await tx.authLinkToken.deleteMany({ where: { userId } });
      await tx.pushSubscription.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });

      // Redact chat + in-app messages involving the subject
      await tx.message.updateMany({
        where: { senderId: userId },
        data: {
          content: '[Content removed under data subject erasure request]',
          attachmentUrl: null,
          isHidden: true,
        },
      });

      await tx.inAppMessage.updateMany({
        where: { OR: [{ senderId: userId }, { recipientId: userId }] },
        data: {
          subject: '[redacted]',
          body: '[Content removed under data subject erasure request]',
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          email: anonEmail,
          firstName: 'Deleted',
          lastName: 'User',
          nickname: null,
          phone: null,
          avatarUrl: null,
          passwordHash,
          isActive: false,
          mustChangePassword: false,
          anonymizedAt: new Date(),
        },
      });

      // Scrub consent + DSAR PII for this subject
      await tx.userConsentRecord.updateMany({
        where: {
          OR: [{ userId }, { email: { equals: originalEmail, mode: 'insensitive' } }],
        },
        data: { email: null, ipAddress: null, userAgent: null },
      });

      await tx.platformDsarRequest.updateMany({
        where: {
          OR: [{ userId }, { requesterEmail: { equals: originalEmail, mode: 'insensitive' } }],
        },
        data: {
          requesterEmail: 'redacted@anonymized.invalid',
          requesterName: 'Deleted User',
        },
      });

      if (memberId) {
        await tx.memberCustomFieldValue.deleteMany({ where: { memberId } });

        await tx.pastoralNote.updateMany({
          where: { memberId },
          data: {
            content: '[Redacted — data subject erasure]',
            isConfidential: true,
          },
        });

        await tx.attendanceRecord.updateMany({
          where: { memberId },
          data: { notes: null },
        });

        await tx.serviceUnitJoinRequest.updateMany({
          where: { memberId },
          data: {
            firstName: 'Deleted',
            lastName: 'Member',
            email: null,
            phone: null,
            motivation: null,
          },
        });

        const business = await tx.businessProfile.findUnique({ where: { memberId } });
        if (business) {
          await tx.businessProfile.update({
            where: { memberId },
            data: {
              businessName: 'Deleted Business',
              tagline: null,
              description: null,
              website: null,
              phone: null,
              email: null,
              address: null,
              logoUrl: null,
              category: null,
              servicesOffered: [],
            },
          });
        }

        await tx.member.update({
          where: { id: memberId },
          data: {
            firstName: 'Deleted',
            lastName: 'Member',
            title: null,
            middleName: null,
            suffix: null,
            nickname: null,
            gender: MemberGender.UNKNOWN,
            email: null,
            workEmail: null,
            phone: null,
            homePhone: null,
            workPhone: null,
            cellPhone: null,
            dateOfBirth: null,
            address: null,
            address2: null,
            city: null,
            state: null,
            zip: null,
            country: null,
            avatarUrl: null,
            facebook: null,
            twitter: null,
            linkedIn: null,
            notes: null,
            specialOccasion: null,
            specialOccasionDate: null,
            bornAgain: null,
            baptizedInHolySpirit: null,
            ministryInterests: [],
            userId: null,
          },
        });
      }
    });

    // Audit note on any open ERASURE rows for this user
    await this.prisma.platformDsarRequest.updateMany({
      where: {
        userId,
        type: DsarRequestType.ERASURE,
        status: { in: [DsarRequestStatus.OPEN, DsarRequestStatus.IN_PROGRESS] },
      },
      data: {
        notes: `Erasure executed by ${actorId} at ${new Date().toISOString()}`,
      },
    });

    return { ok: true };
  }
}
