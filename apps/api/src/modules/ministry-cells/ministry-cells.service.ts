import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CellFormKind,
  CellIncidentSeverity,
  CellIncidentStatus,
  CellPrayerStatus,
  Prisma,
} from '@prisma/client';
import { parseOptionalFlexiblePhoneOrThrow } from '../../common/phone.util';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../auth/current-user.decorator';
import { MembershipService } from '../membership/membership.service';
import { MembershipRegistryService } from '../membership/membership-registry.service';
import { CommunicationsQueueService } from '../communications/communications-queue.service';
import { EmailAdapter } from '../notifications/adapters/email.adapter';
import { SmsAdapter } from '../notifications/adapters/sms.adapter';
import { trySendWhatsApp } from '../notifications/try-send-whatsapp';
import {
  escapeHtml,
  findOneAdminAndOnePastor,
} from '../notifications/report-digest.util';
import {
  isExactHourDue,
  readOperationalEmailSchedules,
} from '../notifications/operational-email-schedule';
import {
  MinistryCellsAccessService,
  type MinistryCellsRole,
} from './ministry-cells-access.service';
import {
  isCellDeputyRole,
  type CellDeputyRole,
} from './cell-leadership-deputies';
import {
  cellPostcodeMatchesCoverage,
  coverageKeyForCell,
  findMatchingProvinceId,
  normalizeCoveragePostcodes,
  requireCellPostcode,
} from './cell-province.util';
import type { AssignCellDeputyDto } from './dto/cell-deputy.dto';
import { MemberPrivacyService } from '../member-privacy/member-privacy.service';

