import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CarePrayerStatus,
  CounselingCaseStatus,
  CounselingCategory,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';

@Injectable()
export class PastoralCareService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Counseling cases ─────────────────────────────────────

  async listCases(
    churchId: string,
    filters?: { status?: CounselingCaseStatus; assignedToId?: string },
  ) {
    return this.prisma.counselingCase.findMany({
      where: {
        churchId,
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.assignedToId ? { assignedToId: filters.assignedToId } : {}),
      },
      include: {
        member: { select: { id: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { sessions: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createCase(
    churchId: string,
    data: {
      title: string;
      category?: CounselingCategory;
      memberId?: string;
      followUpId?: string;
      assignedToId?: string;
      summary?: string;
      isConfidential?: boolean;
    },
  ) {
    return this.prisma.counselingCase.create({
      data: {
        churchId,
        title: data.title.trim(),
        category: data.category ?? 'COUNSELING',
        memberId: data.memberId,
        followUpId: data.followUpId,
        assignedToId: data.assignedToId,
        summary: data.summary,
        isConfidential: data.isConfidential ?? true,
      },
      include: {
        member: { select: { id: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async updateCase(
    churchId: string,
    id: string,
    data: Partial<{
      title: string;
      status: CounselingCaseStatus;
      assignedToId: string | null;
      summary: string;
    }>,
  ) {
    await this.assertCase(churchId, id);
    return this.prisma.counselingCase.update({
      where: { id },
      data,
      include: {
        member: { select: { id: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        sessions: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
  }

  async addSession(
    churchId: string,
    caseId: string,
    authorId: string,
    data: { notes: string; scheduledAt?: string; outcome?: string },
  ) {
    await this.assertCase(churchId, caseId);
    const session = await this.prisma.counselingSession.create({
      data: {
        caseId,
        authorId,
        notes: data.notes,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        outcome: data.outcome,
      },
      include: { author: { select: { id: true, firstName: true, lastName: true } } },
    });
    await this.prisma.counselingCase.update({
      where: { id: caseId },
      data: { status: 'IN_PROGRESS' },
    });
    return session;
  }

  // ─── Prayer requests (pastoral care) ──────────────────────

  async listPrayerRequests(churchId: string, status?: CarePrayerStatus) {
    return this.prisma.carePrayerRequest.findMany({
      where: { churchId, ...(status ? { status } : {}) },
      include: {
        member: { select: { id: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPrayerRequest(
    churchId: string,
    data: {
      title: string;
      details: string;
      memberId?: string;
      followUpId?: string;
      assignedToId?: string;
      isAnonymous?: boolean;
      isConfidential?: boolean;
    },
  ) {
    return this.prisma.carePrayerRequest.create({
      data: {
        churchId,
        title: data.title.trim(),
        details: data.details.trim(),
        memberId: data.isAnonymous ? null : data.memberId,
        followUpId: data.followUpId,
        assignedToId: data.assignedToId,
        isAnonymous: data.isAnonymous ?? false,
        isConfidential: data.isConfidential ?? true,
      },
      include: {
        member: { select: { id: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async updatePrayerRequest(
    churchId: string,
    id: string,
    data: Partial<{
      status: CarePrayerStatus;
      assignedToId: string | null;
      title: string;
      details: string;
    }>,
  ) {
    await this.assertPrayer(churchId, id);
    const answeredAt = data.status === 'ANSWERED' ? new Date() : undefined;
    return this.prisma.carePrayerRequest.update({
      where: { id },
      data: { ...data, ...(answeredAt ? { answeredAt } : {}) },
    });
  }

  // ─── Pastoral notes (secure) ──────────────────────────────

  async addNote(
    churchId: string,
    authorId: string,
    data: {
      content: string;
      isConfidential?: boolean;
      memberId?: string;
      followUpId?: string;
    },
  ) {
    if (!data.memberId && !data.followUpId) {
      throw new NotFoundException('memberId or followUpId required');
    }
    return this.prisma.pastoralNote.create({
      data: {
        churchId,
        authorId,
        memberId: data.memberId,
        followUpId: data.followUpId,
        content: data.content,
        isConfidential: data.isConfidential ?? true,
      },
      include: { author: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async listNotes(
    churchId: string,
    requesterId: string,
    filters: { memberId?: string; followUpId?: string },
  ) {
    const notes = await this.prisma.pastoralNote.findMany({
      where: {
        churchId,
        ...(filters.memberId ? { memberId: filters.memberId } : {}),
        ...(filters.followUpId ? { followUpId: filters.followUpId } : {}),
      },
      include: { author: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const isStaff = await this.userIsStaff(requesterId);
    return notes.filter((n) => isStaff || !n.isConfidential || n.authorId === requesterId);
  }

  async getStats(churchId: string) {
    const [openCases, openPrayers, notesCount] = await Promise.all([
      this.prisma.counselingCase.count({
        where: { churchId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      }),
      this.prisma.carePrayerRequest.count({
        where: { churchId, status: { in: ['OPEN', 'PRAYING'] } },
      }),
      this.prisma.pastoralNote.count({ where: { churchId } }),
    ]);
    return { openCases, openPrayers, notesCount };
  }

  private async assertCase(churchId: string, id: string) {
    const row = await this.prisma.counselingCase.findFirst({ where: { id, churchId } });
    if (!row) throw new NotFoundException('Counseling case not found');
    return row;
  }

  private async assertPrayer(churchId: string, id: string) {
    const row = await this.prisma.carePrayerRequest.findFirst({ where: { id, churchId } });
    if (!row) throw new NotFoundException('Prayer request not found');
    return row;
  }

  private async userIsStaff(userId: string) {
    const roles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    const names = roles.map((r) => r.role.name);
    return names.includes('ADMIN') || names.includes('PASTOR') || names.includes('LEADER');
  }
}
