import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.module';
import { DevotionalVoiceService } from './devotional-voice.service';

@Injectable()
export class DevotionalDiscussionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly voice: DevotionalVoiceService,
  ) {}

  private async memberId(churchId: string, userId: string) {
    const m = await this.prisma.member.findFirst({
      where: { churchId, userId },
      select: { id: true },
    });
    if (!m) throw new BadRequestException('Member profile required');
    return m.id;
  }

  listGroup(churchId: string, groupId: string) {
    return this.prisma.devotionalDiscussion.findMany({
      where: { churchId, groupId, status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async create(
    churchId: string,
    userId: string,
    data: { body: string; title?: string; groupId?: string; planId?: string },
  ) {
    const memberId = await this.memberId(churchId, userId);
    return this.prisma.devotionalDiscussion.create({
      data: {
        churchId,
        memberId,
        groupId: data.groupId,
        planId: data.planId,
        title: data.title?.trim(),
        body: data.body.trim(),
      },
    });
  }

  async attachVoiceTranscript(discussionId: string, audioUrl: string, transcriptText: string) {
    await this.voice.validateTranscript(transcriptText);
    return this.prisma.devotionalDiscussionTranscript.create({
      data: { discussionId, audioUrl, transcriptText },
    });
  }
}
