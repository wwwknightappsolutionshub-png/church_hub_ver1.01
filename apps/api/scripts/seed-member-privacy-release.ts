/**
 * One-shot: PlatformBroadcast kind=RELEASE for member privacy + field access.
 * Run: pnpm exec ts-node --transpile-only scripts/seed-member-privacy-release.ts
 */
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';

const VERSION = '2026.11.24-member-privacy';

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

    const title = 'Member privacy mode & field access';
    const body = [
      'Ops roles (Cell Ministers, deputies, Leaders) now see masked member contact fields (email, phone, address beyond city, household tree) as Restricted.',
      'Church Admin/Pastor: Settings → Field access to tighten visibility further (cannot loosen the hardcoded floor).',
      'Platform: Privacy → Field access (global or per tenant).',
      'Leaders can Request access (notifies Admin/Pastor; no auto-unmask).',
      'Pastoral notes, counseling, confidential care, and bulk directory PII export are Pastor-only; trash/restore and staff role assignment remain Admin+Pastor.',
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
            category: 'SECURITY',
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
        category: 'SECURITY',
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
