import type { PrismaService } from '../../prisma/prisma.service';

export type DigestRecipient = {
  id: string;
  email: string;
  role: 'ADMIN' | 'PASTOR';
};

/**
 * One Church Admin + one Pastor (earliest active account per role).
 * If the same person holds both roles, they receive a single email.
 */
export async function findOneAdminAndOnePastor(
  prisma: PrismaService,
  churchId: string,
): Promise<DigestRecipient[]> {
  const [admin, pastor] = await Promise.all([
    prisma.user.findFirst({
      where: {
        churchId,
        isActive: true,
        email: { not: '' },
        roles: { some: { role: { name: 'ADMIN' } } },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true },
    }),
    prisma.user.findFirst({
      where: {
        churchId,
        isActive: true,
        email: { not: '' },
        roles: { some: { role: { name: 'PASTOR' } } },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true },
    }),
  ]);

  const out: DigestRecipient[] = [];
  if (admin?.email) {
    out.push({ id: admin.id, email: admin.email, role: 'ADMIN' });
  }
  if (pastor?.email && pastor.id !== admin?.id) {
    out.push({ id: pastor.id, email: pastor.email, role: 'PASTOR' });
  } else if (pastor?.email && !admin) {
    out.push({ id: pastor.id, email: pastor.email, role: 'PASTOR' });
  }
  return out;
}

/** Europe/London wall-clock parts for schedule gates. */
export function londonDateParts(now = new Date()): {
  weekday: string;
  hour: number;
  minute: number;
  dateKey: string;
} {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';

  const weekday = get('weekday');
  const hour = parseInt(get('hour'), 10);
  const minute = parseInt(get('minute'), 10);
  const day = get('day');
  const month = get('month');
  const year = get('year');
  return {
    weekday,
    hour: Number.isFinite(hour) ? hour : -1,
    minute: Number.isFinite(minute) ? minute : -1,
    dateKey: `${year}-${month}-${day}`,
  };
}

/** Monday 10:00–10:59 Europe/London. */
export function isLondonMondayDigestWindow(now = new Date()): {
  due: boolean;
  dateKey: string;
} {
  const p = londonDateParts(now);
  return { due: p.weekday === 'Mon' && p.hour === 10, dateKey: p.dateKey };
}

/** Saturday 21:00–21:59 Europe/London. */
export function isLondonSaturdayCellDigestWindow(now = new Date()): {
  due: boolean;
  dateKey: string;
} {
  const p = londonDateParts(now);
  return { due: p.weekday === 'Sat' && p.hour === 21, dateKey: p.dateKey };
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
