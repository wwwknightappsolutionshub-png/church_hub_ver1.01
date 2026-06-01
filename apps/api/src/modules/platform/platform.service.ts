import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  createDefaultChurchLanding,
  DEFAULT_LANDING_MEMBERSHIP_FORM,
  defaultTenantModules,
  mergeTenantModulesIntoSettings,
  parseTenantModulesFromSettings,
  type ChurchTenantModulesMap,
} from '@church-hub/shared-types';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import {
  mergeDepartmentModuleSettingsIntoChurchSettings,
  parseDepartmentModuleSettings,
} from '../../common/department-module-settings';
import { CreateChurchDto } from './dto/create-church.dto';
import { UpdateChurchDto } from './dto/update-church.dto';
import { PlatformProvisioningService } from './platform-provisioning.service';
import { MembershipConfigService } from '../membership/membership-config.service';

const STAFF_ROLE_NAMES = ['ADMIN', 'PASTOR', 'LEADER', 'MEMBER', 'DRIVER'] as const;

@Injectable()
export class PlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provisioning: PlatformProvisioningService,
    private readonly membershipConfig: MembershipConfigService,
  ) {}

  getModuleCatalog() {
    return defaultTenantModules();
  }

  async listChurches() {
    const churches = await this.prisma.church.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        country: true,
        isActive: true,
        settings: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            members: true,
          },
        },
      },
    });

    const churchIds = churches.map((c) => c.id);
    const pastorsByChurch = new Map<string, number>();
    const adminsByChurch = new Map<string, number>();

    const roleUsers = await this.prisma.user.findMany({
      where: {
        churchId: { in: churchIds },
        isActive: true,
        roles: { some: { role: { name: { in: ['PASTOR', 'ADMIN'] } } } },
      },
      select: {
        churchId: true,
        roles: { include: { role: { select: { name: true } } } },
      },
    });

    for (const u of roleUsers) {
      if (!u.churchId) continue;
      const names = u.roles.map((r) => r.role.name);
      if (names.includes('PASTOR')) {
        pastorsByChurch.set(u.churchId, (pastorsByChurch.get(u.churchId) ?? 0) + 1);
      }
      if (names.includes('ADMIN')) {
        adminsByChurch.set(u.churchId, (adminsByChurch.get(u.churchId) ?? 0) + 1);
      }
    }

    return churches.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      city: c.city,
      country: c.country,
      isActive: c.isActive,
      createdAt: c.createdAt,
      userCount: c._count.users,
      memberCount: c._count.members,
      pastorCount: pastorsByChurch.get(c.id) ?? 0,
      adminCount: adminsByChurch.get(c.id) ?? 0,
      tenantModules: parseTenantModulesFromSettings(c.settings),
      departmentModuleSettings: parseDepartmentModuleSettings(c.settings),
    }));
  }

  async getChurch(churchId: string) {
    const church = await this.prisma.church.findUnique({
      where: { id: churchId },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        country: true,
        address: true,
        timezone: true,
        isActive: true,
        settings: true,
        createdAt: true,
      },
    });
    if (!church) throw new NotFoundException('Church not found');

    const staff = await this.prisma.user.findMany({
      where: {
        churchId,
        isActive: true,
        roles: { some: { role: { name: { in: [...STAFF_ROLE_NAMES] } } } },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        lastLoginAt: true,
        createdAt: true,
        roles: { include: { role: { select: { name: true, description: true } } } },
        member: { select: { id: true, status: true } },
      },
    });

    const pastors = staff.filter((u) => u.roles.some((r) => r.role.name === 'PASTOR'));
    const admins = staff.filter((u) => u.roles.some((r) => r.role.name === 'ADMIN'));

    return {
      church: {
        ...church,
        tenantModules: parseTenantModulesFromSettings(church.settings),
        departmentModuleSettings: parseDepartmentModuleSettings(church.settings),
      },
      pastors: pastors.map(this.mapStaffUser),
      admins: admins.map(this.mapStaffUser),
      allStaff: staff.map(this.mapStaffUser),
    };
  }

  async createChurch(dto: CreateChurchDto) {
    const slug = dto.slug.trim().toLowerCase();
    const existing = await this.prisma.church.findUnique({ where: { slug } });
    if (existing) throw new ConflictException('Church slug already taken');

    const settings = {
      landing: createDefaultChurchLanding(dto.name.trim(), 'classic'),
      landingMembershipForm: DEFAULT_LANDING_MEMBERSHIP_FORM,
      tenantModules: defaultTenantModules(),
    };

    const church = await this.prisma.church.create({
      data: {
        name: dto.name.trim(),
        slug,
        city: dto.city?.trim() || null,
        country: dto.country?.trim() || null,
        timezone: dto.timezone?.trim() || 'UTC',
        isActive: dto.isActive ?? true,
        settings: settings as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        country: true,
        isActive: true,
        createdAt: true,
        settings: true,
      },
    });

    const provisionedStaff = await this.provisioning.provisionTenantStaff({
      churchId: church.id,
      churchName: church.name,
      churchSlug: church.slug,
      settings: church.settings,
      adminEmail: dto.adminEmail,
      pastorEmail: dto.pastorEmail,
    });

    await this.membershipConfig.seedChurchDefaults(church.id);

    return {
      ...church,
      tenantModules: parseTenantModulesFromSettings(church.settings),
      departmentModuleSettings: parseDepartmentModuleSettings(church.settings),
      provisionedStaff,
    };
  }

  async updateChurch(churchId: string, dto: UpdateChurchDto) {
    const existing = await this.prisma.church.findUnique({ where: { id: churchId } });
    if (!existing) throw new NotFoundException('Church not found');

    if (dto.slug) {
      const slug = dto.slug.trim().toLowerCase();
      const clash = await this.prisma.church.findFirst({
        where: { slug, NOT: { id: churchId } },
      });
      if (clash) throw new ConflictException('Church slug already taken');
    }

    const currentSettings =
      existing.settings && typeof existing.settings === 'object'
        ? (existing.settings as Record<string, unknown>)
        : {};

    let settings = currentSettings;
    if (dto.tenantModules) {
      settings = mergeTenantModulesIntoSettings(
        currentSettings,
        dto.tenantModules as Partial<ChurchTenantModulesMap>,
      );
    }
    if (dto.departmentModuleSettings) {
      settings = mergeDepartmentModuleSettingsIntoChurchSettings(
        settings,
        dto.departmentModuleSettings,
      );
    }

    const church = await this.prisma.church.update({
      where: { id: churchId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.slug !== undefined ? { slug: dto.slug.trim().toLowerCase() } : {}),
        ...(dto.city !== undefined ? { city: dto.city?.trim() || null } : {}),
        ...(dto.country !== undefined ? { country: dto.country?.trim() || null } : {}),
        ...(dto.timezone !== undefined ? { timezone: dto.timezone?.trim() || 'UTC' } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.tenantModules ? { settings: settings as Prisma.InputJsonValue } : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        country: true,
        isActive: true,
        settings: true,
        createdAt: true,
      },
    });

    return {
      ...church,
      tenantModules: parseTenantModulesFromSettings(church.settings),
      departmentModuleSettings: parseDepartmentModuleSettings(church.settings),
    };
  }

  async deleteChurch(churchId: string) {
    const existing = await this.prisma.church.findUnique({ where: { id: churchId } });
    if (!existing) throw new NotFoundException('Church not found');

    const userCount = await this.prisma.user.count({ where: { churchId } });
    if (userCount > 0) {
      return this.prisma.church.update({
        where: { id: churchId },
        data: { isActive: false },
        select: { id: true, isActive: true },
      });
    }

    await this.prisma.church.delete({ where: { id: churchId } });
    return { id: churchId, deleted: true };
  }

  private mapStaffUser(u: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    lastLoginAt: Date | null;
    createdAt: Date;
    roles: { role: { name: string; description: string | null } }[];
    member: { id: string; status: string } | null;
  }) {
    return {
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
      roles: u.roles.map((r) => ({
        name: r.role.name,
        description: r.role.description,
      })),
      memberId: u.member?.id ?? null,
      memberStatus: u.member?.status ?? null,
    };
  }
}
