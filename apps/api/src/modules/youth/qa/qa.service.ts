import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  YouthQuestionCategory,
  YouthQuestionStatus,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.module';
import { scanYouthContent } from '../common/moderation.util';
import { YouthAccessService } from '../common/youth-access.service';
import { YouthGamificationService } from '../gamification/gamification.service';
import { YOUTH_GAMIFICATION_INTEGRATIONS } from '../gamification/gamification.integrations';
import {
  QA_PUBLIC_BOARD_STATUSES,
  QA_QUEUE_STATUSES,
} from './qa.constants';

const questionInclude = {
  answers: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      author: { select: { id: true, firstName: true, lastName: true } },
    },
  },
  assignedTo: { select: { id: true, firstName: true, lastName: true } },
  member: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.YouthQuestionInclude;

type QuestionRow = Prisma.YouthQuestionGetPayload<{
  include: typeof questionInclude;
}>;

@Injectable()
export class YouthQaService {
  static readonly MODULE_KEY = 'youth/qa' as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gamification: YouthGamificationService,
    private readonly access: YouthAccessService,
  ) {}

  private async requireMember(churchId: string, userId: string) {
    const member = await this.prisma.member.findFirst({
      where: { churchId, userId },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!member) {
      throw new BadRequestException(
        'Link your account to a member profile to use Q&A',
      );
    }
    return member;
  }

  private displayAlias(row: QuestionRow) {
    if (row.isAnonymous) return row.alias?.trim() || 'Anonymous';
    if (row.member) return `${row.member.firstName} ${row.member.lastName}`;
    return row.alias?.trim() || 'Youth';
  }

  private serializeQuestion(
    row: QuestionRow,
    opts: {
      isLeader: boolean;
      viewerMemberId?: string;
      publicBoard?: boolean;
    },
  ) {
    const isOwner = !!opts.viewerMemberId && row.memberId === opts.viewerMemberId;
    const canSeePrivate = opts.isLeader || isOwner;

    const publicAnswers = row.answers.filter((a) => a.isPublic);
    const privateAnswers = row.answers.filter((a) => !a.isPublic);

    let answers = row.answers;
    if (opts.publicBoard) {
      answers = publicAnswers;
    } else if (!canSeePrivate) {
      answers = [];
    } else if (!opts.isLeader && isOwner) {
      answers = row.answers;
    } else if (opts.isLeader) {
      answers = row.answers;
    }

    return {
      id: row.id,
      category: row.category,
      question: row.question,
      status: row.status,
      isAnonymous: row.isAnonymous,
      alias: this.displayAlias(row),
      isPublicAnswer: row.isPublicAnswer,
      assignedTo: row.assignedTo
        ? {
            id: row.assignedTo.id,
            firstName: row.assignedTo.firstName,
            lastName: row.assignedTo.lastName,
          }
        : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      isOwner,
      canReply: opts.isLeader,
      answers: answers.map((a) => ({
        id: a.id,
        body: a.body,
        isPublic: a.isPublic,
        createdAt: a.createdAt.toISOString(),
        author: opts.publicBoard
          ? { firstName: 'Youth Leader', lastName: '' }
          : {
              id: a.author.id,
              firstName: a.author.firstName,
              lastName: a.author.lastName,
            },
      })),
      publicAnswer: publicAnswers[0]
        ? {
            body: publicAnswers[0].body,
            createdAt: publicAnswers[0].createdAt.toISOString(),
          }
        : null,
      privateReplyCount: canSeePrivate ? privateAnswers.length : undefined,
      moderationFlag:
        row.status === 'HIDDEN' ? 'hidden_by_moderation' : undefined,
    };
  }

  async listPublicBoard(
    churchId: string,
    filters?: { category?: YouthQuestionCategory; limit?: number },
  ) {
    const rows = await this.prisma.youthQuestion.findMany({
      where: {
        churchId,
        status: { in: QA_PUBLIC_BOARD_STATUSES },
        isPublicAnswer: true,
        ...(filters?.category ? { category: filters.category } : {}),
      },
      include: questionInclude,
      orderBy: { updatedAt: 'desc' },
      take: Math.min(filters?.limit ?? 50, 100),
    });
    return rows.map((r) =>
      this.serializeQuestion(r, { isLeader: false, publicBoard: true }),
    );
  }

  async listMyQuestions(churchId: string, userId: string) {
    const member = await this.requireMember(churchId, userId);
    const rows = await this.prisma.youthQuestion.findMany({
      where: { churchId, memberId: member.id },
      include: questionInclude,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) =>
      this.serializeQuestion(r, {
        isLeader: false,
        viewerMemberId: member.id,
      }),
    );
  }

  async listQueue(
    churchId: string,
    filters?: {
      status?: YouthQuestionStatus;
      category?: YouthQuestionCategory;
    },
  ) {
    const rows = await this.prisma.youthQuestion.findMany({
      where: {
        churchId,
        status: filters?.status
          ? filters.status
          : { in: QA_QUEUE_STATUSES },
        ...(filters?.category ? { category: filters.category } : {}),
      },
      include: questionInclude,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
    return rows.map((r) =>
      this.serializeQuestion(r, { isLeader: true }),
    );
  }

  async getQuestion(churchId: string, userId: string, questionId: string) {
    const row = await this.prisma.youthQuestion.findFirst({
      where: { id: questionId, churchId },
      include: questionInclude,
    });
    if (!row) throw new NotFoundException('Question not found');

    const isLeader = await this.access.isLeader(userId);
    let viewerMemberId: string | undefined;
    try {
      const member = await this.requireMember(churchId, userId);
      viewerMemberId = member.id;
    } catch {
      viewerMemberId = undefined;
    }

    const isOwner = viewerMemberId && row.memberId === viewerMemberId;
    if (row.status === 'PUBLIC') {
      return this.serializeQuestion(row, {
        isLeader,
        viewerMemberId,
        publicBoard: !isLeader && !isOwner,
      });
    }
    if (!isLeader && !isOwner) {
      throw new ForbiddenException('You cannot view this question');
    }
    return this.serializeQuestion(row, { isLeader, viewerMemberId });
  }

  async submitQuestion(
    churchId: string,
    userId: string,
    data: {
      question: string;
      category?: YouthQuestionCategory;
      isAnonymous?: boolean;
      alias?: string;
    },
  ) {
    const trimmed = data.question?.trim();
    if (!trimmed || trimmed.length < 10) {
      throw new BadRequestException('Question must be at least 10 characters');
    }

    let memberId: string | undefined;
    try {
      const member = await this.requireMember(churchId, userId);
      memberId = member.id;
    } catch {
      memberId = undefined;
    }

    const isAnonymous = data.isAnonymous !== false;
    const isLeader = await this.access.isLeader(userId);
    const moderationHit = scanYouthContent(trimmed, { strictSafeMode: !isLeader });
    const status: YouthQuestionStatus = moderationHit ? 'HIDDEN' : 'OPEN';

    const row = await this.prisma.youthQuestion.create({
      data: {
        churchId,
        memberId: memberId ?? null,
        question: trimmed,
        category: data.category ?? 'OTHER',
        isAnonymous,
        alias: isAnonymous ? data.alias?.trim() || 'Anonymous' : undefined,
        status,
      },
      include: questionInclude,
    });

    const serialized = this.serializeQuestion(row, {
      isLeader: false,
      viewerMemberId: memberId,
    });

    if (memberId && !moderationHit) {
      const { source, reason } = YOUTH_GAMIFICATION_INTEGRATIONS.qa.ask;
      await this.gamification.scoreEvent(churchId, memberId, source, {
        reason,
        sourceId: row.id,
      }).catch(() => undefined);
    }

    return {
      ...serialized,
      moderationWarning: moderationHit ?? undefined,
    };
  }

  async assignQuestion(
    churchId: string,
    questionId: string,
    assignedToId: string,
  ) {
    const row = await this.prisma.youthQuestion.findFirst({
      where: { id: questionId, churchId },
    });
    if (!row) throw new NotFoundException('Question not found');

    const user = await this.prisma.user.findFirst({
      where: { id: assignedToId, churchId },
    });
    if (!user) throw new BadRequestException('Assignee not found');

    const updated = await this.prisma.youthQuestion.update({
      where: { id: questionId },
      data: { assignedToId, status: 'ASSIGNED' },
      include: questionInclude,
    });
    return this.serializeQuestion(updated, { isLeader: true });
  }

  async replyPrivate(
    churchId: string,
    authorUserId: string,
    questionId: string,
    body: string,
  ) {
    const trimmed = body?.trim();
    if (!trimmed) throw new BadRequestException('Reply body is required');

    const hit = scanYouthContent(trimmed, { strictSafeMode: false });
    if (hit) throw new BadRequestException(`Reply blocked: ${hit}`);

    const row = await this.prisma.youthQuestion.findFirst({
      where: { id: questionId, churchId },
    });
    if (!row) throw new NotFoundException('Question not found');
    if (row.status === 'HIDDEN') {
      throw new BadRequestException('Question is hidden');
    }

    await this.prisma.youthAnswer.create({
      data: {
        questionId,
        authorId: authorUserId,
        body: trimmed,
        isPublic: false,
      },
    });

    const updated = await this.prisma.youthQuestion.update({
      where: { id: questionId },
      data: {
        status: 'ANSWERED',
        assignedToId: row.assignedToId ?? authorUserId,
      },
      include: questionInclude,
    });

    if (row.memberId) {
      const { source, reason } = YOUTH_GAMIFICATION_INTEGRATIONS.qa.answered;
      await this.gamification.scoreEvent(churchId, row.memberId, source, {
        reason,
        sourceId: questionId,
      }).catch(() => undefined);
    }

    return this.serializeQuestion(updated, { isLeader: true });
  }

  async publishPublicAnswer(
    churchId: string,
    authorUserId: string,
    questionId: string,
    body: string,
  ) {
    const trimmed = body?.trim();
    if (!trimmed) throw new BadRequestException('Public answer is required');

    const hit = scanYouthContent(trimmed, { strictSafeMode: false });
    if (hit) throw new BadRequestException(`Answer blocked: ${hit}`);

    const row = await this.prisma.youthQuestion.findFirst({
      where: { id: questionId, churchId },
    });
    if (!row) throw new NotFoundException('Question not found');

    const existingPublic = await this.prisma.youthAnswer.findFirst({
      where: { questionId, isPublic: true },
    });

    if (existingPublic) {
      await this.prisma.youthAnswer.update({
        where: { id: existingPublic.id },
        data: { body: trimmed, authorId: authorUserId },
      });
    } else {
      await this.prisma.youthAnswer.create({
        data: {
          questionId,
          authorId: authorUserId,
          body: trimmed,
          isPublic: true,
        },
      });
    }

    const updated = await this.prisma.youthQuestion.update({
      where: { id: questionId },
      data: {
        status: 'PUBLIC',
        isPublicAnswer: true,
        assignedToId: row.assignedToId ?? authorUserId,
      },
      include: questionInclude,
    });

    if (row.memberId) {
      const { source, reason } = YOUTH_GAMIFICATION_INTEGRATIONS.qa.answered;
      await this.gamification.scoreEvent(churchId, row.memberId, source, {
        reason,
        sourceId: questionId,
      }).catch(() => undefined);
    }

    return this.serializeQuestion(updated, { isLeader: true });
  }

  /** Moderation: hide question from board and queue */
  async hideQuestion(churchId: string, questionId: string, _reason?: string) {
    const row = await this.prisma.youthQuestion.findFirst({
      where: { id: questionId, churchId },
    });
    if (!row) throw new NotFoundException('Question not found');

    const updated = await this.prisma.youthQuestion.update({
      where: { id: questionId },
      data: { status: 'HIDDEN' },
      include: questionInclude,
    });
    return this.serializeQuestion(updated, { isLeader: true });
  }

  async restoreQuestion(churchId: string, questionId: string) {
    const row = await this.prisma.youthQuestion.findFirst({
      where: { id: questionId, churchId },
      include: { answers: { select: { id: true } } },
    });
    if (!row) throw new NotFoundException('Question not found');

    const nextStatus: YouthQuestionStatus =
      row.isPublicAnswer ? 'PUBLIC' : row.answers.length ? 'ANSWERED' : 'OPEN';

    const updated = await this.prisma.youthQuestion.update({
      where: { id: questionId },
      data: { status: nextStatus },
      include: questionInclude,
    });
    return this.serializeQuestion(updated, { isLeader: true });
  }

  async listHidden(churchId: string) {
    const rows = await this.prisma.youthQuestion.findMany({
      where: { churchId, status: 'HIDDEN' },
      include: questionInclude,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.serializeQuestion(r, { isLeader: true }));
  }
}
