import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
  HttpException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthLinkPurpose, ConsentType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash, randomInt, randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.module';
import {
  createDefaultChurchLanding,
  DEFAULT_LANDING_MEMBERSHIP_FORM,
  passwordFormatError,
} from '@church-hub/shared-types';
import { PlatformMarketingDripService } from '../platform/platform-marketing-drip.service';
import { EmailAdapter } from '../notifications/adapters/email.adapter';
import { SmsAdapter } from '../notifications/adapters/sms.adapter';
import { trySendWhatsApp } from '../notifications/try-send-whatsapp';
import { RedisCacheService } from '../../common/cache/redis-cache.service';
import { buildAuthLinkEmail } from './auth-link-email';
import { userRequiresLogin2fa } from './login-2fa.constants';
import { AuthAccessLimitService } from './auth-access-limit.service';
import type { AuthRequestContext } from './auth-request-context';

export interface JwtPayload {
  sub: string;
  churchId: string | null;
  email: string;
}

/** Password reset / magic-login / setup-invite links. */
const AUTH_LINK_TTL_MINUTES = 45;
/** Staff + unit-leader set-password invites (same window as reset page countdown). */
export const PASSWORD_SETUP_TTL_MINUTES = 45;
const REGISTER_OTP_TTL_SEC = 15 * 60;
const REGISTER_OTP_MAX_ATTEMPTS = 5;
const LOGIN_2FA_TTL_SEC = 15 * 60;
const LOGIN_2FA_MAX_ATTEMPTS = 5;
const GENERIC_LINK_SENT =
  'If an account exists for that email, we sent a link. Check your inbox (and spam folder).';
/** Failed password attempts in this window before clearing the password field. */
const LOGIN_CLEAR_PASSWORD_AT = 3;
/** Failed attempt that triggers an automatic password-reset email. */
const LOGIN_AUTO_RESET_AT = 4;
/** Account lockout after this many failures in the sliding window. */
const LOGIN_ACCOUNT_LOCKOUT_AT = 8;
/** Sliding window for counting failed logins (30 minutes). */
const LOGIN_FAILURE_WINDOW_MS = 30 * 60 * 1000;
/** Max password-link resends per user within the cooldown window. */
const PASSWORD_RESEND_MAX_PER_WINDOW = 3;
const PASSWORD_RESEND_WINDOW_SEC = 60 * 60;

interface PendingRegistration {
  churchName: string;
  churchSlug: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  otpHash: string;
  attempts: number;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  acceptedMarketing: boolean;
}

