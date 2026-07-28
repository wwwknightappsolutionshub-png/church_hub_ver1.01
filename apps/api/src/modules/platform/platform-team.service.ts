import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.module';
import {
  ALL_PLATFORM_PERMISSION_KEYS,
  PLATFORM_PERMISSION_CATALOG,
  parsePermissionKey,
  type PlatformPermissionKey,
} from './platform-permissions.catalog';

@Injectable()
export class PlatformTeamService {
  constructor(private readonly prisma: PrismaService) {}

  permissionCatalog() {
    return PLATFORM_PERMISSION_CATALOG;
  }

  async listRoles() {
    const roles = await this.prisma.role.findMany({
      where: { scope: 'PLATFORM' },
      include: {
        permissions: true,
        _count: { select: { users: true } },
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      userCount: role._count.users,
      permissions: role.permissions.map(
        (p) => `${p.resource}:${p.action}` as PlatformPermissionKey,
      ),
    }));
  }

  async createRole(dto: {
    name: string;
    description?: string;
    permissions: PlatformPermissionKey[];
  }) {
    const name = dto.name.trim().toUpperCase().replace(/\s+/g, '_');
    if (!name || name === 'PLATFORM_ADMIN') {
      throw new BadRequestException('Invalid role name');
    }
    if (!/^[A-Z][A-Z0-9_]{1,47}$/.test(name)) {
      throw new BadRequestException(
        'Role name must be 2–48 chars: letters, numbers, underscores (e.g. SUPPORT_OPS)',
      );
    }

    const existing = await this.prisma.role.findUnique({ where: { name } });
    if (existing) throw new ConflictException('Role name already exists');

    const keys = this.normalizePermissions(dto.permissions);
    const role = await this.prisma.role.create({
      data: {
        name,
        description: dto.description?.trim() || null,
        scope: 'PLATFORM',
        isSystem: false,
        permissions: {
          create: keys.map((key) => {
            const parsed = parsePermissionKey(key)!;
            return { resource: parsed.resource, action: parsed.action };
          }),
        },
      },
      include: { permissions: true },
    });

    return this.mapRole(role);
  }

