import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommunitySupportRequestType, CommunitySupportStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { EmailAdapter } from '../notifications/adapters/email.adapter';

const STAFF_ROLES = ['ADMIN', 'PASTOR'] as const;
const DEFAULT_VALIDITY_DAYS = 90;

@Injectable()
export class CommunitySupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailAdapter,
  ) {}

  private formatDate(d: Date) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  private addDays(d: Date, days: number) {
    const out = new Date(d);
    out.setDate(out.getDate() + days);
    return out;
  }

  private isActive(row: { status: CommunitySupportStatus; validUntil: Date | null }) {
    if (row.status !== 'APPROVED') return false;
    if (!row.validUntil) return true;
    return row.validUntil > new Date();
  }

  private mapPublicItem(row: {
    id: string;
    requestType: CommunitySupportRequestType;
    title: string;
    description: string;
    location: string | null;
    skills: string | null;
    status: CommunitySupportStatus;
    createdAt: Date;
    approvedAt: Date | null;
    validUntil: Date | null;
  }) {
    return {
      id: row.id,
      requestType: row.requestType,
      title: row.title,
      summary:
        row.description.length > 220 ? `${row.description.slice(0, 217).trim()}…` : row.description,
      location: row.location ?? undefined,
      contactHint: row.skills ?? undefined,
      submittedAtLabel: this.formatDate(row.createdAt),
      approvedAtLabel: row.approvedAt ? this.formatDate(row.approvedAt) : undefined,
      validUntilLabel: row.validUntil ? this.formatDate(row.validUntil) : undefined,
      dateLabel: row.approvedAt
        ? `Approved ${this.formatDate(row.approvedAt)}${row.validUntil ? ` · Valid until ${this.formatDate(row.validUntil)}` : ''}`
        : undefined,
    };
  }

  private async requireMember(churchId: string, userId: string) {
    const member = await this.prisma.member.findFirst({
      where: { churchId, userId },
    });
    if (!member) throw new ForbiddenException('Member profile required');
    return member;
  }

  private async requireStaff(churchId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        churchId,
        isActive: true,
        roles: { some: { role: { name: { in: [...STAFF_ROLES] } } } },
      },
    });
    if (!user) throw new ForbiddenException('Admin or pastor access required');
    return user;
  }

  private async requireAdmin(churchId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        churchId,
        isActive: true,
        roles: { some: { role: { name: 'ADMIN' } } },
      },
    });
    if (!user) throw new ForbiddenException('Church admin access required');
    return user;
  }

  private async notifyStaff(params: {
    churchId: string;
    churchName: string;
    title: string;
    body: string;
    emailSubject: string;
    emailBody: string;
    notificationType: string;
    data?: Prisma.InputJsonValue;
  }) {
    const staff = await this.prisma.user.findMany({
      where: {
        churchId: params.churchId,
        isActive: true,
        roles: { some: { role: { name: { in: [...STAFF_ROLES] } } } },
      },
      select: { id: true, email: true },
    });

    for (const user of staff) {
      await this.prisma.notification.create({
        data: {
          churchId: params.churchId,
          userId: user.id,
          type: params.notificationType,
          title: params.title,
          body: params.body,
          data: params.data ?? ({} as Prisma.InputJsonValue),
        },
      });
      if (user.email) {
        await this.email.send({
          churchId: params.churchId,
          to: user.email,
          subject: params.emailSubject,
          body: params.emailBody,
        });
      }
    }
  }

  async submit(
    churchId: string,
    userId: string,
    body: {
      requestType: CommunitySupportRequestType;
      title: string;
      description: string;
      location?: string;
      contactEmail?: string;
      contactPhone?: string;
      skills?: string;
    },
  ) {
    const member = await this.requireMember(churchId, userId);
    const title = body.title?.trim();
    const description = body.description?.trim();
    if (!title || title.length < 3) throw new BadRequestException('Title is required');
    if (!description || description.length < 10) {
      throw new BadRequestException('Please provide a short description (at least 10 characters)');
    }

    const church = await this.prisma.church.findUnique({ where: { id: churchId } });
    if (!church) throw new NotFoundException('Church not found');

    const request = await this.prisma.communitySupportRequest.create({
      data: {
        churchId,
        memberId: member.id,
        requestType: body.requestType,
        title,
        description,
        location: body.location?.trim() || undefined,
        contactEmail: body.contactEmail?.trim() || undefined,
        contactPhone: body.contactPhone?.trim() || undefined,
        skills: body.skills?.trim() || undefined,
      },
    });

    const typeLabel = body.requestType === 'JOB_SEARCH' ? 'Job search' : 'Business search';
    await this.notifyStaff({
      churchId,
      churchName: church.name,
      title: `Community support: ${typeLabel} pending approval`,
      body: `${title} — submitted by a member. Review in the admin dashboard.`,
      emailSubject: `[${church.name}] Community support request pending`,
      emailBody: `A member submitted a ${typeLabel.toLowerCase()} request titled "${title}".\n\nSign in to the dashboard to approve or reject.\n\nDescription:\n${description}`,
      notificationType: 'COMMUNITY_SUPPORT_SUBMITTED',
      data: { requestId: request.id, requestType: body.requestType } as Prisma.InputJsonValue,
    });

    return request;
  }

  listMine(churchId: string, userId: string) {
    return this.requireMember(churchId, userId).then((member) =>
      this.prisma.communitySupportRequest.findMany({
        where: { churchId, memberId: member.id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          requestType: true,
          title: true,
          description: true,
          location: true,
          status: true,
          rejectionNote: true,
          createdAt: true,
          approvedAt: true,
          validUntil: true,
        },
      }),
    );
  }

  listForAdmin(churchId: string, userId: string, status?: CommunitySupportStatus) {
    return this.requireStaff(churchId, userId).then(() =>
      this.prisma.communitySupportRequest.findMany({
        where: { churchId, ...(status ? { status } : {}) },
        orderBy: { createdAt: 'desc' },
        include: {
          member: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        },
      }),
    );
  }

  listForChurchAdmin(churchId: string, userId: string, status?: CommunitySupportStatus) {
    return this.requireAdmin(churchId, userId).then(() =>
      this.prisma.communitySupportRequest.findMany({
        where: { churchId, ...(status ? { status } : {}) },
        orderBy: { createdAt: 'desc' },
        include: {
          member: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          approvedBy: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
    );
  }

  async createByAdmin(
    churchId: string,
    userId: string,
    body: {
      memberId: string;
      requestType: CommunitySupportRequestType;
      title: string;
      description: string;
      location?: string;
      contactEmail?: string;
      contactPhone?: string;
      skills?: string;
      status?: CommunitySupportStatus;
      validUntil?: string;
    },
  ) {
    await this.requireAdmin(churchId, userId);
    const member = await this.prisma.member.findFirst({
      where: { id: body.memberId, churchId },
    });
    if (!member) throw new NotFoundException('Member not found');

    const title = body.title?.trim();
    const description = body.description?.trim();
    if (!title || !description) throw new BadRequestException('Title and description are required');

    const status = body.status ?? 'PENDING';
    const approvedAt = status === 'APPROVED' ? new Date() : null;
    const validUntil =
      status === 'APPROVED'
        ? body.validUntil
          ? new Date(body.validUntil)
          : this.addDays(approvedAt!, DEFAULT_VALIDITY_DAYS)
        : null;

    return this.prisma.communitySupportRequest.create({
      data: {
        churchId,
        memberId: member.id,
        requestType: body.requestType,
        title,
        description,
        location: body.location?.trim() || undefined,
        contactEmail: body.contactEmail?.trim() || undefined,
        contactPhone: body.contactPhone?.trim() || undefined,
        skills: body.skills?.trim() || undefined,
        status,
        approvedAt,
        approvedById: status === 'APPROVED' ? userId : null,
        validUntil,
      },
      include: {
        member: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async updateByAdmin(
    churchId: string,
    userId: string,
    id: string,
    body: Partial<{
      requestType: CommunitySupportRequestType;
      title: string;
      description: string;
      location: string;
      contactEmail: string;
      contactPhone: string;
      skills: string;
      status: CommunitySupportStatus;
      validUntil: string | null;
    }>,
  ) {
    await this.requireAdmin(churchId, userId);
    const existing = await this.prisma.communitySupportRequest.findFirst({
      where: { id, churchId },
    });
    if (!existing) throw new NotFoundException('Request not found');

    const status = body.status ?? existing.status;
    const approvedAt =
      status === 'APPROVED' && existing.status !== 'APPROVED'
        ? new Date()
        : status === 'APPROVED'
          ? existing.approvedAt ?? new Date()
          : status === 'PENDING'
            ? null
            : existing.approvedAt;

    let validUntil = existing.validUntil;
    if (body.validUntil !== undefined) {
      validUntil = body.validUntil ? new Date(body.validUntil) : null;
    } else if (status === 'APPROVED' && !validUntil && approvedAt) {
      validUntil = this.addDays(approvedAt, DEFAULT_VALIDITY_DAYS);
    }
    if (status !== 'APPROVED') validUntil = null;

    return this.prisma.communitySupportRequest.update({
      where: { id },
      data: {
        requestType: body.requestType,
        title: body.title?.trim(),
        description: body.description?.trim(),
        location: body.location !== undefined ? body.location?.trim() || null : undefined,
        contactEmail: body.contactEmail !== undefined ? body.contactEmail?.trim() || null : undefined,
        contactPhone: body.contactPhone !== undefined ? body.contactPhone?.trim() || null : undefined,
        skills: body.skills !== undefined ? body.skills?.trim() || null : undefined,
        status,
        approvedAt,
        approvedById: status === 'APPROVED' ? userId : null,
        validUntil,
        rejectedAt: status === 'REJECTED' ? new Date() : status === 'APPROVED' ? null : existing.rejectedAt,
        rejectionNote: status === 'REJECTED' ? existing.rejectionNote : status === 'APPROVED' ? null : undefined,
      },
      include: {
        member: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async deleteByAdmin(churchId: string, userId: string, id: string) {
    await this.requireAdmin(churchId, userId);
    const existing = await this.prisma.communitySupportRequest.findFirst({ where: { id, churchId } });
    if (!existing) throw new NotFoundException('Request not found');
    return this.prisma.communitySupportRequest.delete({ where: { id } });
  }

  async approve(
    churchId: string,
    userId: string,
    id: string,
    opts?: { validUntil?: string; validityDays?: number },
  ) {
    await this.requireStaff(churchId, userId);
    const existing = await this.prisma.communitySupportRequest.findFirst({
      where: { id, churchId },
    });
    if (!existing) throw new NotFoundException('Request not found');
    if (existing.status === 'APPROVED') return existing;

    const approvedAt = new Date();
    const days = opts?.validityDays ?? DEFAULT_VALIDITY_DAYS;
    const validUntil = opts?.validUntil
      ? new Date(opts.validUntil)
      : this.addDays(approvedAt, days);

    return this.prisma.communitySupportRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt,
        approvedById: userId,
        validUntil,
        rejectedAt: null,
        rejectionNote: null,
      },
    });
  }

  async reject(churchId: string, userId: string, id: string, note?: string) {
    await this.requireStaff(churchId, userId);
    const existing = await this.prisma.communitySupportRequest.findFirst({
      where: { id, churchId },
    });
    if (!existing) throw new NotFoundException('Request not found');

    return this.prisma.communitySupportRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectionNote: note?.trim() || undefined,
        approvedAt: null,
        approvedById: null,
        validUntil: null,
      },
    });
  }

  async listApprovedPublic(churchId: string) {
    const now = new Date();
    const rows = await this.prisma.communitySupportRequest.findMany({
      where: {
        churchId,
        status: 'APPROVED',
        OR: [{ validUntil: null }, { validUntil: { gt: now } }],
      },
      orderBy: { approvedAt: 'desc' },
      take: 48,
    });

    return rows.map((row) => this.mapPublicItem(row));
  }

  async listForKonnectJobBoard(churchId: string) {
    const now = new Date();
    const rows = await this.prisma.communitySupportRequest.findMany({
      where: {
        churchId,
        status: 'APPROVED',
        OR: [{ validUntil: null }, { validUntil: { gt: now } }],
      },
      orderBy: { approvedAt: 'desc' },
      take: 24,
    });
    return rows.map((row) => ({
      source: 'community' as const,
      id: row.id,
      title: row.title,
      description: row.description,
      location: row.location,
      jobType: row.requestType === 'JOB_SEARCH' ? 'Member job search' : 'Member business search',
      isActive: this.isActive(row),
      createdAt: row.approvedAt ?? row.createdAt,
      submittedAt: row.createdAt,
      approvedAt: row.approvedAt,
      validUntil: row.validUntil,
    }));
  }
}
