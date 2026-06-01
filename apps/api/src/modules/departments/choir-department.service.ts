import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DepartmentAccessService } from './department-access.service';
import { CommunicationsQueueService } from '../communications/communications-queue.service';
import { UploadsService } from '../uploads/uploads.service';
import { resolveDeptModuleCode } from '../../../prisma/dept-module-catalog';
import {
  CHOIR_ROSTER_EVENTS,
  CHOIR_VOICE_PARTS,
  transposeChordChart,
  transposeMusicalKey,
} from './choir.constants';

const memberSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  userId: true,
} as const;

@Injectable()
export class ChoirDepartmentService {
  private readonly logger = new Logger(ChoirDepartmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: DepartmentAccessService,
    private readonly commQueue: CommunicationsQueueService,
    private readonly uploads: UploadsService,
  ) {}

  getCatalog() {
    return { voiceParts: CHOIR_VOICE_PARTS, rosterEvents: CHOIR_ROSTER_EVENTS };
  }

  private async requireChoirUnit(userId: string, churchId: string, serviceUnitId: string) {
    const { ctx, unit } = await this.access.requireView(userId, churchId, serviceUnitId);
    const code = resolveDeptModuleCode(unit.departmentCode, unit.name);
    if (code !== 'CHOIR') {
      throw new BadRequestException('Choir tools are only available for the Choir department');
    }
    return { ctx, unit };
  }

  private prismaHint(err: unknown): never {
    const code = (err as { code?: string })?.code;
    if (code === 'P2021' || code === 'P2010') {
      throw new BadRequestException(
        'Choir tables are missing. Run: npx prisma migrate deploy (from apps/api), then restart the API.',
      );
    }
    throw err;
  }

  async listRoster(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    query?: { from?: string; to?: string; eventType?: string },
  ) {
    await this.requireChoirUnit(userId, churchId, serviceUnitId);
    const where: Prisma.DeptChoirRosterEntryWhereInput = { churchId, serviceUnitId };
    if (query?.eventType) where.eventType = query.eventType as Prisma.EnumChoirRosterEventTypeFilter;
    if (query?.from || query?.to) {
      where.startsAt = {};
      if (query.from) where.startsAt.gte = new Date(query.from);
      if (query.to) where.startsAt.lte = new Date(query.to);
    }
    try {
      const rows = await this.prisma.deptChoirRosterEntry.findMany({
        where,
        include: { member: { select: memberSelect } },
        orderBy: { startsAt: 'asc' },
      });
      return {
        entries: rows,
        byEvent: CHOIR_ROSTER_EVENTS.map((e) => ({
          ...e,
          entries: rows.filter((r) => r.eventType === e.value),
        })),
        byVoicePart: CHOIR_VOICE_PARTS.map((v) => ({
          ...v,
          count: rows.filter((r) => r.voicePart === v.value).length,
        })),
      };
    } catch (err) {
      this.prismaHint(err);
    }
  }

  async upsertRoster(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: {
      id?: string;
      eventType: string;
      startsAt: string;
      voicePart: string;
      memberId: string;
      notes?: string;
    },
  ) {
    await this.access.requireLead(userId, churchId, serviceUnitId);
    await this.requireChoirUnit(userId, churchId, serviceUnitId);
    const startsAt = new Date(body.startsAt);
    if (Number.isNaN(startsAt.getTime())) throw new BadRequestException('Invalid startsAt');
    try {
      if (body.id) {
        return await this.prisma.deptChoirRosterEntry.update({
          where: { id: body.id },
          data: {
            eventType: body.eventType as never,
            startsAt,
            voicePart: body.voicePart as never,
            memberId: body.memberId,
            notes: body.notes,
            reminderSentAt: null,
          },
          include: { member: { select: memberSelect } },
        });
      }
      return await this.prisma.deptChoirRosterEntry.create({
        data: {
          churchId,
          serviceUnitId,
          eventType: body.eventType as never,
          startsAt,
          voicePart: body.voicePart as never,
          memberId: body.memberId,
          notes: body.notes,
        },
        include: { member: { select: memberSelect } },
      });
    } catch (err) {
      this.prismaHint(err);
    }
  }

