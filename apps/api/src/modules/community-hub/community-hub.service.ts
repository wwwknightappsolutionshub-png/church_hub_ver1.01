import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CommunityHubStatus,
  CommunityHubType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { EmailAdapter } from '../notifications/adapters/email.adapter';

const AUTO_APPROVE_MS = 30 * 60 * 1000;

type HubPostRow = {
  id: string;
  subject: string | null;
  testimony: string | null;
  description: string;
  displayName: string | null;
  showDisplayName: boolean;
  status: CommunityHubStatus;
  authorUserId: string;
  createdAt: Date;
  autoApproveAt: Date;
  approvedAt: Date | null;
  _count?: { likes: number; comments: number };
};

@Injectable()
export class CommunityHubService {
  private readonly logger = new Logger(CommunityHubService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailAdapter,
  ) {}

  private async processAutoApprovals(churchId: string, type: CommunityHubType) {
    const now = new Date();
    await this.prisma.communityHubPost.updateMany({
      where: {
        churchId,
        type,
        status: 'PENDING',
        autoApproveAt: { lte: now },
      },
      data: { status: 'APPROVED', approvedAt: now },
    });
  }

  private displayNameFor(
    post: Pick<HubPostRow, 'displayName' | 'showDisplayName' | 'status'>,
    isPastor: boolean,
  ) {
    if (isPastor && post.displayName?.trim()) return post.displayName.trim();
    if (post.status !== 'APPROVED') return 'Pending review';
    if (post.showDisplayName && post.displayName?.trim()) return post.displayName.trim();
    return 'Anonymous';
  }

  private mapCard(
    post: HubPostRow,
    ctx: { isPastor: boolean; userId: string; likedByMe: boolean },
  ) {
    const excerpt =
      post.description.length > 140
        ? `${post.description.slice(0, 140).trim()}…`
        : post.description;

    return {
      id: post.id,
      title: post.subject ?? post.testimony ?? 'Untitled',
      description: post.description,
      excerpt,
      displayName: this.displayNameFor(post, ctx.isPastor),
      status: post.status,
      isOwn: post.authorUserId === ctx.userId,
      createdAt: post.createdAt,
      approvedAt: post.approvedAt,
      autoApproveAt: post.autoApproveAt,
      likeCount: post._count?.likes ?? 0,
      commentCount: post._count?.comments ?? 0,
      likedByMe: ctx.likedByMe,
    };
  }

  private async isPastorUser(userId: string) {
    const roles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    return roles.some((r) => ['ADMIN', 'PASTOR'].includes(r.role.name));
  }

  private async memberIdForUser(churchId: string, userId: string) {
    const m = await this.prisma.member.findFirst({
      where: { churchId, userId },
      select: { id: true },
    });
    return m?.id ?? null;
  }

  private publicWhere(
    churchId: string,
    type: CommunityHubType,
    userId: string,
    isPastor: boolean,
    dateFilter?: { from?: string; to?: string },
  ): Prisma.CommunityHubPostWhereInput {
    const createdAt =
      dateFilter?.from || dateFilter?.to
        ? {
            ...(dateFilter.from ? { gte: new Date(dateFilter.from) } : {}),
            ...(dateFilter.to ? { lte: new Date(dateFilter.to) } : {}),
          }
        : undefined;

    return {
      churchId,
      type,
      status: 'APPROVED',
      ...(createdAt ? { createdAt } : {}),
    };
  }

