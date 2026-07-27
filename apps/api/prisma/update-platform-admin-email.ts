/**
 * One-shot: change PLATFORM_ADMIN login email without resetting password.
 *
 * Usage (from apps/api, with DATABASE_URL set):
 *   pnpm exec ts-node --transpile-only prisma/update-platform-admin-email.ts
 */
import { PrismaClient } from '@prisma/client';
import { PLATFORM_ADMIN_EMAIL } from './seed-platform-admin';

const prisma = new PrismaClient();

const LEGACY = ['platform@churchhub.com'] as const;

async function main() {
  const nextEmail = PLATFORM_ADMIN_EMAIL.toLowerCase().trim();

  const target =
    (await prisma.user.findFirst({
      where: {
        roles: { some: { role: { name: 'PLATFORM_ADMIN' } } },
        OR: [
          { email: { equals: nextEmail, mode: 'insensitive' } },
          { email: { in: [...LEGACY], mode: 'insensitive' } },
        ],
      },
      select: { id: true, email: true },
    })) ??
    (await prisma.user.findFirst({
      where: { roles: { some: { role: { name: 'PLATFORM_ADMIN' } } } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true },
    }));

  if (!target) {
    throw new Error('No PLATFORM_ADMIN user found');
  }

  if (target.email.toLowerCase() === nextEmail) {
    console.log('Already set:', target.email);
    return;
  }

  const conflict = await prisma.user.findFirst({
    where: {
      email: { equals: nextEmail, mode: 'insensitive' },
      id: { not: target.id },
    },
    select: { id: true },
  });
  if (conflict) {
    throw new Error(`Email already in use by another user: ${nextEmail}`);
  }

  await prisma.user.update({
    where: { id: target.id },
    data: { email: nextEmail },
  });

  console.log(`Updated platform admin email: ${target.email} → ${nextEmail}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
  });