  async deleteRoster(userId: string, churchId: string, serviceUnitId: string, id: string) {
    await this.access.requireLead(userId, churchId, serviceUnitId);
    const row = await this.prisma.deptChoirRosterEntry.findFirst({
      where: { id, churchId, serviceUnitId },
    });
    if (!row) throw new NotFoundException('Roster entry not found');
    await this.prisma.deptChoirRosterEntry.delete({ where: { id } });
    return { ok: true };
  }

  async sendRosterReminders(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body?: { from?: string; to?: string; force?: boolean },
  ) {
    await this.access.requireManage(userId, churchId, serviceUnitId);
    const { unit } = await this.requireChoirUnit(userId, churchId, serviceUnitId);
    const where: Prisma.DeptChoirRosterEntryWhereInput = {
      churchId,
      serviceUnitId,
      ...(body?.force ? {} : { reminderSentAt: null }),
    };
    if (body?.from || body?.to) {
      where.startsAt = {};
      if (body.from) where.startsAt.gte = new Date(body.from);
      if (body.to) where.startsAt.lte = new Date(body.to);
    } else {
      where.startsAt = { gte: new Date() };
    }
    const rows = await this.prisma.deptChoirRosterEntry.findMany({
      where,
      include: { member: { select: memberSelect } },
    });
    let sent = 0;
    for (const row of rows) {
      if (!row.member.userId) continue;
      const part = CHOIR_VOICE_PARTS.find((p) => p.value === row.voicePart)?.label ?? row.voicePart;
      const evt = CHOIR_ROSTER_EVENTS.find((e) => e.value === row.eventType)?.label ?? row.eventType;
      const msg = [
        `Choir roster reminder — ${unit.name}`,
        `${evt} · ${part}`,
        `When: ${row.startsAt.toLocaleString()}`,
      ].join('\n');
      await this.commQueue.enqueue(churchId, {
        kind: 'DIRECT_ALERT',
        title: 'Choir — rehearsal / ministration',
        body: msg,
        channels: ['IN_APP', 'EMAIL'],
        serviceUnitId,
        targetUserId: row.member.userId,
        targetMemberId: row.member.id,
      });
      sent += 1;
      await this.prisma.deptChoirRosterEntry.update({
        where: { id: row.id },
        data: { reminderSentAt: new Date() },
      });
    }
    return { remindersQueued: sent, rosterCount: rows.length };
  }

  async listSongs(userId: string, churchId: string, serviceUnitId: string) {
    await this.requireChoirUnit(userId, churchId, serviceUnitId);
    return this.prisma.deptChoirSong.findMany({
      where: { serviceUnitId },
      orderBy: { title: 'asc' },
    });
  }

  async upsertSong(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: {
      id?: string;
      title: string;
      musicalKey?: string;
      tempoBpm?: number;
      lyrics?: string;
      recordingUrl?: string;
      audioSampleUrl?: string;
      sheetUrl?: string;
      chordChart?: string;
      practiceTrackUrl?: string;
      notes?: string;
    },
  ) {
    await this.access.requireLead(userId, churchId, serviceUnitId);
    await this.requireChoirUnit(userId, churchId, serviceUnitId);
    const data = {
      title: body.title.trim(),
      musicalKey: body.musicalKey,
      tempoBpm: body.tempoBpm,
      lyrics: body.lyrics,
      recordingUrl: body.recordingUrl ?? body.audioSampleUrl,
      audioSampleUrl: body.audioSampleUrl,
      sheetUrl: body.sheetUrl,
      chordChart: body.chordChart,
      practiceTrackUrl: body.practiceTrackUrl,
      notes: body.notes,
    };
    if (body.id) {
      return this.prisma.deptChoirSong.update({ where: { id: body.id }, data });
    }
    return this.prisma.deptChoirSong.create({
      data: { churchId, serviceUnitId, ...data },
    });
  }