  async listForUser(
    churchId: string,
    userId: string,
    type: CommunityHubType,
    opts: {
      cursor?: string;
      limit?: number;
      from?: string;
      to?: string;
    },
  ) {
    await this.processAutoApprovals(churchId, type);
    const isPastor = await this.isPastorUser(userId);

    const limit = Math.min(opts.limit ?? 12, 50);
    const where = this.publicWhere(churchId, type, userId, isPastor, {
      from: opts.from,
      to: opts.to,
    });

    const posts = await this.prisma.communityHubPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
      include: {
        _count: { select: { likes: true, comments: true } },
        likes: { where: { userId }, select: { id: true } },
      },
    });

    const hasMore = posts.length > limit;
    const slice = hasMore ? posts.slice(0, limit) : posts;

    return {
      items: slice.map((p) =>
        this.mapCard(p, {
          isPastor,
          userId,
          likedByMe: p.likes.length > 0,
        }),
      ),
      nextCursor: hasMore ? slice[slice.length - 1]?.id : null,
    };
  }

  async getPostDetail(churchId: string, userId: string, id: string) {
    const isPastor = await this.isPastorUser(userId);
    const post = await this.prisma.communityHubPost.findFirst({
      where: { id, churchId },
      include: {
        _count: { select: { likes: true, comments: true } },
        likes: { where: { userId }, select: { id: true } },
      },
    });
    if (!post) throw new NotFoundException('Post not found');

    if (
      !isPastor &&
      post.status !== 'APPROVED' &&
      post.authorUserId !== userId
    ) {
      throw new ForbiddenException('This post is not visible yet');
    }

    return this.mapCard(post, {
      isPastor,
      userId,
      likedByMe: post.likes.length > 0,
    });
  }

  async toggleLike(churchId: string, userId: string, postId: string) {
    const post = await this.prisma.communityHubPost.findFirst({
      where: { id: postId, churchId },
    });
    if (!post) throw new NotFoundException('Post not found');
    if (post.status !== 'APPROVED') {
      throw new ForbiddenException('Only approved posts can be liked');
    }

    const existing = await this.prisma.communityHubLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      await this.prisma.communityHubLike.delete({ where: { id: existing.id } });
      return { liked: false };
    }

    await this.prisma.communityHubLike.create({
      data: { postId, userId },
    });
    return { liked: true };
  }

  async listComments(churchId: string, userId: string, postId: string) {
    const post = await this.prisma.communityHubPost.findFirst({
      where: { id: postId, churchId },
    });
    if (!post) throw new NotFoundException('Post not found');

    const isPastor = await this.isPastorUser(userId);
    if (
      !isPastor &&
      post.status !== 'APPROVED' &&
      post.authorUserId !== userId
    ) {
      throw new ForbiddenException('This post is not visible yet');
    }

    const rows = await this.prisma.communityHubComment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      take: 100,
      include: {
        member: { select: { firstName: true, lastName: true, nickname: true } },
        user: { select: { firstName: true, lastName: true, nickname: true } },
      },
    });

    return rows.map((c) => ({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt,
      authorName:
        c.member?.nickname?.trim() ||
        (c.member
          ? `${c.member.firstName} ${c.member.lastName}`.trim()
          : c.user.nickname?.trim() ||
            `${c.user.firstName} ${c.user.lastName}`.trim()),
    }));
  }

  async addComment(
    churchId: string,
    userId: string,
    postId: string,
    body: string,
  ) {
    const post = await this.prisma.communityHubPost.findFirst({
      where: { id: postId, churchId },
    });
    if (!post) throw new NotFoundException('Post not found');
    if (post.status !== 'APPROVED') {
      throw new ForbiddenException('Only approved posts can be commented on');
    }

    const memberId = await this.memberIdForUser(churchId, userId);
    const comment = await this.prisma.communityHubComment.create({
      data: {
        postId,
        userId,
        memberId,
        body: body.trim(),
      },
      include: {
        member: { select: { firstName: true, lastName: true, nickname: true } },
        user: { select: { firstName: true, lastName: true, nickname: true } },
      },
    });

    return {
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt,
      authorName:
        comment.member?.nickname?.trim() ||
        (comment.member
          ? `${comment.member.firstName} ${comment.member.lastName}`.trim()
          : comment.user.nickname?.trim() ||
            `${comment.user.firstName} ${comment.user.lastName}`.trim()),
    };
  }

  async createPrayer(
    churchId: string,
    userId: string,
    memberId: string | null,
    data: { subject: string; description: string; displayName?: string },
  ) {
    const autoApproveAt = new Date(Date.now() + AUTO_APPROVE_MS);
    const post = await this.prisma.communityHubPost.create({
      data: {
        churchId,
        type: 'PRAYER',
        authorUserId: userId,
        authorMemberId: memberId,
        subject: data.subject.trim(),
        description: data.description.trim(),
        displayName: data.displayName?.trim() || null,
        showDisplayName: false,
        autoApproveAt,
      },
    });
    await this.notifyPastors(churchId, 'PRAYER', post.id, data.subject);
    return post;
  }

  async createPraise(
    churchId: string,
    userId: string,
    memberId: string | null,
    data: {
      testimony: string;
      description: string;
      displayName?: string;
      showDisplayName: boolean;
    },
  ) {
    const autoApproveAt = new Date(Date.now() + AUTO_APPROVE_MS);
    const post = await this.prisma.communityHubPost.create({
      data: {
        churchId,
        type: 'PRAISE',
        authorUserId: userId,
        authorMemberId: memberId,
        testimony: data.testimony.trim(),
        description: data.description.trim(),
        displayName: data.displayName?.trim() || null,
        showDisplayName: data.showDisplayName,
        autoApproveAt,
      },
    });
    await this.notifyPastors(churchId, 'PRAISE', post.id, data.testimony);
    return post;
  }

  async pastorList(
    churchId: string,
    type: CommunityHubType,
    status?: CommunityHubStatus,
  ) {
    await this.processAutoApprovals(churchId, type);
    return this.prisma.communityHubPost.findMany({
      where: { churchId, type, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async updatePost(
    churchId: string,
    id: string,
    data: Partial<{
      subject: string;
      testimony: string;
      description: string;
      displayName: string;
      showDisplayName: boolean;
      status: CommunityHubStatus;
    }>,
    pastorUserId?: string,
  ) {
    const post = await this.prisma.communityHubPost.findFirst({
      where: { id, churchId },
    });
    if (!post) throw new NotFoundException('Post not found');

    const status = data.status;
    return this.prisma.communityHubPost.update({
      where: { id },
      data: {
        ...data,
        ...(status === 'APPROVED'
          ? { approvedAt: new Date(), approvedById: pastorUserId }
          : {}),
        ...(status === 'REJECTED' ? { rejectedAt: new Date() } : {}),
      },
    });
  }

  async deletePost(churchId: string, id: string) {
    const post = await this.prisma.communityHubPost.findFirst({ where: { id, churchId } });
    if (!post) throw new NotFoundException('Post not found');
    return this.prisma.communityHubPost.delete({ where: { id } });
  }

  async approveNow(churchId: string, id: string, pastorUserId: string) {
    return this.updatePost(churchId, id, { status: 'APPROVED' }, pastorUserId);
  }

  private async notifyPastors(
    churchId: string,
    type: CommunityHubType,
    postId: string,
    title: string,
  ) {
    try {
      const pastors = await this.prisma.user.findMany({
        where: {
          churchId,
          isActive: true,
          roles: { some: { role: { name: { in: ['PASTOR', 'ADMIN'] } } } },
        },
      });
      const hubLabel = type === 'PRAYER' ? 'Prayer Hub' : 'Testimony Hub';
      const appUrl = process.env.APP_URL ?? 'http://localhost:3001';
      const path = type === 'PRAYER' ? 'prayer-hub' : 'testimony-hub';

      for (const p of pastors) {
        await this.prisma.notification.create({
          data: {
            churchId,
            userId: p.id,
            type: `${type}_HUB_PENDING`,
            title: `New ${hubLabel} submission`,
            body: `"${title}" awaits approval (auto-publishes in 30 min).`,
            data: { postId, type },
          },
        });
        if (p.email) {
          await this.email.send({
            churchId,
            to: p.email,
            subject: `[${hubLabel}] Approval needed`,
            body: `A new submission "${title}" needs review.\n${appUrl}/dashboard/${path}`,
          });
        }
      }
    } catch (err) {
      this.logger.warn(
        `Pastor notification failed for ${type} post ${postId}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}
