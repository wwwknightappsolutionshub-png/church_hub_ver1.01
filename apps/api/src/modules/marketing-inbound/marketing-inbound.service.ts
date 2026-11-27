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
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { EmailAdapter } from '../notifications/adapters/email.adapter';
import {
  DEFAULT_PLATFORM_SUPPORT_EMAIL,
  MARKETING_INBOUND_TYPE_LABEL,
} from './marketing-inbound.constants';
import { cleanInternalNotes, cleanMarketingSubmission } from './marketing-inbound.input';

const SUBMISSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  private optionalEnum<T extends string>(value: string | undefined, allowed: T[], label: string): T | undefined {
    if (value == null || value === '') return undefined;
    if (!allowed.includes(value as T)) {
      throw new BadRequestException(`Invalid ${label}`);
    }
    return value as T;
  }

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
    const { type, name, email, organization, subject, message, rating } = cleanMarketingSubmission(input);

    let record: { id: string };
    try {
      record = await this.prisma.platformMarketingSubmission.create({
        data: {
          type,
          name,
          email,
          organization,
          subject,
          message,
          rating,
        },
        select: { id: true },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2004' || err.code === 'P2000')) {
        throw new BadRequestException('That submission could not be stored');
      }
      throw err;
    }

    const typeLabel = MARKETING_INBOUND_TYPE_LABEL[type];
    const mailSubject = `[Church Hub ${typeLabel}] ${(subject ?? name).replace(/[\r\n\u2028\u2029]/g, ' ')}`;
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

    return { ok: true as const };
  }

  list(filters?: {
    type?: MarketingInboundType | string;
    status?: MarketingInboundStatus | string;
  }) {
    const type = this.optionalEnum(filters?.type, Object.values(MarketingInboundType), 'type');
    const status = this.optionalEnum(filters?.status, Object.values(MarketingInboundStatus), 'status');
    return this.prisma.platformMarketingSubmission.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(status ? { status } : {}),
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
    if (!SUBMISSION_ID.test(id)) throw new NotFoundException('Submission not found');
    const notes = body.internalNotes === undefined ? undefined : cleanInternalNotes(body.internalNotes);
    const existing = await this.prisma.platformMarketingSubmission.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Submission not found');

    const status = body.status;
    if (status != null && typeof status !== 'string') {
      throw new BadRequestException('Invalid status');
    }
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
        ...(notes !== undefined ? { internalNotes: notes } : {}),
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
