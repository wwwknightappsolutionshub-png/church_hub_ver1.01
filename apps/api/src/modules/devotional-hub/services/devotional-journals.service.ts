import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DevotionalGroupMemberRole, DevotionalJournalVisibility, Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.module';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../devotional-hub.constants';
import {
  exportJournalMarkdown,
  JOURNAL_RECAP_PROMPTS,
  JOURNAL_REACTION_EMOJIS,
  JournalCommentTreeNode,
  memberDisplayName,
  parseJsonArray,
} from '../devotional-journal.util';
import {
  CreateJournalCommentDto,
  CreateJournalDto,
  UpdateJournalDto,
} from '../dto/journal.dto';

const ADMIN_ROLES: DevotionalGroupMemberRole[] = ['ADMIN', 'CO_ADMIN'];

@Injectable()
export class DevotionalJournalsService {
  constructor(private readonly prisma: PrismaService) {}

  recapPrompts() {
    return JOURNAL_RECAP_PROMPTS;
  }

  reactionEmojis() {
    return JOURNAL_REACTION_EMOJIS;
  }

  private async resolveMember(churchId: string, userId: string) {
    const member = await this.prisma.member.findFirst({
      where: { churchId, userId },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });
    if (!member) throw new BadRequestException('Member profile required');
    return member;
  }