  async deleteSong(userId: string, churchId: string, serviceUnitId: string, songId: string) {
    await this.access.requireLead(userId, churchId, serviceUnitId);
    await this.requireChoirUnit(userId, churchId, serviceUnitId);
    const row = await this.prisma.deptChoirSong.findFirst({
      where: { id: songId, serviceUnitId },
    });
    if (!row) throw new NotFoundException('Song not found');
    await this.prisma.deptChoirSong.delete({ where: { id: songId } });
    return { ok: true };
  }

  async uploadSongAsset(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    file: Express.Multer.File,
    meta: { assetType: 'audio' | 'sheet' | 'practice'; songId?: string; title?: string },
  ) {
    await this.access.requireLead(userId, churchId, serviceUnitId);
    await this.requireChoirUnit(userId, churchId, serviceUnitId);
    const { url } = await this.uploads.saveDeptChoirAsset(
      churchId,
      serviceUnitId,
      file,
      meta.assetType,
    );
    const patch: Record<string, string> =
      meta.assetType === 'audio'
        ? { audioSampleUrl: url, recordingUrl: url }
        : meta.assetType === 'sheet'
          ? { sheetUrl: url }
          : { practiceTrackUrl: url };

    if (meta.songId) {
      const song = await this.prisma.deptChoirSong.findFirst({
        where: { id: meta.songId, serviceUnitId },
      });
      if (!song) throw new NotFoundException('Song not found');
      return this.prisma.deptChoirSong.update({
        where: { id: meta.songId },
        data: patch,
      });
    }

    if (meta.title?.trim()) {
      return this.upsertSong(userId, churchId, serviceUnitId, {
        title: meta.title.trim(),
        ...patch,
      });
    }

    return { url, ...patch };
  }

  async transposeSong(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    songId: string,
    body: { semitones: number; updateChordChart?: boolean },
  ) {
    await this.access.requireParticipate(userId, churchId, serviceUnitId);
    await this.requireChoirUnit(userId, churchId, serviceUnitId);
    const song = await this.prisma.deptChoirSong.findFirst({
      where: { id: songId, serviceUnitId },
    });
    if (!song) throw new NotFoundException('Song not found');
    const newKey = song.musicalKey
      ? transposeMusicalKey(song.musicalKey, body.semitones)
      : null;
    const newChart =
      body.updateChordChart && song.chordChart
        ? transposeChordChart(song.chordChart, body.semitones)
        : song.chordChart;
    return this.prisma.deptChoirSong.update({
      where: { id: songId },
      data: {
        musicalKey: newKey ?? undefined,
        chordChart: newChart ?? undefined,
      },
    });
  }

