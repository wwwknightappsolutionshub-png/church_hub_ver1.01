import { PrismaClient, MemberRoleType } from '@prisma/client';
import { TEST_ACCOUNTS, TEST_PASSWORD } from '../src/modules/auth/test-accounts';

type RoleMap = Record<string, { id: string }>;

const MEMBER_ROLE_TYPES = new Set<string>([
  'YOUTH',
  'ADULT',
  'LEADER',
  'EVANGELIST',
  'ADMIN',
  'DRIVER',
]);

function memberRolesFromAccount(memberRoles: string[]): MemberRoleType[] {
  const roles = memberRoles.filter((r): r is MemberRoleType =>
    MEMBER_ROLE_TYPES.has(r),
  );
  return roles.length > 0 ? roles : ['ADULT'];
}

export async function seedTestUsers(
  prisma: PrismaClient,
  churchId: string,
  passwordHash: string,
  roles: RoleMap,
) {
  const followUpUnit = await prisma.serviceUnit.findFirst({
    where: { churchId, name: 'Follow-up' },
  });
  const harvestersUnit = await prisma.serviceUnit.findFirst({
    where: { churchId, name: 'Harvesters Squad' },
  });
  const choirUnit = await prisma.serviceUnit.findFirst({
    where: { churchId, OR: [{ name: 'Choir' }, { departmentCode: 'CHOIR' }] },
  });

  for (const account of TEST_ACCOUNTS) {
    if (account.email === 'admin@demo.church') continue;

    const role = roles[account.userRole];
    if (!role) {
      console.warn(`Skipping ${account.email}: role ${account.userRole} not found`);
      continue;
    }

    const user = await prisma.user.upsert({
      where: { churchId_email: { churchId, email: account.email } },
      update: {
        passwordHash,
        isActive: true,
        firstName:
          account.key === 'choiradmin'
            ? 'Daniel'
            : account.label.split('(')[0].trim().split(' ')[0] || 'Demo',
        lastName: account.key === 'choiradmin' ? 'Morrison' : 'User',
      },
      create: {
        churchId,
        email: account.email,
        passwordHash,
        firstName:
          account.key === 'choiradmin'
            ? 'Daniel'
            : account.label.split('(')[0].trim().split(' ')[0] || 'Demo',
        lastName: account.key === 'choiradmin' ? 'Morrison' : 'User',
        isActive: true,
      },
    });

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      create: { userId: user.id, roleId: role.id },
      update: {},
    });

    const memberRoles = memberRolesFromAccount(account.memberRoles);

    const member = await prisma.member.upsert({
      where: { userId: user.id },
      update: { roles: memberRoles, email: user.email, status: 'ACTIVE_MEMBER' },
      create: {
        churchId,
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        status: 'ACTIVE_MEMBER',
        roles: memberRoles,
        gamification: { create: {} },
      },
    });

    const unitId =
      account.key === 'choiradmin'
        ? choirUnit?.id
        : account.key === 'evangelist'
          ? harvestersUnit?.id
          : followUpUnit?.id;
    if (unitId) {
      await prisma.serviceUnitMember.upsert({
        where: { serviceUnitId_memberId: { serviceUnitId: unitId, memberId: member.id } },
        create: { serviceUnitId: unitId, memberId: member.id },
        update: {},
      });
      if (account.key === 'unitadmin' || account.key === 'choiradmin') {
        await prisma.serviceUnitLeader.upsert({
          where: {
            serviceUnitId_memberId: { serviceUnitId: unitId, memberId: member.id },
          },
          create: {
            serviceUnitId: unitId,
            memberId: member.id,
            role: account.key === 'choiradmin' ? 'CHOIR DIRECTOR' : 'UNIT ADMIN',
            isModerator: true,
            isUnitAdmin: true,
          },
          update: { isUnitAdmin: true, isModerator: true },
        });
      }
    }
  }

  console.log('Test accounts seeded (password:', TEST_PASSWORD + ')');
}

