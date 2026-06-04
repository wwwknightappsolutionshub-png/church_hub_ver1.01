import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { TEST_PASSWORD } from './test-accounts';

export async function seedPlatformAdmin(prisma: PrismaClient) {
  const role = await prisma.role.upsert({
    where: { name: 'PLATFORM_ADMIN' },
    update: { description: 'SaaS platform operator — all churches' },
    create: {
      name: 'PLATFORM_ADMIN',
      description: 'SaaS platform operator — all churches',
      permissions: { create: [{ resource: 'platform', action: '*' }] },
    },
  });

  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);

  const existing = await prisma.user.findFirst({
    where: { email: 'platform@churchhub.com' },
  });

  if (existing) {
    await prisma.member.updateMany({
      where: { userId: existing.id },
      data: { userId: null },
    });
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        churchId: null,
        passwordHash,
        isActive: true,
        firstName: 'Platform',
        lastName: 'Admin',
      },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: existing.id, roleId: role.id } },
      create: { userId: existing.id, roleId: role.id },
      update: {},
    });
    console.log('Platform admin repaired:', existing.email);
    return existing;
  }

  const user = await prisma.user.create({
    data: {
      churchId: null,
      email: 'platform@churchhub.com',
      passwordHash,
      firstName: 'Platform',
      lastName: 'Admin',
      roles: { create: { roleId: role.id } },
    },
  });

  console.log('Platform admin:', user.email, '(password:', TEST_PASSWORD + ')');
  return user;
}
