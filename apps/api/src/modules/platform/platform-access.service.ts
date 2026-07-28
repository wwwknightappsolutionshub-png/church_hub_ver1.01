import {
  ForbiddenException,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.module';
import {
  ALL_PLATFORM_PERMISSION_KEYS,
  PLATFORM_PERMISSION_CATALOG,
  type PlatformPermissionKey,
  toPermissionKey,
} from './platform-permissions.catalog';

@Injectable()
export class PlatformAccessService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensurePlatformAdminRoleSeeded();
  }

  /** Ensure PLATFORM_ADMIN exists as system platform role with full permission set. */
  async ensurePlatformAdminRoleSeeded() {
    const role = await this.prisma.role.upsert({
      where: { name: 'PLATFORM_ADMIN' },
      create: {
        name: 'PLATFORM_ADMIN',
        description: 'SaaS platform owner — full access',
        scope: 'PLATFORM',
        isSystem: true,
      },
      update: {
        scope: 'PLATFORM',
        isSystem: true,
        description: 'SaaS platform owner — full access',
      },
    });

    for (const def of PLATFORM_PERMISSION_CATALOG) {
      await this.prisma.permission.upsert({
        where: {
          roleId_resource_action: {
            roleId: role.id,
            resource: def.resource,
            action: def.action,
          },
        },
        create: {
          roleId: role.id,
          resource: def.resource,
          action: def.action,
        },
        update: {},
      });
    }
  }

  async isPlatformAdmin(userId: string): Promise<boolean> {
    const row = await this.prisma.userRole.findFirst({
      where: { userId, role: { name: 'PLATFORM_ADMIN' } },
      select: { userId: true },
    });
    return !!row;
  }

  async isPlatformOperator(userId: string): Promise<boolean> {
    if (await this.isPlatformAdmin(userId)) return true;
    const row = await this.prisma.userRole.findFirst({
      where: { userId, role: { scope: 'PLATFORM' } },
      select: { userId: true },
    });
    return !!row;
  }

  async listPermissionKeysForUser(userId: string): Promise<PlatformPermissionKey[]> {
    if (await this.isPlatformAdmin(userId)) {
      return [...ALL_PLATFORM_PERMISSION_KEYS];
    }

    const roles = await this.prisma.userRole.findMany({
      where: { userId, role: { scope: 'PLATFORM' } },
      include: { role: { include: { permissions: true } } },
    });

    const keys = new Set<string>();
    for (const ur of roles) {
      for (const p of ur.role.permissions) {
        keys.add(toPermissionKey(p.resource, p.action));
      }
    }
    return [...keys].filter((k): k is PlatformPermissionKey =>
      ALL_PLATFORM_PERMISSION_KEYS.includes(k as PlatformPermissionKey),
    );
  }

  async hasPermission(userId: string, key: PlatformPermissionKey): Promise<boolean> {
    if (await this.isPlatformAdmin(userId)) return true;
    const parsed = key.split(':');
    if (parsed.length < 2) return false;
    const action = parsed.pop()!;
    const resource = parsed.join(':');
    const hit = await this.prisma.userRole.findFirst({
      where: {
        userId,
        role: {
          scope: 'PLATFORM',
          permissions: { some: { resource, action } },
        },
      },
      select: { userId: true },
    });
    return !!hit;
  }

  async assertPermission(userId: string, key: PlatformPermissionKey): Promise<void> {
    const ok = await this.hasPermission(userId, key);
    if (!ok) {
      throw new ForbiddenException(`Missing platform permission: ${key}`);
    }
  }

  async assertPlatformOperator(userId: string): Promise<void> {
    if (!(await this.isPlatformOperator(userId))) {
      throw new ForbiddenException('Platform operator access required');
    }
  }
}
