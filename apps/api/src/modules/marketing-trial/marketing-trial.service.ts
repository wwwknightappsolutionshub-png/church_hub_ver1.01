import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.module';
import { EmailAdapter } from '../notifications/adapters/email.adapter';
import { buildMarketingTrialWelcomeEmail } from './marketing-trial-email';
import { normalizeEmailKey, parseNameFromEmailLocalPart } from './parse-email-name';

const TRIAL_TTL_HOURS = 48;
const EXISTING_ACCOUNT_MESSAGE =
  'Sorry, this email already has an account with us. Try password reset or use another email.';

@Injectable()
export class MarketingTrialService {
  private readonly logger = new Logger(MarketingTrialService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailAdapter,
    private readonly config: ConfigService,
  ) {}

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private appUrl(): string {
    return (
      this.config.get<string>('NEXT_PUBLIC_APP_URL') ??
      process.env.APP_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      'http://localhost:3001'
    ).replace(/\/$/, '');
  }

  private generateTempPassword(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const bytes = randomBytes(10);
    let out = '';
    for (let i = 0; i < 10; i++) {
      out += alphabet[bytes[i]! % alphabet.length];
    }
    return out;
  }

  async requestAccess(input: {
    email: string;
    firstName?: string;
    lastName?: string;
  }) {
    const email = input.email?.trim() ?? '';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Enter a valid email address');
    }

    const emailKey = normalizeEmailKey(email);

    const existingUser = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existingUser) {
      throw new ConflictException(EXISTING_ACCOUNT_MESSAGE);
    }

    let firstName = input.firstName?.trim() ?? '';
    let lastName = input.lastName?.trim() ?? '';

    if (!firstName || !lastName) {
      const parsed = parseNameFromEmailLocalPart(email);
      if (parsed) {
        firstName = firstName || parsed.firstName;
        lastName = lastName || parsed.lastName;
      }
    }

    if (!firstName || !lastName) {
      throw new BadRequestException('NAME_REQUIRED: Please enter your first and last name');
    }

    const temporaryPassword = this.generateTempPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + TRIAL_TTL_HOURS * 60 * 60 * 1000);

    await this.prisma.marketingTrialLead.create({
      data: {
        email: emailKey,
        emailKey,
        firstName,
        lastName,
        passwordHash,
        tokenHash,
        expiresAt,
      },
    });

    const loginUrl = `${this.appUrl()}/login?trial=${encodeURIComponent(rawToken)}`;
    const mail = buildMarketingTrialWelcomeEmail({
      firstName,
      loginUrl,
      temporaryPassword,
      expiresHours: TRIAL_TTL_HOURS,
    });

    try {
      await this.email.send({
        to: emailKey,
        subject: mail.subject,
        body: mail.text,
        html: mail.html,
        churchId: null,
        purpose: 'onboarding',
      });
    } catch (err) {
      this.logger.error(
        `Failed to send trial welcome email to ${emailKey}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw new BadRequestException('Could not send the welcome email. Please try again shortly.');
    }

    return { ok: true as const };
  }

  async preview(rawToken: string) {
    const lead = await this.findValidLead(rawToken);
    return {
      email: lead.email,
      firstName: lead.firstName,
      lastName: lead.lastName,
    };
  }

  async redeem(rawToken: string, password: string) {
    if (!password?.trim()) {
      throw new BadRequestException('Enter the temporary password from your email');
    }

    const lead = await this.findValidLead(rawToken);
    const ok = await bcrypt.compare(password, lead.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid temporary password');
    }

    await this.prisma.marketingTrialLead.update({
      where: { id: lead.id },
      data: { consumedAt: new Date() },
    });

    return {
      email: lead.email,
      firstName: lead.firstName,
      lastName: lead.lastName,
      redirectTo: '/register',
    };
  }

  private async findValidLead(rawToken: string) {
    const token = rawToken?.trim() ?? '';
    if (!token || token.length < 16) {
      throw new BadRequestException('Invalid or expired trial link');
    }

    const lead = await this.prisma.marketingTrialLead.findUnique({
      where: { tokenHash: this.hashToken(token) },
    });

    if (!lead || lead.consumedAt || lead.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('This trial link is invalid or has expired');
    }

    return lead;
  }
}
