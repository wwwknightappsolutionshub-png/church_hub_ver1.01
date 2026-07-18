import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { SuggestionTopic } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { CommunicationsQueueService } from '../communications/communications-queue.service';

const TOPIC_LABELS: Record<SuggestionTopic, string> = {
  CHURCH_SERVICE: 'Church service',
  EVANGELISM: 'Evangelism',
  MEMBERSHIP: 'Membership',
  GRIEVANCE: 'Grievance',
  OTHER: 'Other',
};

@Injectable()
export class SuggestionsService {
  private readonly logger = new Logger(SuggestionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly commQueue: CommunicationsQueueService,
  ) {}

  async create(
    churchId: string,
    userId: string,
    data: { topic: SuggestionTopic; subject?: string; body: string },
  ) {
    const body = data.body?.trim();
    if (!body) throw new BadRequestException('Please write your comment or suggestion');
    if (!data.topic || !(data.topic in TOPIC_LABELS)) {
      throw new BadRequestException('Select a valid topic');
    }

    const author = await this.prisma.user.findFirst({
      where: { id: userId, churchId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    if (!author) throw new BadRequestException('User not found in this church');

    const row = await this.prisma.memberSuggestion.create({
      data: {
        churchId,
        authorUserId: userId,
        topic: data.topic,
        subject: data.subject?.trim() || null,
        body,
      },
    });

    await this.notifyLeadership(churchId, row, author);
    return {
      id: row.id,
      topic: row.topic,
      topicLabel: TOPIC_LABELS[row.topic],
      subject: row.subject,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async listMine(churchId: string, userId: string) {
    const rows = await this.prisma.memberSuggestion.findMany({
      where: { churchId, authorUserId: userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    return rows.map((row) => ({
      id: row.id,
      topic: row.topic,
      topicLabel: TOPIC_LABELS[row.topic],
      subject: row.subject,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  private async notifyLeadership(
    churchId: string,
    row: {
      id: string;
      topic: SuggestionTopic;
      subject: string | null;
      body: string;
      createdAt: Date;
    },
    author: { firstName: string; lastName: string; email: string | null },
  ) {
    const topicLabel = TOPIC_LABELS[row.topic];
    const authorName = `${author.firstName} ${author.lastName}`.trim();
    const subjectLine = row.subject?.trim() || `${topicLabel} suggestion`;
    const title = `[Suggestion] ${topicLabel} — ${subjectLine}`;
    const body = [
      `Topic: ${topicLabel}`,
      `From: ${authorName}${author.email ? ` (${author.email})` : ''}`,
      `Subject: ${subjectLine}`,
      `Submitted: ${row.createdAt.toISOString()}`,
      ``,
      row.body,
    ].join('\n');

    try {
      const staffUsers = await this.prisma.user.findMany({
        where: {
          churchId,
          isActive: true,
          roles: { some: { role: { name: { in: ['ADMIN', 'PASTOR'] } } } },
        },
        select: { id: true },
      });

      for (const staff of staffUsers) {
        await this.commQueue.enqueue(churchId, {
          kind: 'DIRECT_ALERT',
          title,
          body,
          channels: ['IN_APP', 'EMAIL'],
          targetUserId: staff.id,
          metadata: {
            reportType: 'Member Suggestion',
            suggestionId: row.id,
            topic: row.topic,
            topicLabel,
            authorName,
          },
        });
      }
    } catch (err) {
      this.logger.warn(
        `Suggestion notify failed for ${row.id}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}
