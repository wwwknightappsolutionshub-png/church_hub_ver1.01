import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ContentReportStatus,
  Prisma,
  YouthPointSource,
  YouthPostStatus,
  YouthReactionTarget,
  YouthReactionType,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.module';
import { RedisCacheService } from '../../../common/cache/redis-cache.service';
import { YouthAccessService } from '../common/youth-access.service';
import { YouthGamificationService } from '../gamification/gamification.service';
import {
  computeEngagementScore,
  extractHashtags,
  scanYouthContent,
} from '../common/moderation.util';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const postInclude = {
  author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  youthGroup: { select: { id: true, name: true } },
  media: { orderBy: { sortOrder: 'asc' as const } },
  reactions: { select: { reactionType: true, memberId: true } },
} satisfies Prisma.YouthPostInclude;

type PostRow = Prisma.YouthPostGetPayload<{ include: typeof postInclude }>;

interface FeedCursor {
  sort: 'recent' | 'top';
  createdAt: string;
  id: string;
  engagementScore?: number;
}

@Injectable()
export class YouthFeedService {
  static readonly MODULE_KEY = 'youth/feed' as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gamification: YouthGamificationService,
    private readonly cache: RedisCacheService,
    private readonly access: YouthAccessService,
  ) {}

  private feedCachePrefix(churchId: string) {
    return `youth:feed:${churchId}:`;
  }

  // ─── Helpers ───────────────────────────────────────────────

  private async requireMember(churchId: string, userId: string) {
    const member = await this.prisma.member.findFirst({
      where: { churchId, userId },
      select: { id: true, firstName: true, lastName: true, avatarUrl: true },
    });
    if (!member) {
      throw new BadRequestException(
        'Link your account to a member profile to use the youth feed',
      );
    }
    return member;
  }

  private encodeCursor(cursor: FeedCursor): string {
    return Buffer.from(JSON.stringify(cursor)).toString('base64url');
  }

  private decodeCursor(raw?: string): FeedCursor | null {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as FeedCursor;
      if (!parsed?.id || !parsed?.createdAt) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  private reactionSummary(
    reactions: { reactionType: YouthReactionType; memberId: string }[],
    memberId?: string,
  ) {
    const summary: Partial<Record<YouthReactionType, number>> = {};
    const myReactions: YouthReactionType[] = [];
    for (const r of reactions) {
      summary[r.reactionType] = (summary[r.reactionType] ?? 0) + 1;
      if (memberId && r.memberId === memberId) myReactions.push(r.reactionType);
    }
    return { reactionSummary: summary, myReactions };
  }

  private serializePost(row: PostRow, viewerMemberId?: string) {
    const { reactionSummary, myReactions } = this.reactionSummary(
      row.reactions,
      viewerMemberId,
    );
    const { reactions: _r, ...rest } = row;
    return {
      ...rest,
      reactionSummary,
      myReactions,
    };
  }

  private async refreshPostEngagement(postId: string) {
    const post = await this.prisma.youthPost.findUnique({
      where: { id: postId },
      select: { createdAt: true, shareCount: true },
    });
    if (!post) return;

    const [reactionCount, commentCount] = await Promise.all([
      this.prisma.youthReaction.count({
        where: { postId, targetType: YouthReactionTarget.POST },
      }),
      this.prisma.youthComment.count({ where: { postId } }),
    ]);

    const likeCount = await this.prisma.youthReaction.count({
      where: {
        postId,
        targetType: YouthReactionTarget.POST,
        reactionType: { not: YouthReactionType.SAVE },
      },
    });

    const ageHours =
      (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60);
    const engagementScore = computeEngagementScore(
      likeCount,
      commentCount,
      post.shareCount,
      ageHours,
    );

    await this.prisma.youthPost.update({
      where: { id: postId },
      data: { reactionCount, commentCount, engagementScore },
    });
  }

  private async refreshCommentEngagement(commentId: string) {
    const count = await this.prisma.youthReaction.count({
      where: { commentId, targetType: YouthReactionTarget.COMMENT },
    });
    await this.prisma.youthComment.update({
      where: { id: commentId },
      data: { reactionCount: count },
    });
  }

  private async getPostOrThrow(churchId: string, postId: string) {
    const post = await this.prisma.youthPost.findFirst({
      where: { id: postId, churchId },
      include: postInclude,
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  private visibleStatuses(moderator: boolean): YouthPostStatus[] {
    return moderator
      ? [YouthPostStatus.PUBLISHED, YouthPostStatus.FLAGGED, YouthPostStatus.HIDDEN]
      : [YouthPostStatus.PUBLISHED];
  }

  // ─── Feed algorithm (cursor pagination) ───────────────────

  async listFeed(
    churchId: string,
    userId: string,
    opts: {
      youthGroupId?: string;
      sort?: 'recent' | 'top';
      cursor?: string;
      limit?: number;
      moderator?: boolean;
    },
  ) {
    const member = await this.requireMember(churchId, userId);
    const sort = opts.sort ?? 'recent';
    const limit = Math.min(Math.max(opts.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const cursor = this.decodeCursor(opts.cursor);
    const statuses = this.visibleStatuses(!!opts.moderator);

    if (!opts.cursor && !opts.moderator) {
      const cacheKey = `${this.feedCachePrefix(churchId)}${sort}:${opts.youthGroupId ?? 'all'}:${limit}`;
      const cached = await this.cache.get<{ items: unknown[]; nextCursor: string | null }>(
        cacheKey,
      );
      if (cached) return cached;
    }

    const where: Prisma.YouthPostWhereInput = {
      churchId,
      status: { in: statuses },
      ...(opts.youthGroupId ? { youthGroupId: opts.youthGroupId } : {}),
    };

    if (cursor && cursor.sort === sort) {
      const createdAt = new Date(cursor.createdAt);
      if (sort === 'top' && cursor.engagementScore != null) {
        where.OR = [
          { engagementScore: { lt: cursor.engagementScore } },
          {
            engagementScore: cursor.engagementScore,
            createdAt: { lt: createdAt },
          },
          {
            engagementScore: cursor.engagementScore,
            createdAt,
            id: { lt: cursor.id },
          },
        ];
      } else {
        where.OR = [
          { createdAt: { lt: createdAt } },
          { createdAt, id: { lt: cursor.id } },
        ];
      }
    }

    const orderBy: Prisma.YouthPostOrderByWithRelationInput[] =
      sort === 'top'
        ? [{ engagementScore: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }]
        : [{ createdAt: 'desc' }, { id: 'desc' }];

    const rows = await this.prisma.youthPost.findMany({
      where,
      include: postInclude,
      orderBy,
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map((r) => this.serializePost(r, member.id));
    const last = rows[Math.min(limit, rows.length) - 1];
    const nextCursor =
      hasMore && last
        ? this.encodeCursor({
            sort,
            createdAt: last.createdAt.toISOString(),
            id: last.id,
            ...(sort === 'top' ? { engagementScore: last.engagementScore } : {}),
          })
        : null;

    const result = { items, nextCursor };

    if (!opts.cursor && !opts.moderator) {
      const cacheKey = `${this.feedCachePrefix(churchId)}${sort}:${opts.youthGroupId ?? 'all'}:${limit}`;
      await this.cache.set(cacheKey, result, 30);
    }

    return result;
  }

  async getPost(churchId: string, userId: string, postId: string, moderator = false) {
    const member = await this.requireMember(churchId, userId);
    const post = await this.getPostOrThrow(churchId, postId);
    if (!moderator && post.status !== YouthPostStatus.PUBLISHED) {
      throw new NotFoundException('Post not found');
    }
    return this.serializePost(post, member.id);
  }

  // ─── Posts ─────────────────────────────────────────────────

  async createPost(
    churchId: string,
    userId: string,
    data: {
      content: string;
      youthGroupId?: string;
      isYouthOnly?: boolean;
      media?: Array<{
        url: string;
        thumbnailUrl?: string;
        mimeType?: string;
        kind?: 'IMAGE' | 'VIDEO' | 'GIF';
        sortOrder?: number;
        width?: number;
        height?: number;
      }>;
    },
  ) {
    const member = await this.requireMember(churchId, userId);
    const trimmed = data.content?.trim();
    if (!trimmed) throw new BadRequestException('Post content is required');

    if (data.youthGroupId) {
      const group = await this.prisma.youthGroup.findFirst({
        where: { id: data.youthGroupId, churchId },
      });
      if (!group) throw new NotFoundException('Youth group not found');
    }

    const isLeader = await this.access.isLeader(userId);
    const flagReason = scanYouthContent(trimmed, { strictSafeMode: !isLeader });
    const hashtags = extractHashtags(trimmed);

    const post = await this.prisma.youthPost.create({
      data: {
        churchId,
        authorMemberId: member.id,
        youthGroupId: data.youthGroupId,
        content: trimmed,
        hashtags,
        isYouthOnly: data.isYouthOnly ?? true,
        status: flagReason ? YouthPostStatus.FLAGGED : YouthPostStatus.PUBLISHED,
        media: data.media?.length
          ? {
              create: data.media.map((m, i) => ({
                churchId,
                uploaderMemberId: member.id,
                url: m.url,
                thumbnailUrl: m.thumbnailUrl,
                mimeType: m.mimeType,
                kind: m.kind ?? 'IMAGE',
                sortOrder: m.sortOrder ?? i,
                width: m.width,
                height: m.height,
              })),
            }
          : undefined,
      },
      include: postInclude,
    });

    if (flagReason) {
      await this.prisma.youthContentReport.create({
        data: {
          churchId,
          reporterMemberId: member.id,
          postId: post.id,
          reason: flagReason,
          status: ContentReportStatus.OPEN,
        },
      });
    } else {
      await this.gamification.scoreEvent(churchId, member.id, YouthPointSource.POST, {
        sourceId: post.id,
        reason: 'Feed post',
      });
    }

    await this.cache.invalidatePrefix(this.feedCachePrefix(churchId));
    await this.refreshPostEngagement(post.id);
    const refreshed = await this.getPostOrThrow(churchId, post.id);
    return this.serializePost(refreshed, member.id);
  }

  async updatePost(
    churchId: string,
    userId: string,
    postId: string,
    data: { content?: string },
  ) {
    const member = await this.requireMember(churchId, userId);
    const isLeader = await this.access.isLeader(userId);
    const existing = await this.prisma.youthPost.findFirst({
      where: { id: postId, churchId },
    });
    if (!existing) throw new NotFoundException('Post not found');
    if (!isLeader && existing.authorMemberId !== member.id) {
      throw new ForbiddenException('You can only edit your own posts');
    }

    const trimmed = data.content?.trim();
    if (!trimmed) throw new BadRequestException('Post content is required');

    const flagReason = scanYouthContent(trimmed, { strictSafeMode: !isLeader });
    const hashtags = extractHashtags(trimmed);

    await this.prisma.youthPost.update({
      where: { id: postId },
      data: {
        content: trimmed,
        hashtags,
        ...(flagReason && !isLeader
          ? { status: YouthPostStatus.FLAGGED }
          : {}),
      },
    });

    if (flagReason && !isLeader) {
      await this.prisma.youthContentReport.create({
        data: {
          churchId,
          reporterMemberId: member.id,
          postId,
          reason: flagReason,
        },
      });
    }

    const post = await this.getPostOrThrow(churchId, postId);
    return this.serializePost(post, member.id);
  }

  async deletePost(churchId: string, userId: string, postId: string) {
    const member = await this.requireMember(churchId, userId);
    const isLeader = await this.access.isLeader(userId);
    const existing = await this.prisma.youthPost.findFirst({
      where: { id: postId, churchId },
    });
    if (!existing) throw new NotFoundException('Post not found');
    if (!isLeader && existing.authorMemberId !== member.id) {
      throw new ForbiddenException('You can only delete your own posts');
    }
    await this.prisma.youthPost.update({
      where: { id: postId },
      data: { status: YouthPostStatus.REMOVED },
    });
    return { ok: true };
  }

  // ─── Comments ──────────────────────────────────────────────

  async listComments(
    churchId: string,
    userId: string,
    postId: string,
    parentId?: string,
  ) {
    const member = await this.requireMember(churchId, userId);
    await this.getPostOrThrow(churchId, postId);

    const comments = await this.prisma.youthComment.findMany({
      where: { postId, parentId: parentId ?? null },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        reactions: { select: { reactionType: true, memberId: true } },
        replies: {
          include: {
            author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            reactions: { select: { reactionType: true, memberId: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });

    return comments.map((c) => {
      const { reactionSummary, myReactions } = this.reactionSummary(
        c.reactions,
        member.id,
      );
      const replies = c.replies.map((r) => {
        const rr = this.reactionSummary(r.reactions, member.id);
        const { reactions: _rx, ...rest } = r;
        return { ...rest, ...rr };
      });
      const { reactions: _r, replies: _re, ...rest } = c;
      return { ...rest, reactionSummary, myReactions, replies };
    });
  }

  async createComment(
    churchId: string,
    userId: string,
    postId: string,
    data: { content: string; parentId?: string },
  ) {
    const member = await this.requireMember(churchId, userId);
    const post = await this.prisma.youthPost.findFirst({
      where: { id: postId, churchId, status: YouthPostStatus.PUBLISHED },
    });
    if (!post) throw new NotFoundException('Post not found');

    const trimmed = data.content?.trim();
    if (!trimmed) throw new BadRequestException('Comment content is required');

    if (data.parentId) {
      const parent = await this.prisma.youthComment.findFirst({
        where: { id: data.parentId, postId },
      });
      if (!parent) throw new NotFoundException('Parent comment not found');
    }

    const isLeader = await this.access.isLeader(userId);
    const flagReason = scanYouthContent(trimmed, { strictSafeMode: !isLeader });
    if (flagReason) {
      throw new BadRequestException(
        'Comment blocked by moderation. Please revise your message.',
      );
    }

    const comment = await this.prisma.youthComment.create({
      data: {
        postId,
        authorMemberId: member.id,
        parentId: data.parentId,
        content: trimmed,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        reactions: { select: { reactionType: true, memberId: true } },
      },
    });

    await this.refreshPostEngagement(postId);
    await this.gamification.scoreEvent(churchId, member.id, YouthPointSource.COMMENT, {
      sourceId: comment.id,
      reason: 'Feed comment',
    });
    return {
      ...comment,
      reactionSummary: {},
      myReactions: [],
      replies: [],
    };
  }

  // ─── Reactions ─────────────────────────────────────────────

  async addReaction(
    churchId: string,
    userId: string,
    data: {
      postId?: string;
      commentId?: string;
      reactionType?: YouthReactionType;
    },
  ) {
    const member = await this.requireMember(churchId, userId);
    const reactionType = data.reactionType ?? YouthReactionType.LIKE;

    if (data.postId && data.commentId) {
      throw new BadRequestException('Specify postId or commentId, not both');
    }
    if (!data.postId && !data.commentId) {
      throw new BadRequestException('postId or commentId is required');
    }

    if (data.postId) {
      const post = await this.prisma.youthPost.findFirst({
        where: { id: data.postId, churchId, status: YouthPostStatus.PUBLISHED },
      });
      if (!post) throw new NotFoundException('Post not found');

      await this.prisma.youthReaction.upsert({
        where: {
          memberId_postId_reactionType: {
            memberId: member.id,
            postId: data.postId,
            reactionType,
          },
        },
        create: {
          churchId,
          memberId: member.id,
          targetType: YouthReactionTarget.POST,
          postId: data.postId,
          reactionType,
        },
        update: {},
      });
      await this.refreshPostEngagement(data.postId);
      return { target: 'post', postId: data.postId, reactionType, added: true };
    }

    const comment = await this.prisma.youthComment.findFirst({
      where: { id: data.commentId, post: { churchId } },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    await this.prisma.youthReaction.upsert({
      where: {
        memberId_commentId_reactionType: {
          memberId: member.id,
          commentId: data.commentId!,
          reactionType,
        },
      },
      create: {
        churchId,
        memberId: member.id,
        targetType: YouthReactionTarget.COMMENT,
        commentId: data.commentId,
        reactionType,
      },
      update: {},
    });
    await this.refreshCommentEngagement(data.commentId!);
    return {
      target: 'comment',
      commentId: data.commentId,
      reactionType,
      added: true,
    };
  }

  async removeReaction(
    churchId: string,
    userId: string,
    data: {
      postId?: string;
      commentId?: string;
      reactionType?: YouthReactionType;
    },
  ) {
    const member = await this.requireMember(churchId, userId);
    const reactionType = data.reactionType ?? YouthReactionType.LIKE;

    if (data.postId) {
      await this.prisma.youthReaction.deleteMany({
        where: { memberId: member.id, postId: data.postId, reactionType },
      });
      await this.refreshPostEngagement(data.postId);
      return { removed: true };
    }

    if (data.commentId) {
      await this.prisma.youthReaction.deleteMany({
        where: { memberId: member.id, commentId: data.commentId, reactionType },
      });
      await this.refreshCommentEngagement(data.commentId);
      return { removed: true };
    }

    throw new BadRequestException('postId or commentId is required');
  }

  // ─── Media uploader ────────────────────────────────────────

  async registerMedia(
    churchId: string,
    userId: string,
    data: {
      url: string;
      thumbnailUrl?: string;
      mimeType?: string;
      kind?: 'IMAGE' | 'VIDEO' | 'GIF';
      width?: number;
      height?: number;
    },
  ) {
    const member = await this.requireMember(churchId, userId);
    const url = data.url?.trim();
    if (!url) throw new BadRequestException('Media URL is required');

    return this.prisma.youthMedia.create({
      data: {
        churchId,
        uploaderMemberId: member.id,
        url,
        thumbnailUrl: data.thumbnailUrl,
        mimeType: data.mimeType,
        kind: data.kind ?? 'IMAGE',
        width: data.width,
        height: data.height,
      },
    });
  }

  // ─── Moderation hooks ────────────────────────────────────────

  async reportPost(
    churchId: string,
    userId: string,
    postId: string,
    reason: string,
  ) {
    const member = await this.requireMember(churchId, userId);
    const post = await this.prisma.youthPost.findFirst({
      where: { id: postId, churchId },
    });
    if (!post) throw new NotFoundException('Post not found');

    const trimmed = reason?.trim();
    if (!trimmed) throw new BadRequestException('Report reason is required');

    return this.prisma.youthContentReport.create({
      data: {
        churchId,
        reporterMemberId: member.id,
        postId,
        reason: trimmed,
      },
      include: {
        reporter: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        post: { select: { id: true, content: true, status: true } },
      },
    });
  }

  async listReports(churchId: string, status?: ContentReportStatus) {
    return this.prisma.youthContentReport.findMany({
      where: {
        churchId,
        postId: { not: null },
        ...(status ? { status } : {}),
      },
      include: {
        reporter: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        post: { select: { id: true, content: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async reviewReport(
    churchId: string,
    reportId: string,
    data: { status: ContentReportStatus; hidePost?: boolean },
  ) {
    const report = await this.prisma.youthContentReport.findFirst({
      where: { id: reportId, churchId },
    });
    if (!report) throw new NotFoundException('Report not found');

    await this.prisma.youthContentReport.update({
      where: { id: reportId },
      data: { status: data.status },
    });

    if (data.hidePost && report.postId) {
      await this.moderatePost(churchId, report.postId, {
        status: YouthPostStatus.HIDDEN,
      });
    }

    return this.prisma.youthContentReport.findUnique({
      where: { id: reportId },
      include: {
        reporter: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        post: { select: { id: true, content: true, status: true } },
      },
    });
  }

  async moderatePost(
    churchId: string,
    postId: string,
    data: { status: YouthPostStatus },
  ) {
    const post = await this.prisma.youthPost.findFirst({
      where: { id: postId, churchId },
    });
    if (!post) throw new NotFoundException('Post not found');

    return this.prisma.youthPost.update({
      where: { id: postId },
      data: { status: data.status },
      include: postInclude,
    });
  }

  async listFlaggedPosts(churchId: string) {
    return this.prisma.youthPost.findMany({
      where: {
        churchId,
        status: { in: [YouthPostStatus.FLAGGED, YouthPostStatus.HIDDEN] },
      },
      include: postInclude,
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
  }
}
