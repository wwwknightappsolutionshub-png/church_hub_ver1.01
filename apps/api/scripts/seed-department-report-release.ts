/**
 * One-shot: PlatformBroadcast kind=RELEASE for department weekly reports.
 * Run: pnpm exec ts-node --transpile-only scripts/seed-department-report-release.ts
 */
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';

const VERSION = '2026.11.26-department-weekly-report';

async function main() {
  const prisma = new PrismaClient();
  try {
    const existing = await prisma.platformBroadcast.findFirst({
      where: { kind: 'RELEASE', version: VERSION },
    });
    if (existing) {
      console.log('RELEASE already exists', existing.id);
      return;
    }

    const platformAdmin = await prisma.user.findFirst({
      where: { roles: { some: { role: { name: 'PLATFORM_ADMIN' } } } },
      select: { id: true },
    });

    const title = 'Department weekly report';
    const body = [
      'Unit leaders can preview a week range and send one report to the church admin and pastor.',
      'The unit home shows attendance as a line graph. Membership consistency is in the workspace menu.',
      'Public outreach registration now requires a consent checkbox before a contact can be saved.',
    ].join('\n\n');

    const churches = await prisma.church.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    const notifRows: Array<{
      id: string;
      churchId: string;
      userId: string;
      title: string;
      body: string;
      type: string;
      data: object;
    }> = [];

    for (const c of churches) {
      const users = await prisma.user.findMany({
        where: { churchId: c.id, isActive: true },
        select: { id: true },
      });
      for (const u of users) {
        notifRows.push({
          id: randomUUID(),
          churchId: c.id,
          userId: u.id,
          title,
          body,
          type: 'PLATFORM_RELEASE',
          data: {
            source: 'platform',
            kind: 'RELEASE',
            category: 'PRODUCT',
            version: VERSION,
          },
        });
      }
    }

    if (notifRows.length) {
      await prisma.notification.createMany({ data: notifRows });
    }

    const broadcast = await prisma.platformBroadcast.create({
      data: {
        title,
        body,
        audience: 'ALL',
        sendEmail: false,
        createdByUserId: platformAdmin?.id ?? null,
        notificationCount: notifRows.length,
        kind: 'RELEASE',
        category: 'PRODUCT',
        version: VERSION,
        deliveries: { create: churches.map((c) => ({ churchId: c.id })) },
      },
    });

    console.log('Created RELEASE', broadcast.id, 'notifications', notifRows.length);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
