import { Injectable } from '@nestjs/common';
import { MemberActivityType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';

@Injectable()
export class MembershipActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    churchId: string,
    memberId: string,
    type: MemberActivityType,
    summary: string,
    opts?: { actorUserId?: string; metadata?: Prisma.InputJsonValue },
  ) {
    return this.prisma.memberActivityLog.create({
      data: {
        churchId,
        memberId,
        type,
        summary,
        actorUserId: opts?.actorUserId ?? null,
        metadata: opts?.metadata ?? undefined,
      },
    });
  }

  async listForMember(churchId: string, memberId: string, limit = 50) {
    return this.prisma.memberActivityLog.findMany({
      where: { churchId, memberId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        actor: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }
}