  private entryInclude() {
    return {
      member: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      },
      lastEditedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      },
      pinnedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      },
      group: { select: { id: true, name: true } },
      plan: { select: { id: true, title: true } },
      day: { select: { id: true, dayNumber: true, title: true } },
      reactions: {
        include: {
          member: {
            include: { user: { select: { firstName: true, lastName: true, email: true } } },
          },
        },
      },
      comments: {
        include: {
          member: {
            include: { user: { select: { firstName: true, lastName: true, email: true } } },
          },
        },
        orderBy: { createdAt: 'asc' as const },
      },
    };
  }

  private serializeEntry(
    entry: Prisma.DevotionalJournalEntryGetPayload<{ include: ReturnType<DevotionalJournalsService['entryInclude']> }>,
    viewerMemberId: string,
  ) {
    const moods = parseJsonArray<string>(entry.moods);
    const scriptureRefs = parseJsonArray(entry.scriptureRefs);
    const attachments = parseJsonArray(entry.attachments);

    const reactionMap = new Map<string, { emoji: string; count: number; mine: boolean }>();
    for (const r of entry.reactions) {
      const cur = reactionMap.get(r.emoji) ?? { emoji: r.emoji, count: 0, mine: false };
      cur.count += 1;
      if (r.memberId === viewerMemberId) cur.mine = true;
      reactionMap.set(r.emoji, cur);
    }

    const comments = this.buildCommentTree(entry.comments);

    return {
      id: entry.id,
      churchId: entry.churchId,
      memberId: entry.memberId,
      authorName: memberDisplayName(entry.member),
      planId: entry.planId,
      dayId: entry.dayId,
      groupId: entry.groupId,
      visibility: entry.visibility,
      title: entry.title,
      body: entry.body,
      contentFormat: entry.contentFormat,
      moods,
      scriptureRefs,
      attachments,
      voiceNoteUrl: entry.voiceNoteUrl,
      voiceTranscript: entry.voiceTranscript,
      recapPromptId: entry.recapPromptId,
      recapPrompt: JOURNAL_RECAP_PROMPTS.find((p) => p.id === entry.recapPromptId)?.text ?? null,
      isPinned: entry.isPinned,
      pinnedAt: entry.pinnedAt?.toISOString() ?? null,
      pinnedByName: entry.pinnedBy ? memberDisplayName(entry.pinnedBy) : null,
      lastEditedByName: entry.lastEditedBy ? memberDisplayName(entry.lastEditedBy) : null,
      shareToken: entry.shareToken,
      group: entry.group,
      plan: entry.plan,
      day: entry.day,
      reactions: [...reactionMap.values()],
      comments,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      canEdit: this.canEditEntry(entry, viewerMemberId),
    };
  }

  private buildCommentTree(
    comments: Array<{
      id: string;
      entryId: string;
      memberId: string;
      parentId: string | null;
      body: string;
      createdAt: Date;
      updatedAt: Date;
      member: {
        firstName: string;
        lastName: string;
        email: string | null;
        user: { firstName: string | null; lastName: string | null; email: string } | null;
      };
    }>,
  ) {
    const byId = new Map<string, JournalCommentTreeNode>();
    const roots: JournalCommentTreeNode[] = [];

    for (const c of comments) {
      byId.set(c.id, {
        id: c.id,
        memberId: c.memberId,
        authorName: memberDisplayName(c.member),
        parentId: c.parentId,
        body: c.body,
        createdAt: c.createdAt.toISOString(),
        replies: [],
      });
    }
    for (const c of comments) {
      const node = byId.get(c.id)!;
      if (c.parentId && byId.has(c.parentId)) {
        byId.get(c.parentId)!.replies.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  private canEditEntry(
    entry: { memberId: string; visibility: DevotionalJournalVisibility; groupId: string | null },
    memberId: string,
  ) {
    if (entry.memberId === memberId) return true;
    return entry.visibility === 'GROUP' && !!entry.groupId;
  }

  private async assertGroupAccess(groupId: string, memberId: string) {
    const m = await this.prisma.devotionalGroupMember.findUnique({
      where: { groupId_memberId: { groupId, memberId } },
    });
    if (!m || m.status !== 'ACTIVE') {
      throw new ForbiddenException('Active group membership required');
    }
    return m;
  }

  private async assertGroupAdmin(groupId: string, memberId: string) {
    const m = await this.assertGroupAccess(groupId, memberId);
    if (!ADMIN_ROLES.includes(m.role)) {
      throw new ForbiddenException('Admin or co-admin access required');
    }
    return m;
  }

  private async loadEntry(churchId: string, entryId: string) {
    const entry = await this.prisma.devotionalJournalEntry.findFirst({
      where: { id: entryId, churchId },
      include: this.entryInclude(),
    });
    if (!entry) throw new NotFoundException('Journal entry not found');
    return entry;
  }

  private async assertCanView(
    entry: { memberId: string; visibility: DevotionalJournalVisibility; groupId: string | null },
    viewerId: string,
  ) {
    if (entry.memberId === viewerId) return;
    if (entry.visibility === 'GROUP' && entry.groupId) {
      await this.assertGroupAccess(entry.groupId, viewerId);
      return;
    }
    throw new ForbiddenException('You cannot view this journal entry');
  }

  private async assertCanEdit(
    entry: { memberId: string; visibility: DevotionalJournalVisibility; groupId: string | null },
    editorId: string,
  ) {
    if (entry.memberId === editorId) return;
    if (entry.visibility === 'GROUP' && entry.groupId) {
      await this.assertGroupAccess(entry.groupId, editorId);
      return;
    }
    throw new ForbiddenException('You cannot edit this journal entry');
  }

  async listPrivate(churchId: string, userId: string, page = 1, limit = DEFAULT_PAGE_SIZE) {
    const member = await this.resolveMember(churchId, userId);
    const take = Math.min(limit, MAX_PAGE_SIZE);
    const where = { memberId: member.id, visibility: 'PRIVATE' as const };
    const [total, rows] = await Promise.all([
      this.prisma.devotionalJournalEntry.count({ where }),
      this.prisma.devotionalJournalEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * take,
        take,
        include: {
          group: { select: { id: true, name: true } },
          reactions: true,
        },
      }),
    ]);
    return {
      items: rows.map((e) => ({
        id: e.id,
        title: e.title,
        preview: (e.body ?? '').slice(0, 160),
        moods: parseJsonArray<string>(e.moods),
        visibility: e.visibility,
        createdAt: e.createdAt.toISOString(),
        reactionCount: e.reactions.length,
      })),
      page,
      limit: take,
      total,
      totalPages: Math.ceil(total / take) || 1,
    };
  }

  async listGroup(churchId: string, userId: string, groupId: string, page = 1, limit = DEFAULT_PAGE_SIZE) {
    const member = await this.resolveMember(churchId, userId);
    await this.assertGroupAccess(groupId, member.id);
    const take = Math.min(limit, MAX_PAGE_SIZE);
    const where = { churchId, groupId, visibility: 'GROUP' as const };
    const [total, rows] = await Promise.all([
      this.prisma.devotionalJournalEntry.count({ where }),
      this.prisma.devotionalJournalEntry.findMany({
        where,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * take,
        take,
        include: {
          member: {
            include: { user: { select: { firstName: true, lastName: true, email: true } } },
          },
          reactions: true,
        },
      }),
    ]);
    return {
      items: rows.map((e) => ({
        id: e.id,
        title: e.title,
        preview: (e.body ?? '').slice(0, 160),
        authorName: memberDisplayName(e.member),
        moods: parseJsonArray<string>(e.moods),
        isPinned: e.isPinned,
        createdAt: e.createdAt.toISOString(),
        reactionCount: e.reactions.length,
      })),
      page,
      limit: take,
      total,
      totalPages: Math.ceil(total / take) || 1,
    };
  }

  async getOne(churchId: string, userId: string, entryId: string) {
    const member = await this.resolveMember(churchId, userId);
    const entry = await this.loadEntry(churchId, entryId);
    await this.assertCanView(entry, member.id);
    return this.serializeEntry(entry, member.id);
  }

  async getByShareToken(churchId: string, userId: string, token: string) {
    const member = await this.resolveMember(churchId, userId);
    const entry = await this.prisma.devotionalJournalEntry.findFirst({
      where: {
        churchId,
        shareToken: token,
        OR: [{ shareExpiresAt: null }, { shareExpiresAt: { gt: new Date() } }],
      },
      include: this.entryInclude(),
    });
    if (!entry) throw new NotFoundException('Shared journal not found or expired');
    await this.assertCanView(entry, member.id);
    return this.serializeEntry(entry, member.id);
  }

  async create(churchId: string, userId: string, data: CreateJournalDto) {
    const member = await this.resolveMember(churchId, userId);
    if (!data.body?.trim()) throw new BadRequestException('Journal body is required');

    const visibility = data.visibility ?? 'PRIVATE';
    if (visibility === 'GROUP') {
      if (!data.groupId) throw new BadRequestException('Group id required for team journals');
      await this.assertGroupAccess(data.groupId, member.id);
    } else if (data.groupId) {
      throw new BadRequestException('groupId only allowed for team (GROUP) journals');
    }

    const row = await this.prisma.devotionalJournalEntry.create({
      data: {
        churchId,
        memberId: member.id,
        planId: data.planId,
        dayId: data.dayId,
        groupId: visibility === 'GROUP' ? data.groupId : null,
        visibility,
        title: data.title?.trim(),
        body: data.body.trim(),
        contentFormat: 'html',
        moods: (data.moods ?? []) as Prisma.InputJsonValue,
        scriptureRefs: (data.scriptureRefs ?? []) as unknown as Prisma.InputJsonValue,
        attachments: (data.attachments ?? []) as unknown as Prisma.InputJsonValue,
        voiceNoteUrl: data.voiceNoteUrl,
        voiceTranscript: data.voiceTranscript?.trim(),
        recapPromptId: data.recapPromptId,
        lastEditedById: member.id,
      },
      include: this.entryInclude(),
    });
    return this.serializeEntry(row, member.id);
  }

  async update(churchId: string, userId: string, entryId: string, data: UpdateJournalDto) {
    const member = await this.resolveMember(churchId, userId);
    const existing = await this.loadEntry(churchId, entryId);
    await this.assertCanEdit(existing, member.id);

    const row = await this.prisma.devotionalJournalEntry.update({
      where: { id: entryId },
      data: {
        title: data.title !== undefined ? data.title?.trim() : undefined,
        body: data.body?.trim(),
        moods: data.moods !== undefined ? (data.moods as Prisma.InputJsonValue) : undefined,
        scriptureRefs:
          data.scriptureRefs !== undefined
            ? (data.scriptureRefs as unknown as Prisma.InputJsonValue)
            : undefined,
        attachments:
          data.attachments !== undefined
            ? (data.attachments as unknown as Prisma.InputJsonValue)
            : undefined,
        voiceNoteUrl: data.voiceNoteUrl,
        voiceTranscript: data.voiceTranscript?.trim(),
        recapPromptId: data.recapPromptId,
        lastEditedById: member.id,
      },
      include: this.entryInclude(),
    });
    return this.serializeEntry(row, member.id);
  }

  async remove(churchId: string, userId: string, entryId: string) {
    const member = await this.resolveMember(churchId, userId);
    const existing = await this.prisma.devotionalJournalEntry.findFirst({
      where: { id: entryId, churchId },
    });
    if (!existing) throw new NotFoundException('Journal entry not found');

    if (existing.memberId !== member.id) {
      if (existing.groupId) await this.assertGroupAdmin(existing.groupId, member.id);
      else throw new ForbiddenException('Only the author can delete this entry');
    }

    await this.prisma.devotionalJournalEntry.delete({ where: { id: entryId } });
    return { ok: true };
  }

  async addComment(churchId: string, userId: string, entryId: string, data: CreateJournalCommentDto) {
    const member = await this.resolveMember(churchId, userId);
    const entry = await this.prisma.devotionalJournalEntry.findFirst({
      where: { id: entryId, churchId },
    });
    if (!entry) throw new NotFoundException('Journal entry not found');
    if (entry.visibility !== 'GROUP') {
      throw new BadRequestException('Comments are only available on team journals');
    }
    await this.assertGroupAccess(entry.groupId!, member.id);

    if (data.parentId) {
      const parent = await this.prisma.devotionalJournalComment.findFirst({
        where: { id: data.parentId, entryId },
      });
      if (!parent) throw new BadRequestException('Parent comment not found');
    }

    const comment = await this.prisma.devotionalJournalComment.create({
      data: {
        entryId,
        memberId: member.id,
        parentId: data.parentId,
        body: data.body.trim(),
      },
      include: {
        member: {
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
        },
      },
    });

    return {
      id: comment.id,
      memberId: comment.memberId,
      authorName: memberDisplayName(comment.member),
      parentId: comment.parentId,
      body: comment.body,
      createdAt: comment.createdAt.toISOString(),
      replies: [],
    };
  }

  async removeComment(churchId: string, userId: string, commentId: string) {
    const member = await this.resolveMember(churchId, userId);
    const comment = await this.prisma.devotionalJournalComment.findFirst({
      where: { id: commentId },
      include: { entry: true },
    });
    if (!comment || comment.entry.churchId !== churchId) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.memberId !== member.id) {
      if (comment.entry.groupId) await this.assertGroupAdmin(comment.entry.groupId, member.id);
      else throw new ForbiddenException('Cannot delete this comment');
    }
    await this.prisma.devotionalJournalComment.delete({ where: { id: commentId } });
    return { ok: true };
  }

  async toggleReaction(churchId: string, userId: string, entryId: string, emoji: string) {
    const member = await this.resolveMember(churchId, userId);
    const entry = await this.prisma.devotionalJournalEntry.findFirst({
      where: { id: entryId, churchId },
    });
    if (!entry) throw new NotFoundException('Journal entry not found');
    await this.assertCanView(entry, member.id);

    if (!JOURNAL_REACTION_EMOJIS.includes(emoji as (typeof JOURNAL_REACTION_EMOJIS)[number])) {
      throw new BadRequestException('Emoji not allowed');
    }

    const existing = await this.prisma.devotionalJournalReaction.findUnique({
      where: { entryId_memberId_emoji: { entryId, memberId: member.id, emoji } },
    });
    if (existing) {
      await this.prisma.devotionalJournalReaction.delete({ where: { id: existing.id } });
      return { added: false, emoji };
    }
    await this.prisma.devotionalJournalReaction.create({
      data: { entryId, memberId: member.id, emoji },
    });
    return { added: true, emoji };
  }

  async setPinned(churchId: string, userId: string, entryId: string, pinned: boolean) {
    const member = await this.resolveMember(churchId, userId);
    const entry = await this.prisma.devotionalJournalEntry.findFirst({
      where: { id: entryId, churchId, visibility: 'GROUP' },
    });
    if (!entry?.groupId) throw new BadRequestException('Only team journals can be pinned');
    await this.assertGroupAdmin(entry.groupId, member.id);

    const row = await this.prisma.devotionalJournalEntry.update({
      where: { id: entryId },
      data: pinned
        ? { isPinned: true, pinnedAt: new Date(), pinnedById: member.id }
        : { isPinned: false, pinnedAt: null, pinnedById: null },
      include: this.entryInclude(),
    });
    return this.serializeEntry(row, member.id);
  }

  async exportEntry(churchId: string, userId: string, entryId: string, format: 'markdown' | 'text') {
    const member = await this.resolveMember(churchId, userId);
    const entry = await this.loadEntry(churchId, entryId);
    await this.assertCanView(entry, member.id);
    const markdown = exportJournalMarkdown(entry);
    if (format === 'markdown') return { format, content: markdown };
    return { format: 'text', content: markdown };
  }

  async createShareLink(churchId: string, userId: string, entryId: string, expiresInDays = 14) {
    const member = await this.resolveMember(churchId, userId);
    const entry = await this.prisma.devotionalJournalEntry.findFirst({
      where: { id: entryId, churchId },
    });
    if (!entry) throw new NotFoundException('Journal entry not found');
    await this.assertCanView(entry, member.id);

    const token = entry.shareToken ?? randomBytes(18).toString('hex');
    const shareExpiresAt = new Date();
    shareExpiresAt.setDate(shareExpiresAt.getDate() + expiresInDays);

    await this.prisma.devotionalJournalEntry.update({
      where: { id: entryId },
      data: { shareToken: token, shareExpiresAt },
    });

    return {
      shareToken: token,
      shareExpiresAt: shareExpiresAt.toISOString(),
      path: `/dashboard/devotional-hub/journal/share/${token}`,
    };
  }

  /** @deprecated use listPrivate */
  async listMine(churchId: string, userId: string, page = 1, limit = DEFAULT_PAGE_SIZE) {
    return this.listPrivate(churchId, userId, page, limit);
  }
}