const branchInclude = {
  leader: { select: { id: true, firstName: true, lastName: true, email: true } },
  province: {
    select: {
      id: true,
      name: true,
      leaderUserId: true,
      leader: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  },
  _count: { select: { members: true, incidents: true } },
} satisfies Prisma.CellBranchInclude;

const branchListInclude = {
  ...branchInclude,
  members: {
    include: {
      member: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          status: true,
          family: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { joinedAt: 'asc' as const },
  },
} satisfies Prisma.CellBranchInclude;

@Injectable()
export class MinistryCellsService {
  private readonly logger = new Logger(MinistryCellsService.name);
  private readonly cellDigestSent = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: MinistryCellsAccessService,
    private readonly membership: MembershipService,
    private readonly registry: MembershipRegistryService,
    private readonly commQueue: CommunicationsQueueService,
    private readonly email: EmailAdapter,
    private readonly sms: SmsAdapter,
    private readonly memberPrivacy: MemberPrivacyService,
  ) {}

  async getContext(user: AuthUser, churchId: string) {
    await this.access.assertModuleEnabled(churchId);
    const ctx = await this.access.resolveRole(user, churchId);
    if (ctx.role === 'none') {
      return {
        role: 'none' as const,
        leaderBranchId: null,
        leaderProvinceId: null,
        isDeputy: false,
        deputyRole: null,
        deputyBranchIds: [] as string[],
        deputyProvinceIds: [] as string[],
        canManage: false,
        canAssignDeputies: false,
        canViewAnalytics: false,
      };
    }
    const canManage = ctx.role === 'admin' || ctx.role === 'pastor';
    const isHubLeader =
      ctx.role === 'admin' || ctx.role === 'pastor' || ctx.role === 'provincialLeader';
    return {
      role: ctx.role,
      leaderBranchId: ctx.leaderBranchId,
      leaderProvinceId: ctx.leaderProvinceId,
      isDeputy: ctx.isDeputy,
      deputyRole: ctx.deputyRole,
      deputyBranchIds: ctx.deputyBranchIds,
      deputyProvinceIds: ctx.deputyProvinceIds,
      canManage,
      /** Branch cell roles (minister / assistant / secretary) and hub staff/province primary. */
      canAssignDeputies:
        canManage ||
        ctx.role === 'cellLeader' ||
        (!ctx.isDeputy && ctx.role === 'provincialLeader'),
      /** Hub analytics only — cell workspace users stay on their branch. */
      canViewAnalytics: isHubLeader,
    };
  }

  private branchWhere(
    churchId: string,
    role: MinistryCellsRole,
    leaderBranchId: string | null,
    leaderProvinceId: string | null,
    deputyBranchIds: string[] = [],
    deputyProvinceIds: string[] = [],
  ) {
    if (role === 'cellLeader') {
      const ids = Array.from(
        new Set([...(leaderBranchId ? [leaderBranchId] : []), ...deputyBranchIds]),
      );
      if (ids.length === 1) return { churchId, id: ids[0] };
      if (ids.length > 1) return { churchId, id: { in: ids } };
    }
    if (role === 'provincialLeader') {
      const ids = Array.from(
        new Set([...(leaderProvinceId ? [leaderProvinceId] : []), ...deputyProvinceIds]),
      );
      if (ids.length === 1) return { churchId, provinceId: ids[0] };
      if (ids.length > 1) return { churchId, provinceId: { in: ids } };
    }
    return { churchId };
  }

  async listBranches(user: AuthUser, churchId: string) {
    const ctx = await this.access.assertCanAccess(user, churchId);
    const branches = await this.prisma.cellBranch.findMany({
      where: this.branchWhere(
        churchId,
        ctx.role,
        ctx.leaderBranchId,
        ctx.leaderProvinceId,
        ctx.deputyBranchIds,
        ctx.deputyProvinceIds,
      ),
      include: branchListInclude,
      orderBy: { name: 'asc' },
    });
    const latestByBranch = await this.latestAttendanceByBranchIds(
      churchId,
      branches.map((b) => b.id),
    );
    const viewer = await this.memberPrivacy.resolveViewerFromDb(user, churchId);
    const rows = [];
    for (const b of branches) {
      const mapped = this.mapBranchListRow(b, latestByBranch.get(b.id) ?? null);
      const members = await this.memberPrivacy.projectMemberList(
        churchId,
        viewer,
        mapped.members as unknown as Record<string, unknown>[],
      );
      rows.push({ ...mapped, members });
    }
    return rows;
  }

  /**
   * Leadership roster of assigned cell leaders — no member PII payload.
   * Admin/Pastor only (full church). Provincial leaders get province-scoped rows.
   */
  async listCellMinisters(user: AuthUser, churchId: string) {
    const ctx = await this.access.assertCanAccess(user, churchId);
    if (ctx.role !== 'admin' && ctx.role !== 'pastor' && ctx.role !== 'provincialLeader') {
      throw new ForbiddenException('Only church leadership can view the cell ministers roster');
    }

    const where =
      ctx.role === 'provincialLeader'
        ? this.branchWhere(
            churchId,
            ctx.role,
            ctx.leaderBranchId,
            ctx.leaderProvinceId,
            ctx.deputyBranchIds,
            ctx.deputyProvinceIds,
          )
        : { churchId, leaderUserId: { not: null } };

    const branches = await this.prisma.cellBranch.findMany({
      where:
        ctx.role === 'provincialLeader'
          ? { ...where, leaderUserId: { not: null } }
          : where,
      select: {
        id: true,
        name: true,
        location: true,
        postcode: true,
        createdAt: true,
        leader: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { name: 'asc' },
    });

    const latestByBranch = await this.latestAttendanceByBranchIds(
      churchId,
      branches.map((b) => b.id),
    );

    return branches
      .filter((b) => b.leader)
      .map((b) => ({
        id: b.id,
        ministerName: `${b.leader!.firstName} ${b.leader!.lastName}`.trim(),
        ministerEmail: b.leader!.email,
        cellName: b.name,
        createdAt: b.createdAt,
        postcode: b.postcode,
        location: b.location,
        latestAttendance: latestByBranch.get(b.id)
          ? {
              presentCount: latestByBranch.get(b.id)!.presentCount,
              weekStart: latestByBranch.get(b.id)!.weekStart,
            }
          : null,
      }))
      .sort((a, b) => a.ministerName.localeCompare(b.ministerName));
  }

  private async latestAttendanceByBranchIds(churchId: string, branchIds: string[]) {
    const latestByBranch = new Map<string, { presentCount: number; weekStart: Date }>();
    if (!branchIds.length) return latestByBranch;
    const attendanceRows = await this.prisma.cellAttendance.findMany({
      where: { churchId, branchId: { in: branchIds } },
      orderBy: { weekStart: 'desc' },
      select: { branchId: true, presentCount: true, weekStart: true },
    });
    for (const row of attendanceRows) {
      if (!latestByBranch.has(row.branchId)) {
        latestByBranch.set(row.branchId, {
          presentCount: row.presentCount,
          weekStart: row.weekStart,
        });
      }
    }
    return latestByBranch;
  }

  private mapBranchListRow(
    b: Prisma.CellBranchGetPayload<{ include: typeof branchListInclude }>,
    latestAttendance: { presentCount: number; weekStart: Date } | null = null,
  ) {
    return {
      id: b.id,
      name: b.name,
      location: b.location,
      postcode: b.postcode,
      provinceId: b.provinceId,
      province: b.province
        ? {
            id: b.province.id,
            name: b.province.name,
            leader: b.province.leader
              ? {
                  id: b.province.leader.id,
                  name: `${b.province.leader.firstName} ${b.province.leader.lastName}`.trim(),
                  email: b.province.leader.email,
                }
              : null,
          }
        : null,
      createdAt: b.createdAt,
      memberCount: b._count.members,
      incidentCount: b._count.incidents,
      latestAttendance,
      members: b.members.map((row) => ({
        id: row.member.id,
        firstName: row.member.firstName,
        lastName: row.member.lastName,
        name: `${row.member.firstName} ${row.member.lastName}`.trim(),
        email: row.member.email,
        phone: row.member.phone,
        status: row.member.status,
        family: row.member.family
          ? { id: row.member.family.id, name: row.member.family.name }
          : null,
        joinedAt: row.joinedAt,
      })),
      leader: b.leader
        ? {
            id: b.leader.id,
            name: `${b.leader.firstName} ${b.leader.lastName}`.trim(),
            email: b.leader.email,
          }
        : null,
    };
  }

  async createBranch(
    user: AuthUser,
    churchId: string,
    body: {
      name: string;
      location?: string;
      postcode: string;
      leaderUserId?: string;
    },
  ) {
    await this.access.assertLeadership(user, churchId);
    if (!body.name?.trim()) throw new BadRequestException('Branch name is required');
    const postcode = requireCellPostcode(body.postcode);
    if (body.leaderUserId) {
      await this.assertLeaderAvailable(churchId, body.leaderUserId);
    }
    const provinceId = await this.resolveProvinceIdForPostcode(churchId, postcode);
    return this.prisma.cellBranch.create({
      data: {
        churchId,
        name: body.name.trim(),
        location: body.location?.trim() || null,
        postcode,
        provinceId,
        leaderUserId: body.leaderUserId || null,
      },
      include: branchInclude,
    });
  }

  async updateBranch(
    user: AuthUser,
    churchId: string,
    branchId: string,
    body: {
      name?: string;
      location?: string | null;
      postcode?: string;
      leaderUserId?: string | null;
    },
  ) {
    await this.access.assertLeadership(user, churchId);
    await this.getBranchOrThrow(churchId, branchId);
    if (body.leaderUserId) {
      await this.assertLeaderAvailable(churchId, body.leaderUserId, branchId);
    }

    const data: Prisma.CellBranchUncheckedUpdateInput = {};
    if (body.name !== undefined) data.name = body.name.trim();
    if (body.location !== undefined) data.location = body.location?.trim() || null;
    if (body.leaderUserId !== undefined) {
      data.leaderUserId = body.leaderUserId;
    }
    if (body.postcode !== undefined) {
      const postcode = requireCellPostcode(body.postcode);
      data.postcode = postcode;
      data.provinceId = await this.resolveProvinceIdForPostcode(churchId, postcode);
    }
    return this.prisma.cellBranch.update({
      where: { id: branchId },
      data,
      include: branchInclude,
    });
  }

  async deleteBranch(user: AuthUser, churchId: string, branchId: string) {
    await this.access.assertLeadership(user, churchId);
    await this.getBranchOrThrow(churchId, branchId);
    await this.prisma.cellBranch.delete({ where: { id: branchId } });
    return { ok: true };
  }

  async getBranchDetail(user: AuthUser, churchId: string, branchId: string) {
    await this.access.assertBranchAccess(user, churchId, branchId);
    const branch = await this.prisma.cellBranch.findFirst({
      where: { id: branchId, churchId },
      include: {
        ...branchInclude,
        members: {
          include: {
            member: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                status: true,
                family: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });
    if (!branch) throw new NotFoundException('Branch not found');

    const [latestAttendance, openIncidents, openPrayers] = await Promise.all([
      this.prisma.cellAttendance.findFirst({
        where: { branchId, churchId },
        orderBy: { weekStart: 'desc' },
      }),
      this.prisma.cellIncident.count({
        where: { branchId, churchId, status: { in: ['OPEN', 'REVIEWING'] } },
      }),
      this.prisma.cellPrayerRequest.count({
        where: { branchId, churchId, status: { in: ['OPEN', 'PRAYING'] } },
      }),
    ]);

    return {
      id: branch.id,
      name: branch.name,
      location: branch.location,
      postcode: branch.postcode,
      provinceId: branch.provinceId,
      province: branch.province
        ? {
            id: branch.province.id,
            name: branch.province.name,
            leader: branch.province.leader
              ? {
                  id: branch.province.leader.id,
                  name: `${branch.province.leader.firstName} ${branch.province.leader.lastName}`.trim(),
                  email: branch.province.leader.email,
                }
              : null,
          }
        : null,
      createdAt: branch.createdAt,
      leader: branch.leader
        ? {
            id: branch.leader.id,
            name: `${branch.leader.firstName} ${branch.leader.lastName}`.trim(),
            email: branch.leader.email,
          }
        : null,
      deputies: await this.listDeputiesForScope(churchId, { branchId }),
      members: await this.projectBranchMembers(
        user,
        churchId,
        branch.members.map((m) => ({
          id: m.member.id,
          firstName: m.member.firstName,
          lastName: m.member.lastName,
          email: m.member.email,
          phone: m.member.phone,
          status: m.member.status,
          family: m.member.family
            ? { id: m.member.family.id, name: m.member.family.name }
            : null,
          joinedAt: m.joinedAt,
        })),
      ),
      memberCount: branch.members.length,
      latestAttendance,
      openIncidents,
      openPrayers,
    };
  }

  private async projectBranchMembers(
    user: AuthUser,
    churchId: string,
    members: Record<string, unknown>[],
  ) {
    const viewer = await this.memberPrivacy.resolveViewerFromDb(user, churchId);
    return this.memberPrivacy.projectMemberList(churchId, viewer, members);
  }

  async listBranchDeputies(user: AuthUser, churchId: string, branchId: string) {
    await this.access.assertBranchAccess(user, churchId, branchId);
    await this.getBranchOrThrow(churchId, branchId);
    return this.listDeputiesForScope(churchId, { branchId });
  }

  async listProvinceDeputies(user: AuthUser, churchId: string, provinceId: string) {
    await this.access.assertProvinceLeadership(user, churchId, provinceId);
    return this.listDeputiesForScope(churchId, { provinceId });
  }

  /** Active church users for Assistant/Secretary pickers — assigners only. */
  async listDeputyCandidates(
    user: AuthUser,
    churchId: string,
    scope: { branchId?: string; provinceId?: string },
  ) {
    await this.access.assertCanAssignDeputies(user, churchId, scope);
    if (scope.branchId) await this.getBranchOrThrow(churchId, scope.branchId);
    if (scope.provinceId) {
      const province = await this.prisma.cellProvince.findFirst({
        where: { id: scope.provinceId, churchId },
        select: { id: true },
      });
      if (!province) throw new NotFoundException('Province not found');
    }
    const users = await this.prisma.user.findMany({
      where: { churchId, isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      take: 500,
    });
    return users.map((u) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`.trim(),
      email: u.email,
    }));
  }

  async assignBranchDeputy(
    user: AuthUser,
    churchId: string,
    branchId: string,
    body: AssignCellDeputyDto,
  ) {
    await this.access.assertCanAssignDeputies(user, churchId, { branchId });
    const branch = await this.getBranchOrThrow(churchId, branchId);
    return this.upsertDeputy(churchId, {
      scope: 'BRANCH',
      branchId,
      provinceId: null,
      role: body.role,
      body,
      primaryLeaderUserId: branch.leaderUserId,
    });
  }

  async assignProvinceDeputy(
    user: AuthUser,
    churchId: string,
    provinceId: string,
    body: AssignCellDeputyDto,
  ) {
    await this.access.assertCanAssignDeputies(user, churchId, { provinceId });
    const province = await this.prisma.cellProvince.findFirst({
      where: { id: provinceId, churchId },
      select: { id: true, leaderUserId: true },
    });
    if (!province) throw new NotFoundException('Province not found');
    return this.upsertDeputy(churchId, {
      scope: 'PROVINCE',
      branchId: null,
      provinceId,
      role: body.role,
      body,
      primaryLeaderUserId: province.leaderUserId,
    });
  }

  async removeBranchDeputy(
    user: AuthUser,
    churchId: string,
    branchId: string,
    deputyId: string,
  ) {
    await this.access.assertCanAssignDeputies(user, churchId, { branchId });
    return this.removeDeputy(churchId, deputyId, { branchId });
  }

  async removeProvinceDeputy(
    user: AuthUser,
    churchId: string,
    provinceId: string,
    deputyId: string,
  ) {
    await this.access.assertCanAssignDeputies(user, churchId, { provinceId });
    return this.removeDeputy(churchId, deputyId, { provinceId });
  }

  private async listDeputiesForScope(
    churchId: string,
    scope: { branchId?: string; provinceId?: string },
  ) {
    const rows = await this.prisma.cellLeadershipDeputy.findMany({
      where: {
        churchId,
        ...(scope.branchId
          ? { scope: 'BRANCH', branchId: scope.branchId }
          : { scope: 'PROVINCE', provinceId: scope.provinceId }),
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { role: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      role: r.role as CellDeputyRole,
      assignedAt: r.assignedAt,
      user: {
        id: r.user.id,
        name: `${r.user.firstName} ${r.user.lastName}`.trim(),
        email: r.user.email,
      },
    }));
  }

  private async upsertDeputy(
    churchId: string,
    args: {
      scope: 'BRANCH' | 'PROVINCE';
      branchId: string | null;
      provinceId: string | null;
      role: CellDeputyRole;
      body: AssignCellDeputyDto;
      primaryLeaderUserId: string | null;
    },
  ) {
    if (!isCellDeputyRole(args.role)) {
      throw new BadRequestException('role must be ASSISTANT or SECRETARY');
    }
    const userId = await this.resolveDeputyUserId(churchId, args.body);
    if (args.primaryLeaderUserId && args.primaryLeaderUserId === userId) {
      throw new BadRequestException(
        'The primary leader cannot also be assigned as Assistant or Secretary',
      );
    }

    const existingSlot = await this.prisma.cellLeadershipDeputy.findFirst({
      where:
        args.scope === 'BRANCH'
          ? { churchId, branchId: args.branchId!, role: args.role }
          : { churchId, provinceId: args.provinceId!, role: args.role },
      select: { id: true, userId: true },
    });
    if (existingSlot && existingSlot.userId !== userId) {
      throw new BadRequestException(
        `This ${args.scope === 'BRANCH' ? 'cell' : 'province'} already has a ${
          args.role === 'ASSISTANT' ? 'Assistant' : 'Secretary'
        }. Remove them first.`,
      );
    }

    const existingUser = await this.prisma.cellLeadershipDeputy.findFirst({
      where: {
        churchId,
        userId,
        ...(args.scope === 'BRANCH'
          ? { branchId: args.branchId! }
          : { provinceId: args.provinceId! }),
      },
      select: { id: true, role: true },
    });
    if (existingUser && existingUser.role !== args.role) {
      throw new BadRequestException(
        'This person already holds the other deputy role for this scope. Remove them first.',
      );
    }

    const row = existingSlot
      ? await this.prisma.cellLeadershipDeputy.update({
          where: { id: existingSlot.id },
          data: { userId, role: args.role },
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        })
      : await this.prisma.cellLeadershipDeputy.create({
          data: {
            churchId,
            scope: args.scope,
            branchId: args.branchId,
            provinceId: args.provinceId,
            userId,
            role: args.role,
          },
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        });

    return {
      id: row.id,
      role: row.role as CellDeputyRole,
      assignedAt: row.assignedAt,
      user: {
        id: row.user.id,
        name: `${row.user.firstName} ${row.user.lastName}`.trim(),
        email: row.user.email,
      },
    };
  }

  private async removeDeputy(
    churchId: string,
    deputyId: string,
    scope: { branchId?: string; provinceId?: string },
  ) {
    const existing = await this.prisma.cellLeadershipDeputy.findFirst({
      where: {
        id: deputyId,
        churchId,
        ...(scope.branchId
          ? { branchId: scope.branchId }
          : { provinceId: scope.provinceId }),
      },
    });
    if (!existing) throw new NotFoundException('Deputy assignment not found');
    await this.prisma.cellLeadershipDeputy.delete({ where: { id: deputyId } });
    return { ok: true };
  }

  private async resolveDeputyUserId(
    churchId: string,
    body: AssignCellDeputyDto,
  ): Promise<string> {
    if (body.userId?.trim()) {
      const user = await this.prisma.user.findFirst({
        where: { id: body.userId.trim(), churchId, isActive: true },
        select: { id: true },
      });
      if (!user) throw new NotFoundException('User not found in this church');
      return user.id;
    }

    const email = body.email?.trim().toLowerCase();
    if (email) {
      const byEmail = await this.prisma.user.findFirst({
        where: { churchId, email, isActive: true },
        select: { id: true },
      });
      if (byEmail) return byEmail.id;
    }

    const firstName = body.firstName?.trim();
    const lastName = body.lastName?.trim();
    if (!firstName || !lastName) {
      throw new BadRequestException('Provide userId or first and last name');
    }

    // Prefer an existing member-linked user before creating a bare user account.
    if (email) {
      const member = await this.prisma.member.findFirst({
        where: { churchId, email },
        select: { userId: true, id: true },
      });
      if (member?.userId) return member.userId;
    }

    throw new BadRequestException(
      'Deputy must be an existing church user. Create their account first, then assign Assistant or Secretary.',
    );
  }

  async addMember(
    user: AuthUser,
    churchId: string,
    branchId: string,
    memberId: string,
  ) {
    await this.access.assertBranchAccess(user, churchId, branchId);
    await this.getBranchOrThrow(churchId, branchId);
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, churchId },
    });
    if (!member) throw new NotFoundException('Member not found');
    const existing = await this.prisma.cellBranchMember.findUnique({
      where: { churchId_memberId: { churchId, memberId } },
    });
    if (existing && existing.branchId !== branchId) {
      throw new BadRequestException('Member is already assigned to another cell branch');
    }
    if (existing) return existing;
    return this.prisma.cellBranchMember.create({
      data: { churchId, branchId, memberId },
    });
  }

  /**
   * Create a new church member when search finds no match, then attach to this branch.
   * Accepts the global congregant editor payload and writes to the membership database.
   */
  async createMemberAndAdd(
    user: AuthUser,
    churchId: string,
    branchId: string,
    data: Record<string, unknown>,
  ) {
    await this.access.assertBranchAccess(user, churchId, branchId);
    await this.getBranchOrThrow(churchId, branchId);
    const viewer = await this.memberPrivacy.resolveViewerFromDb(user, churchId);
    const sanitized = this.memberPrivacy.sanitizeOpsMemberWritePayload(viewer, data);
    const firstName = String(sanitized.firstName ?? '').trim();
    const lastName = String(sanitized.lastName ?? '').trim();
    if (!firstName || !lastName) {
      throw new BadRequestException('First name and last name are required');
    }
    const created = await this.membership.createMember(churchId, {
      ...(sanitized as Parameters<MembershipService['createMember']>[1]),
      firstName,
      lastName,
      cellBranchId: branchId,
      startOnboarding: sanitized.startOnboarding === true,
      requireContactFields: sanitized.requireContactFields !== false,
    });
    const row = await this.prisma.cellBranchMember.findUnique({
      where: { churchId_memberId: { churchId, memberId: created.id } },
    });
    if (!row) {
      await this.addMember(user, churchId, branchId, created.id);
    }
    return this.memberPrivacy.projectMember(
      churchId,
      viewer,
      created as unknown as Record<string, unknown>,
    );
  }

  async getRegistryCatalog(user: AuthUser, churchId: string) {
    await this.access.assertCanAccess(user, churchId);
    return this.registry.getRegistryCatalog(churchId);
  }

  async removeMember(
    user: AuthUser,
    churchId: string,
    branchId: string,
    memberId: string,
  ) {
    await this.access.assertBranchAccess(user, churchId, branchId);
    const row = await this.prisma.cellBranchMember.findFirst({
      where: { churchId, branchId, memberId },
    });
    if (!row) throw new NotFoundException('Member not in this branch');
    await this.prisma.cellBranchMember.delete({ where: { id: row.id } });
    return { ok: true };
  }

  async listForms(user: AuthUser, churchId: string) {
    await this.access.assertCanAccess(user, churchId);
    return this.prisma.cellFormDefinition.findMany({
      where: { churchId },
      orderBy: [{ kind: 'asc' }, { name: 'asc' }],
    });
  }

  async upsertForm(
    user: AuthUser,
    churchId: string,
    body: {
      id?: string;
      kind: CellFormKind;
      name: string;
      description?: string;
      fields?: unknown;
      isActive?: boolean;
    },
  ) {
    await this.access.assertLeadership(user, churchId);
    if (body.id) {
      return this.prisma.cellFormDefinition.update({
        where: { id: body.id },
        data: {
          kind: body.kind,
          name: body.name.trim(),
          description: body.description?.trim() || null,
          fields: (body.fields ?? []) as Prisma.InputJsonValue,
          isActive: body.isActive,
        },
      });
    }
    return this.prisma.cellFormDefinition.create({
      data: {
        churchId,
        kind: body.kind,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        fields: (body.fields ?? []) as Prisma.InputJsonValue,
        isActive: body.isActive ?? true,
      },
    });
  }

  async seedDefaultForms(user: AuthUser, churchId: string) {
    await this.access.assertLeadership(user, churchId);
    const existing = await this.prisma.cellFormDefinition.count({ where: { churchId } });
    if (existing > 0) return { seeded: false };
    await this.prisma.cellFormDefinition.createMany({
      data: [
        {
          churchId,
          kind: 'WEEKLY_REPORT',
          name: 'Weekly Cell Report',
          description: 'Standard weekly meeting report',
          fields: [
            { key: 'meetingHeld', label: 'Meeting held?', type: 'boolean' },
            { key: 'attendance', label: 'Attendance count', type: 'number' },
            { key: 'newVisitors', label: 'New visitors', type: 'number' },
            { key: 'highlights', label: 'Highlights', type: 'text' },
            { key: 'prayerNeeds', label: 'Prayer needs', type: 'text' },
          ] as Prisma.InputJsonValue,
        },
        {
          churchId,
          kind: 'INCIDENT',
          name: 'Incident Report',
          description: 'Report an incident in your cell',
          fields: [
            { key: 'title', label: 'Title', type: 'text', required: true },
            { key: 'description', label: 'Description', type: 'text', required: true },
            { key: 'severity', label: 'Severity', type: 'select', options: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
          ] as Prisma.InputJsonValue,
        },
      ],
    });
    return { seeded: true };
  }

  async listTeaching(user: AuthUser, churchId: string) {
    await this.access.assertCanAccess(user, churchId);
    return this.prisma.cellTeachingResource.findMany({
      where: { churchId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async upsertTeaching(
    user: AuthUser,
    churchId: string,
    body: {
      id?: string;
      title: string;
      description?: string;
      fileUrl?: string;
      content?: string;
      sortOrder?: number;
    },
  ) {
    await this.access.assertLeadership(user, churchId);
    if (body.id) {
      return this.prisma.cellTeachingResource.update({
        where: { id: body.id },
        data: {
          title: body.title.trim(),
          description: body.description?.trim() || null,
          fileUrl: body.fileUrl || null,
          content: body.content || null,
          sortOrder: body.sortOrder,
        },
      });
    }
    return this.prisma.cellTeachingResource.create({
      data: {
        churchId,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        fileUrl: body.fileUrl || null,
        content: body.content || null,
        sortOrder: body.sortOrder ?? 0,
      },
    });
  }

  async deleteTeaching(user: AuthUser, churchId: string, id: string) {
    await this.access.assertLeadership(user, churchId);
    await this.prisma.cellTeachingResource.delete({ where: { id } });
    return { ok: true };
  }

  async submitReport(
    user: AuthUser,
    churchId: string,
    branchId: string,
    body: { formId: string; payload: Record<string, unknown> },
  ) {
    await this.access.assertBranchAccess(user, churchId, branchId);
    const form = await this.prisma.cellFormDefinition.findFirst({
      where: { id: body.formId, churchId, isActive: true },
    });
    if (!form) throw new NotFoundException('Form not found');
    const report = await this.prisma.cellReport.create({
      data: {
        churchId,
        branchId,
        formId: body.formId,
        submittedByUserId: user.userId,
        payload: body.payload as Prisma.InputJsonValue,
      },
    });
    if (form.kind === 'INCIDENT') {
      const title = String(body.payload.title ?? 'Incident report');
      const description = String(body.payload.description ?? '');
      const severity = (body.payload.severity as CellIncidentSeverity) ?? 'MEDIUM';
      await this.prisma.cellIncident.create({
        data: {
          churchId,
          branchId,
          title,
          description: description || title,
          severity,
          reportedByUserId: user.userId,
        },
      });
    }
    return report;
  }

  async listReports(user: AuthUser, churchId: string, branchId: string) {
    await this.access.assertBranchAccess(user, churchId, branchId);
    return this.prisma.cellReport.findMany({
      where: { churchId, branchId },
      include: {
        form: { select: { id: true, name: true, kind: true } },
        submittedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { submittedAt: 'desc' },
      take: 50,
    });
  }

  private nonNegInt(value: unknown, field: string): number {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!/^\d+$/.test(trimmed)) {
        throw new BadRequestException(`${field} must be a whole number`);
      }
      return Number(trimmed);
    }
    if (typeof value === 'number') {
      if (!Number.isInteger(value) || value < 0) {
        throw new BadRequestException(`${field} must be a non-negative whole number`);
      }
      return value;
    }
    throw new BadRequestException(`${field} must be a whole number`);
  }

  private startOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private formatWeekLabel(date: Date): string {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  async recordAttendance(
    user: AuthUser,
    churchId: string,
    branchId: string,
    body: {
      weekStart?: string;
      meetingDate?: string;
      presentCount?: number;
      absentCount?: number;
      maleCount?: number;
      femaleCount?: number;
      boysCount?: number;
      girlsCount?: number;
      testifiersCount?: number;
      firstTimersCount?: number;
      notes?: string;
      meetingId?: string;
    },
  ) {
    await this.access.assertBranchAccess(user, churchId, branchId);

    const maleCount = this.nonNegInt(body.maleCount, 'maleCount');
    const femaleCount = this.nonNegInt(body.femaleCount, 'femaleCount');
    const boysCount = this.nonNegInt(body.boysCount, 'boysCount');
    const girlsCount = this.nonNegInt(body.girlsCount, 'girlsCount');
    const testifiersCount = this.nonNegInt(body.testifiersCount, 'testifiersCount');
    const firstTimersCount = this.nonNegInt(body.firstTimersCount, 'firstTimersCount');

    const demographicTotal = maleCount + femaleCount + boysCount + girlsCount;
    const presentCount =
      body.presentCount != null && Number.isFinite(Number(body.presentCount))
        ? this.nonNegInt(body.presentCount, 'presentCount')
        : demographicTotal;

    const meetingDate = body.meetingDate
      ? new Date(body.meetingDate)
      : body.weekStart
        ? new Date(body.weekStart)
        : new Date();
    if (Number.isNaN(meetingDate.getTime())) {
      throw new BadRequestException('Invalid meeting date');
    }
    const weekStart = body.weekStart ? new Date(body.weekStart) : this.startOfWeek(meetingDate);
    if (Number.isNaN(weekStart.getTime())) {
      throw new BadRequestException('Invalid week start');
    }

    return this.prisma.cellAttendance.create({
      data: {
        churchId,
        branchId,
        meetingId: body.meetingId || null,
        weekStart,
        meetingDate,
        presentCount,
        absentCount:
          body.absentCount != null ? this.nonNegInt(body.absentCount, 'absentCount') : null,
        maleCount,
        femaleCount,
        boysCount,
        girlsCount,
        testifiersCount,
        firstTimersCount,
        notes: body.notes?.trim() || null,
        recordedByUserId: user.userId,
      },
    }).then(async (row) => {
      await this.notifyLeadershipOfAttendance(churchId, branchId, row, 'created');
      return row;
    });
  }

  async updateAttendance(
    user: AuthUser,
    churchId: string,
    branchId: string,
    attendanceId: string,
    body: {
      weekStart?: string;
      meetingDate?: string;
      presentCount?: number;
      absentCount?: number;
      maleCount?: number;
      femaleCount?: number;
      boysCount?: number;
      girlsCount?: number;
      testifiersCount?: number;
      firstTimersCount?: number;
      notes?: string;
    },
  ) {
    await this.access.assertBranchAccess(user, churchId, branchId);
    const existing = await this.prisma.cellAttendance.findFirst({
      where: { id: attendanceId, churchId, branchId },
    });
    if (!existing) throw new NotFoundException('Attendance record not found');

    const maleCount =
      body.maleCount != null ? this.nonNegInt(body.maleCount, 'maleCount') : existing.maleCount;
    const femaleCount =
      body.femaleCount != null
        ? this.nonNegInt(body.femaleCount, 'femaleCount')
        : existing.femaleCount;
    const boysCount =
      body.boysCount != null ? this.nonNegInt(body.boysCount, 'boysCount') : existing.boysCount;
    const girlsCount =
      body.girlsCount != null ? this.nonNegInt(body.girlsCount, 'girlsCount') : existing.girlsCount;
    const testifiersCount =
      body.testifiersCount != null
        ? this.nonNegInt(body.testifiersCount, 'testifiersCount')
        : existing.testifiersCount;
    const firstTimersCount =
      body.firstTimersCount != null
        ? this.nonNegInt(body.firstTimersCount, 'firstTimersCount')
        : existing.firstTimersCount;

    const demographicTotal = maleCount + femaleCount + boysCount + girlsCount;
    const presentCount =
      body.presentCount != null
        ? this.nonNegInt(body.presentCount, 'presentCount')
        : demographicTotal > 0
          ? demographicTotal
          : existing.presentCount;

    const meetingDate = body.meetingDate
      ? new Date(body.meetingDate)
      : existing.meetingDate ?? existing.weekStart;
    if (Number.isNaN(meetingDate.getTime())) {
      throw new BadRequestException('Invalid meeting date');
    }
    const weekStart = body.weekStart
      ? new Date(body.weekStart)
      : this.startOfWeek(meetingDate);

    const row = await this.prisma.cellAttendance.update({
      where: { id: attendanceId },
      data: {
        weekStart,
        meetingDate,
        presentCount,
        absentCount:
          body.absentCount != null && Number.isFinite(body.absentCount)
            ? Math.floor(body.absentCount)
            : existing.absentCount,
        maleCount,
        femaleCount,
        boysCount,
        girlsCount,
        testifiersCount,
        firstTimersCount,
        notes: body.notes !== undefined ? body.notes?.trim() || null : existing.notes,
      },
    });

    await this.notifyLeadershipOfAttendance(churchId, branchId, row, 'updated');
    return row;
  }

  private async notifyLeadershipOfAttendance(
    churchId: string,
    branchId: string,
    row: {
      id: string;
      weekStart: Date;
      meetingDate: Date | null;
      presentCount: number;
      maleCount: number;
      femaleCount: number;
      boysCount: number;
      girlsCount: number;
      testifiersCount: number;
      firstTimersCount: number;
      createdAt: Date;
    },
    action: 'created' | 'updated',
  ) {
    const branch = await this.prisma.cellBranch.findFirst({
      where: { id: branchId, churchId },
      select: { name: true },
    });
    const branchName = branch?.name ?? 'Branch/Cell';
    const meetingDate = row.meetingDate ?? row.weekStart;
    const dateLabel = meetingDate.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const timestamp = new Date().toISOString();
    const title = `[Attendance Report] ${branchName} — ${dateLabel}`;
    const body = [
      `Tags: Branch/Cell Name · Date · Attendance Report · Timestamp`,
      ``,
      `Branch/Cell Name: ${branchName}`,
      `Date: ${dateLabel}`,
      `Attendance Report: ${action === 'created' ? 'New' : 'Updated'} weekly attendance`,
      `Timestamp: ${timestamp}`,
      ``,
      `Male: ${row.maleCount}`,
      `Female: ${row.femaleCount}`,
      `Boys: ${row.boysCount}`,
      `Girls: ${row.girlsCount}`,
      `Testifiers: ${row.testifiersCount}`,
      `First Timers: ${row.firstTimersCount}`,
      `Total present: ${row.presentCount}`,
    ].join('\n');

    const staffUsers = await this.prisma.user.findMany({
      where: {
        churchId,
        isActive: true,
        roles: { some: { role: { name: { in: ['ADMIN', 'PASTOR'] } } } },
      },
      select: { id: true },
    });

    const recipientIds = new Set(staffUsers.map((u) => u.id));
    const branchMeta = await this.prisma.cellBranch.findFirst({
      where: { id: branchId, churchId },
      select: {
        provinceId: true,
        province: { select: { leaderUserId: true, leader: { select: { id: true, isActive: true } } } },
      },
    });
    const pl = branchMeta?.province?.leader;
    if (pl?.isActive) {
      recipientIds.add(pl.id);
    }

    for (const targetUserId of recipientIds) {
      await this.commQueue.enqueue(churchId, {
        kind: 'DEPARTMENT_WEEKLY_REPORT',
        title,
        body,
        channels: ['IN_APP'],
        targetUserId,
        metadata: {
          tags: ['Branch/Cell Name', 'Date', 'Attendance Report', 'Timestamp'],
          branchId,
          branchName,
          date: dateLabel,
          reportType: 'Attendance Report',
          timestamp,
          attendanceId: row.id,
          action,
          presentCount: row.presentCount,
          maleCount: row.maleCount,
          femaleCount: row.femaleCount,
          boysCount: row.boysCount,
          girlsCount: row.girlsCount,
          firstTimersCount: row.firstTimersCount,
          testifiersCount: row.testifiersCount,
        },
      });
    }
  }

  /**
   * Full cell/ministry digest: one row per province → one Admin + one Pastor.
   * Sent via REPORTS SMTP. Window defaults to the Mon–Sun week containing `asOf`.
   */
  async sendFullCellDigest(churchId: string, asOfInput?: string) {
    await this.access.assertModuleEnabled(churchId);
    const asOf = asOfInput ? new Date(asOfInput) : new Date();
    if (Number.isNaN(asOf.getTime())) {
      throw new BadRequestException('Invalid date');
    }
    const weekStart = this.startOfWeek(asOf);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekLabel = `${weekStart.toISOString().slice(0, 10)} → ${new Date(weekEnd.getTime() - 86400000).toISOString().slice(0, 10)}`;

    const provinces = await this.prisma.cellProvince.findMany({
      where: { churchId },
      select: {
        id: true,
        name: true,
        branches: { select: { id: true } },
      },
      orderBy: { name: 'asc' },
    });

    const allBranchIds = provinces.flatMap((p) => p.branches.map((b) => b.id));
    const attendance = allBranchIds.length
      ? await this.prisma.cellAttendance.findMany({
          where: {
            churchId,
            branchId: { in: allBranchIds },
            weekStart: { gte: weekStart, lt: weekEnd },
          },
          select: {
            branchId: true,
            presentCount: true,
            maleCount: true,
            femaleCount: true,
            boysCount: true,
            girlsCount: true,
            testifiersCount: true,
            firstTimersCount: true,
          },
        })
      : [];

    type Acc = {
      present: number;
      male: number;
      female: number;
      boys: number;
      girls: number;
      testifiers: number;
      firstTimers: number;
      records: number;
    };
    const empty = (): Acc => ({
      present: 0,
      male: 0,
      female: 0,
      boys: 0,
      girls: 0,
      testifiers: 0,
      firstTimers: 0,
      records: 0,
    });

    const rows = provinces.map((province) => {
      const branchIds = new Set(province.branches.map((b) => b.id));
      const totals = attendance
        .filter((a) => branchIds.has(a.branchId))
        .reduce((acc, r) => {
          acc.present += r.presentCount;
          acc.male += r.maleCount;
          acc.female += r.femaleCount;
          acc.boys += r.boysCount;
          acc.girls += r.girlsCount;
          acc.testifiers += r.testifiersCount;
          acc.firstTimers += r.firstTimersCount;
          acc.records += 1;
          return acc;
        }, empty());
      return {
        name: province.name,
        branchCount: province.branches.length,
        ...totals,
      };
    });

    const church = await this.prisma.church.findFirst({
      where: { id: churchId },
      select: { name: true },
    });
    const churchName = church?.name ?? 'Church';
    const subject = `${churchName} — Cell/Ministry weekly digest (${weekLabel})`;

    const tableRows = rows
      .map(
        (r) =>
          `<tr>
            <td style="padding:8px;border:1px solid #ddd">${escapeHtml(r.name)}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right">${r.branchCount}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right">${r.records}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right">${r.present}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right">${r.male}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right">${r.female}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right">${r.boys}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right">${r.girls}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right">${r.testifiers}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right">${r.firstTimers}</td>
          </tr>`,
      )
      .join('');

    const html = `
      <p>Cell/Ministry province summary for <strong>${escapeHtml(churchName)}</strong> (${escapeHtml(weekLabel)}).</p>
      <table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:14px">
        <thead>
          <tr style="background:#f5f5f5">
            <th style="padding:8px;border:1px solid #ddd;text-align:left">Province</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right">Cells</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right">Reports</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right">Present</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right">Male</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right">Female</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right">Boys</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right">Girls</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right">Testifiers</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right">First timers</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows || `<tr><td colspan="10" style="padding:8px;border:1px solid #ddd">No provinces configured</td></tr>`}
        </tbody>
      </table>
      <p style="color:#666;font-size:12px;margin-top:16px">Sent automatically Saturdays at 21:00 Europe/London, or on demand from Church Hub.</p>
    `;

    const text = [
      `Cell/Ministry province summary for ${churchName} (${weekLabel})`,
      '',
      'Province | Cells | Reports | Present | Male | Female | Boys | Girls | Testifiers | First timers',
      ...rows.map(
        (r) =>
          `${r.name} | ${r.branchCount} | ${r.records} | ${r.present} | ${r.male} | ${r.female} | ${r.boys} | ${r.girls} | ${r.testifiers} | ${r.firstTimers}`,
      ),
    ].join('\n');

    const recipients = await findOneAdminAndOnePastor(this.prisma, churchId);
    let emailed = 0;
    for (const recipient of recipients) {
      await this.email.send({
        to: recipient.email,
        subject,
        body: text,
        html,
        churchId,
        purpose: 'reports',
      });
      await trySendWhatsApp(this.sms, this.logger, {
        to: recipient.phone,
        body: `${subject}\n\n${text}`,
        churchId,
        label: 'Cell weekly digest',
      });
      await this.prisma.notification.create({
        data: {
          churchId,
          userId: recipient.id,
          title: subject,
          body: text.slice(0, 2000),
          type: 'DEPARTMENT_WEEKLY_REPORT',
          data: {
            digest: true,
            cellDigest: true,
            weekStart: weekStart.toISOString(),
            role: recipient.role,
          } as Prisma.InputJsonValue,
        },
      });
      emailed++;
    }

    return {
      weekLabel,
      provinces: rows.length,
      recipients: recipients.map((r) => ({ role: r.role, email: r.email })),
      emailed,
    };
  }

  async runCellDigestsForAllChurches() {
    const churches = await this.prisma.church.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    let digests = 0;
    for (const church of churches) {
      try {
        await this.sendFullCellDigest(church.id);
        digests++;
      } catch (err) {
        // Module may be disabled for some churches
        if (err instanceof ForbiddenException || err instanceof NotFoundException) {
          continue;
        }
        throw err;
      }
    }
    return { churches: churches.length, digests };
  }

  /** Saturday 21:00 Europe/London unless a platform owner set another window. */
  async runDueCellDigests(now = new Date()) {
    const churches = await this.prisma.church.findMany({
      where: { isActive: true },
      select: { id: true, timezone: true, settings: true },
    });
    let digests = 0;
    for (const church of churches) {
      const schedule = readOperationalEmailSchedules(church.settings, church.timezone).cellDigest;
      const slot = isExactHourDue(now, schedule);
      const key = `${church.id}:${slot.dateKey}`;
      if (!slot.due || this.cellDigestSent.has(key)) continue;
      this.cellDigestSent.add(key);
      try {
        await this.sendFullCellDigest(church.id);
        digests++;
      } catch (err) {
        this.cellDigestSent.delete(key);
        if (err instanceof ForbiddenException || err instanceof NotFoundException) continue;
        throw err;
      }
    }
    return { churches: churches.length, digests };
  }

  async listAttendance(user: AuthUser, churchId: string, branchId: string) {
    await this.access.assertBranchAccess(user, churchId, branchId);
    return this.prisma.cellAttendance.findMany({
      where: { churchId, branchId },
      orderBy: { weekStart: 'desc' },
      take: 26,
    });
  }

  /** Last 4 weeks of demographic totals + growth for a single branch. */
  async getBranchAnalytics(user: AuthUser, churchId: string, branchId: string) {
    await this.access.assertBranchAccess(user, churchId, branchId);
    await this.getBranchOrThrow(churchId, branchId);

    const now = new Date();
    const windowStart = this.startOfWeek(new Date(now));
    windowStart.setDate(windowStart.getDate() - 21);

    const rows = await this.prisma.cellAttendance.findMany({
      where: {
        churchId,
        branchId,
        weekStart: { gte: windowStart },
      },
      orderBy: { weekStart: 'asc' },
      select: {
        weekStart: true,
        meetingDate: true,
        presentCount: true,
        maleCount: true,
        femaleCount: true,
        boysCount: true,
        girlsCount: true,
        testifiersCount: true,
        firstTimersCount: true,
      },
    });

    type Bucket = {
      weekStart: string;
      label: string;
      male: number;
      female: number;
      boys: number;
      girls: number;
      testifiers: number;
      firstTimers: number;
      total: number;
    };

    const byWeek = new Map<string, Bucket>();
    for (const row of rows) {
      const key = this.startOfWeek(row.weekStart).toISOString().slice(0, 10);
      const existing = byWeek.get(key) ?? {
        weekStart: key,
        label: this.formatWeekLabel(this.startOfWeek(row.weekStart)),
        male: 0,
        female: 0,
        boys: 0,
        girls: 0,
        testifiers: 0,
        firstTimers: 0,
        total: 0,
      };
      existing.male += row.maleCount;
      existing.female += row.femaleCount;
      existing.boys += row.boysCount;
      existing.girls += row.girlsCount;
      existing.testifiers += row.testifiersCount;
      existing.firstTimers += row.firstTimersCount;
      const demoSum = row.maleCount + row.femaleCount + row.boysCount + row.girlsCount;
      existing.total += demoSum > 0 ? demoSum : row.presentCount;
      byWeek.set(key, existing);
    }

    const weeks: Bucket[] = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      const start = this.startOfWeek(d);
      const key = start.toISOString().slice(0, 10);
      weeks.push(
        byWeek.get(key) ?? {
          weekStart: key,
          label: this.formatWeekLabel(start),
          male: 0,
          female: 0,
          boys: 0,
          girls: 0,
          testifiers: 0,
          firstTimers: 0,
          total: 0,
        },
      );
    }

    const totals = weeks.reduce(
      (acc, w) => ({
        male: acc.male + w.male,
        female: acc.female + w.female,
        boys: acc.boys + w.boys,
        girls: acc.girls + w.girls,
        testifiers: acc.testifiers + w.testifiers,
        firstTimers: acc.firstTimers + w.firstTimers,
        total: acc.total + w.total,
      }),
      { male: 0, female: 0, boys: 0, girls: 0, testifiers: 0, firstTimers: 0, total: 0 },
    );

    const firstHalf = weeks.slice(0, 2).reduce((s, w) => s + w.total, 0);
    const secondHalf = weeks.slice(2, 4).reduce((s, w) => s + w.total, 0);
    const growthPercent =
      firstHalf === 0
        ? secondHalf > 0
          ? 100
          : 0
        : Math.round(((secondHalf - firstHalf) / firstHalf) * 1000) / 10;

    const demographicPie = [
      { name: 'Male', value: totals.male },
      { name: 'Female', value: totals.female },
      { name: 'Boys', value: totals.boys },
      { name: 'Girls', value: totals.girls },
    ].filter((d) => d.value > 0);

    return {
      periodWeeks: 4,
      windowStart: windowStart.toISOString(),
      weeks,
      totals,
      growthPercent,
      demographicPie,
      firstTimersTotal: totals.firstTimers,
      testifiersTotal: totals.testifiers,
    };
  }

  async listIncidents(user: AuthUser, churchId: string, branchId: string) {
    await this.access.assertBranchAccess(user, churchId, branchId);
    return this.prisma.cellIncident.findMany({
      where: { churchId, branchId },
      include: {
        reportedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateIncident(
    user: AuthUser,
    churchId: string,
    incidentId: string,
    body: { status?: CellIncidentStatus; severity?: CellIncidentSeverity },
  ) {
    const ctx = await this.access.assertCanAccess(user, churchId);
    const incident = await this.prisma.cellIncident.findFirst({
      where: { id: incidentId, churchId },
    });
    if (!incident) throw new NotFoundException('Incident not found');
    if (ctx.role === 'cellLeader' && ctx.leaderBranchId !== incident.branchId) {
      throw new ForbiddenException('Cannot update incidents for other branches');
    }
    return this.prisma.cellIncident.update({
      where: { id: incidentId },
      data: { status: body.status, severity: body.severity },
    });
  }

  async listPrayers(user: AuthUser, churchId: string, branchId: string) {
    await this.access.assertBranchAccess(user, churchId, branchId);
    return this.prisma.cellPrayerRequest.findMany({
      where: { churchId, branchId },
      include: {
        member: { select: { firstName: true, lastName: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPrayer(
    user: AuthUser,
    churchId: string,
    branchId: string,
    body: {
      title: string;
      body?: string;
      memberId?: string;
      isAnonymous?: boolean;
    },
  ) {
    await this.access.assertBranchAccess(user, churchId, branchId);
    return this.prisma.cellPrayerRequest.create({
      data: {
        churchId,
        branchId,
        title: body.title.trim(),
        body: body.body?.trim() || null,
        memberId: body.isAnonymous ? null : body.memberId || null,
        isAnonymous: body.isAnonymous ?? false,
        createdByUserId: user.userId,
      },
    });
  }

  async updatePrayer(
    user: AuthUser,
    churchId: string,
    prayerId: string,
    body: { status?: CellPrayerStatus },
  ) {
    const ctx = await this.access.assertCanAccess(user, churchId);
    const prayer = await this.prisma.cellPrayerRequest.findFirst({
      where: { id: prayerId, churchId },
    });
    if (!prayer) throw new NotFoundException('Prayer request not found');
    if (ctx.role === 'cellLeader' && ctx.leaderBranchId !== prayer.branchId) {
      throw new ForbiddenException('Cannot update prayers for other branches');
    }
    return this.prisma.cellPrayerRequest.update({
      where: { id: prayerId },
      data: { status: body.status },
    });
  }

  async listMessages(user: AuthUser, churchId: string, branchId: string) {
    await this.access.assertBranchAccess(user, churchId, branchId);
    return this.prisma.cellMessage.findMany({
      where: {
        churchId,
        branchId,
        OR: [{ fromUserId: user.userId }, { toUserId: user.userId }],
      },
      include: {
        fromUser: { select: { id: true, firstName: true, lastName: true } },
        toUser: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
  }

  async sendMessage(
    user: AuthUser,
    churchId: string,
    branchId: string,
    body: { toUserId: string; body: string },
  ) {
    const ctx = await this.access.assertBranchAccess(user, churchId, branchId);
    const branch = await this.getBranchOrThrow(churchId, branchId);
    const toUser = await this.prisma.user.findFirst({
      where: { id: body.toUserId, churchId },
      include: { roles: { include: { role: true } } },
    });
    if (!toUser) throw new NotFoundException('Recipient not found');

    const toIsLeadership = toUser.roles.some(
      (r) => r.role.name === 'ADMIN' || r.role.name === 'PASTOR',
    );
    const fromIsLeader = ctx.role === 'cellLeader' && branch.leaderUserId === user.userId;
    const fromIsLeadership = ctx.role === 'admin' || ctx.role === 'pastor';
    const toIsLeader = branch.leaderUserId === body.toUserId;

    const allowed =
      (fromIsLeader && toIsLeadership) ||
      (fromIsLeadership && toIsLeader);

    if (!allowed) {
      throw new BadRequestException(
        'Messages are only allowed between cell leaders and church admin/pastor',
      );
    }

    const message = await this.prisma.cellMessage.create({
      data: {
        churchId,
        branchId,
        fromUserId: user.userId,
        toUserId: body.toUserId,
        body: body.body.trim(),
      },
      include: {
        fromUser: { select: { id: true, firstName: true, lastName: true } },
        toUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await this.prisma.notification.create({
      data: {
        churchId,
        userId: body.toUserId,
        title: 'Ministry/Cells message',
        body: body.body.trim().slice(0, 200),
        type: 'MINISTRY_CELL_MESSAGE',
        data: { branchId, messageId: message.id },
      },
    });

    return message;
  }

  async markMessageRead(user: AuthUser, churchId: string, messageId: string) {
    const msg = await this.prisma.cellMessage.findFirst({
      where: { id: messageId, churchId, toUserId: user.userId },
    });
    if (!msg) throw new NotFoundException('Message not found');
    return this.prisma.cellMessage.update({
      where: { id: messageId },
      data: { readAt: new Date() },
    });
  }

  async listReminders(user: AuthUser, churchId: string, branchId?: string) {
    const ctx = await this.access.assertCanAccess(user, churchId);
    const where: Prisma.CellReminderWhereInput = { churchId };
    if (ctx.role === 'cellLeader' && ctx.leaderBranchId) {
      where.OR = [{ branchId: ctx.leaderBranchId }, { branchId: null, userId: user.userId }];
    } else if (branchId) {
      where.branchId = branchId;
    }
    return this.prisma.cellReminder.findMany({
      where,
      orderBy: { remindAt: 'asc' },
      take: 50,
    });
  }

  async createReminder(
    user: AuthUser,
    churchId: string,
    body: {
      branchId?: string;
      userId?: string;
      title: string;
      body?: string;
      remindAt: string;
    },
  ) {
    await this.access.assertLeadership(user, churchId);
    return this.prisma.cellReminder.create({
      data: {
        churchId,
        branchId: body.branchId || null,
        userId: body.userId || null,
        title: body.title.trim(),
        body: body.body?.trim() || null,
        remindAt: new Date(body.remindAt),
      },
    });
  }

  async getAnalytics(
    user: AuthUser,
    churchId: string,
    filters: {
      branchId?: string;
      leaderUserId?: string;
      location?: string;
      from?: string;
      to?: string;
    },
  ) {
    const ctx = await this.access.assertCanAccess(user, churchId);
    if (
      ctx.role !== 'admin' &&
      ctx.role !== 'pastor' &&
      ctx.role !== 'provincialLeader'
    ) {
      throw new ForbiddenException('Analytics access required');
    }

    const from = filters.from ? new Date(filters.from) : new Date(Date.now() - 90 * 86400000);
    const to = filters.to ? new Date(filters.to) : new Date();

    const branchWhere: Prisma.CellBranchWhereInput = { churchId };
    if (ctx.role === 'provincialLeader' && ctx.leaderProvinceId) {
      branchWhere.provinceId = ctx.leaderProvinceId;
    }
    if (filters.branchId) branchWhere.id = filters.branchId;
    if (filters.leaderUserId) branchWhere.leaderUserId = filters.leaderUserId;
    if (filters.location) branchWhere.location = { contains: filters.location, mode: 'insensitive' };

    const branches = await this.prisma.cellBranch.findMany({
      where: branchWhere,
      include: {
        leader: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { members: true } },
      },
    });
    const branchIds = branches.map((b) => b.id);

    const [attendance, reports, incidents, prayers, messages] = await Promise.all([
      this.prisma.cellAttendance.findMany({
        where: { churchId, branchId: { in: branchIds }, weekStart: { gte: from, lte: to } },
        orderBy: { weekStart: 'asc' },
      }),
      this.prisma.cellReport.findMany({
        where: { churchId, branchId: { in: branchIds }, submittedAt: { gte: from, lte: to } },
      }),
      this.prisma.cellIncident.findMany({
        where: { churchId, branchId: { in: branchIds }, createdAt: { gte: from, lte: to } },
      }),
      this.prisma.cellPrayerRequest.findMany({
        where: { churchId, branchId: { in: branchIds }, createdAt: { gte: from, lte: to } },
      }),
      this.prisma.cellMessage.findMany({
        where: { churchId, branchId: { in: branchIds }, createdAt: { gte: from, lte: to } },
      }),
    ]);

    const weeksInRange = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (7 * 86400000)));

    const branchMetrics = branches.map((b) => {
      const bAttendance = attendance.filter((a) => a.branchId === b.id);
      const bReports = reports.filter((r) => r.branchId === b.id);
      const bIncidents = incidents.filter((i) => i.branchId === b.id);
      const bPrayers = prayers.filter((p) => p.branchId === b.id);
      const bMessages = messages.filter((m) => m.branchId === b.id);
      const avgAttendance =
        bAttendance.length > 0
          ? bAttendance.reduce((s, a) => s + a.presentCount, 0) / bAttendance.length
          : 0;
      const reportCompliance = Math.min(100, Math.round((bReports.length / weeksInRange) * 100));

      return {
        branchId: b.id,
        name: b.name,
        location: b.location,
        memberCount: b._count.members,
        leader: b.leader
          ? `${b.leader.firstName} ${b.leader.lastName}`.trim()
          : null,
        avgAttendance: Math.round(avgAttendance * 10) / 10,
        reportCount: bReports.length,
        reportCompliance,
        incidentCount: bIncidents.length,
        openIncidents: bIncidents.filter((i) => i.status === 'OPEN' || i.status === 'REVIEWING').length,
        prayerCount: bPrayers.length,
        messageCount: bMessages.length,
      };
    });

    return {
      from,
      to,
      totals: {
        branches: branches.length,
        members: branches.reduce((s, b) => s + b._count.members, 0),
        reports: reports.length,
        incidents: incidents.length,
        prayers: prayers.length,
        messages: messages.length,
      },
      attendanceTrend: attendance.map((a) => ({
        branchId: a.branchId,
        weekStart: a.weekStart,
        presentCount: a.presentCount,
      })),
      branchMetrics,
    };
  }

  /**
   * Email a filtered analytics report (branch comparison + totals) to
   * one Admin + one Pastor, and the requesting user when not already included.
   */
  async emailAnalyticsReport(
    user: AuthUser,
    churchId: string,
    filters: {
      branchId?: string;
      location?: string;
      from?: string;
      to?: string;
    },
  ) {
    const data = await this.getAnalytics(user, churchId, filters);
    const church = await this.prisma.church.findFirst({
      where: { id: churchId },
      select: { name: true },
    });
    const churchName = church?.name ?? 'Church';
    const fromLabel =
      data.from instanceof Date
        ? data.from.toISOString().slice(0, 10)
        : String(filters.from ?? '');
    const toLabel =
      data.to instanceof Date
        ? data.to.toISOString().slice(0, 10)
        : String(filters.to ?? '');
    const rangeLabel = `${fromLabel} → ${toLabel}`;
    const subject = `${churchName} — Ministry/Cells analytics (${rangeLabel})`;

    const branchFilterLabel = filters.branchId
      ? data.branchMetrics.find((m) => m.branchId === filters.branchId)?.name ??
        'Selected branch'
      : 'All branches';
    const locationFilterLabel = filters.location?.trim() || 'All locations';
    const filterBits = `Branch: ${branchFilterLabel} · Location: ${locationFilterLabel}`;

    const totalsLine = Object.entries(data.totals)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' · ');

    const tableRows = data.branchMetrics
      .map(
        (m) =>
          `<tr>
            <td style="padding:8px;border:1px solid #ddd">${escapeHtml(m.name)}</td>
            <td style="padding:8px;border:1px solid #ddd">${escapeHtml(m.leader ?? '—')}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right">${m.memberCount}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right">${m.avgAttendance}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right">${m.reportCompliance}%</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right">${m.incidentCount}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right">${m.prayerCount}</td>
            <td style="padding:8px;border:1px solid #ddd">${escapeHtml(m.location ?? '—')}</td>
          </tr>`,
      )
      .join('');

    const html = `
      <p>Ministry/Cells analytics for <strong>${escapeHtml(churchName)}</strong>.</p>
      <p style="color:#555;font-size:13px">Range: ${escapeHtml(rangeLabel)}<br/>${escapeHtml(filterBits)}<br/>${escapeHtml(totalsLine)}</p>
      <table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:13px">
        <thead>
          <tr style="background:#f5f5f5">
            <th style="padding:8px;border:1px solid #ddd;text-align:left">Branch</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left">Leader</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right">Members</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right">Avg att.</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right">Compliance</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right">Incidents</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right">Prayers</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left">Location</th>
          </tr>
        </thead>
        <tbody>
          ${
            tableRows ||
            `<tr><td colspan="8" style="padding:8px;border:1px solid #ddd">No branches in this filter</td></tr>`
          }
        </tbody>
      </table>
      <p style="color:#666;font-size:12px;margin-top:16px">Generated from Church Hub Ministry/Cells Analytics.</p>
    `;

    const text = [
      `Ministry/Cells analytics for ${churchName}`,
      `Range: ${rangeLabel}`,
      filterBits,
      totalsLine,
      '',
      'Branch | Leader | Members | Avg att. | Compliance | Incidents | Prayers | Location',
      ...data.branchMetrics.map(
        (m) =>
          `${m.name} | ${m.leader ?? '—'} | ${m.memberCount} | ${m.avgAttendance} | ${m.reportCompliance}% | ${m.incidentCount} | ${m.prayerCount} | ${m.location ?? '—'}`,
      ),
    ].join('\n');

    type AnalyticsRecipient = {
      id: string;
      email: string;
      phone?: string | null;
      role: 'ADMIN' | 'PASTOR' | 'REQUESTER';
    };
    const leadership = await findOneAdminAndOnePastor(this.prisma, churchId);
    const recipients: AnalyticsRecipient[] = [...leadership];
    const already = new Set(recipients.map((r) => r.email.toLowerCase()));
    const me = await this.prisma.user.findFirst({
      where: { id: user.userId, churchId, isActive: true },
      select: { id: true, email: true, phone: true },
    });
    if (me?.email && !already.has(me.email.toLowerCase())) {
      recipients.push({
        id: me.id,
        email: me.email,
        phone: me.phone,
        role: 'REQUESTER',
      });
    }

    let emailed = 0;
    for (const recipient of recipients) {
      await this.email.send({
        to: recipient.email,
        subject,
        body: text,
        html,
        churchId,
        purpose: 'reports',
      });
      await this.prisma.notification.create({
        data: {
          churchId,
          userId: recipient.id,
          title: subject,
          body: text.slice(0, 2000),
          type: 'DEPARTMENT_WEEKLY_REPORT',
          data: {
            analyticsReport: true,
            from: fromLabel,
            to: toLabel,
            role: recipient.role,
          } as Prisma.InputJsonValue,
        },
      });
      emailed++;
    }

    return {
      rangeLabel,
      branches: data.branchMetrics.length,
      recipients: recipients.map((r) => ({ role: r.role, email: r.email })),
      emailed,
    };
  }

  async listAvailableMembers(
    user: AuthUser,
    churchId: string,
    branchId?: string,
    search?: string,
  ) {
    await this.access.assertCanAccess(user, churchId);
    const viewer = await this.memberPrivacy.resolveViewerFromDb(user, churchId);
    const assignedElsewhere = await this.prisma.cellBranchMember.findMany({
      where: branchId ? { churchId, NOT: { branchId } } : { churchId },
      select: { memberId: true },
    });
    const excludeIds = assignedElsewhere.map((a) => a.memberId);
    const q = search?.trim();
    // Ops roles: name-only search (never email). Leadership may still search name.
    const nameFilter = q
      ? {
          OR: [
            { firstName: { contains: q, mode: 'insensitive' as const } },
            { lastName: { contains: q, mode: 'insensitive' as const } },
            ...(viewer.isLeadership
              ? [{ email: { contains: q, mode: 'insensitive' as const } }]
              : []),
          ],
        }
      : {};
    const rows = await this.prisma.member.findMany({
      where: {
        churchId,
        ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
        ...nameFilter,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      take: 500,
    });
    return this.memberPrivacy.projectMemberList(
      churchId,
      viewer,
      rows as unknown as Record<string, unknown>[],
    );
  }

  async listLeaderCandidates(user: AuthUser, churchId: string) {
    await this.access.assertLeadership(user, churchId);
    const users = await this.prisma.user.findMany({
      where: { churchId, isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        member: { select: { id: true } },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
    return users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      memberId: u.member?.id ?? null,
    }));
  }

  async listLeadershipContacts(user: AuthUser, churchId: string, branchId: string) {
    await this.access.assertBranchAccess(user, churchId, branchId);
    const branch = await this.getBranchOrThrow(churchId, branchId);
    const leaders = await this.prisma.user.findMany({
      where: {
        churchId,
        roles: { some: { role: { name: { in: ['ADMIN', 'PASTOR'] } } } },
        isActive: true,
      },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    return {
      leaderUserId: branch.leaderUserId,
      leadershipContacts: leaders,
    };
  }

  private async getBranchOrThrow(churchId: string, branchId: string) {
    const branch = await this.prisma.cellBranch.findFirst({
      where: { id: branchId, churchId },
    });
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  private async assertLeaderAvailable(
    churchId: string,
    leaderUserId: string,
    excludeBranchId?: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: leaderUserId, churchId, isActive: true },
    });
    if (!user) throw new BadRequestException('Leader user not found in this church');
    void excludeBranchId;
  }

  private async resolveProvinceIdForPostcode(
    churchId: string,
    postcode: string,
  ): Promise<string | null> {
    const provinces = await this.prisma.cellProvince.findMany({
      where: { churchId },
      select: {
        id: true,
        postcodes: { select: { postcodeNormalized: true } },
      },
    });
    return findMatchingProvinceId(
      postcode,
      provinces.map((p) => ({
        id: p.id,
        postcodes: p.postcodes.map((c) => c.postcodeNormalized),
      })),
    );
  }

  private async recomputeBranchProvinces(churchId: string) {
    const [provinces, branches] = await Promise.all([
      this.prisma.cellProvince.findMany({
        where: { churchId },
        select: {
          id: true,
          postcodes: { select: { postcodeNormalized: true } },
        },
      }),
      this.prisma.cellBranch.findMany({
        where: { churchId },
        select: { id: true, postcode: true, provinceId: true },
      }),
    ]);
    const mapped = provinces.map((p) => ({
      id: p.id,
      postcodes: p.postcodes.map((c) => c.postcodeNormalized),
    }));
    for (const branch of branches) {
      const provinceId = branch.postcode
        ? findMatchingProvinceId(branch.postcode, mapped)
        : null;
      if (provinceId !== branch.provinceId) {
        await this.prisma.cellBranch.update({
          where: { id: branch.id },
          data: { provinceId },
        });
      }
    }
  }

  private async assertProvincialLeaderUser(churchId: string, leaderUserId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: leaderUserId,
        churchId,
        isActive: true,
        roles: { some: { role: { name: 'PROVINCIAL_LEADER' } } },
      },
      select: { id: true },
    });
    if (!user) {
      throw new BadRequestException(
        'Province leader must be an active user with the PROVINCIAL_LEADER role',
      );
    }
    const taken = await this.prisma.cellProvince.findFirst({
      where: { churchId, leaderUserId },
      select: { id: true, name: true },
    });
    if (taken) {
      throw new BadRequestException(
        `This user already leads province "${taken.name}". One user may lead only one province.`,
      );
    }
  }

  private serializeProvince(
    p: Prisma.CellProvinceGetPayload<{
      include: {
        leader: {
          select: { id: true; firstName: true; lastName: true; email: true; phone: true };
        };
        postcodes: true;
        _count: { select: { branches: true } };
      };
    }>,
  ) {
    return {
      id: p.id,
      name: p.name,
      postcodes: p.postcodes.map((c) => c.postcodeNormalized),
      branchCount: p._count.branches,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      assignedAt: p.createdAt,
      leader: {
        id: p.leader.id,
        name: `${p.leader.firstName} ${p.leader.lastName}`.trim(),
        email: p.leader.email,
        phone: p.leader.phone,
      },
    };
  }

  async listProvinces(user: AuthUser, churchId: string) {
    const ctx = await this.access.assertCanAccess(user, churchId);
    const provinceIds = Array.from(
      new Set([
        ...(ctx.leaderProvinceId ? [ctx.leaderProvinceId] : []),
        ...ctx.deputyProvinceIds,
      ]),
    );
    const where =
      ctx.role === 'provincialLeader' && provinceIds.length
        ? { churchId, id: provinceIds.length === 1 ? provinceIds[0] : { in: provinceIds } }
        : { churchId };
    const rows = await this.prisma.cellProvince.findMany({
      where,
      include: {
        leader: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        postcodes: { orderBy: { postcodeNormalized: 'asc' } },
        _count: { select: { branches: true } },
      },
      orderBy: { name: 'asc' },
    });
    return Promise.all(
      rows.map(async (p) => ({
        ...this.serializeProvince(p),
        deputies: await this.listDeputiesForScope(churchId, { provinceId: p.id }),
      })),
    );
  }

  async createProvince(
    user: AuthUser,
    churchId: string,
    body: { name: string; leaderUserId: string; postcodes: string[] },
  ) {
    await this.access.assertLeadership(user, churchId);
    const name = body.name?.trim();
    if (!name) throw new BadRequestException('Province name is required');
    if (!body.leaderUserId) throw new BadRequestException('Province leader is required');
    const postcodes = normalizeCoveragePostcodes(body.postcodes ?? []);
    await this.assertProvincialLeaderUser(churchId, body.leaderUserId);

    const conflicting = await this.prisma.cellProvincePostcode.findMany({
      where: { churchId, postcodeNormalized: { in: postcodes } },
      select: { postcodeNormalized: true },
    });
    if (conflicting.length) {
      throw new BadRequestException(
        `Postcode(s) already used by another province: ${conflicting
          .map((c) => c.postcodeNormalized)
          .join(', ')}`,
      );
    }

    const created = await this.prisma.cellProvince.create({
      data: {
        churchId,
        name,
        leaderUserId: body.leaderUserId,
        postcodes: {
          create: postcodes.map((postcodeNormalized) => ({
            churchId,
            postcodeNormalized,
          })),
        },
      },
      include: {
        leader: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        postcodes: { orderBy: { postcodeNormalized: 'asc' } },
        _count: { select: { branches: true } },
      },
    });
    await this.recomputeBranchProvinces(churchId);
    return this.serializeProvince(created);
  }

  async updateProvince(
    user: AuthUser,
    churchId: string,
    provinceId: string,
    body: {
      name?: string;
      leaderUserId?: string;
      postcodes?: string[];
      leaderPhone?: string | null;
    },
  ) {
    await this.access.assertLeadership(user, churchId);
    const existing = await this.prisma.cellProvince.findFirst({
      where: { id: provinceId, churchId },
    });
    if (!existing) throw new NotFoundException('Province not found');

    if (body.leaderUserId && body.leaderUserId !== existing.leaderUserId) {
      await this.assertProvincialLeaderUser(churchId, body.leaderUserId);
    }

    let postcodes: string[] | undefined;
    if (body.postcodes !== undefined) {
      postcodes = normalizeCoveragePostcodes(body.postcodes);
      const conflicting = await this.prisma.cellProvincePostcode.findMany({
        where: {
          churchId,
          postcodeNormalized: { in: postcodes },
          NOT: { provinceId },
        },
        select: { postcodeNormalized: true },
      });
      if (conflicting.length) {
        throw new BadRequestException(
          `Postcode(s) already used by another province: ${conflicting
            .map((c) => c.postcodeNormalized)
            .join(', ')}`,
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      if (postcodes) {
        await tx.cellProvincePostcode.deleteMany({ where: { provinceId } });
        await tx.cellProvincePostcode.createMany({
          data: postcodes.map((postcodeNormalized) => ({
            churchId,
            provinceId,
            postcodeNormalized,
          })),
        });
      }
      await tx.cellProvince.update({
        where: { id: provinceId },
        data: {
          name: body.name?.trim() || undefined,
          leaderUserId: body.leaderUserId || undefined,
        },
      });
      if (body.leaderPhone !== undefined) {
        const leaderId = body.leaderUserId || existing.leaderUserId;
        const phone = parseOptionalFlexiblePhoneOrThrow(body.leaderPhone, 'Leader phone');
        await tx.user.update({
          where: { id: leaderId },
          data: { phone: phone ?? null },
        });
      }
    });

    await this.recomputeBranchProvinces(churchId);

    const updated = await this.prisma.cellProvince.findFirstOrThrow({
      where: { id: provinceId },
      include: {
        leader: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        postcodes: { orderBy: { postcodeNormalized: 'asc' } },
        _count: { select: { branches: true } },
      },
    });
    return this.serializeProvince(updated);
  }

  async deleteProvince(user: AuthUser, churchId: string, provinceId: string) {
    await this.access.assertLeadership(user, churchId);
    const existing = await this.prisma.cellProvince.findFirst({
      where: { id: provinceId, churchId },
    });
    if (!existing) throw new NotFoundException('Province not found');
    await this.prisma.cellProvince.delete({ where: { id: provinceId } });
    return { ok: true };
  }

  async listProvincialLeaderCandidates(
    user: AuthUser,
    churchId: string,
    excludeProvinceId?: string,
  ) {
    await this.access.assertLeadership(user, churchId);
    const leading = await this.prisma.cellProvince.findMany({
      where: {
        churchId,
        ...(excludeProvinceId ? { NOT: { id: excludeProvinceId } } : {}),
      },
      select: { leaderUserId: true },
    });
    const taken = new Set(leading.map((p) => p.leaderUserId));
    const users = await this.prisma.user.findMany({
      where: {
        churchId,
        isActive: true,
        roles: { some: { role: { name: 'PROVINCIAL_LEADER' } } },
      },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
    return users
      .filter((u) => !taken.has(u.id))
      .map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`.trim(),
        email: u.email,
        phone: u.phone,
      }));
  }

  async mapBranchToProvince(
    user: AuthUser,
    churchId: string,
    branchId: string,
    provinceId: string,
  ) {
    await this.access.assertLeadership(user, churchId);
    const branch = await this.getBranchOrThrow(churchId, branchId);
    if (!branch.postcode) {
      throw new BadRequestException('Set a postcode on this cell before mapping to a province');
    }
    const province = await this.prisma.cellProvince.findFirst({
      where: { id: provinceId, churchId },
      include: { postcodes: true },
    });
    if (!province) throw new NotFoundException('Province not found');

    const coverage = province.postcodes.map((p) => p.postcodeNormalized);
    if (!cellPostcodeMatchesCoverage(branch.postcode, coverage)) {
      const key = coverageKeyForCell(branch.postcode);
      const owned = await this.prisma.cellProvincePostcode.findFirst({
        where: { churchId, postcodeNormalized: key },
        include: { province: { select: { id: true, name: true } } },
      });
      if (owned && owned.provinceId !== provinceId) {
        throw new BadRequestException(
          `Postcode ${key} already belongs to province "${owned.province.name}". Update that coverage first.`,
        );
      }
      if (!owned) {
        await this.prisma.cellProvincePostcode.create({
          data: {
            churchId,
            provinceId,
            postcodeNormalized: key,
          },
        });
      }
    }

    return this.prisma.cellBranch.update({
      where: { id: branchId },
      data: { provinceId },
      include: branchInclude,
    });
  }

  async getProvinceAttendanceReport(
    user: AuthUser,
    churchId: string,
    provinceId: string,
    filters: { from?: string; to?: string },
  ) {
    await this.access.assertProvinceLeadership(user, churchId, provinceId);
    const province = await this.prisma.cellProvince.findFirst({
      where: { id: provinceId, churchId },
      include: {
        leader: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        branches: {
          select: { id: true, name: true, postcode: true, location: true },
          orderBy: { name: 'asc' },
        },
      },
    });
    if (!province) throw new NotFoundException('Province not found');

    const from = filters.from ? new Date(filters.from) : new Date(Date.now() - 90 * 86400000);
    const to = filters.to ? new Date(filters.to) : new Date();
    const branchIds = province.branches.map((b) => b.id);

    const attendance = branchIds.length
      ? await this.prisma.cellAttendance.findMany({
          where: {
            churchId,
            branchId: { in: branchIds },
            weekStart: { gte: from, lte: to },
          },
          include: {
            recordedBy: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { weekStart: 'asc' },
        })
      : [];

    const byBranch = province.branches.map((b) => {
      const rows = attendance.filter((a) => a.branchId === b.id);
      const totals = rows.reduce(
        (acc, r) => ({
          present: acc.present + r.presentCount,
          male: acc.male + r.maleCount,
          female: acc.female + r.femaleCount,
          boys: acc.boys + r.boysCount,
          girls: acc.girls + r.girlsCount,
          testifiers: acc.testifiers + r.testifiersCount,
          firstTimers: acc.firstTimers + r.firstTimersCount,
          weeks: acc.weeks + 1,
        }),
        {
          present: 0,
          male: 0,
          female: 0,
          boys: 0,
          girls: 0,
          testifiers: 0,
          firstTimers: 0,
          weeks: 0,
        },
      );
      return {
        branchId: b.id,
        name: b.name,
        postcode: b.postcode,
        location: b.location,
        weeksRecorded: totals.weeks,
        avgPresent:
          totals.weeks > 0 ? Math.round((totals.present / totals.weeks) * 10) / 10 : 0,
        totals: {
          present: totals.present,
          male: totals.male,
          female: totals.female,
          boys: totals.boys,
          girls: totals.girls,
          testifiers: totals.testifiers,
          firstTimers: totals.firstTimers,
        },
        records: rows.map((r) => ({
          id: r.id,
          weekStart: r.weekStart,
          meetingDate: r.meetingDate,
          presentCount: r.presentCount,
          maleCount: r.maleCount,
          femaleCount: r.femaleCount,
          boysCount: r.boysCount,
          girlsCount: r.girlsCount,
          testifiersCount: r.testifiersCount,
          firstTimersCount: r.firstTimersCount,
          recordedBy: r.recordedBy
            ? {
                id: r.recordedBy.id,
                firstName: r.recordedBy.firstName,
                lastName: r.recordedBy.lastName,
              }
            : null,
        })),
      };
    });

    const provinceTotals = byBranch.reduce(
      (acc, b) => ({
        present: acc.present + b.totals.present,
        male: acc.male + b.totals.male,
        female: acc.female + b.totals.female,
        boys: acc.boys + b.totals.boys,
        girls: acc.girls + b.totals.girls,
        testifiers: acc.testifiers + b.totals.testifiers,
        firstTimers: acc.firstTimers + b.totals.firstTimers,
      }),
      { present: 0, male: 0, female: 0, boys: 0, girls: 0, testifiers: 0, firstTimers: 0 },
    );

    return {
      province: {
        id: province.id,
        name: province.name,
        assignedAt: province.createdAt,
        leader: {
          id: province.leader.id,
          name: `${province.leader.firstName} ${province.leader.lastName}`.trim(),
          email: province.leader.email,
          phone: province.leader.phone,
        },
      },
      from,
      to,
      branchCount: province.branches.length,
      totals: provinceTotals,
      branches: byBranch,
    };
  }
}
