import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { MembershipImportColumnMapping, MembershipImportOptions } from '@church-hub/shared-types';
import { PrismaService } from '../../prisma/prisma.module';
import { DepartmentAccessService } from './department-access.service';
import { CommunicationsQueueService } from '../communications/communications-queue.service';
import {
  applyCelebrationTemplate,
  CelebrationEmailTemplatesService,
} from '../communications/celebration-email-templates.service';
import { MembershipService } from '../membership/membership.service';
import { MembershipRegistryService } from '../membership/membership-registry.service';
import { MembershipImportService } from '../membership/membership-import.service';
import {
  CHILDREN_MINISTRY_INTEREST,
  type ChildrenClassGroup,
  isChildrenChurchChild,
  isoWeekKey,
  memberAgeYears,
  parseServiceDateInput,
  parseWeekStartInput,
  serviceDateIso,
  weekStartUtc,
} from './children.constants';
import { RegisterChildWizardDto } from './children.dto';
import { ChildrenClassDefinitionsService } from './children-class-definitions.service';

const memberSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  dateOfBirth: true,
  ministryInterests: true,
  userId: true,
} as const;

function paginate<T>(items: T[], page: number, limit: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    total,
    page: safePage,
    limit,
    totalPages,
  };
}

@Injectable()
export class ChildrenMinistryService {
  private readonly logger = new Logger(ChildrenMinistryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: DepartmentAccessService,
    private readonly commQueue: CommunicationsQueueService,
    private readonly celebrationTemplates: CelebrationEmailTemplatesService,
    private readonly membership: MembershipService,
    private readonly registry: MembershipRegistryService,
    private readonly importService: MembershipImportService,
    private readonly classDefinitions: ChildrenClassDefinitionsService,
  ) {}

  async getAccess(userId: string, churchId: string, serviceUnitId: string) {
    const { ctx } = await this.access.requireView(userId, churchId, serviceUnitId);
    return {
      canAccess: this.access.canAccessChildrenMinistryLeadership(ctx, serviceUnitId),
      isChurchStaff: this.access.isChurchStaff(ctx),
      isChildrenChurchAdmin: ctx.unitAdminUnitIds.includes(serviceUnitId),
    };
  }