  async listSetlists(userId: string, churchId: string, serviceUnitId: string) {
    await this.requireChoirUnit(userId, churchId, serviceUnitId);
    return this.prisma.deptChoirSetlist.findMany({
      where: { serviceUnitId },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: { song: true },
        },
        _count: { select: { feedback: true } },
      },
      orderBy: { serviceDate: 'desc' },
    });
  }

  async createSetlist(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: { title: string; serviceDate: string; notes?: string },
  ) {
    await this.access.requireLead(userId, churchId, serviceUnitId);
    return this.prisma.deptChoirSetlist.create({
      data: {
        churchId,
        serviceUnitId,
        title: body.title.trim(),
        serviceDate: new Date(body.serviceDate),
        notes: body.notes,
      },
      include: { items: { include: { song: true } } },
    });
  }

  async addSetlistItem(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    setlistId: string,
    body: { songId: string; sortOrder?: number; musicalKey?: string; tempoBpm?: number; notes?: string },
  ) {
    await this.access.requireLead(userId, churchId, serviceUnitId);
    const setlist = await this.prisma.deptChoirSetlist.findFirst({
      where: { id: setlistId, serviceUnitId },
    });
    if (!setlist) throw new NotFoundException('Setlist not found');
    const song = await this.prisma.deptChoirSong.findFirst({
      where: { id: body.songId, serviceUnitId },
    });
    if (!song) throw new NotFoundException('Song not found');
    return this.prisma.deptChoirSetlistItem.upsert({
      where: { setlistId_songId: { setlistId, songId: body.songId } },
      create: {
        setlistId,
        songId: body.songId,
        sortOrder: body.sortOrder ?? 0,
        musicalKey: body.musicalKey ?? song.musicalKey,
        tempoBpm: body.tempoBpm ?? song.tempoBpm,
        notes: body.notes,
      },
      update: {
        sortOrder: body.sortOrder,
        musicalKey: body.musicalKey,
        tempoBpm: body.tempoBpm,
        notes: body.notes,
      },
      include: { song: true },
    });
  }

  async addSongFeedback(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: {
      songId: string;
      setlistId?: string;
      rating?: number;
      difficultyScore?: number;
      comment?: string;
    },
  ) {
    const { ctx } = await this.access.requireParticipate(userId, churchId, serviceUnitId);
    if (!ctx.memberId) throw new BadRequestException('Member profile required to vote');
    return this.prisma.deptChoirSongFeedback.create({
      data: {
        churchId,
        serviceUnitId,
        songId: body.songId,
        setlistId: body.setlistId,
        memberId: ctx.memberId,
        rating: body.rating,
        difficultyScore: body.difficultyScore,
        comment: body.comment,
      },
      include: { member: { select: memberSelect }, song: { select: { id: true, title: true } } },
    });
  }

  async listAttendance(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    query?: { from?: string; to?: string },
  ) {
    await this.requireChoirUnit(userId, churchId, serviceUnitId);
    const where: Prisma.DeptChoirAttendanceWhereInput = { serviceUnitId };
    if (query?.from || query?.to) {
      where.eventDate = {};
      if (query.from) where.eventDate.gte = new Date(query.from);
      if (query.to) where.eventDate.lte = new Date(query.to);
    }
    const rows = await this.prisma.deptChoirAttendance.findMany({
      where,
      include: { member: { select: memberSelect } },
      orderBy: { eventDate: 'desc' },
    });
    const metrics = {
      total: rows.length,
      attended: rows.filter((r) => r.attended).length,
      late: rows.filter((r) => r.minutesLate > 0).length,
      avgMinutesLate:
        rows.length > 0
          ? Math.round(rows.reduce((s, r) => s + r.minutesLate, 0) / rows.length)
          : 0,
    };
    return { records: rows, metrics };
  }

  async upsertAttendance(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: {
      id?: string;
      eventType: string;
      eventDate: string;
      memberId?: string;
      attended?: boolean;
      arrivedAt?: string;
      minutesLate?: number;
      notes?: string;
    },
  ) {
    await this.access.requireLead(userId, churchId, serviceUnitId);
    const eventDate = new Date(body.eventDate);
    if (body.id) {
      const row = await this.prisma.deptChoirAttendance.findFirst({
        where: { id: body.id, serviceUnitId },
      });
      if (!row) throw new NotFoundException('Attendance record not found');
      return this.prisma.deptChoirAttendance.update({
        where: { id: body.id },
        data: {
          eventType: body.eventType as never,
          eventDate,
          ...(body.memberId ? { memberId: body.memberId } : {}),
          attended: body.attended,
          arrivedAt: body.arrivedAt ? new Date(body.arrivedAt) : undefined,
          minutesLate: body.minutesLate,
          notes: body.notes,
        },
        include: { member: { select: memberSelect } },
      });
    }
    if (!body.memberId) {
      throw new BadRequestException('memberId is required');
    }
    return this.prisma.deptChoirAttendance.upsert({
      where: {
        serviceUnitId_eventType_eventDate_memberId: {
          serviceUnitId,
          eventType: body.eventType as never,
          eventDate,
          memberId: body.memberId,
        },
      },
      create: {
        churchId,
        serviceUnitId,
        eventType: body.eventType as never,
        eventDate,
        memberId: body.memberId,
        attended: body.attended ?? true,
        arrivedAt: body.arrivedAt ? new Date(body.arrivedAt) : null,
        minutesLate: body.minutesLate ?? 0,
        notes: body.notes,
      },
      update: {
        attended: body.attended,
        arrivedAt: body.arrivedAt ? new Date(body.arrivedAt) : undefined,
        minutesLate: body.minutesLate,
        notes: body.notes,
      },
      include: { member: { select: memberSelect } },
    });
  }

  async bulkUpsertAttendance(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: {
      eventType: string;
      eventDate: string;
      memberIds: string[];
      attended?: boolean;
      minutesLate?: number;
      notes?: string;
    },
  ) {
    await this.access.requireLead(userId, churchId, serviceUnitId);
    if (!body.memberIds?.length) {
      throw new BadRequestException('Select at least one member');
    }
    const records = [];
    for (const memberId of body.memberIds) {
      records.push(
        await this.upsertAttendance(userId, churchId, serviceUnitId, {
          eventType: body.eventType,
          eventDate: body.eventDate,
          memberId,
          attended: body.attended,
          minutesLate: body.minutesLate,
          notes: body.notes,
        }),
      );
    }
    return { saved: records.length, records };
  }

  async deleteAttendance(userId: string, churchId: string, serviceUnitId: string, id: string) {
    await this.access.requireLead(userId, churchId, serviceUnitId);
    const row = await this.prisma.deptChoirAttendance.findFirst({
      where: { id, serviceUnitId },
    });
    if (!row) throw new NotFoundException('Attendance record not found');
    await this.prisma.deptChoirAttendance.delete({ where: { id } });
    return { ok: true };
  }

  async sendAttendanceFollowUps(userId: string, churchId: string, serviceUnitId: string) {
    await this.access.requireManage(userId, churchId, serviceUnitId);
    const rows = await this.prisma.deptChoirAttendance.findMany({
      where: {
        serviceUnitId,
        followUpSentAt: null,
        OR: [{ attended: false }, { minutesLate: { gte: 15 } }],
      },
      include: { member: { select: memberSelect } },
      take: 50,
    });
    let sent = 0;
    for (const row of rows) {
      if (!row.member.userId) continue;
      const reason = row.attended
        ? `You were ${row.minutesLate} minutes late`
        : 'You were marked absent';
      await this.commQueue.enqueue(churchId, {
        kind: 'DIRECT_ALERT',
        title: 'Choir — attendance follow-up',
        body: `${reason} for ${row.eventType.replace('_', ' ').toLowerCase()}. Please connect with your section leader.`,
        channels: ['IN_APP', 'EMAIL'],
        serviceUnitId,
        targetUserId: row.member.userId,
      });
      await this.prisma.deptChoirAttendance.update({
        where: { id: row.id },
        data: { followUpSentAt: new Date() },
      });
      sent += 1;
    }
    return { followUpsQueued: sent };
  }

  async listAuditions(userId: string, churchId: string, serviceUnitId: string) {
    await this.requireChoirUnit(userId, churchId, serviceUnitId);
    return this.prisma.deptChoirAudition.findMany({
      where: { serviceUnitId },
      include: { member: { select: memberSelect } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async upsertAudition(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: {
      id?: string;
      memberId: string;
      status?: string;
      voicePart?: string;
      auditionDate?: string;
      notes?: string;
      recordingUrl?: string;
    },
  ) {
    await this.access.requireLead(userId, churchId, serviceUnitId);
    const data = {
      memberId: body.memberId,
      status: (body.status ?? 'SCHEDULED') as never,
      voicePart: body.voicePart as never,
      auditionDate: body.auditionDate ? new Date(body.auditionDate) : null,
      notes: body.notes,
      recordingUrl: body.recordingUrl,
    };
    if (body.id) {
      return this.prisma.deptChoirAudition.update({
        where: { id: body.id },
        data,
        include: { member: { select: memberSelect } },
      });
    }
    return this.prisma.deptChoirAudition.create({
      data: { churchId, serviceUnitId, ...data },
      include: { member: { select: memberSelect } },
    });
  }

  async deleteAudition(userId: string, churchId: string, serviceUnitId: string, id: string) {
    await this.access.requireLead(userId, churchId, serviceUnitId);
    const row = await this.prisma.deptChoirAudition.findFirst({
      where: { id, serviceUnitId },
    });
    if (!row) throw new NotFoundException('Audition not found');
    await this.prisma.deptChoirAudition.delete({ where: { id } });
    return { ok: true };
  }

  async uploadAuditionRecording(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    file: Express.Multer.File,
    meta?: { auditionId?: string; memberId?: string },
  ) {
    await this.access.requireLead(userId, churchId, serviceUnitId);
    await this.requireChoirUnit(userId, churchId, serviceUnitId);
    const { url } = await this.uploads.saveDeptChoirAsset(
      churchId,
      serviceUnitId,
      file,
      'audio',
    );
    if (meta?.auditionId) {
      const row = await this.prisma.deptChoirAudition.findFirst({
        where: { id: meta.auditionId, serviceUnitId },
      });
      if (!row) throw new NotFoundException('Audition not found');
      return this.prisma.deptChoirAudition.update({
        where: { id: meta.auditionId },
        data: { recordingUrl: url },
        include: { member: { select: memberSelect } },
      });
    }
    return { recordingUrl: url };
  }

  async listVoiceTasks(userId: string, churchId: string, serviceUnitId: string) {
    await this.requireChoirUnit(userId, churchId, serviceUnitId);
    return this.prisma.deptChoirVoiceTask.findMany({
      where: { serviceUnitId },
      include: { member: { select: memberSelect } },
      orderBy: [{ completedAt: 'asc' }, { dueDate: 'asc' }],
    });
  }

  async upsertVoiceTask(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: {
      id?: string;
      memberId: string;
      title: string;
      description?: string;
      dueDate?: string;
      completed?: boolean;
    },
  ) {
    await this.access.requireLead(userId, churchId, serviceUnitId);
    const data = {
      memberId: body.memberId,
      title: body.title.trim(),
      description: body.description,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      completedAt: body.completed ? new Date() : null,
    };
    if (body.id) {
      return this.prisma.deptChoirVoiceTask.update({
        where: { id: body.id },
        data,
        include: { member: { select: memberSelect } },
      });
    }
    return this.prisma.deptChoirVoiceTask.create({
      data: { churchId, serviceUnitId, ...data },
      include: { member: { select: memberSelect } },
    });
  }

  async deleteVoiceTask(userId: string, churchId: string, serviceUnitId: string, id: string) {
    await this.access.requireLead(userId, churchId, serviceUnitId);
    const row = await this.prisma.deptChoirVoiceTask.findFirst({
      where: { id, serviceUnitId },
    });
    if (!row) throw new NotFoundException('Voice task not found');
    await this.prisma.deptChoirVoiceTask.delete({ where: { id } });
    return { ok: true };
  }

  async listVocalNotes(userId: string, churchId: string, serviceUnitId: string) {
    await this.requireChoirUnit(userId, churchId, serviceUnitId);
    return this.prisma.deptChoirVocalNote.findMany({
      where: { serviceUnitId },
      include: {
        member: { select: memberSelect },
        author: { select: memberSelect },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createVocalNote(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: { memberId: string; body: string; improvementTag?: string },
  ) {
    await this.access.requireLead(userId, churchId, serviceUnitId);
    const { ctx } = await this.access.requireView(userId, churchId, serviceUnitId);
    if (!ctx.memberId) throw new BadRequestException('Author member required');
    return this.prisma.deptChoirVocalNote.create({
      data: {
        churchId,
        serviceUnitId,
        memberId: body.memberId,
        authorId: ctx.memberId,
        body: body.body.trim(),
        improvementTag: body.improvementTag,
      },
      include: {
        member: { select: memberSelect },
        author: { select: memberSelect },
      },
    });
  }

  async deleteVocalNote(userId: string, churchId: string, serviceUnitId: string, id: string) {
    await this.access.requireLead(userId, churchId, serviceUnitId);
    const row = await this.prisma.deptChoirVocalNote.findFirst({
      where: { id, serviceUnitId },
    });
    if (!row) throw new NotFoundException('Vocal note not found');
    await this.prisma.deptChoirVocalNote.delete({ where: { id } });
    return { ok: true };
  }
}
