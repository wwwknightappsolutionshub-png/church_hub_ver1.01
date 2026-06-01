/**
 * Seeds roles (if missing) + magic-login test users for demo-church.
 * Run: pnpm --filter @church-hub/api prisma:seed:test-users
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { seedTestUsers } from './seed-test-users';

const prisma = new PrismaClient();

async function ensureRoles() {
  const defs: Array<{
    name: string;
    description: string;
    permissions: Array<{ resource: string; action: string }>;
  }> = [
    {
      name: 'ADMIN',
      description: 'Church administrator',
      permissions: [{ resource: '*', action: '*' }],
    },
    {
      name: 'PASTOR',
      description: 'Pastoral staff',
      permissions: [
        { resource: 'follow-up', action: 'read' },
        { resource: 'follow-up', action: 'write' },
        { resource: 'membership', action: 'read' },
      ],
    },
    {
      name: 'LEADER',
      description: 'Ministry leader',
      permissions: [
        { resource: 'follow-up', action: 'read' },
        { resource: 'follow-up', action: 'write' },
        { resource: 'membership', action: 'read' },
      ],
    },
    {
      name: 'DRIVER',
      description: 'Bus driver',
      permissions: [{ resource: 'bus', action: 'write' }],
    },
    {
      name: 'MEMBER',
      description: 'Church member',
      permissions: [
        { resource: 'membership', action: 'read' },
        { resource: 'prayer-hub', action: 'read' },
        { resource: 'praise-hub', action: 'read' },
      ],
    },
    {
      name: 'PLATFORM_ADMIN',
      description: 'SaaS platform operator — all churches',
      permissions: [{ resource: 'platform', action: '*' }],
    },
  ];

  const map: Record<string, { id: string }> = {};
  for (const def of defs) {
    const role = await prisma.role.upsert({
      where: { name: def.name },
      update: { description: def.description },
      create: {
        name: def.name,
        description: def.description,
        permissions: { create: def.permissions },
      },
    });
    map[def.name] = role;
  }
  return map;
}

async function main() {
  const church = await prisma.church.findUnique({ where: { slug: 'demo-church' } });
  if (!church) {
    throw new Error('demo-church not found — run full seed first: pnpm prisma:seed');
  }

  const roles = await ensureRoles();
  const passwordHash = await bcrypt.hash('ChurchHub123!', 12);
  await seedTestUsers(prisma, church.id, passwordHash, roles);

  const { seedPlatformAdmin } = await import('./seed-platform-admin');
  await seedPlatformAdmin(prisma);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