interface PendingLogin2fa {
  userId: string;
  email: string;
  firstName: string;
  otpHash: string;
  attempts: number;
  mustChangePassword: boolean;
  churchId: string | null;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly drips: PlatformMarketingDripService,
    private readonly email: EmailAdapter,
    private readonly sms: SmsAdapter,
    private readonly cache: RedisCacheService,
    private readonly accessLimit: AuthAccessLimitService,
  ) {}

  private assertStrongPassword(password: string) {
    const err = passwordFormatError(password);
    if (err) throw new BadRequestException(err);
  }

  /** Step 1: validate signup, email OTP, store pending registration. */
  async startRegistration(input: {
    churchName: string;
    churchSlug?: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    acceptedTerms: boolean;
    acceptedPrivacy: boolean;
    acceptedMarketing?: boolean;
  }) {
    if (input.acceptedTerms !== true || input.acceptedPrivacy !== true) {
      throw new BadRequestException('You must accept the Terms of Service and Privacy Policy');
    }
    const email = input.email.trim().toLowerCase();
    const churchSlug =
      (input.churchSlug ?? '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') ||
      this.slugifyChurchName(input.churchName);
    if (!churchSlug) {
      throw new BadRequestException('Church name is required to create a URL slug');
    }
    this.assertStrongPassword(input.password);

    const existing = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const slugTaken = await this.prisma.church.findUnique({
      where: { slug: churchSlug },
    });
    if (slugTaken) {
      throw new ConflictException('Church slug already taken');
    }

    const otp = String(randomInt(100_000, 1_000_000));
    const passwordHash = await bcrypt.hash(input.password, 12);
    const registrationId = randomUUID();
    const pending: PendingRegistration = {
      churchName: input.churchName.trim(),
      churchSlug,
      email,
      passwordHash,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      otpHash: this.hashToken(otp),
      attempts: 0,
      acceptedTerms: true,
      acceptedPrivacy: true,
      acceptedMarketing: input.acceptedMarketing === true,
    };

    await this.cache.set(`register:otp:${registrationId}`, pending, REGISTER_OTP_TTL_SEC);

    try {
      await this.email.send({
        to: email,
        subject: 'Your Church_Hub verification code',
        body: `Hi ${pending.firstName},\n\nYour verification code is ${otp}.\n\nIt expires in 15 minutes.\n\n— Church_Hub`,
        html: `<p>Hi ${pending.firstName},</p><p>Your verification code is <strong style="font-size:1.25rem;letter-spacing:0.1em">${otp}</strong>.</p><p>It expires in 15 minutes.</p><p>— Church_Hub</p>`,
        churchId: null,
        purpose: 'auth',
      });
    } catch (err) {
      this.logger.warn(
        `Register OTP email failed for ${email}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new BadRequestException(
        'Could not send verification email. Check email settings and try again.',
      );
    }

    if (process.env.NODE_ENV !== 'production' && !this.email.isConfigured('auth')) {
      this.logger.log(`[register-otp] issued for ${email} (code redacted)`);
    }

    return {
      registrationId,
      email,
      message: 'We sent a 6-digit verification code to your email.',
      expiresInSeconds: REGISTER_OTP_TTL_SEC,
    };
  }

  /** Step 2: verify OTP and create the church workspace. */
  async verifyRegistration(registrationId: string, otp: string, ctx?: AuthRequestContext) {
    const key = `register:otp:${registrationId}`;
    const pending = await this.cache.get<PendingRegistration>(key);
    if (!pending) {
      throw new BadRequestException('Registration expired or not found. Start again.');
    }

    if (pending.attempts >= REGISTER_OTP_MAX_ATTEMPTS) {
      await this.cache.del(key);
      throw new BadRequestException('Too many incorrect codes. Start registration again.');
    }

    const otpOk = this.hashToken(otp.trim()) === pending.otpHash;
    if (!otpOk) {
      pending.attempts += 1;
      await this.cache.set(key, pending, REGISTER_OTP_TTL_SEC);
      await this.accessLimit.recordFailure(ctx?.clientIp, 'register-verify', pending.email);
      throw new BadRequestException('Incorrect verification code');
    }

    await this.cache.del(key);

    // Re-check uniqueness in case another signup completed while OTP was pending.
    const existing = await this.prisma.user.findFirst({
      where: { email: { equals: pending.email, mode: 'insensitive' } },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const slugTaken = await this.prisma.church.findUnique({
      where: { slug: pending.churchSlug },
    });
    if (slugTaken) {
      throw new ConflictException('Church slug already taken');
    }

    return this.createChurchFromPending(pending);
  }

  /** @deprecated Prefer startRegistration + verifyRegistration (kept for rare clients). */
  async register(input: {
    churchName: string;
    churchSlug: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    acceptedTerms: boolean;
    acceptedPrivacy: boolean;
    acceptedMarketing?: boolean;
  }) {
    // Force OTP path — do not create without email verification.
    return this.startRegistration(input);
  }

  private async createChurchFromPending(pending: PendingRegistration) {
    const adminRole = await this.prisma.role.upsert({
      where: { name: 'ADMIN' },
      update: {},
      create: {
        name: 'ADMIN',
        description: 'Church administrator',
        permissions: {
          create: [{ resource: '*', action: '*' }],
        },
      },
    });

    const church = await this.prisma.church.create({
      data: {
        name: pending.churchName,
        slug: pending.churchSlug,
        settings: {
          landing: createDefaultChurchLanding(pending.churchName, 'classic'),
          landingMembershipForm: DEFAULT_LANDING_MEMBERSHIP_FORM,
        },
        users: {
          create: {
            email: pending.email,
            passwordHash: pending.passwordHash,
            firstName: pending.firstName,
            lastName: pending.lastName,
            roles: { create: { roleId: adminRole.id } },
          },
        },
      },
      include: { users: true },
    });

    const user = church.users[0];

    const consentRows: Array<{
      consentType: ConsentType;
      documentSlug: string;
    }> = [
      { consentType: ConsentType.TERMS, documentSlug: 'terms-of-service' },
      { consentType: ConsentType.PRIVACY, documentSlug: 'privacy-policy' },
    ];
    if (pending.acceptedMarketing) {
      consentRows.push({
        consentType: ConsentType.MARKETING,
        documentSlug: 'privacy-policy',
      });
    }

    const pageVersions = await this.prisma.platformCmsPage.findMany({
      where: { slug: { in: ['terms-of-service', 'privacy-policy'] } },
      select: { slug: true, version: true },
    });
    const versionBySlug = new Map(pageVersions.map((p) => [p.slug, p.version]));

    await this.prisma.userConsentRecord.createMany({
      data: consentRows.map((c) => ({
        userId: user.id,
        churchId: church.id,
        email: user.email,
        consentType: c.consentType,
        documentSlug: c.documentSlug,
        documentVersion: versionBySlug.get(c.documentSlug) ?? 1,
        accepted: true,
      })),
    });

    void this.drips
      .scheduleUpsellSequence({
        churchId: church.id,
        userId: user.id,
        registeredAt: user.createdAt,
      })
      .catch(() => undefined);

    return this.issueTokens(user.id, user.churchId, user.email);
  }

  private slugifyChurchName(name: string): string {
    const slug = name
      .trim()
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64);
    return slug || 'church';
  }

  async login(email: string, password: string, ctx?: AuthRequestContext) {
    const emailKey = email.trim().toLowerCase();
    await this.accessLimit.assertAccountNotLocked(emailKey);

    const user = await this.prisma.user.findFirst({
      where: { email: { equals: emailKey, mode: 'insensitive' }, isActive: true },
      include: { roles: { include: { role: { select: { name: true } } } } },
    });

    if (!user) {
      await this.rejectFailedLogin(emailKey, ctx?.clientIp);
    }

    const valid = await bcrypt.compare(password, user!.passwordHash);
    if (!valid) {
      await this.rejectFailedLogin(emailKey, ctx?.clientIp);
    }

    await this.clearLoginFailures(emailKey);
    await this.accessLimit.recordSuccess(ctx?.clientIp, 'login', emailKey);

    const roleNames = user!.roles.map((r) => r.role.name);
    if (userRequiresLogin2fa(roleNames) && !this.shouldSkipLogin2fa()) {
      return this.startLogin2faChallenge(user!);
    }

    return this.completeLoginSession(user!);
  }

  /** Local/dev only — never honor in production even if env is mis-set. */
  private shouldSkipLogin2fa(): boolean {
    if (process.env.NODE_ENV === 'production') return false;
    const flag = (process.env.AUTH_SKIP_LOGIN_2FA ?? '').trim().toLowerCase();
    return flag === '1' || flag === 'true' || flag === 'yes';
  }

  /** Verify email OTP from password or magic-link challenge; then issue tokens. */
  async verifyLogin2fa(challengeId: string, otp: string, ctx?: AuthRequestContext) {
    const key = `login:2fa:${challengeId}`;
    const pending = await this.cache.get<PendingLogin2fa>(key);
    if (!pending) {
      throw new BadRequestException('Verification expired or not found. Sign in again.');
    }

    if (pending.attempts >= LOGIN_2FA_MAX_ATTEMPTS) {
      await this.cache.del(key);
      throw new BadRequestException('Too many incorrect codes. Sign in again.');
    }

    const otpOk = this.hashToken(otp.trim()) === pending.otpHash;
    if (!otpOk) {
      pending.attempts += 1;
      await this.cache.set(key, pending, LOGIN_2FA_TTL_SEC);
      await this.accessLimit.recordFailure(ctx?.clientIp, 'login-2fa', pending.email);
      throw new BadRequestException('Incorrect verification code');
    }

    await this.cache.del(key);
    await this.accessLimit.recordSuccess(ctx?.clientIp, 'login-2fa', pending.email);

    const user = await this.prisma.user.findFirst({
      where: { id: pending.userId, isActive: true },
    });
    if (!user) {
      throw new UnauthorizedException('Account is no longer available');
    }

    return this.completeLoginSession(user);
  }

  /**
   * Record a failed password attempt. Clears the password field after 3 failures;
   * on the 4th, emails a reset link (if the account exists) and resets the counter.
   * Client response stays generic — never reveals whether the account exists or a reset was sent.
   */
  private async rejectFailedLogin(emailKey: string, clientIp?: string): Promise<never> {
    const failedAttempts = await this.recordLoginFailure(emailKey);
    await this.accessLimit.recordFailure(clientIp, 'login', emailKey);
    const clearPassword = failedAttempts >= LOGIN_CLEAR_PASSWORD_AT;

    if (failedAttempts >= LOGIN_ACCOUNT_LOCKOUT_AT) {
      await this.accessLimit.lockAccount(emailKey, 'login_failures');
      throw new HttpException(
        {
          statusCode: 429,
          message:
            'Too many failed sign-in attempts for this account. Try again later or reset your password.',
          code: 'ACCOUNT_LOCKED',
          clearPassword: true,
        },
        429,
      );
    }

    if (failedAttempts >= LOGIN_AUTO_RESET_AT) {
      await this.requestPasswordReset(emailKey);
    }

    throw new UnauthorizedException({
      message: 'Invalid credentials',
      clearPassword,
    });
  }

  private async recordLoginFailure(emailKey: string): Promise<number> {
    const now = new Date();
    const existing = await this.prisma.loginFailureBucket.findUnique({
      where: { emailKey },
    });

    if (!existing) {
      await this.prisma.loginFailureBucket.create({
        data: {
          emailKey,
          attemptCount: 1,
          windowStartedAt: now,
          lastAttemptAt: now,
        },
      });
      return 1;
    }

    const windowExpired =
      now.getTime() - existing.windowStartedAt.getTime() > LOGIN_FAILURE_WINDOW_MS;

    if (windowExpired) {
      await this.prisma.loginFailureBucket.update({
        where: { emailKey },
        data: {
          attemptCount: 1,
          windowStartedAt: now,
          lastAttemptAt: now,
        },
      });
      return 1;
    }

    const updated = await this.prisma.loginFailureBucket.update({
      where: { emailKey },
      data: {
        attemptCount: { increment: 1 },
        lastAttemptAt: now,
      },
    });
    return updated.attemptCount;
  }

  private async clearLoginFailures(emailKey: string) {
    await this.prisma.loginFailureBucket.deleteMany({ where: { emailKey } });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, isActive: true },
    });
    if (!user) throw new UnauthorizedException('User not found');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    this.assertStrongPassword(newPassword);

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    });

    return { success: true, mustChangePassword: false };
  }

  /** Request a password-reset email. Always returns the same message (no email enumeration). */
  async requestPasswordReset(email: string) {
    await this.issueAuthLink(email.trim().toLowerCase(), AuthLinkPurpose.PASSWORD_RESET);
    return { success: true, message: GENERIC_LINK_SENT };
  }

  /**
   * Create a one-time password setup/reset link for a known user without sending the
   * generic reset email (caller embeds the URL in their own invite message).
   * Defaults to 45 minutes (single-use; consumed on successful password set).
   */
  async createPasswordSetupLink(
    userId: string,
    ttlMinutes = PASSWORD_SETUP_TTL_MINUTES,
  ): Promise<string> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, isActive: true },
      select: { id: true },
    });
    if (!user) {
      throw new BadRequestException('User not found or inactive');
    }

    await this.prisma.authLinkToken.updateMany({
      where: {
        userId: user.id,
        purpose: AuthLinkPurpose.PASSWORD_RESET,
        consumedAt: null,
      },
      data: { consumedAt: new Date() },
    });

    const rawToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + Math.max(5, ttlMinutes) * 60 * 1000);
    await this.prisma.authLinkToken.create({
      data: {
        userId: user.id,
        purpose: AuthLinkPurpose.PASSWORD_RESET,
        tokenHash: this.hashToken(rawToken),
        expiresAt,
      },
    });

    const appUrl =
      this.config.get<string>('APP_URL') ??
      this.config.get<string>('NEXT_PUBLIC_APP_URL') ??
      process.env.WEB_APP_URL ??
      'http://localhost:3001';
    return `${appUrl.replace(/\/$/, '')}/reset-password?token=${rawToken}`;
  }

  /**
   * Inspect a reset/setup token without consuming it (for countdown UX).
   * Non-valid states collapse to `unusable` so callers cannot fingerprint used vs expired.
   */
  async validatePasswordResetToken(
    rawToken: string,
    ctx?: AuthRequestContext,
  ): Promise<{
    status: 'valid' | 'unusable';
    expiresAt?: string;
  }> {
    const tokenHash = this.hashToken(rawToken.trim());
    const record = await this.prisma.authLinkToken.findUnique({
      where: { tokenHash },
    });
    if (
      !record ||
      record.purpose !== AuthLinkPurpose.PASSWORD_RESET ||
      record.consumedAt ||
      record.expiresAt < new Date()
    ) {
      await this.accessLimit.recordFailure(ctx?.clientIp, 'reset-validate');
      return { status: 'unusable' };
    }
    return { status: 'valid', expiresAt: record.expiresAt.toISOString() };
  }

  /**
   * From an old/expired/used reset token, mint a new 45‑min link and email it.
   * WhatsApp only notifies that email was sent (no bearer URL).
   * Always returns the same generic message (no enumeration).
   */
  async resendPasswordSetupFromToken(rawToken: string) {
    const tokenHash = this.hashToken(rawToken.trim());
    const record = await this.prisma.authLinkToken.findUnique({
      where: { tokenHash },
      select: { userId: true, purpose: true },
    });
    if (record?.purpose === AuthLinkPurpose.PASSWORD_RESET) {
      const user = await this.prisma.user.findFirst({
        where: { id: record.userId, isActive: true },
        select: { id: true, email: true, phone: true, firstName: true, churchId: true },
      });
      if (user && (await this.allowPasswordResend(user.id))) {
        try {
          const actionUrl = await this.createPasswordSetupLink(user.id);
          const rendered = buildAuthLinkEmail({
            firstName: user.firstName || 'there',
            purpose: 'PASSWORD_RESET',
            actionUrl,
            expiresMinutes: AUTH_LINK_TTL_MINUTES,
          });
          try {
            await this.email.send({
              to: user.email,
              subject: rendered.subject,
              body: rendered.text,
              html: rendered.html,
              churchId: user.churchId,
              purpose: 'auth',
            });
          } catch (err) {
            this.logger.warn(
              `Password resend email failed for ${user.email}: ${
                err instanceof Error ? err.message : String(err)
              }`,
            );
          }
          await trySendWhatsApp(this.sms, this.logger, {
            to: user.phone,
            body: this.authLinkWhatsAppNotice(
              user.firstName || 'there',
              'PASSWORD_RESET',
            ),
            churchId: user.churchId,
            label: 'Password resend',
          });
        } catch (err) {
          this.logger.warn(
            `Password resend failed: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    }
    return { success: true, message: GENERIC_LINK_SENT };
  }

  /** Per-user resend budget — fails closed (skips send) when over limit. */
  private async allowPasswordResend(userId: string): Promise<boolean> {
    const key = `auth:password-resend:${userId}`;
    const current = (await this.cache.get<number>(key)) ?? 0;
    if (current >= PASSWORD_RESEND_MAX_PER_WINDOW) {
      this.logger.warn(`Password resend rate-limited for user ${userId}`);
      return false;
    }
    await this.cache.set(key, current + 1, PASSWORD_RESEND_WINDOW_SEC);
    return true;
  }

  /** WhatsApp must not carry password/magic bearer URLs (unverified phone risk). */
  private authLinkWhatsAppNotice(
    firstName: string,
    purpose: 'PASSWORD_RESET' | 'MAGIC_LOGIN',
  ): string {
    const isReset = purpose === 'PASSWORD_RESET';
    return [
      isReset ? 'Church_Hub password reset' : 'Church_Hub sign-in',
      '',
      `Hi ${firstName},`,
      isReset
        ? 'We sent a one-time set-password link to your email. It expires in 45 minutes.'
        : 'We sent a one-time sign-in link to your email. It expires in 45 minutes.',
      'Open that email on this device to continue. If you did not request this, ignore this message.',
    ].join('\n');
  }

  /** Request a magic sign-in email. Always returns the same message (no email enumeration). */
  async requestMagicLink(email: string) {
    await this.issueAuthLink(email.trim().toLowerCase(), AuthLinkPurpose.MAGIC_LOGIN);
    return { success: true, message: GENERIC_LINK_SENT };
  }

  async resetPasswordWithToken(token: string, newPassword: string, ctx?: AuthRequestContext) {
    this.assertStrongPassword(newPassword);
    const passwordHash = await bcrypt.hash(newPassword, 12);
    const tokenHash = this.hashToken(token.trim());
    const now = new Date();

    try {
      await this.prisma.$transaction(async (tx) => {
        const consumed = await tx.authLinkToken.updateMany({
          where: {
            tokenHash,
            purpose: AuthLinkPurpose.PASSWORD_RESET,
            consumedAt: null,
            expiresAt: { gt: now },
          },
          data: { consumedAt: now },
        });
        if (consumed.count !== 1) {
          throw new BadRequestException(
            'This password reset link is invalid or has expired',
          );
        }

        const record = await tx.authLinkToken.findUnique({ where: { tokenHash } });
        if (!record) {
          throw new BadRequestException(
            'This password reset link is invalid or has expired',
          );
        }

        await tx.user.update({
          where: { id: record.userId },
          data: { passwordHash, mustChangePassword: false },
        });

        await tx.refreshToken.updateMany({
          where: { userId: record.userId, revokedAt: null },
          data: { revokedAt: now },
        });
      });
    } catch (err) {
      if (err instanceof BadRequestException) {
        await this.accessLimit.recordFailure(ctx?.clientIp, 'reset-password');
        throw err;
      }
      this.logger.warn(
        `Password reset transaction failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      await this.accessLimit.recordFailure(ctx?.clientIp, 'reset-password');
      throw new BadRequestException('Could not update password. Request a new link and try again.');
    }

    await this.accessLimit.recordSuccess(ctx?.clientIp, 'reset-password');
    return { success: true, message: 'Password updated. You can sign in with your new password.' };
  }

  async consumeMagicLink(token: string, ctx?: AuthRequestContext) {
    let record;
    try {
      record = await this.consumeAuthLink(token, AuthLinkPurpose.MAGIC_LOGIN);
    } catch (err) {
      await this.accessLimit.recordFailure(ctx?.clientIp, 'magic-consume');
      throw err;
    }
    const user = await this.prisma.user.findFirst({
      where: { id: record.userId, isActive: true },
      include: { roles: { include: { role: { select: { name: true } } } } },
    });
    if (!user) {
      throw new UnauthorizedException('This sign-in link is no longer valid');
    }

    const roleNames = user.roles.map((r) => r.role.name);
    if (userRequiresLogin2fa(roleNames) && !this.shouldSkipLogin2fa()) {
      return this.startLogin2faChallenge(user);
    }

    return this.completeLoginSession(user);
  }

  private async issueAuthLink(email: string, purpose: AuthLinkPurpose) {
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, isActive: true },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        churchId: true,
      },
    });
    if (!user) return;

    await this.prisma.authLinkToken.updateMany({
      where: { userId: user.id, purpose, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    const rawToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + AUTH_LINK_TTL_MINUTES * 60 * 1000);
    await this.prisma.authLinkToken.create({
      data: {
        userId: user.id,
        purpose,
        tokenHash: this.hashToken(rawToken),
        expiresAt,
      },
    });

    const appUrl =
      this.config.get<string>('APP_URL') ??
      this.config.get<string>('NEXT_PUBLIC_APP_URL') ??
      process.env.WEB_APP_URL ??
      'http://localhost:3001';
    const actionUrl =
      purpose === AuthLinkPurpose.PASSWORD_RESET
        ? `${appUrl.replace(/\/$/, '')}/reset-password?token=${rawToken}`
        : `${appUrl.replace(/\/$/, '')}/login/magic?token=${rawToken}`;

    const rendered = buildAuthLinkEmail({
      firstName: user.firstName || 'there',
      purpose,
      actionUrl,
      expiresMinutes: AUTH_LINK_TTL_MINUTES,
    });

    try {
      await this.email.send({
        to: user.email,
        subject: rendered.subject,
        body: rendered.text,
        html: rendered.html,
        churchId: user.churchId,
        purpose: 'auth',
      });
    } catch (err) {
      this.logger.warn(
        `Auth link email failed for ${user.email}: ${err instanceof Error ? err.message : String(err)}`,
      );
      // Still succeed to the client — do not leak delivery failures as "email not found".
    }

    await trySendWhatsApp(this.sms, this.logger, {
      to: user.phone,
      body: this.authLinkWhatsAppNotice(
        user.firstName || 'there',
        purpose === AuthLinkPurpose.PASSWORD_RESET ? 'PASSWORD_RESET' : 'MAGIC_LOGIN',
      ),
      churchId: user.churchId,
      label: `Auth link (${purpose})`,
    });

    if (process.env.NODE_ENV !== 'production' && !this.email.isConfigured('auth')) {
      // Never log the bearer token — even in non-prod shared environments.
      this.logger.log(
        `[auth-link:${purpose}] issued for ${user.email} (token redacted, expires ${AUTH_LINK_TTL_MINUTES}m)`,
      );
    }
  }

  /** Atomically consume a one-time auth link (conditional update — no TOCTOU race). */
  private async consumeAuthLink(rawToken: string, purpose: AuthLinkPurpose) {
    const tokenHash = this.hashToken(rawToken.trim());
    const now = new Date();
    const consumed = await this.prisma.authLinkToken.updateMany({
      where: {
        tokenHash,
        purpose,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      data: { consumedAt: now },
    });

    if (consumed.count !== 1) {
      throw new BadRequestException(
        purpose === AuthLinkPurpose.PASSWORD_RESET
          ? 'This password reset link is invalid or has expired'
          : 'This sign-in link is invalid or has expired',
      );
    }

    const record = await this.prisma.authLinkToken.findUnique({
      where: { tokenHash },
    });
    if (!record) {
      throw new BadRequestException(
        purpose === AuthLinkPurpose.PASSWORD_RESET
          ? 'This password reset link is invalid or has expired'
          : 'This sign-in link is invalid or has expired',
      );
    }

    return record;
  }

  async refresh(refreshToken: string, ctx?: AuthRequestContext) {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      await this.accessLimit.recordFailure(ctx?.clientIp, 'refresh');
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const tokenChurchId = await this.tokenChurchIdForUser(
      stored.user.id,
      stored.user.churchId,
    );
    return this.issueTokens(stored.user.id, tokenChurchId, stored.user.email);
  }

  async findActiveUserAccount(userId: string) {
    return this.prisma.user.findFirst({
      where: { id: userId, isActive: true },
      select: { mustChangePassword: true },
    });
  }

  async logout(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  /** Revoke all active refresh tokens for a user (role change, deactivate, password reset). */
  async revokeRefreshTokensForUser(userId: string) {
    const result = await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { revoked: result.count };
  }

  async updateAccount(
    userId: string,
    data: Partial<{
      firstName: string;
      lastName: string;
      nickname: string | null;
      phone: string | null;
      avatarUrl: string | null;
    }>,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { member: { select: { id: true } } },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found');
    }

    if (data.firstName !== undefined && !data.firstName?.trim()) {
      throw new BadRequestException('First name is required');
    }
    if (data.lastName !== undefined && !data.lastName?.trim()) {
      throw new BadRequestException('Last name is required');
    }

    const patch: Record<string, unknown> = {};
    if (data.firstName !== undefined) patch.firstName = data.firstName.trim();
    if (data.lastName !== undefined) patch.lastName = data.lastName.trim();
    if (data.phone !== undefined) patch.phone = data.phone?.trim() || null;
    if (data.nickname !== undefined) {
      const nick = data.nickname?.trim() || null;
      patch.nickname = nick && nick.length > 32 ? nick.slice(0, 32) : nick;
    }
    if (data.avatarUrl !== undefined) {
      const url = data.avatarUrl?.trim() || null;
      if (
        url &&
        !/^https?:\/\//i.test(url) &&
        !url.startsWith('/') &&
        !url.startsWith('data:image/')
      ) {
        throw new BadRequestException(
          'Avatar must be an http(s) URL, uploaded path, or image data URL',
        );
      }
      patch.avatarUrl = url;
    }

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('No profile fields to update');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: patch,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        nickname: true,
        phone: true,
        avatarUrl: true,
      },
    });

    if (user.member) {
      await this.prisma.member.update({
        where: { id: user.member.id },
        data: {
          ...(data.avatarUrl !== undefined ? { avatarUrl: updated.avatarUrl } : {}),
          ...(data.phone !== undefined ? { phone: updated.phone } : {}),
          ...(data.nickname !== undefined ? { nickname: updated.nickname } : {}),
          ...(data.firstName !== undefined ? { firstName: updated.firstName } : {}),
          ...(data.lastName !== undefined ? { lastName: updated.lastName } : {}),
        },
      });
    }

    return updated;
  }

  private async startLogin2faChallenge(user: {
    id: string;
    email: string;
    firstName: string;
    phone?: string | null;
    churchId: string | null;
    mustChangePassword: boolean;
  }) {
    const otp = String(randomInt(100_000, 1_000_000));
    const challengeId = randomUUID();
    const pending: PendingLogin2fa = {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      otpHash: this.hashToken(otp),
      attempts: 0,
      mustChangePassword: user.mustChangePassword,
      churchId: user.churchId,
    };

    await this.cache.set(`login:2fa:${challengeId}`, pending, LOGIN_2FA_TTL_SEC);

    const subject = 'Your Church_Hub sign-in code';
    const textBody = `Hi ${user.firstName || 'there'},\n\nYour sign-in verification code is ${otp}.\n\nIt expires in 15 minutes.\n\nIf you did not try to sign in, ignore this message.\n\n— Church_Hub`;

    try {
      await this.email.send({
        to: user.email,
        subject,
        body: textBody,
        html: `<p>Hi ${user.firstName || 'there'},</p><p>Your sign-in verification code is <strong style="font-size:1.25rem;letter-spacing:0.1em">${otp}</strong>.</p><p>It expires in 15 minutes.</p><p>If you did not try to sign in, ignore this email.</p><p>— Church_Hub</p>`,
        churchId: user.churchId,
        purpose: 'auth',
      });
    } catch (err) {
      await this.cache.del(`login:2fa:${challengeId}`);
      this.logger.warn(
        `Login 2FA email failed for ${user.email}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new BadRequestException(
        'Could not send verification email. Check email settings and try again.',
      );
    }

    let phone = user.phone;
    if (phone === undefined) {
      const row = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { phone: true },
      });
      phone = row?.phone ?? null;
    }
    await trySendWhatsApp(this.sms, this.logger, {
      to: phone,
      body: textBody,
      churchId: user.churchId,
      label: 'Login 2FA',
    });

    if (process.env.NODE_ENV !== 'production') {
      // Local DX: email often isn't delivered — surface the code in API logs only.
      this.logger.warn(`[login-2fa] DEV code for ${user.email}: ${otp}`);
    }

    return {
      requires2fa: true as const,
      challengeId,
      email: user.email,
      message: 'We sent a 6-digit verification code to your email (and WhatsApp if a phone is on file).',
      expiresInSeconds: LOGIN_2FA_TTL_SEC,
    };
  }

  private async completeLoginSession(user: {
    id: string;
    email: string;
    churchId: string | null;
    mustChangePassword: boolean;
  }) {
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokenChurchId = await this.tokenChurchIdForUser(user.id, user.churchId);
    const tokens = await this.issueTokens(user.id, tokenChurchId, user.email);
    return { ...tokens, mustChangePassword: user.mustChangePassword };
  }

  /** SaaS operators always get a global token (no church scope), even if mis-linked in DB. */
  private async tokenChurchIdForUser(userId: string, churchId: string | null) {
    const roles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    if (roles.some((r) => r.role.name === 'PLATFORM_ADMIN')) {
      return null;
    }
    return churchId;
  }

  private async issueTokens(userId: string, churchId: string | null, email: string) {
    const payload: JwtPayload = { sub: userId, churchId, email };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN', '15m'),
    });

    const refreshToken = randomBytes(48).toString('hex');
    const expiresIn = this.config.get('JWT_REFRESH_EXPIRES_IN', '7d');
    const expiresAt = new Date(
      Date.now() + this.parseDurationMs(expiresIn),
    );

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
      },
    });

    return { accessToken, refreshToken, expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN', '15m') };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseDurationMs(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return value * (multipliers[unit] ?? multipliers.d);
  }
}