  async updateRole(
    roleId: string,
    dto: { description?: string; permissions?: PlatformPermissionKey[] },
  ) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, scope: 'PLATFORM' },
    });
    if (!role) throw new NotFoundException('Role not found');

    if (role.isSystem && dto.permissions) {
      // Keep PLATFORM_ADMIN fully permissioned; ignore attempts to shrink.
      await this.syncSystemAdminPermissions(role.id);
    } else if (dto.permissions) {
      const keys = this.normalizePermissions(dto.permissions);
      await this.prisma.$transaction(async (tx) => {
        await tx.permission.deleteMany({ where: { roleId: role.id } });
        if (keys.length) {
          await tx.permission.createMany({
            data: keys.map((key) => {
              const parsed = parsePermissionKey(key)!;
              return {
                roleId: role.id,
                resource: parsed.resource,
                action: parsed.action,
              };
            }),
          });
        }
      });
    }

    if (dto.description !== undefined) {
      await this.prisma.role.update({
        where: { id: role.id },
        data: { description: dto.description?.trim() || null },
      });
    }

    const updated = await this.prisma.role.findUniqueOrThrow({
      where: { id: role.id },
      include: { permissions: true, _count: { select: { users: true } } },
    });
    return this.mapRole(updated);
  }

  async deleteRole(roleId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, scope: 'PLATFORM' },
      include: { _count: { select: { users: true } } },
    });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be deleted');
    }
    if (role._count.users > 0) {
      throw new BadRequestException('Reassign staff before deleting this role');
    }
    await this.prisma.role.delete({ where: { id: role.id } });
    return { deleted: true };
  }

  async listStaff() {
    const users = await this.prisma.user.findMany({
      where: {
        churchId: null,
        roles: { some: { role: { scope: 'PLATFORM' } } },
      },
      include: {
        roles: { include: { role: true } },
      },
      orderBy: [{ isActive: 'desc' }, { lastName: 'asc' }, { firstName: 'asc' }],
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      isActive: u.isActive,
      mustChangePassword: u.mustChangePassword,
      lastLoginAt: u.lastLoginAt,
      roles: u.roles
        .filter((ur) => ur.role.scope === 'PLATFORM')
        .map((ur) => ({
          id: ur.role.id,
          name: ur.role.name,
          isSystem: ur.role.isSystem,
        })),
    }));
  }

  async inviteStaff(dto: {
    email: string;
    firstName: string;
    lastName: string;
    roleId: string;
  }) {
    const email = dto.email.toLowerCase().trim();
    const role = await this.prisma.role.findFirst({
      where: { id: dto.roleId, scope: 'PLATFORM' },
    });
    if (!role) throw new NotFoundException('Platform role not found');
    if (role.name === 'PLATFORM_ADMIN') {
      throw new BadRequestException('Cannot invite additional PLATFORM_ADMIN via Team');
    }

    const existing = await this.prisma.user.findFirst({ where: { email } });
    if (existing) {
      if (existing.churchId) {
        throw new ConflictException('Email belongs to a church tenant user');
      }
      const alreadyPlatform = await this.prisma.userRole.findFirst({
        where: { userId: existing.id, role: { scope: 'PLATFORM' } },
      });
      if (alreadyPlatform) {
        throw new ConflictException('User is already a platform operator');
      }
      await this.prisma.userRole.create({
        data: { userId: existing.id, roleId: role.id },
      });
      if (!existing.isActive) {
        await this.prisma.user.update({
          where: { id: existing.id },
          data: { isActive: true },
        });
      }
      return {
        userId: existing.id,
        email,
        temporaryPassword: null as string | null,
        reactivated: true,
      };
    }

    const temporaryPassword = randomBytes(9).toString('base64url').slice(0, 12);
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);
    const user = await this.prisma.user.create({
      data: {
        churchId: null,
        email,
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        mustChangePassword: true,
        roles: { create: { roleId: role.id } },
      },
    });

    return {
      userId: user.id,
      email,
      temporaryPassword,
      reactivated: false,
    };
  }

  async updateStaff(userId: string, dto: { roleId?: string; isActive?: boolean }) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, churchId: null },
      include: { roles: { include: { role: true } } },
    });
    if (!user) throw new NotFoundException('Platform staff not found');

    const isOwner = user.roles.some((ur) => ur.role.name === 'PLATFORM_ADMIN');
    if (isOwner) {
      if (dto.isActive === false) {
        throw new BadRequestException('Cannot deactivate PLATFORM_ADMIN');
      }
      if (dto.roleId) {
        throw new BadRequestException('Cannot change PLATFORM_ADMIN role assignment');
      }
    }

    if (dto.roleId) {
      const role = await this.prisma.role.findFirst({
        where: { id: dto.roleId, scope: 'PLATFORM' },
      });
      if (!role) throw new NotFoundException('Platform role not found');
      if (role.name === 'PLATFORM_ADMIN') {
        throw new BadRequestException('Cannot assign PLATFORM_ADMIN via Team');
      }

      const platformRoleIds = user.roles
        .filter((ur) => ur.role.scope === 'PLATFORM')
        .map((ur) => ur.roleId);

      await this.prisma.$transaction(async (tx) => {
        if (platformRoleIds.length) {
          await tx.userRole.deleteMany({
            where: { userId, roleId: { in: platformRoleIds } },
          });
        }
        await tx.userRole.create({ data: { userId, roleId: role.id } });
      });
    }

    if (dto.isActive !== undefined) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { isActive: dto.isActive },
      });
    }

    const staff = await this.listStaff();
    return staff.find((s) => s.id === userId);
  }

  private normalizePermissions(keys: PlatformPermissionKey[]): PlatformPermissionKey[] {
    const set = new Set<PlatformPermissionKey>();
    for (const key of keys) {
      if (!ALL_PLATFORM_PERMISSION_KEYS.includes(key)) {
        throw new BadRequestException(`Unknown permission: ${key}`);
      }
      set.add(key);
    }
    return [...set];
  }

  private async syncSystemAdminPermissions(roleId: string) {
    for (const def of PLATFORM_PERMISSION_CATALOG) {
      await this.prisma.permission.upsert({
        where: {
          roleId_resource_action: {
            roleId,
            resource: def.resource,
            action: def.action,
          },
        },
        create: {
          roleId,
          resource: def.resource,
          action: def.action,
        },
        update: {},
      });
    }
  }

  private mapRole(role: {
    id: string;
    name: string;
    description: string | null;
    isSystem: boolean;
    permissions: { resource: string; action: string }[];
    _count?: { users: number };
  }) {
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      userCount: role._count?.users ?? 0,
      permissions: role.permissions.map(
        (p) => `${p.resource}:${p.action}` as PlatformPermissionKey,
      ),
    };
  }
}
