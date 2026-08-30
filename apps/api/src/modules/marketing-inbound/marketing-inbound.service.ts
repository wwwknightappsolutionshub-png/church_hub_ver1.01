import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MarketingInboundStatus,
  MarketingInboundType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { EmailAdapter } from '../notifications/adapters/email.adapter';
import {
  DEFAULT_PLATFORM_SUPPORT_EMAIL,
  MARKETING_INBOUND_TYPE_LABEL,
} from './marketing-inbound.constants';

type SubmitInput = {
  type: MarketingInboundType;
  name: string;
  email: string;
  organization?: string;
  subject?: string;
  message: string;
  rating?: number;
};

@Injectable()
export class MarketingInboundService {
  private readonly logger = new Logger(MarketingInboundService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailAdapter,
    private readonly config: ConfigService,
  ) {}

  private supportInbox(): string {
    return (
      this.config.get<string>('PLATFORM_SUPPORT_INBOX') ??
      process.env.PLATFORM_SUPPORT_INBOX ??
      DEFAULT_PLATFORM_SUPPORT_EMAIL
    );
  }

  private dashboardUrl(): string {
    const base = (
      this.config.get<string>('NEXT_PUBLIC_APP_URL') ??
      process.env.APP_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      'http://localhost:3001'
    ).replace(/\/$/, '');
    return `${base}/dashboard/platform/marketing?tab=submissions`;
  }

  async submit(input: SubmitInput) {
    const type = input.type;
    if (type !== MarketingInboundType.CONTACT && type !== MarketingInboundType.FEEDBACK) {
      throw new BadRequestException('Invalid submission type');
    }

    const name = input.name?.trim() ?? '';
    const email = input.email?.trim() ?? '';
    const message = input.message?.trim() ?? '';
    const organization = input.organization?.trim() || null;
    const subject = input.subject?.trim() || null;

    if (!name || name.length < 2) {
      throw new BadRequestException('Enter your name');
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Enter a valid email address');
    }
    if (!message || message.length < 10) {
      throw new BadRequestException('Message must be at least 10 characters');
    }
    if (message.length > 8000) {
      throw new BadRequestException('Message is too long');
    }

    let rating: number | null = null;
    if (input.rating != null) {
      const n = Number(input.rating);
      if (!Number.isInteger(n) || n < 1 || n > 5) {
        throw new BadRequestException('Rating must be between 1 and 5');
      }
      rating = n;
    }

    if (type === MarketingInboundType.CONTACT && !subject) {
      throw new BadRequestException('Enter a subject for your message');
    }

    const record = await this.prisma.platformMarketingSubmission.create({
      data: {
        type,
        name,
        email,
        organization,
        subject,
        message,
        rating,
      },
    });

    const typeLabel = MARKETING_INBOUND_TYPE_LABEL[type];
    const mailSubject = `[Church Hub ${typeLabel}] ${subject ?? name}`;
    const lines = [
      `New ${typeLabel.toLowerCase()} submission from the Church Hub marketing site.`,
      '',
      `Type: ${typeLabel}`,
      `Name: ${name}`,
      `Email: ${email}`,
      organization ? `Organization: ${organization}` : null,
      subject ? `Subject: ${subject}` : null,
      rating != null ? `Rating: ${rating}/5` : null,
      '',
      'Message:',
      message,
      '',
      `View in platform dashboard: ${this.dashboardUrl()}`,
      `Submission ID: ${record.id}`,
    ].filter(Boolean);

    try {
      await this.email.send({
        to: this.supportInbox(),
        subject: mailSubject,
        body: lines.join('\n'),
        churchId: null,
        purpose: 'connect',
      });
    } catch (err) {
      this.logger.error(
        `Failed to email support for marketing submission ${record.id}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }

    return { ok: true as const, id: record.id };
  }

  list(filters?: {
    type?: MarketingInboundType;
    status?: MarketingInboundStatus;
  }) {
    return this.prisma.platformMarketingSubmission.findMany({
      where: {
        ...(filters?.type ? { type: filters.type } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        handledBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async update(
    handlerId: string,
    id: string,
    body: { status?: MarketingInboundStatus; internalNotes?: string | null },
  ) {
    const existing = await this.prisma.platformMarketingSubmission.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Submission not found');

    const status = body.status;
    if (
      status &&
      status !== MarketingInboundStatus.NEW &&
      status !== MarketingInboundStatus.READ &&
      status !== MarketingInboundStatus.ARCHIVED
    ) {
      throw new BadRequestException('Invalid status');
    }

    const markHandled =
      status === MarketingInboundStatus.READ ||
      status === MarketingInboundStatus.ARCHIVED;

    return this.prisma.platformMarketingSubmission.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(body.internalNotes !== undefined
          ? { internalNotes: body.internalNotes?.trim() || null }
          : {}),
        ...(markHandled
          ? { handledById: handlerId, handledAt: new Date() }
          : status === MarketingInboundStatus.NEW
            ? { handledById: null, handledAt: null }
            : {}),
      },
      include: {
        handledBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }
}