  private async loadChildrenMembers(churchId: string) {
    const members = await this.prisma.member.findMany({
      where: { churchId },
      select: {
        ...memberSelect,
        childLinks: {
          select: {
            relation: true,
            parent: { select: memberSelect },
          },
        },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
    return members.filter((m) => isChildrenChurchChild(m));
  }

  private async rosterTeachersForWeek(churchId: string, serviceUnitId: string, weekStart: Date) {
    return this.prisma.deptChildrenDutyRoster.findMany({
      where: { churchId, serviceUnitId, weekStart },
      include: {
        teacher: { select: memberSelect },
        assistant: { select: memberSelect },
      },
    });
  }

  async listClassDefinitions(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    opts?: { includeInactive?: boolean },
  ) {
    await this.access.requireView(userId, churchId, serviceUnitId);
    if (opts?.includeInactive) {
      await this.access.requireChildrenMinistryLeadership(userId, churchId, serviceUnitId);
      return this.classDefinitions.listAll(churchId, serviceUnitId);
    }
    return this.classDefinitions.listActive(churchId, serviceUnitId);
  }

  async createClassDefinition(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: { name: string; minAge?: number | null; maxAge?: number | null; sortOrder?: number },
  ) {
    await this.access.requireChildrenMinistryLeadership(userId, churchId, serviceUnitId);
    return this.classDefinitions.createClass(churchId, serviceUnitId, body);
  }

  async updateClassDefinition(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    classId: string,
    body: {
      name?: string;
      minAge?: number | null;
      maxAge?: number | null;
      sortOrder?: number;
      isActive?: boolean;
    },
  ) {
    await this.access.requireChildrenMinistryLeadership(userId, churchId, serviceUnitId);
    return this.classDefinitions.updateClass(churchId, serviceUnitId, classId, body);
  }

  private classGroupLabel(
    group: ChildrenClassGroup | string | null | undefined,
    definitions: Array<{ code: string; name: string }>,
  ) {
    return this.classDefinitions.labelForCode(group, definitions);
  }

  async listChildren(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    opts?: { page?: number; limit?: number; search?: string },
  ) {
    await this.access.requireChildrenMinistryLeadership(userId, churchId, serviceUnitId);
    const page = opts?.page ?? 1;
    const limit = Math.min(50, Math.max(1, opts?.limit ?? 20));
    const weekStart = weekStartUtc();
    const search = opts?.search?.trim().toLowerCase();

    const [children, enrollments, roster, classDefs] = await Promise.all([
      this.loadChildrenMembers(churchId),
      this.prisma.deptChildrenClassEnrollment.findMany({
        where: { churchId, serviceUnitId },
      }),
      this.rosterTeachersForWeek(churchId, serviceUnitId, weekStart),
      this.classDefinitions.listActive(churchId, serviceUnitId),
    ]);

    const enrollmentByChild = new Map(enrollments.map((e) => [e.childMemberId, e]));
    const rosterByGroup = new Map(roster.map((r) => [r.classGroup, r]));

    let rows = children.map((c) => {
      const enrollment = enrollmentByChild.get(c.id);
      const classGroup =
        enrollment?.classGroup ??
        this.classDefinitions.suggestedClassCode(c.dateOfBirth, classDefs) ??
        null;
      const rosterRow = classGroup ? rosterByGroup.get(classGroup) : undefined;
      const age = c.dateOfBirth ? memberAgeYears(new Date(c.dateOfBirth)) : null;
      return {
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        dateOfBirth: c.dateOfBirth?.toISOString().slice(0, 10) ?? null,
        age,
        classGroup,
        classLabel: this.classGroupLabel(classGroup, classDefs),
        teacher: rosterRow?.teacher
          ? {
              id: rosterRow.teacher.id,
              firstName: rosterRow.teacher.firstName,
              lastName: rosterRow.teacher.lastName,
            }
          : null,
        parentCount: c.childLinks.length,
      };
    });

    if (search) {
      rows = rows.filter((r) =>
        `${r.firstName} ${r.lastName}`.toLowerCase().includes(search),
      );
    }

    return { children: paginate(rows, page, limit), classGroups: classDefs };
  }

  async getChildDetail(userId: string, churchId: string, serviceUnitId: string, childId: string) {
    await this.access.requireChildrenMinistryLeadership(userId, churchId, serviceUnitId);
    const member = await this.prisma.member.findFirst({
      where: { id: childId, churchId },
      select: {
        ...memberSelect,
        family: { select: { id: true, name: true } },
        childLinks: {
          select: {
            relation: true,
            parent: {
              select: {
                ...memberSelect,
                parentLinks: {
                  select: {
                    relation: true,
                    child: { select: { id: true, firstName: true, lastName: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!member || !isChildrenChurchChild(member)) {
      throw new NotFoundException('Child not found in Children\'s Church');
    }

    const weekStart = weekStartUtc();
    const classDefs = await this.classDefinitions.listActive(churchId, serviceUnitId);
    const [enrollment, roster] = await Promise.all([
      this.prisma.deptChildrenClassEnrollment.findUnique({
        where: { serviceUnitId_childMemberId: { serviceUnitId, childMemberId: childId } },
      }),
      this.rosterTeachersForWeek(churchId, serviceUnitId, weekStart),
    ]);

    const classGroup =
      enrollment?.classGroup ??
      this.classDefinitions.suggestedClassCode(member.dateOfBirth, classDefs) ??
      null;
    const rosterRow = classGroup ? roster.find((r) => r.classGroup === classGroup) : undefined;

    const connectionTree = member.childLinks.map((link) => ({
      relation: link.relation,
      parent: {
        id: link.parent.id,
        firstName: link.parent.firstName,
        lastName: link.parent.lastName,
        email: link.parent.email,
        phone: link.parent.phone,
      },
      siblings: link.parent.parentLinks
        .filter((pl) => pl.child.id !== childId)
        .map((pl) => ({
          id: pl.child.id,
          firstName: pl.child.firstName,
          lastName: pl.child.lastName,
          relation: pl.relation,
        })),
    }));

    return {
      child: {
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        phone: member.phone,
        dateOfBirth: member.dateOfBirth?.toISOString().slice(0, 10) ?? null,
        age: member.dateOfBirth ? memberAgeYears(new Date(member.dateOfBirth)) : null,
        family: member.family,
        ministryInterests: member.ministryInterests,
      },
      classGroup,
      classLabel: this.classGroupLabel(classGroup, classDefs),
      teacher: rosterRow?.teacher ?? null,
      assistant: rosterRow?.assistant ?? null,
      connectionTree,
    };
  }

  async listParents(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    opts?: { page?: number; limit?: number },
  ) {
    await this.access.requireChildrenMinistryLeadership(userId, churchId, serviceUnitId);
    const children = await this.loadChildrenMembers(churchId);
    const childIds = new Set(children.map((c) => c.id));

    const links = await this.prisma.parentGuardianLink.findMany({
      where: { childId: { in: [...childIds] } },
      include: {
        parent: { select: memberSelect },
        child: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const byParent = new Map<
      string,
      {
        id: string;
        firstName: string;
        lastName: string;
        email: string | null;
        phone: string | null;
        children: Array<{ id: string; firstName: string; lastName: string; relation: string }>;
      }
    >();

    for (const link of links) {
      const existing = byParent.get(link.parentId) ?? {
        id: link.parent.id,
        firstName: link.parent.firstName,
        lastName: link.parent.lastName,
        email: link.parent.email,
        phone: link.parent.phone,
        children: [],
      };
      existing.children.push({
        id: link.child.id,
        firstName: link.child.firstName,
        lastName: link.child.lastName,
        relation: link.relation,
      });
      byParent.set(link.parentId, existing);
    }

    const parents = [...byParent.values()].sort((a, b) =>
      `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`),
    );

    return {
      parents: paginate(parents, opts?.page ?? 1, Math.min(50, opts?.limit ?? 20)),
    };
  }

  async listTeachers(userId: string, churchId: string, serviceUnitId: string) {
    await this.access.requireChildrenMinistryLeadership(userId, churchId, serviceUnitId);
    const weekStart = weekStartUtc();

    const [roster, leaders, unitMembers] = await Promise.all([
      this.rosterTeachersForWeek(churchId, serviceUnitId, weekStart),
      this.prisma.serviceUnitLeader.findMany({
        where: { serviceUnitId, isUnitAdmin: true },
        include: { member: { select: memberSelect } },
      }),
      this.prisma.serviceUnitMember.findMany({
        where: { serviceUnitId },
        include: { member: { select: memberSelect } },
      }),
    ]);

    const teacherMap = new Map<
      string,
      {
        id: string;
        firstName: string;
        lastName: string;
        email: string | null;
        roles: string[];
        classGroups: string[];
        isChildrenChurchAdmin: boolean;
      }
    >();

    const addTeacher = (
      m: { id: string; firstName: string; lastName: string; email: string | null },
      role: string,
      classGroup?: string,
    ) => {
      const existing = teacherMap.get(m.id) ?? {
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        email: m.email,
        roles: [],
        classGroups: [],
        isChildrenChurchAdmin: false,
      };
      if (!existing.roles.includes(role)) existing.roles.push(role);
      if (classGroup && !existing.classGroups.includes(classGroup)) {
        existing.classGroups.push(classGroup);
      }
      teacherMap.set(m.id, existing);
    };

    for (const row of roster) {
      addTeacher(row.teacher, 'Lead teacher', row.classGroup);
      if (row.assistant) addTeacher(row.assistant, 'Assistant', row.classGroup);
    }
    for (const l of leaders) {
      const entry = teacherMap.get(l.member.id) ?? {
        id: l.member.id,
        firstName: l.member.firstName,
        lastName: l.member.lastName,
        email: l.member.email,
        roles: [],
        classGroups: [],
        isChildrenChurchAdmin: true,
      };
      entry.isChildrenChurchAdmin = true;
      if (!entry.roles.includes('Children Church Admin')) entry.roles.push('Children Church Admin');
      teacherMap.set(l.member.id, entry);
    }
    for (const um of unitMembers) {
      if (um.member.ministryInterests.includes(CHILDREN_MINISTRY_INTEREST)) {
        addTeacher(um.member, 'Team member');
      }
    }

    return {
      weekKey: isoWeekKey(weekStart),
      teachers: [...teacherMap.values()].sort((a, b) =>
        `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`),
      ),
    };
  }

  async addTeacher(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: {
      memberId?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      designation?: string;
      makeCoordinator?: boolean;
    },
  ) {
    await this.access.requireChildrenMinistryLeadership(userId, churchId, serviceUnitId);

    let memberId = body.memberId?.trim();
    if (!memberId) {
      const firstName = body.firstName?.trim();
      const lastName = body.lastName?.trim();
      if (!firstName || !lastName) {
        throw new BadRequestException('Select an existing member or provide first and last name');
      }
      const email = body.email?.trim() || undefined;
      if (email) {
        const existing = await this.prisma.member.findFirst({
          where: { churchId, email },
          select: { id: true },
        });
        if (existing) memberId = existing.id;
      }
      if (!memberId) {
        const created = await this.membership.createMember(churchId, {
          firstName,
          lastName,
          email,
          phone: body.phone?.trim() || undefined,
          status: 'ACTIVE_MEMBER',
          startOnboarding: false,
        });
        memberId = created.id;
      }
    } else {
      const member = await this.prisma.member.findFirst({
        where: { id: memberId, churchId },
        select: { id: true },
      });
      if (!member) throw new NotFoundException('Member not found');
    }

    await this.prisma.serviceUnitMember.upsert({
      where: { serviceUnitId_memberId: { serviceUnitId, memberId } },
      create: { serviceUnitId, memberId },
      update: {},
    });

    await this.tagTeacherForMinistry(churchId, memberId);

    if (body.makeCoordinator) {
      await this.prisma.serviceUnitLeader.upsert({
        where: { serviceUnitId_memberId: { serviceUnitId, memberId } },
        create: {
          serviceUnitId,
          memberId,
          role: body.designation?.trim() || 'Children Church Coordinator',
          isUnitAdmin: true,
        },
        update: {
          role: body.designation?.trim() || 'Children Church Coordinator',
          isUnitAdmin: true,
        },
      });
    } else if (body.designation?.trim()) {
      await this.prisma.serviceUnitLeader.upsert({
        where: { serviceUnitId_memberId: { serviceUnitId, memberId } },
        create: {
          serviceUnitId,
          memberId,
          role: body.designation.trim(),
          isUnitAdmin: false,
        },
        update: { role: body.designation.trim() },
      });
    }

    const feed = await this.listTeachers(userId, churchId, serviceUnitId);
    const added = feed.teachers.find((t) => t.id === memberId);
    return { teacher: added ?? null, teachers: feed.teachers, weekKey: feed.weekKey };
  }

  private async tagTeacherForMinistry(churchId: string, memberId: string) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, churchId },
      select: { ministryInterests: true },
    });
    if (!member) throw new NotFoundException('Member not found');

    const interests = new Set(member.ministryInterests ?? []);
    interests.add(CHILDREN_MINISTRY_INTEREST);

    await this.prisma.member.update({
      where: { id: memberId },
      data: { ministryInterests: Array.from(interests) },
    });
  }

  async listBirthdays(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    opts?: { days?: number; page?: number; limit?: number },
  ) {
    await this.access.requireChildrenMinistryLeadership(userId, churchId, serviceUnitId);
    const days = Math.min(90, Math.max(7, opts?.days ?? 30));
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const windowEnd = new Date(today);
    windowEnd.setUTCDate(windowEnd.getUTCDate() + days);

    const children = await this.loadChildrenMembers(churchId);
    const childIds = children.map((c) => c.id);
    const parentLinks = await this.prisma.parentGuardianLink.findMany({
      where: { childId: { in: childIds } },
      include: { parent: { select: memberSelect } },
    });
    const parentsByChild = new Map<string, typeof parentLinks>();
    for (const link of parentLinks) {
      const list = parentsByChild.get(link.childId) ?? [];
      list.push(link);
      parentsByChild.set(link.childId, list);
    }

    const rows: Array<{
      childId: string;
      childName: string;
      date: string;
      label: string;
      age: number | null;
      parents: Array<{ id: string; name: string; email: string | null }>;
    }> = [];

    for (const c of children) {
      if (!c.dateOfBirth) continue;
      const dob = new Date(c.dateOfBirth);
      let next = new Date(Date.UTC(today.getUTCFullYear(), dob.getUTCMonth(), dob.getUTCDate()));
      if (next < today) {
        next = new Date(Date.UTC(today.getUTCFullYear() + 1, dob.getUTCMonth(), dob.getUTCDate()));
      }
      if (next > windowEnd) continue;
      const age = memberAgeYears(dob, next);
      rows.push({
        childId: c.id,
        childName: `${c.firstName} ${c.lastName}`.trim(),
        date: next.toISOString().slice(0, 10),
        label: next.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        age,
        parents: (parentsByChild.get(c.id) ?? []).map((l) => ({
          id: l.parent.id,
          name: `${l.parent.firstName} ${l.parent.lastName}`.trim(),
          email: l.parent.email,
        })),
      });
    }
    rows.sort((a, b) => a.date.localeCompare(b.date));

    return {
      windowDays: days,
      birthdays: paginate(rows, opts?.page ?? 1, Math.min(50, opts?.limit ?? 20)),
    };
  }

  async assignClass(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    childMemberId: string,
    classGroup: string,
  ) {
    await this.access.requireChildrenMinistryLeadership(userId, churchId, serviceUnitId);
    await this.classDefinitions.assertActiveClassCode(churchId, serviceUnitId, classGroup);
    const child = await this.prisma.member.findFirst({
      where: { id: childMemberId, churchId },
      select: { id: true, ministryInterests: true, dateOfBirth: true },
    });
    if (!child || !isChildrenChurchChild(child)) {
      throw new BadRequestException('Member is not enrolled in Children\'s Church');
    }

    return this.prisma.deptChildrenClassEnrollment.upsert({
      where: { serviceUnitId_childMemberId: { serviceUnitId, childMemberId } },
      create: { churchId, serviceUnitId, childMemberId, classGroup },
      update: { classGroup },
      include: { child: { select: memberSelect } },
    });
  }

  async sendSundayReport(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    dto: { serviceDate?: string; classes: Array<{ classGroup: string; boys: number; girls: number }>; otherComments?: string },
  ) {
    const { unit } = await this.access.requireChildrenRegistration(userId, churchId, serviceUnitId);

    if (!dto.classes?.length) {
      throw new BadRequestException('Add at least one class head count');
    }

    const date = parseServiceDateInput(dto.serviceDate);
    const classDefs = await this.classDefinitions.listActive(churchId, serviceUnitId);
    const dateLabel = date.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const classRows = await Promise.all(
      dto.classes.map(async (row) => {
        await this.classDefinitions.assertActiveClassCode(churchId, serviceUnitId, row.classGroup);
        const boys = Math.max(0, Math.floor(row.boys ?? 0));
        const girls = Math.max(0, Math.floor(row.girls ?? 0));
        return {
          classGroup: row.classGroup,
          classLabel: this.classGroupLabel(row.classGroup, classDefs) ?? row.classGroup,
          boys,
          girls,
          total: boys + girls,
        };
      }),
    );

    const grandTotals = classRows.reduce(
      (acc, row) => ({
        boys: acc.boys + row.boys,
        girls: acc.girls + row.girls,
        total: acc.total + row.total,
      }),
      { boys: 0, girls: 0, total: 0 },
    );

    const headCountLines = classRows.map(
      (row) =>
        `• ${row.classLabel}: ${row.boys} boys, ${row.girls} girls (${row.total} total)`,
    );

    const bodyParts = [
      `Children's Church Sunday Report — ${dateLabel}`,
      `Unit: ${unit.name}`,
      '',
      'Head count by class:',
      ...headCountLines,
      '',
      `Grand total: ${grandTotals.boys} boys, ${grandTotals.girls} girls (${grandTotals.total} children)`,
    ];

    const otherComments = dto.otherComments?.trim();
    if (otherComments) {
      bodyParts.push('', 'Other comments:', otherComments);
    }

    const body = bodyParts.join('\n');

    const weekStart = weekStartUtc(date);
    const report = await this.prisma.serviceUnitWeeklyReport.upsert({
      where: { serviceUnitId_weekStart: { serviceUnitId, weekStart } },
      create: {
        churchId,
        serviceUnitId,
        weekStart,
        body,
        stats: {
          reportType: 'head_count',
          serviceDate: date.toISOString().slice(0, 10),
          classes: classRows,
          grandTotals,
          otherComments: otherComments ?? null,
        } as Prisma.InputJsonValue,
      },
      update: {
        body,
        stats: {
          reportType: 'head_count',
          serviceDate: date.toISOString().slice(0, 10),
          classes: classRows,
          grandTotals,
          otherComments: otherComments ?? null,
        } as Prisma.InputJsonValue,
        emailedAt: new Date(),
      },
    });

    const staffUsers = await this.prisma.user.findMany({
      where: {
        churchId,
        isActive: true,
        roles: { some: { role: { name: { in: ['ADMIN', 'PASTOR'] } } } },
      },
      select: { id: true, email: true },
    });

    let notificationsQueued = 0;
    for (const staff of staffUsers) {
      await this.commQueue.enqueue(churchId, {
        kind: 'DEPARTMENT_WEEKLY_REPORT',
        title: `Children's Church — Sunday head count (${date.toISOString().slice(0, 10)})`,
        body,
        channels: ['IN_APP'],
        serviceUnitId,
        targetUserId: staff.id,
        metadata: { reportId: report.id, serviceDate: date.toISOString().slice(0, 10) },
      });
      await this.prisma.notification.create({
        data: {
          churchId,
          userId: staff.id,
          type: 'DEPT_REPORT',
          title: `Children's Church Sunday head count`,
          body: body.slice(0, 500),
          data: { reportId: report.id, serviceUnitId } as Prisma.InputJsonValue,
        },
      });
      notificationsQueued += 1;
    }

    this.logger.log(`Children Sunday head-count report sent for ${serviceUnitId} — ${notificationsQueued} staff notified`);

    return {
      reportId: report.id,
      serviceDate: date.toISOString().slice(0, 10),
      stats: { ...grandTotals, classes: classRows },
      notificationsQueued,
      body,
    };
  }

  async getCheckInBoard(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    serviceDate?: string,
  ) {
    await this.access.requireChildrenMinistryLeadership(userId, churchId, serviceUnitId);

    const date = parseServiceDateInput(serviceDate);
    const dayEnd = new Date(date);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const [children, enrollments, sessionCheckIns, classDefs] = await Promise.all([
      this.loadChildrenMembers(churchId),
      this.prisma.deptChildrenClassEnrollment.findMany({
        where: { churchId, serviceUnitId },
      }),
      this.prisma.deptChildCheckIn.findMany({
        where: { serviceUnitId, checkedInAt: { gte: date, lt: dayEnd } },
        orderBy: { checkedInAt: 'desc' },
        include: { child: { select: memberSelect } },
      }),
      this.classDefinitions.listActive(churchId, serviceUnitId),
    ]);

    const enrollmentByChild = new Map(enrollments.map((e) => [e.childMemberId, e]));
    const latestCheckInByChild = new Map<string, (typeof sessionCheckIns)[number]>();
    for (const row of sessionCheckIns) {
      if (!latestCheckInByChild.has(row.childMemberId)) {
        latestCheckInByChild.set(row.childMemberId, row);
      }
    }

    const waiting: Array<{
      childId: string;
      firstName: string;
      lastName: string;
      classGroup: ChildrenClassGroup | null;
      classLabel: string | null;
      age: number | null;
      status: 'available' | 'checked_out';
      checkInId?: string;
      checkedOutAt?: string | null;
    }> = [];

    const checkedIn: Array<{
      checkInId: string;
      childId: string;
      firstName: string;
      lastName: string;
      classGroup: ChildrenClassGroup | null;
      classLabel: string | null;
      age: number | null;
      checkedInAt: string;
    }> = [];

    for (const child of children) {
      const enrollment = enrollmentByChild.get(child.id);
      const classGroup =
        enrollment?.classGroup ??
        this.classDefinitions.suggestedClassCode(child.dateOfBirth, classDefs) ??
        null;
      const row = {
        childId: child.id,
        firstName: child.firstName,
        lastName: child.lastName,
        classGroup,
        classLabel: this.classGroupLabel(classGroup, classDefs),
        age: child.dateOfBirth ? memberAgeYears(new Date(child.dateOfBirth)) : null,
      };

      const session = latestCheckInByChild.get(child.id);
      if (session && !session.checkedOutAt) {
        checkedIn.push({
          checkInId: session.id,
          ...row,
          checkedInAt: session.checkedInAt.toISOString(),
        });
      } else {
        waiting.push({
          ...row,
          status: session?.checkedOutAt ? 'checked_out' : 'available',
          checkInId: session?.id,
          checkedOutAt: session?.checkedOutAt?.toISOString() ?? null,
        });
      }
    }

    const sortByName = <T extends { lastName: string; firstName: string }>(a: T, b: T) =>
      `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);

    waiting.sort(sortByName);
    checkedIn.sort(sortByName);

    return {
      serviceDate: serviceDateIso(date),
      stats: {
        registered: children.length,
        checkedIn: checkedIn.length,
        checkedOut: waiting.filter((w) => w.status === 'checked_out').length,
        waiting: waiting.filter((w) => w.status === 'available').length,
      },
      waiting,
      checkedIn,
    };
  }

  async runBirthdayParentEmailsManual(
    userId: string,
    churchId: string,
    serviceUnitId: string,
  ) {
    await this.access.requireChildrenMinistryLeadership(userId, churchId, serviceUnitId);
    return this.runBirthdayParentEmails(churchId, serviceUnitId);
  }

  async runBirthdayParentEmails(churchId: string, serviceUnitId?: string) {
    const birthdayTpl = await this.celebrationTemplates.getActive(churchId, 'BIRTHDAY');
    if (!birthdayTpl) return { queued: 0 };

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayKey = `${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`;

    const children = await this.loadChildrenMembers(churchId);
    const birthdayChildren = children.filter(
      (c) =>
        c.dateOfBirth &&
        `${String(new Date(c.dateOfBirth).getUTCMonth() + 1).padStart(2, '0')}-${String(new Date(c.dateOfBirth).getUTCDate()).padStart(2, '0')}` ===
          todayKey,
    );

    let queued = 0;
    for (const child of birthdayChildren) {
      const links = await this.prisma.parentGuardianLink.findMany({
        where: { childId: child.id },
        include: { parent: { select: memberSelect } },
      });

      for (const link of links) {
        if (!link.parent.email) continue;
        const dup = await this.prisma.communicationQueueItem.findFirst({
          where: {
            churchId,
            kind: 'BIRTHDAY_GREETING',
            targetMemberId: link.parent.id,
            createdAt: { gte: today },
          },
        });
        if (dup) {
          const meta = dup.metadata as { childMemberId?: string } | null;
          if (meta?.childMemberId === child.id) continue;
        }

        const childName = `${child.firstName} ${child.lastName}`.trim();
        const parentName = `${link.parent.firstName} ${link.parent.lastName}`.trim();
        const age = child.dateOfBirth ? memberAgeYears(new Date(child.dateOfBirth)) : null;
        const vars = {
          firstName: link.parent.firstName,
          lastName: link.parent.lastName,
          fullName: parentName,
          occasionName: `${childName}'s Birthday`,
          occasionDate: today.toLocaleDateString(),
          age: age != null ? String(age) : '',
          churchName: '',
          childName,
        };

        const church = await this.prisma.church.findUnique({
          where: { id: churchId },
          select: { name: true },
        });
        vars.churchName = church?.name ?? 'Your church';

        const subject = applyCelebrationTemplate(birthdayTpl.subject, vars);
        let bodyHtml = applyCelebrationTemplate(birthdayTpl.bodyHtml, vars);
        bodyHtml = bodyHtml.replace(/\{\{childName\}\}/g, childName);

        await this.commQueue.enqueue(churchId, {
          kind: 'BIRTHDAY_GREETING',
          title: subject,
          body: `Today is ${childName}'s birthday! ${applyCelebrationTemplate(birthdayTpl.bodyHtml.replace(/<[^>]+>/g, ' '), vars)}`,
          channels: ['EMAIL'],
          targetMemberId: link.parent.id,
          targetUserId: link.parent.userId ?? undefined,
          serviceUnitId,
          metadata: {
            childMemberId: child.id,
            recipientType: 'parent',
            bodyHtml,
          },
        });
        queued += 1;
      }
    }

    return { queued, children: birthdayChildren.length };
  }

  async getRegistrationCatalog(userId: string, churchId: string, serviceUnitId: string) {
    await this.access.requireChildrenRegistration(userId, churchId, serviceUnitId);
    const [catalog, families, classGroups] = await Promise.all([
      this.registry.getRegistryCatalog(churchId),
      this.prisma.family.findMany({
        where: { churchId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
        take: 500,
      }),
      this.classDefinitions.listActive(churchId, serviceUnitId),
    ]);
    return {
      ...catalog,
      families,
      classGroups: classGroups.map((g) => ({
        id: g.id,
        value: g.code,
        label: g.name,
        ages: g.ages,
        minAge: g.minAge,
        maxAge: g.maxAge,
      })),
    };
  }

  async searchRegistrationFamilies(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    search?: string,
  ) {
    await this.access.requireChildrenRegistration(userId, churchId, serviceUnitId);
    const q = search?.trim();
    const families = await this.prisma.family.findMany({
      where: {
        churchId,
        isActive: true,
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      },
      select: {
        id: true,
        name: true,
        city: true,
        homePhone: true,
        email: true,
        members: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            familyRole: { select: { name: true } },
          },
          orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        },
      },
      orderBy: { name: 'asc' },
      take: 100,
    });
    return {
      items: families.map((f) => ({
        id: f.id,
        name: f.name,
        city: f.city,
        homePhone: f.homePhone,
        email: f.email,
        members: f.members.map((m) => ({
          id: m.id,
          firstName: m.firstName,
          lastName: m.lastName,
          familyRole: m.familyRole?.name ?? null,
        })),
      })),
    };
  }

  async searchRegistrationGuardians(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    search?: string,
  ) {
    await this.access.requireChildrenRegistration(userId, churchId, serviceUnitId);
    const q = search?.trim();
    const members = await this.prisma.member.findMany({
      where: {
        churchId,
        ...(q
          ? {
              OR: [
                { firstName: { contains: q, mode: 'insensitive' } },
                { lastName: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        cellPhone: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      take: 50,
    });
    return {
      items: members.map((m) => ({
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        email: m.email,
        phone: m.phone ?? m.cellPhone,
      })),
    };
  }

  async createFamilyForRegistration(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: {
      name: string;
      headMemberId?: string;
      address?: string;
      address2?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
      homePhone?: string;
      email?: string;
      homeCell?: string;
      specialOccasion?: string;
      specialOccasionDate?: string;
      customFields?: Record<string, string | boolean | null>;
      propertyIds?: string[];
    },
  ) {
    await this.access.requireChildrenRegistration(userId, churchId, serviceUnitId);
    if (!body.name?.trim()) throw new BadRequestException('Family name is required');
    const { name, headMemberId, ...rest } = body;
    return this.membership.createFamily(churchId, name.trim(), headMemberId, userId, rest);
  }

  private async tagChildForMinistry(
    churchId: string,
    serviceUnitId: string,
    memberId: string,
    dateOfBirth?: Date | null,
    classGroupOverride?: ChildrenClassGroup | null,
  ) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, churchId },
      select: { ministryInterests: true, dateOfBirth: true },
    });
    if (!member) throw new NotFoundException('Member not found');

    const interests = new Set(member.ministryInterests ?? []);
    interests.add(CHILDREN_MINISTRY_INTEREST);

    await this.prisma.member.update({
      where: { id: memberId },
      data: { ministryInterests: Array.from(interests) },
    });

    const dob = dateOfBirth ?? member.dateOfBirth;
    const classDefs = await this.classDefinitions.listActive(churchId, serviceUnitId);
    let classGroup = classGroupOverride ?? this.classDefinitions.suggestedClassCode(dob, classDefs);
    if (classGroupOverride) {
      await this.classDefinitions.assertActiveClassCode(churchId, serviceUnitId, classGroupOverride);
      classGroup = classGroupOverride;
    }
    if (classGroup) {
      await this.prisma.deptChildrenClassEnrollment.upsert({
        where: { serviceUnitId_childMemberId: { serviceUnitId, childMemberId: memberId } },
        create: { churchId, serviceUnitId, childMemberId: memberId, classGroup },
        update: { classGroup },
      });
    }
  }

  private buildChildNotes(body: {
    notes?: string;
    schoolName?: string;
    gradeLevel?: string;
  }): string | undefined {
    const edu: string[] = [];
    if (body.schoolName?.trim()) edu.push(`School: ${body.schoolName.trim()}`);
    if (body.gradeLevel?.trim()) edu.push(`Grade: ${body.gradeLevel.trim()}`);
    const parts = [body.notes?.trim(), edu.length ? edu.join(' | ') : ''].filter(Boolean);
    return parts.length ? parts.join('\n') : undefined;
  }

  async registerChildWizard(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: RegisterChildWizardDto,
  ) {
    await this.access.requireChildrenRegistration(userId, churchId, serviceUnitId);

    if (!body.firstName?.trim() || !body.lastName?.trim()) {
      throw new BadRequestException('First and last name are required');
    }

    let familyId = body.familyId;
    if (body.familyMode === 'existing') {
      if (!familyId) throw new BadRequestException('Select an existing family');
      const family = await this.prisma.family.findFirst({
        where: { id: familyId, churchId, isActive: true },
      });
      if (!family) throw new NotFoundException('Family not found');
    } else {
      if (!body.newFamily?.name?.trim()) {
        throw new BadRequestException('Family name is required for a new household');
      }
      const createdFamily = await this.createFamilyForRegistration(
        userId,
        churchId,
        serviceUnitId,
        {
          ...body.newFamily,
          name: body.newFamily.name,
          specialOccasionDate: body.newFamily.specialOccasionDate ?? undefined,
        },
      );
      familyId = createdFamily.id;
    }

    const created = await this.membership.createMember(churchId, {
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      middleName: body.middleName?.trim(),
      gender: body.gender,
      dateOfBirth: body.dateOfBirth,
      cellPhone: body.cellPhone,
      homePhone: body.homePhone,
      classificationId: body.classificationId ?? undefined,
      familyId,
      familyRoleId: body.familyRoleId ?? undefined,
      notes: this.buildChildNotes(body),
      ministryInterests: [CHILDREN_MINISTRY_INTEREST],
      roles: ['YOUTH'],
      startOnboarding: false,
      address: body.newFamily?.address,
      address2: body.newFamily?.address2,
      city: body.newFamily?.city,
      state: body.newFamily?.state,
      zip: body.newFamily?.zip,
      country: body.newFamily?.country,
    });

    for (const guardian of body.guardians ?? []) {
      let parentId = guardian.memberId;
      if (guardian.mode === 'new') {
        if (!guardian.firstName?.trim() || !guardian.lastName?.trim()) {
          throw new BadRequestException('Guardian first and last name are required');
        }
        const parent = await this.membership.createMember(churchId, {
          firstName: guardian.firstName.trim(),
          lastName: guardian.lastName.trim(),
          email: guardian.email,
          phone: guardian.phone,
          cellPhone: guardian.phone,
          familyId,
          roles: ['ADULT'],
          startOnboarding: false,
        });
        parentId = parent.id;
      } else if (!parentId) {
        throw new BadRequestException('Select an existing guardian or provide new guardian details');
      }

      if (parentId === created.id) continue;

      await this.prisma.parentGuardianLink.upsert({
        where: { parentId_childId: { parentId, childId: created.id } },
        create: {
          parentId,
          childId: created.id,
          relation: guardian.relation?.trim() || 'PARENT',
        },
        update: { relation: guardian.relation?.trim() || 'PARENT' },
      });
    }

    await this.tagChildForMinistry(
      churchId,
      serviceUnitId,
      created.id,
      created.dateOfBirth ? new Date(created.dateOfBirth) : null,
      body.classGroup ?? null,
    );

    return this.getChildDetail(userId, churchId, serviceUnitId, created.id);
  }

  async registerChildMember(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: Record<string, unknown>,
  ) {
    await this.access.requireChildrenRegistration(userId, churchId, serviceUnitId);

    const created = await this.membership.createMember(churchId, {
      ...(body as Parameters<MembershipService['createMember']>[1]),
      ministryInterests: [CHILDREN_MINISTRY_INTEREST],
      roles: ['YOUTH'],
      startOnboarding: false,
    });

    await this.tagChildForMinistry(
      churchId,
      serviceUnitId,
      created.id,
      created.dateOfBirth ? new Date(created.dateOfBirth) : null,
    );

    return created;
  }

  getChildrenImportTemplateCsv() {
    return this.importService.getTemplateCsv();
  }

  async uploadChildrenImport(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    file: Express.Multer.File,
  ) {
    await this.access.requireChildrenRegistration(userId, churchId, serviceUnitId);
    return this.importService.upload(churchId, userId, file);
  }

  async previewChildrenImport(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    jobId: string,
    columnMapping: MembershipImportColumnMapping,
    options?: MembershipImportOptions,
  ) {
    await this.access.requireChildrenRegistration(userId, churchId, serviceUnitId);
    return this.importService.preview(churchId, jobId, { columnMapping, options });
  }

  async commitChildrenImport(
    churchId: string,
    serviceUnitId: string,
    jobId: string,
    actorUserId: string,
  ) {
    await this.access.requireChildrenRegistration(actorUserId, churchId, serviceUnitId);
    const result = await this.importService.commit(churchId, jobId, actorUserId);

    const rows = await this.prisma.membershipImportJobRow.findMany({
      where: { jobId, memberId: { not: null }, action: { in: ['CREATE', 'UPDATE'] } },
      select: { memberId: true },
    });

    for (const row of rows) {
      if (!row.memberId) continue;
      const member = await this.prisma.member.findFirst({
        where: { id: row.memberId, churchId },
        select: { dateOfBirth: true },
      });
      if (member) {
        await this.tagChildForMinistry(churchId, serviceUnitId, row.memberId, member.dateOfBirth);
      }
    }

    return result;
  }

  getChildrenImportJob(churchId: string, jobId: string) {
    return this.importService.getJob(churchId, jobId);
  }
}
