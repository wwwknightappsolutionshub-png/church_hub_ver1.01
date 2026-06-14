import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ChurchCalendarEventKind } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { MembershipCelebrationsService } from '../membership/membership-celebrations.service';

export interface CalendarFeedItemDto {
  id: string;
  title: string;
  description?: string | null;
  startsAt: string;
  endsAt?: string | null;
  allDay: boolean;
  kind: ChurchCalendarEventKind | 'BIRTHDAY' | 'ANNIVERSARY' | 'EVENT';
  isPinned: boolean;
  highlightColor?: string | null;
  source: 'event' | 'birthday' | 'anniversary';
  editable: boolean;
}

@Injectable()
export class ChurchCalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly celebrations: MembershipCelebrationsService,
  ) {}

  async getFeed(
    churchId: string,
    from: Date,
    to: Date,
  ): Promise<{ items: CalendarFeedItemDto[] }> {
    const [events, celebrationData] = await Promise.all([
      this.prisma.churchCalendarEvent.findMany({
        where: { churchId, startsAt: { gte: from, lte: to } },
        orderBy: [{ isPinned: 'desc' }, { startsAt: 'asc' }],
      }),
      this.celebrations.getCelebrations(churchId, 60, {
        birthdaysPage: 1,
        birthdaysLimit: 500,
        anniversariesPage: 1,
        anniversariesLimit: 500,
      }),
    ]);

    const items: CalendarFeedItemDto[] = events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      startsAt: e.startsAt.toISOString(),
      endsAt: e.endsAt?.toISOString() ?? null,
      allDay: e.allDay,
      kind: e.kind,
      isPinned: e.isPinned,
      highlightColor: e.highlightColor,
      source: 'event' as const,
      editable: true,
    }));

    for (const b of celebrationData.birthdays.items) {
      const start = new Date(b.date);
      if (start < from || start > to) continue;
      items.push({
        id: `birthday-${b.id}-${b.date}`,
        title: `${b.firstName} ${b.lastName} — Birthday`,
        description: b.label,
        startsAt: start.toISOString(),
        endsAt: null,
        allDay: true,
        kind: 'BIRTHDAY',
        isPinned: false,
        highlightColor: '#d97706',
        source: 'birthday',
        editable: false,
      });
    }

    for (const a of celebrationData.anniversaries.items) {
      const start = new Date(a.date);
      if (start < from || start > to) continue;
      items.push({
        id: `anniversary-${a.id}-${a.date}`,
        title: `${a.name} — ${a.occasion}`,
        description: a.label,
        startsAt: start.toISOString(),
        endsAt: null,
        allDay: true,
        kind: 'ANNIVERSARY',
        isPinned: false,
        highlightColor: '#7c3aed',
        source: 'anniversary',
        editable: false,
      });
    }

    items.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
    });

    return { items };
  }

  async createEvent(
    churchId: string,
    userId: string,
    data: {
      title: string;
      description?: string;
      startsAt: string;
      endsAt?: string;
      allDay?: boolean;
      isPinned?: boolean;
      highlightColor?: string;
    },
  ) {
    if (!data.title?.trim()) throw new BadRequestException('Title is required');
    return this.prisma.churchCalendarEvent.create({
      data: {
        churchId,
        title: data.title.trim(),
        description: data.description?.trim(),
        startsAt: new Date(data.startsAt),
        endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
        allDay: data.allDay ?? false,
        kind: ChurchCalendarEventKind.EVENT,
        isPinned: data.isPinned ?? false,
        highlightColor: data.highlightColor?.trim() || null,
        createdByUserId: userId,
      },
    });
  }

  async updateEvent(
    churchId: string,
    id: string,
    data: Partial<{
      title: string;
      description: string | null;
      startsAt: string;
      endsAt: string | null;
      allDay: boolean;
      isPinned: boolean;
      highlightColor: string | null;
    }>,
  ) {
    await this.assertEvent(churchId, id);
    return this.prisma.churchCalendarEvent.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.startsAt !== undefined ? { startsAt: new Date(data.startsAt) } : {}),
        ...(data.endsAt !== undefined
          ? { endsAt: data.endsAt ? new Date(data.endsAt) : null }
          : {}),
        ...(data.allDay !== undefined ? { allDay: data.allDay } : {}),
        ...(data.isPinned !== undefined ? { isPinned: data.isPinned } : {}),
        ...(data.highlightColor !== undefined ? { highlightColor: data.highlightColor } : {}),
      },
    });
  }

  async deleteEvent(churchId: string, id: string) {
    await this.assertEvent(churchId, id);
    await this.prisma.churchCalendarEvent.delete({ where: { id } });
    return { success: true };
  }

  private async assertEvent(churchId: string, id: string) {
    const row = await this.prisma.churchCalendarEvent.findFirst({ where: { id, churchId } });
    if (!row) throw new NotFoundException('Calendar event not found');
    return row;
  }

  assertCanManage(isAdmin: boolean, isPastor: boolean, isPlatformAdmin: boolean) {
    if (!isAdmin && !isPastor && !isPlatformAdmin) {
      throw new ForbiddenException('Only church admin or pastor can manage calendar events');
    }
  }
}
