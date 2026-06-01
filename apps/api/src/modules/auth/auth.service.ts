import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.module';
import {
  createDefaultChurchLanding,
  DEFAULT_LANDING_MEMBERSHIP_FORM,
} from '@church-hub/shared-types';
import { PlatformMarketingDripService } from '../platform/platform-marketing-drip.service';

export interface JwtPayload {
  sub: string;
  churchId: string | null;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly drips: PlatformMarketingDripService,
  ) {}

  async register(input: {
    churchName: string;
    churchSlug: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    const existing = await this.prisma.user.findFirst({
      where: { email: input.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const slugTaken = await this.prisma.church.findUnique({
      where: { slug: input.churchSlug },
    });
    if (slugTaken) {
      throw new ConflictException('Church slug already taken');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

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
        name: input.churchName,
        slug: input.churchSlug,
        settings: {
          landing: createDefaultChurchLanding(input.churchName, 'classic'),
          landingMembershipForm: DEFAULT_LANDING_MEMBERSHIP_FORM,
        },
        users: {
          create: {
            email: input.email,
            passwordHash,
            firstName: input.firstName,
            lastName: input.lastName,
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

  async login(email: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { email, isActive: true },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokenChurchId = await this.tokenChurchIdForUser(user.id, user.churchId);
    const tokens = await this.issueTokens(user.id, tokenChurchId, user.email);
    return { ...tokens, mustChangePassword: user.mustChangePassword };
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
