import { ConflictException, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import {
  parseTenantModulesFromSettings,
  type ChurchTenantModulesMap,
} from '@church-hub/shared-types';
import { PrismaService } from '../../prisma/prisma.module';
import { EmailAdapter } from '../notifications/adapters/email.adapter';
import { buildTenantWelcomeEmail } from './tenant-welcome-email';
import { PlatformMarketingService } from './platform-marketing.service';
import { PlatformMarketingDripService } from './platform-marketing-drip.service';

export interface ProvisionedStaffResult {
  email: string;
  role: 'ADMIN' | 'PASTOR';
  welcomeEmailSent: boolean;
  userId: string;
}

@Injectable()
export class PlatformProvisioningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailAdapter,
    private readonly marketing: PlatformMarketingService,
    private readonly drips: PlatformMarketingDripService,
  ) {}

  private generateTempPassword(): string {
    return randomBytes(9).toString('base64url').slice(0, 12);
  }

  private namesFromEmail(email: string, roleLabel: string) {
    const local = email.split('@')[0] ?? 'user';
    const parts = local.split(/[._-]+/).filter(Boolean);
    const cap = (s: string) =>
      s.length ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';
    if (parts.length >= 2) {
      return { firstName: cap(parts[0]), lastName: cap(parts.slice(1).join(' ')) };
    }
    return { firstName: roleLabel, lastName: cap(local) || 'User' };
  }

  private async roleId(name: string) {
    const role = await this.prisma.role.findFirst({ where: { name } });
    if (!role) throw new ConflictException(`Role ${name} is not configured`);
    return role.id;
  }

  private async createStaffUser(params: {
    churchId: string;
    email: string;
    roleName: 'ADMIN' | 'PASTOR';
    roleLabel: 'Church Administrator' | 'Pastor';
    churchName: string;
    churchSlug: string;
    enabledModules: ChurchTenantModulesMap;
  }): Promise<ProvisionedStaffResult> {
    const email = params.email.toLowerCase().trim();
    const existing = await this.prisma.user.findFirst({ where: { email } });
    if (existing) {
      throw new ConflictException(`Email already in use: ${email}`);
    }

    const tempPassword = this.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    const { firstName, lastName } = this.namesFromEmail(email, params.roleLabel);
    const roleId = await this.roleId(params.roleName);

    const user = await this.prisma.user.create({
      data: {
        churchId: params.churchId,
        email,
        passwordHash,
        firstName,
        lastName,
        mustChangePassword: true,
        roles: { create: { roleId } },
      },
    });

    await this.prisma.member.create({
      data: {
        churchId: params.churchId,
        userId: user.id,
        email,
        firstName,
        lastName,
        status: 'ACTIVE_MEMBER',
        roles: params.roleName === 'ADMIN' ? ['ADMIN', 'ADULT'] : ['ADULT', 'LEADER'],
        gamification: { create: {} },
      },
    });

    const appUrl =
      process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';
    const loginUrl = `${appUrl}/login?church=${encodeURIComponent(params.churchSlug)}`;

    let subject: string;
    let body: string;
    let html: string | undefined;
    try {
      const branded = await this.marketing.buildWelcomeEmail({
        churchName: params.churchName,
        churchSlug: params.churchSlug,
        roleLabel: params.roleLabel,
        email,
        tempPassword,
        loginUrl,
        enabledModules: params.enabledModules,
      });
      subject = branded.subject;
      body = branded.text;
      html = branded.html;
    } catch {
      const plain = buildTenantWelcomeEmail({
        churchName: params.churchName,
        churchSlug: params.churchSlug,
        roleLabel: params.roleLabel,
        email,
        tempPassword,
        loginUrl,
        enabledModules: params.enabledModules,
      });
      subject = plain.subject;
      body = plain.body;
    }

    let welcomeEmailSent = false;
    try {
      await this.email.send({
        churchId: params.churchId,
        to: email,
        subject,
        body,
        html,
      });
      welcomeEmailSent = true;
    } catch {
      welcomeEmailSent = false;
    }

    void this.drips
      .scheduleUpsellSequence({
        churchId: params.churchId,
        userId: user.id,
        registeredAt: new Date(),
      })
      .catch(() => undefined);

    return {
      email,
      role: params.roleName,
      welcomeEmailSent,
      userId: user.id,
    };
  }

  async provisionTenantStaff(params: {
    churchId: string;
    churchName: string;
    churchSlug: string;
    settings: unknown;
    adminEmail?: string;
    pastorEmail?: string;
  }) {
    const enabledModules = parseTenantModulesFromSettings(params.settings);
    const results: {
      admin?: ProvisionedStaffResult;
      pastor?: ProvisionedStaffResult;
    } = {};

    if (params.adminEmail?.trim()) {
      results.admin = await this.createStaffUser({
        churchId: params.churchId,
        email: params.adminEmail,
        roleName: 'ADMIN',
        roleLabel: 'Church Administrator',
        churchName: params.churchName,
        churchSlug: params.churchSlug,
        enabledModules,
      });
    }

    if (params.pastorEmail?.trim()) {
      results.pastor = await this.createStaffUser({
        churchId: params.churchId,
        email: params.pastorEmail,
        roleName: 'PASTOR',
        roleLabel: 'Pastor',
        churchName: params.churchName,
        churchSlug: params.churchSlug,
        enabledModules,
      });
    }

    return results;
  }
}
