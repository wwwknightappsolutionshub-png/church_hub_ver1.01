import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.module';

@Injectable()
export class DevotionalProgressService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireMember(churchId: string, userId: string) {
    const member = await this.prisma.member.findFirst({
      where: { churchId, userId },
      select: { id: true },
    });
    if (!member) {
      throw new BadRequestException('Link your account to a member profile for study progress');
    }
    return member;
  }

  async getMyProgress(churchId: string, userId: string, planId: string) {
    const member = await this.requireMember(churchId, userId);
    return this.prisma.devotionalStudyProgress.findUnique({
      where: { memberId_planId: { memberId: member.id, planId } },
    });
  }

  async markDayComplete(
    churchId: string,
    userId: string,
    planId: string,
    dayNumber: number,
    dayId?: string,
  ) {
    const member = await this.requireMember(churchId, userId);
    const plan = await this.prisma.devotionalPlan.findFirst({
      where: { id: planId, churchId, isActive: true },
    });
    if (!plan) throw new NotFoundException('Devotional plan not found');

    const existing = await this.prisma.devotionalStudyProgress.findUnique({
      where: { memberId_planId: { memberId: member.id, planId } },
    });

    const streakDays =
      existing && dayNumber === existing.lastDay + 1
        ? existing.streakDays + 1
        : dayNumber === existing?.lastDay
          ? existing.streakDays
          : 1;

    return this.prisma.devotionalStudyProgress.upsert({
      where: { memberId_planId: { memberId: member.id, planId } },
      create: {
        churchId,
        memberId: member.id,
        planId,
        dayId,
        lastDay: dayNumber,
        streakDays,
        lastReadAt: new Date(),
      },
      update: {
        dayId,
        lastDay: Math.max(dayNumber, existing?.lastDay ?? 0),
        streakDays,
        lastReadAt: new Date(),
        completedAt: new Date(),
      },
    });
  }
}
