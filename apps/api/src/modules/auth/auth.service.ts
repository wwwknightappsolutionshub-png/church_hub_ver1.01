import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthLinkPurpose } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash, randomInt, randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.module';
import {
  createDefaultChurchLanding,
  DEFAULT_LANDING_MEMBERSHIP_FORM,
} from '@church-hub/shared-types';
import { PlatformMarketingDripService } from '../platform/platform-marketing-drip.service';
import { EmailAdapter } from '../notifications/adapters/email.adapter';
import { RedisCacheService } from '../../common/cache/redis-cache.service';
import { buildAuthLinkEmail } from './auth-link-email';
import { userRequiresLogin2fa } from './login-2fa.constants';

export interface JwtPayload {
  sub: string;
  churchId: string | null;
  email: string;
}

const AUTH_LINK_TTL_MINUTES = 30;
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
/** Sliding window for counting failed logins (30 minutes). */
const LOGIN_FAILURE_WINDOW_MS = 30 * 60 * 1000;

interface PendingRegistration {
  churchName: string;
  churchSlug: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  otpHash: string;
  attempts: number;
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
    private readonly cache: RedisCacheService,
  ) {}

  /** Step 1: validate signup, email OTP, store pending registration. */
  async startRegistration(input: {
    churchName: string;
    churchSlug?: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    const email = input.email.trim().toLowerCase();
    const churchSlug =
      (input.churchSlug ?? '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') ||
      this.slugifyChurchName(input.churchName);
    if (!churchSlug) {
      throw new BadRequestException('Church name is required to create a URL slug');
    }
    if (input.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

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
    };

    await this.cache.set(`register:otp:${registrationId}`, pending, REGISTER_OTP_TTL_SEC);

    try {
      await this.email.send({
        to: email,
        subject: 'Your Church_Hub verification code',
        body: `Hi ${pending.firstName},\n\nYour verification code is ${otp}.\n\nIt expires in 15 minutes.\n\n— Church_Hub`,
        html: `<p>Hi ${pending.firstName},</p><p>Your verification code is <strong style="font-size:1.25rem;letter-spacing:0.1em">${otp}</strong>.</p><p>It expires in 15 minutes.</p><p>— Church_Hub</p>`,
        churchId: null,
      });
    } catch (err) {
      this.logger.warn(
        `Register OTP email failed for ${email}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new BadRequestException(
        'Could not send verification email. Check email settings and try again.',
      );
    }

    if (process.env.NODE_ENV !== 'production' && !process.env.SMTP_HOST) {
      this.logger.log(`[register-otp] ${email} → ${otp}`);
    }

    return {
      registrationId,
      email,
      message: 'We sent a 6-digit verification code to your email.',
      expiresInSeconds: REGISTER_OTP_TTL_SEC,
    };
  }

  /** Step 2: verify OTP and create the church workspace. */
  async verifyRegistration(registrationId: string, otp: string) {
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

  async login(email: string, password: string) {
    const emailKey = email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: emailKey, mode: 'insensitive' }, isActive: true },
      include: { roles: { include: { role: { select: { name: true } } } } },
    });

    if (!user) {
      await this.rejectFailedLogin(emailKey);
    }

    const valid = await bcrypt.compare(password, user!.passwordHash);
    if (!valid) {
      await this.rejectFailedLogin(emailKey);
    }

    await this.clearLoginFailures(emailKey);

    const roleNames = user!.roles.map((r) => r.role.name);
    if (userRequiresLogin2fa(roleNames)) {
      return this.startLogin2faChallenge(user!);
    }

    return this.completeLoginSession(user!);
  }

  /** Verify email OTP from password or magic-link challenge; then issue tokens. */
  async verifyLogin2fa(challengeId: string, otp: string) {
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
      throw new BadRequestException('Incorrect verification code');
    }

    await this.cache.del(key);

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
   */
  private async rejectFailedLogin(emailKey: string): Promise<never> {
    const failedAttempts = await this.recordLoginFailure(emailKey);
    const clearPassword = failedAttempts >= LOGIN_CLEAR_PASSWORD_AT;
    let resetLinkSent = false;

    if (failedAttempts >= LOGIN_AUTO_RESET_AT) {
      await this.requestPasswordReset(emailKey);
      resetLinkSent = true;
      await this.clearLoginFailures(emailKey);
    }

    throw new UnauthorizedException({
      message: resetLinkSent
        ? 'Too many failed attempts. Check your registered email for a password reset link.'
        : 'Invalid credentials',
      clearPassword,
      resetLinkSent,
      failedAttempts,
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

    if (newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters');
    }

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

  /** Request a magic sign-in email. Always returns the same message (no email enumeration). */
  async requestMagicLink(email: string) {
    await this.issueAuthLink(email.trim().toLowerCase(), AuthLinkPurpose.MAGIC_LOGIN);
    return { success: true, message: GENERIC_LINK_SENT };
  }

  async resetPasswordWithToken(token: string, newPassword: string) {
    if (newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters');
    }

    const record = await this.consumeAuthLink(token, AuthLinkPurpose.PASSWORD_RESET);
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash, mustChangePassword: false },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { success: true, message: 'Password updated. You can sign in with your new password.' };
  }

  async consumeMagicLink(token: string) {
    const record = await this.consumeAuthLink(token, AuthLinkPurpose.MAGIC_LOGIN);
    const user = await this.prisma.user.findFirst({
      where: { id: record.userId, isActive: true },
      include: { roles: { include: { role: { select: { name: true } } } } },
    });
    if (!user) {
      throw new UnauthorizedException('This sign-in link is no longer valid');
    }

    const roleNames = user.roles.map((r) => r.role.name);
    if (userRequiresLogin2fa(roleNames)) {
      return this.startLogin2faChallenge(user);
    }

    return this.completeLoginSession(user);
  }

  private async issueAuthLink(email: string, purpose: AuthLinkPurpose) {
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, isActive: true },
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
      });
    } catch (err) {
      this.logger.warn(
        `Auth link email failed for ${user.email}: ${err instanceof Error ? err.message : String(err)}`,
      );
      // Still succeed to the client — do not leak delivery failures as "email not found".
    }

    if (process.env.NODE_ENV !== 'production' && !process.env.SMTP_HOST) {
      this.logger.log(`[auth-link:${purpose}] ${user.email} → ${actionUrl}`);
    }
  }

  private async consumeAuthLink(rawToken: string, purpose: AuthLinkPurpose) {
    const tokenHash = this.hashToken(rawToken.trim());
    const record = await this.prisma.authLinkToken.findUnique({
      where: { tokenHash },
    });

    if (
      !record ||
      record.purpose !== purpose ||
      record.consumedAt ||
      record.expiresAt < new Date()
    ) {
      throw new BadRequestException(
        purpose === AuthLinkPurpose.PASSWORD_RESET
          ? 'This password reset link is invalid or has expired'
          : 'This sign-in link is invalid or has expired',
      );
    }

    await this.prisma.authLinkToken.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });

    return record;
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
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

    try {
      await this.email.send({
        to: user.email,
        subject: 'Your Church_Hub sign-in code',
        body: `Hi ${user.firstName || 'there'},\n\nYour sign-in verification code is ${otp}.\n\nIt expires in 15 minutes.\n\nIf you did not try to sign in, ignore this email.\n\n— Church_Hub`,
        html: `<p>Hi ${user.firstName || 'there'},</p><p>Your sign-in verification code is <strong style="font-size:1.25rem;letter-spacing:0.1em">${otp}</strong>.</p><p>It expires in 15 minutes.</p><p>If you did not try to sign in, ignore this email.</p><p>— Church_Hub</p>`,
        churchId: user.churchId,
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

    if (process.env.NODE_ENV !== 'production' && !process.env.SMTP_HOST) {
      this.logger.log(`[login-2fa] ${user.email} → ${otp}`);
    }

    return {
      requires2fa: true as const,
      challengeId,
      email: user.email,
      message: 'We sent a 6-digit verification code to your email.',
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
