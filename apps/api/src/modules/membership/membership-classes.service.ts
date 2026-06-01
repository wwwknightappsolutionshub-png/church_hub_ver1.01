import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ClassEnrollmentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { MembershipActivityService } from './membership-activity.service';

@Injectable()
export class MembershipClassesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: MembershipActivityService,
  ) {}

  async listEnrollments(
    churchId: string,
    filters?: { memberId?: string; classDefinitionId?: string; status?: ClassEnrollmentStatus },
  ) {
    return this.prisma.classEnrollment.findMany({
      where: {
        churchId,
        ...(filters?.memberId ? { memberId: filters.memberId } : {}),
        ...(filters?.classDefinitionId ? { classDefinitionId: filters.classDefinitionId } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      include: {
        member: { select: { id: true, firstName: true, lastName: true, status: true } },
        classDefinition: true,
      },
      orderBy: [{ enrolledAt: 'desc' }],
    });
  }

  async enroll(
    churchId: string,
    data: {
      memberId: string;
      classDefinitionId: string;
      notes?: string;
      status?: ClassEnrollmentStatus;
    },
    actorUserId?: string,
  ) {
    const [member, classDef] = await Promise.all([
      this.prisma.member.findFirst({ where: { id: data.memberId, churchId } }),
      this.prisma.membershipClassDefinition.findFirst({
        where: { id: data.classDefinitionId, churchId, isActive: true },
      }),
    ]);
    if (!member) throw new NotFoundException('Member not found');
    if (!classDef) throw new NotFoundException('Class definition not found');

    const existing = await this.prisma.classEnrollment.findUnique({
      where: {
        memberId_classDefinitionId: {
          memberId: data.memberId,
          classDefinitionId: data.classDefinitionId,
        },
      },
    });
    if (existing && existing.status !== 'WITHDRAWN') {
      throw new BadRequestException('Member is already enrolled in this class');
    }

    const enrollment = existing
      ? await this.prisma.classEnrollment.update({
          where: { id: existing.id },
          data: {
            status: data.status ?? 'ENROLLED',
            notes: data.notes,
            enrolledAt: new Date(),
            completedAt: null,
          },
          include: { classDefinition: true, member: true },
        })
      : await this.prisma.classEnrollment.create({
          data: {
            churchId,
            memberId: data.memberId,
            classDefinitionId: data.classDefinitionId,
            status: data.status ?? 'ENROLLED',
            notes: data.notes,
          },
          include: { classDefinition: true, member: true },
        });

    await this.activity.log(churchId, data.memberId, 'CLASS_ENROLLED', `Enrolled in ${classDef.code} — ${classDef.name}`, {
      actorUserId,
      metadata: { classDefinitionId: classDef.id, enrollmentId: enrollment.id },
    });

    return enrollment;
  }

  async updateEnrollment(
    churchId: string,
    id: string,
    data: { status?: ClassEnrollmentStatus; notes?: string },
    actorUserId?: string,
  ) {
    const row = await this.prisma.classEnrollment.findFirst({
      where: { id, churchId },
      include: { classDefinition: true },
    });
    if (!row) throw new NotFoundException('Enrollment not found');

    const completedAt =
      data.status === 'COMPLETED' ? new Date() : data.status === 'WITHDRAWN' ? row.completedAt : null;

    const updated = await this.prisma.classEnrollment.update({
      where: { id },
      data: {
        status: data.status,
        notes: data.notes,
        completedAt: data.status === 'COMPLETED' ? new Date() : completedAt,
      },
      include: { classDefinition: true, member: true },
    });

    if (data.status === 'COMPLETED') {
      await this.activity.log(
        churchId,
        row.memberId,
        'CLASS_COMPLETED',
        `Completed ${row.classDefinition.code} — ${row.classDefinition.name}`,
        { actorUserId, metadata: { enrollmentId: id } },
      );
    } else if (data.status === 'WITHDRAWN') {
      await this.activity.log(
        churchId,
        row.memberId,
        'CLASS_WITHDRAWN',
        `Withdrawn from ${row.classDefinition.code}`,
        { actorUserId, metadata: { enrollmentId: id } },
      );
    }

    return updated;
  }
}
