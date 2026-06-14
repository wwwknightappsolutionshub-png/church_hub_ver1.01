import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.module';

export interface CelebrationBirthdayDto {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  date: string;
  label: string;
  age?: number | null;
}

export interface CelebrationAnniversaryDto {
  id: string;
  type: 'member' | 'family';
  name: string;
  email?: string | null;
  occasion: string;
  date: string;
  label: string;
}

export interface CelebrationPaginatedListDto<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MembershipCelebrationsDto {
  windowDays: number;
  birthdays: CelebrationPaginatedListDto<CelebrationBirthdayDto>;
  anniversaries: CelebrationPaginatedListDto<CelebrationAnniversaryDto>;
}

function paginateList<T>(items: T[], page: number, limit: number): CelebrationPaginatedListDto<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    total,
    page: safePage,
    limit,
    totalPages,
  };
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

function monthDayKey(d: Date): string {
  return `${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function nextOccurrence(month: number, day: number, from: Date): Date {
  const year = from.getUTCFullYear();
  let candidate = new Date(Date.UTC(year, month - 1, day));
  if (candidate < from) {
    candidate = new Date(Date.UTC(year + 1, month - 1, day));
  }
  return candidate;
}

@Injectable()
export class MembershipCelebrationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCelebrations(
    churchId: string,
    windowDays = 30,
    opts?: {
      birthdaysPage?: number;
      birthdaysLimit?: number;
      anniversariesPage?: number;
      anniversariesLimit?: number;
    },
  ): Promise<MembershipCelebrationsDto> {
    const birthdaysPage = opts?.birthdaysPage ?? 1;
    const birthdaysLimit = opts?.birthdaysLimit ?? 8;
    const anniversariesPage = opts?.anniversariesPage ?? 1;
    const anniversariesLimit = opts?.anniversariesLimit ?? 8;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const windowEnd = addDays(today, windowDays);

    const [members, families] = await Promise.all([
      this.prisma.member.findMany({
        where: { churchId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          dateOfBirth: true,
          hideAge: true,
          specialOccasion: true,
          specialOccasionDate: true,
        },
      }),
      this.prisma.family.findMany({
        where: { churchId, isActive: true },
        select: {
          id: true,
          name: true,
          email: true,
          specialOccasion: true,
          specialOccasionDate: true,
        },
      }),
    ]);

    const birthdays: CelebrationBirthdayDto[] = [];
    for (const m of members) {
      if (!m.dateOfBirth) continue;
      const dob = new Date(m.dateOfBirth);
      const next = nextOccurrence(dob.getUTCMonth() + 1, dob.getUTCDate(), today);
      if (next > windowEnd) continue;
      const age = m.hideAge ? null : next.getUTCFullYear() - dob.getUTCFullYear();
      birthdays.push({
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        email: m.email,
        date: next.toISOString().slice(0, 10),
        label: next.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        age,
      });
    }
    birthdays.sort((a, b) => a.date.localeCompare(b.date));

    const anniversaries: CelebrationAnniversaryDto[] = [];
    for (const m of members) {
      if (!m.specialOccasionDate) continue;
      const occ = new Date(m.specialOccasionDate);
      const next = nextOccurrence(occ.getUTCMonth() + 1, occ.getUTCDate(), today);
      if (next > windowEnd) continue;
      anniversaries.push({
        id: m.id,
        type: 'member',
        name: `${m.firstName} ${m.lastName}`.trim(),
        email: m.email,
        occasion: m.specialOccasion?.trim() || 'Special occasion',
        date: next.toISOString().slice(0, 10),
        label: next.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      });
    }
    for (const f of families) {
      if (!f.specialOccasionDate) continue;
      const occ = new Date(f.specialOccasionDate);
      const next = nextOccurrence(occ.getUTCMonth() + 1, occ.getUTCDate(), today);
      if (next > windowEnd) continue;
      anniversaries.push({
        id: f.id,
        type: 'family',
        name: f.name,
        email: f.email,
        occasion: f.specialOccasion?.trim() || 'Special occasion',
        date: next.toISOString().slice(0, 10),
        label: next.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      });
    }
    anniversaries.sort((a, b) => a.date.localeCompare(b.date));

    return {
      windowDays,
      birthdays: paginateList(birthdays, birthdaysPage, birthdaysLimit),
      anniversaries: paginateList(anniversaries, anniversariesPage, anniversariesLimit),
    };
  }

  async getBirthdaysToday(churchId: string) {
    const todayKey = monthDayKey(new Date());
    const members = await this.prisma.member.findMany({
      where: { churchId, dateOfBirth: { not: null }, email: { not: null } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        dateOfBirth: true,
        hideAge: true,
        ministryInterests: true,
      },
    });
    return members.filter((m) => m.dateOfBirth && monthDayKey(new Date(m.dateOfBirth)) === todayKey);
  }

  async getAnniversariesToday(churchId: string) {
    const todayKey = monthDayKey(new Date());
    const [members, families] = await Promise.all([
      this.prisma.member.findMany({
        where: { churchId, specialOccasionDate: { not: null }, email: { not: null } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          specialOccasion: true,
          specialOccasionDate: true,
        },
      }),
      this.prisma.family.findMany({
        where: { churchId, isActive: true, specialOccasionDate: { not: null } },
        select: {
          id: true,
          name: true,
          email: true,
          specialOccasion: true,
          specialOccasionDate: true,
        },
      }),
    ]);

    const memberHits = members
      .filter((m) => m.specialOccasionDate && monthDayKey(new Date(m.specialOccasionDate)) === todayKey)
      .map((m) => ({
        memberId: m.id,
        familyId: null as string | null,
        email: m.email!,
        firstName: m.firstName,
        lastName: m.lastName,
        occasionName: m.specialOccasion?.trim() || 'Special occasion',
      }));

    const familyHits = families
      .filter((f) => f.specialOccasionDate && monthDayKey(new Date(f.specialOccasionDate)) === todayKey)
      .filter((f) => f.email)
      .map((f) => ({
        memberId: null as string | null,
        familyId: f.id,
        email: f.email!,
        firstName: f.name,
        lastName: '',
        occasionName: f.specialOccasion?.trim() || 'Special occasion',
      }));

    return [...memberHits, ...familyHits];
  }
}
