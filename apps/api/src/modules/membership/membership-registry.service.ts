import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MemberGender, MembershipCustomFieldType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import {
  AGE_DISTRIBUTION_BUCKETS,
  DEFAULT_CONGREGANT_CLASSIFICATIONS,
  DEFAULT_FAMILY_PROPERTIES,
  DEFAULT_FAMILY_ROLES,
  DEFAULT_MEMBER_PROPERTIES,
} from './membership-registry.constants';
import type {
  MembershipCongregantAnalyticsDto,
  MembershipEmailLinksDto,
  MembershipRegistryCatalogDto,
} from '@church-hub/shared-types';
import { EmailAdapter } from '../notifications/adapters/email.adapter';

@Injectable()
export class MembershipRegistryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailAdapter,
  ) {}

  async getRegistryCatalog(churchId: string): Promise<MembershipRegistryCatalogDto> {
    await this.ensureRegistryDefaults(churchId);
    return this.fetchRegistryCatalog(churchId, true);
  }

  /** Admin settings — includes inactive definitions. */
  async getAdminCatalog(churchId: string): Promise<MembershipRegistryCatalogDto> {
    await this.ensureRegistryDefaults(churchId);
    return this.fetchRegistryCatalog(churchId, false);
  }

  private async fetchRegistryCatalog(churchId: string, activeOnly: boolean) {
    const activeFilter = activeOnly ? { isActive: true } : {};
    const [
      classifications,
      familyRoles,
      memberCustomFields,
      familyCustomFields,
      memberProperties,
      familyProperties,
      serviceUnits,
      cellBranches,
    ] = await Promise.all([
      this.prisma.congregantClassification.findMany({
        where: { churchId, ...activeFilter },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.familyRoleDefinition.findMany({
        where: { churchId, ...activeFilter },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.memberCustomFieldDefinition.findMany({
        where: { churchId, ...activeFilter },
        orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
      }),
      this.prisma.familyCustomFieldDefinition.findMany({
        where: { churchId, ...activeFilter },
        orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
      }),
      this.prisma.memberPropertyDefinition.findMany({
        where: { churchId, ...activeFilter },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.familyPropertyDefinition.findMany({
        where: { churchId, ...activeFilter },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.serviceUnit.findMany({
        where: { churchId, isActive: true },
        select: { id: true, name: true, departmentCode: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.cellBranch.findMany({
        where: { churchId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      classifications,
      familyRoles,
      memberCustomFields: memberCustomFields.map((f) => this.mapCustomField(f)),
      familyCustomFields: familyCustomFields.map((f) => this.mapCustomField(f)),
      memberProperties,
      familyProperties,
      serviceUnits: serviceUnits.map((u) => ({
        id: u.id,
        name: u.name,
        departmentCode: u.departmentCode,
        departmentLabel: u.departmentCode?.replace(/_/g, ' ') ?? null,
      })),
      cellBranches,
    };
  }

  async ensureRegistryDefaults(churchId: string) {
    const [classCount, roleCount, memberPropCount, familyPropCount] = await Promise.all([
      this.prisma.congregantClassification.count({ where: { churchId } }),
      this.prisma.familyRoleDefinition.count({ where: { churchId } }),
      this.prisma.memberPropertyDefinition.count({ where: { churchId } }),
      this.prisma.familyPropertyDefinition.count({ where: { churchId } }),
    ]);

    const ops: Prisma.PrismaPromise<unknown>[] = [];
    if (classCount === 0) {
      ops.push(
        ...DEFAULT_CONGREGANT_CLASSIFICATIONS.map((c) =>
          this.prisma.congregantClassification.create({ data: { churchId, ...c } }),
        ),
      );
    }
    if (roleCount === 0) {
      ops.push(
        ...DEFAULT_FAMILY_ROLES.map((r) =>
          this.prisma.familyRoleDefinition.create({ data: { churchId, ...r } }),
        ),
      );
    }
    if (memberPropCount === 0) {
      ops.push(
        ...DEFAULT_MEMBER_PROPERTIES.map((p) =>
          this.prisma.memberPropertyDefinition.create({ data: { churchId, ...p } }),
        ),
      );
    }
    if (familyPropCount === 0) {
      ops.push(
        ...DEFAULT_FAMILY_PROPERTIES.map((p) =>
          this.prisma.familyPropertyDefinition.create({ data: { churchId, ...p } }),
        ),
      );
    }
    if (ops.length > 0) await this.prisma.$transaction(ops);
  }

  async createClassification(
    churchId: string,
    data: { code: string; name: string; sortOrder?: number; isInactive?: boolean },
  ) {
    return this.prisma.congregantClassification.create({
      data: {
        churchId,
        code: data.code.trim().toUpperCase(),
        name: data.name.trim(),
        sortOrder: data.sortOrder ?? 0,
        isInactive: data.isInactive ?? false,
      },
    });
  }

  async updateClassification(
    churchId: string,
    id: string,
    data: Partial<{ name: string; sortOrder: number; isInactive: boolean; isActive: boolean }>,
  ) {
    await this.assertClassification(churchId, id);
    return this.prisma.congregantClassification.update({ where: { id }, data });
  }

  async createFamilyRole(
    churchId: string,
    data: { code: string; name: string; sortOrder?: number },
  ) {
    return this.prisma.familyRoleDefinition.create({
      data: {
        churchId,
        code: data.code.trim().toUpperCase(),
        name: data.name.trim(),
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async updateFamilyRole(
    churchId: string,
    id: string,
    data: Partial<{ name: string; sortOrder: number; isActive: boolean }>,
  ) {
    await this.assertFamilyRole(churchId, id);
    return this.prisma.familyRoleDefinition.update({ where: { id }, data });
  }

  async createMemberCustomField(
    churchId: string,
    data: {
      fieldKey: string;
      label: string;
      fieldType?: MembershipCustomFieldType;
      sortOrder?: number;
      isRequired?: boolean;
      options?: string[];
    },
  ) {
    return this.prisma.memberCustomFieldDefinition.create({
      data: {
        churchId,
        fieldKey: data.fieldKey.trim(),
        label: data.label.trim(),
        fieldType: data.fieldType ?? 'TEXT',
        sortOrder: data.sortOrder ?? 0,
        isRequired: data.isRequired ?? false,
        options: data.options ?? [],
      },
    });
  }

  async createFamilyCustomField(
    churchId: string,
    data: {
      fieldKey: string;
      label: string;
      fieldType?: MembershipCustomFieldType;
      sortOrder?: number;
      isRequired?: boolean;
      options?: string[];
    },
  ) {
    return this.prisma.familyCustomFieldDefinition.create({
      data: {
        churchId,
        fieldKey: data.fieldKey.trim(),
        label: data.label.trim(),
        fieldType: data.fieldType ?? 'TEXT',
        sortOrder: data.sortOrder ?? 0,
        isRequired: data.isRequired ?? false,
        options: data.options ?? [],
      },
    });
  }

  async createMemberProperty(
    churchId: string,
    data: { name: string; description?: string; sortOrder?: number },
  ) {
    return this.prisma.memberPropertyDefinition.create({
      data: {
        churchId,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async createFamilyProperty(
    churchId: string,
    data: { name: string; description?: string; sortOrder?: number },
  ) {
    return this.prisma.familyPropertyDefinition.create({
      data: {
        churchId,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async updateMemberCustomField(
    churchId: string,
    id: string,
    data: Partial<{
      label: string;
      fieldType: MembershipCustomFieldType;
      sortOrder: number;
      isRequired: boolean;
      isActive: boolean;
    }>,
  ) {
    await this.assertMemberCustomField(churchId, id);
    return this.prisma.memberCustomFieldDefinition.update({ where: { id }, data });
  }

  async updateFamilyCustomField(
    churchId: string,
    id: string,
    data: Partial<{
      label: string;
      fieldType: MembershipCustomFieldType;
      sortOrder: number;
      isRequired: boolean;
      isActive: boolean;
    }>,
  ) {
    await this.assertFamilyCustomField(churchId, id);
    return this.prisma.familyCustomFieldDefinition.update({ where: { id }, data });
  }

  async updateMemberProperty(
    churchId: string,
    id: string,
    data: Partial<{ name: string; description: string | null; sortOrder: number; isActive: boolean }>,
  ) {
    await this.assertMemberProperty(churchId, id);
    return this.prisma.memberPropertyDefinition.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
  }

  async updateFamilyProperty(
    churchId: string,
    id: string,
    data: Partial<{ name: string; description: string | null; sortOrder: number; isActive: boolean }>,
  ) {
    await this.assertFamilyProperty(churchId, id);
    return this.prisma.familyPropertyDefinition.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
  }

  async syncMemberCustomFields(
    churchId: string,
    memberId: string,
    values: Record<string, string | boolean | null | undefined>,
  ) {
    const definitions = await this.prisma.memberCustomFieldDefinition.findMany({
      where: { churchId, isActive: true },
    });
    for (const def of definitions) {
      if (!(def.fieldKey in values)) continue;
      const raw = values[def.fieldKey];
      const valueText =
        raw === null || raw === undefined ? null : def.fieldType === 'BOOLEAN' ? String(raw) : String(raw);
      await this.prisma.memberCustomFieldValue.upsert({
        where: { memberId_definitionId: { memberId, definitionId: def.id } },
        create: { memberId, definitionId: def.id, valueText },
        update: { valueText },
      });
    }
  }

  async syncMemberProperties(churchId: string, memberId: string, propertyIds: string[]) {
    const valid = await this.prisma.memberPropertyDefinition.findMany({
      where: { churchId, id: { in: propertyIds }, isActive: true },
      select: { id: true },
    });
    const validIds = new Set(valid.map((v) => v.id));
    await this.prisma.memberPropertyAssignment.deleteMany({
      where: { memberId, definitionId: { notIn: [...validIds] } },
    });
    for (const definitionId of validIds) {
      await this.prisma.memberPropertyAssignment.upsert({
        where: { memberId_definitionId: { memberId, definitionId } },
        create: { memberId, definitionId },
        update: {},
      });
    }
  }

  async syncFamilyCustomFields(
    churchId: string,
    familyId: string,
    values: Record<string, string | boolean | null | undefined>,
  ) {
    const definitions = await this.prisma.familyCustomFieldDefinition.findMany({
      where: { churchId, isActive: true },
    });
    for (const def of definitions) {
      if (!(def.fieldKey in values)) continue;
      const raw = values[def.fieldKey];
      const valueText =
        raw === null || raw === undefined ? null : def.fieldType === 'BOOLEAN' ? String(raw) : String(raw);
      await this.prisma.familyCustomFieldValue.upsert({
        where: { familyId_definitionId: { familyId, definitionId: def.id } },
        create: { familyId, definitionId: def.id, valueText },
        update: { valueText },
      });
    }
  }

  async syncFamilyProperties(churchId: string, familyId: string, propertyIds: string[]) {
    const valid = await this.prisma.familyPropertyDefinition.findMany({
      where: { churchId, id: { in: propertyIds }, isActive: true },
      select: { id: true },
    });
    const validIds = new Set(valid.map((v) => v.id));
    await this.prisma.familyPropertyAssignment.deleteMany({
      where: { familyId, definitionId: { notIn: [...validIds] } },
    });
    for (const definitionId of validIds) {
      await this.prisma.familyPropertyAssignment.upsert({
        where: { familyId_definitionId: { familyId, definitionId } },
        create: { familyId, definitionId },
        update: {},
      });
    }
  }

  async getCongregantAnalytics(churchId: string): Promise<MembershipCongregantAnalyticsDto> {
    await this.ensureRegistryDefaults(churchId);
    const members = await this.prisma.member.findMany({
      where: { churchId },
      select: {
        gender: true,
        dateOfBirth: true,
        classification: { select: { name: true } },
        familyRole: { select: { name: true } },
      },
    });

    const classificationCounts = new Map<string, number>();
    const genderCounts = new Map<string, number>();
    const familyRoleCounts = new Map<string, number>();
    const ageCounts = new Map<string, number>(
      AGE_DISTRIBUTION_BUCKETS.map((b) => [b.label, 0]),
    );

    const now = new Date();
    for (const m of members) {
      const classLabel = m.classification?.name ?? 'Unclassified';
      classificationCounts.set(classLabel, (classificationCounts.get(classLabel) ?? 0) + 1);

      const genderLabel =
        m.gender === 'MALE' ? 'Male' : m.gender === 'FEMALE' ? 'Female' : 'Unknown';
      genderCounts.set(genderLabel, (genderCounts.get(genderLabel) ?? 0) + 1);

      const roleLabel = m.familyRole?.name ?? 'Unassigned';
      familyRoleCounts.set(roleLabel, (familyRoleCounts.get(roleLabel) ?? 0) + 1);

      let ageBucket = 'Unknown';
      if (m.dateOfBirth) {
        const age = Math.floor(
          (now.getTime() - m.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
        );
        const bucket = AGE_DISTRIBUTION_BUCKETS.find(
          (b) => b.min >= 0 && age >= b.min && age <= b.max,
        );
        ageBucket = bucket?.label ?? 'Unknown';
      }
      ageCounts.set(ageBucket, (ageCounts.get(ageBucket) ?? 0) + 1);
    }

    const toChart = (map: Map<string, number>) =>
      [...map.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count);

    return {
      byClassification: toChart(classificationCounts),
      byGender: toChart(genderCounts),
      byFamilyRole: toChart(familyRoleCounts),
      byAgeDistribution: toChart(ageCounts),
    };
  }

  async getEmailLinks(churchId: string): Promise<MembershipEmailLinksDto> {
    const members = await this.prisma.member.findMany({
      where: {
        churchId,
        email: { not: null },
        NOT: {
          propertyAssignments: {
            some: {
              definition: { name: 'Do Not Email', isActive: true },
            },
          },
        },
      },
      select: {
        email: true,
        familyRole: { select: { name: true } },
      },
    });

    const emails = [...new Set(members.map((m) => m.email).filter(Boolean) as string[])];
    const all = emails.length ? `mailto:${emails.join(',')}` : '';
    const bcc = emails.length ? `mailto:?bcc=${encodeURIComponent(emails.join(','))}` : '';

    const byRole = new Map<string, string[]>();
    for (const m of members) {
      const role = m.familyRole?.name ?? 'Unassigned';
      if (!m.email) continue;
      const list = byRole.get(role) ?? [];
      list.push(m.email);
      byRole.set(role, list);
    }

    return {
      all,
      bcc,
      byFamilyRole: [...byRole.entries()].map(([role, roleEmails]) => {
        const unique = [...new Set(roleEmails)];
        return {
          role,
          all: unique.length ? `mailto:${unique.join(',')}` : '',
          bcc: unique.length ? `mailto:?bcc=${encodeURIComponent(unique.join(','))}` : '',
        };
      }),
    };
  }

  async resolveCongregantEmails(
    churchId: string,
    options?: { familyRoleName?: string },
  ): Promise<string[]> {
    const members = await this.prisma.member.findMany({
      where: {
        churchId,
        email: { not: null },
        NOT: {
          propertyAssignments: {
            some: {
              definition: { name: 'Do Not Email', isActive: true },
            },
          },
        },
        ...(options?.familyRoleName
          ? { familyRole: { name: options.familyRoleName } }
          : {}),
      },
      select: { email: true },
    });
    return [...new Set(members.map((m) => m.email).filter(Boolean) as string[])];
  }

  async sendCongregantEmail(
    churchId: string,
    data: {
      subject: string;
      bodyHtml: string;
      mode: 'all' | 'bcc';
      familyRoleName?: string;
    },
  ) {
    const emails = await this.resolveCongregantEmails(churchId, {
      familyRoleName: data.familyRoleName,
    });
    if (!emails.length) {
      return { sent: 0, recipients: 0, message: 'No congregant email addresses on file' };
    }

    const plain = data.bodyHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const staff = await this.prisma.user.findFirst({
      where: {
        churchId,
        isActive: true,
        roles: { some: { role: { name: { in: ['ADMIN', 'PASTOR'] } } } },
      },
      select: { email: true },
      orderBy: { createdAt: 'asc' },
    });
    const fromEmail = staff?.email ?? 'noreply@churchhub.local';

    if (data.mode === 'bcc') {
      await this.email.send({
        to: fromEmail,
        bcc: emails,
        subject: data.subject,
        body: plain,
        html: data.bodyHtml,
        churchId,
      });
      return { sent: 1, recipients: emails.length, message: `Email queued to ${emails.length} recipients (BCC)` };
    }

    let sent = 0;
    for (const to of emails) {
      await this.email.send({
        to,
        subject: data.subject,
        body: plain,
        html: data.bodyHtml,
        churchId,
      });
      sent++;
    }
    return { sent, recipients: emails.length, message: `Sent ${sent} email(s)` };
  }

  async countChurchUnits(churchId: string): Promise<number> {
    const [serviceUnits, cellBranches] = await Promise.all([
      this.prisma.serviceUnit.count({ where: { churchId, isActive: true } }),
      this.prisma.cellBranch.count({ where: { churchId } }),
    ]);
    return serviceUnits + cellBranches;
  }

  async countChildrenChurch(churchId: string): Promise<number> {
    const members = await this.prisma.member.findMany({
      where: { churchId },
      select: { roles: true, dateOfBirth: true },
    });
    const now = new Date();
    return members.filter((m) => {
      if (m.roles.includes('YOUTH')) return true;
      if (!m.dateOfBirth) return false;
      const age = Math.floor(
        (now.getTime() - m.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
      );
      return age < 18;
    }).length;
  }

  private mapCustomField(row: {
    id: string;
    fieldKey: string;
    label: string;
    fieldType: MembershipCustomFieldType;
    sortOrder: number;
    isRequired: boolean;
    isActive: boolean;
    options: unknown;
  }) {
    return {
      ...row,
      options: Array.isArray(row.options) ? (row.options as string[]) : [],
    };
  }

  private async assertClassification(churchId: string, id: string) {
    const row = await this.prisma.congregantClassification.findFirst({ where: { id, churchId } });
    if (!row) throw new NotFoundException('Classification not found');
    return row;
  }

  private async assertFamilyRole(churchId: string, id: string) {
    const row = await this.prisma.familyRoleDefinition.findFirst({ where: { id, churchId } });
    if (!row) throw new NotFoundException('Family role not found');
    return row;
  }

  private async assertMemberCustomField(churchId: string, id: string) {
    const row = await this.prisma.memberCustomFieldDefinition.findFirst({ where: { id, churchId } });
    if (!row) throw new NotFoundException('Member custom field not found');
    return row;
  }

  private async assertFamilyCustomField(churchId: string, id: string) {
    const row = await this.prisma.familyCustomFieldDefinition.findFirst({ where: { id, churchId } });
    if (!row) throw new NotFoundException('Family custom field not found');
    return row;
  }

  private async assertMemberProperty(churchId: string, id: string) {
    const row = await this.prisma.memberPropertyDefinition.findFirst({ where: { id, churchId } });
    if (!row) throw new NotFoundException('Member property not found');
    return row;
  }

  private async assertFamilyProperty(churchId: string, id: string) {
    const row = await this.prisma.familyPropertyDefinition.findFirst({ where: { id, churchId } });
    if (!row) throw new NotFoundException('Family property not found');
    return row;
  }

  parseGender(value?: string): MemberGender {
    if (value === 'MALE' || value === 'FEMALE') return value;
    return 'UNKNOWN';
  }

  validateCongregantPayload(
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      homePhone?: string;
      cellPhone?: string;
      phone?: string;
      address?: string;
      zip?: string;
      requireContactFields?: boolean;
    },
  ) {
    if (!data.firstName?.trim()) throw new BadRequestException('First name is required');
    if (!data.lastName?.trim()) throw new BadRequestException('Last name is required');
    if (!data.requireContactFields) return;
    if (!data.email?.trim()) throw new BadRequestException('Email is required');
    const hasPhone = Boolean(
      data.cellPhone?.trim() || data.homePhone?.trim() || data.phone?.trim(),
    );
    if (!hasPhone) throw new BadRequestException('Phone number is required');
    if (!data.address?.trim()) throw new BadRequestException('Address is required');
    if (!data.zip?.trim()) throw new BadRequestException('Post code is required');
  }

  async syncCongregantServiceGroups(
    churchId: string,
    memberId: string,
    data: { serviceUnitIds?: string[]; cellBranchId?: string | null },
  ) {
    if (data.serviceUnitIds !== undefined) {
      const unitIds = [...new Set(data.serviceUnitIds.filter(Boolean))];
      if (unitIds.length) {
        const count = await this.prisma.serviceUnit.count({
          where: { churchId, isActive: true, id: { in: unitIds } },
        });
        if (count !== unitIds.length) {
          throw new BadRequestException('One or more service units are invalid');
        }
      }

      await this.prisma.serviceUnitMember.deleteMany({
        where: {
          memberId,
          serviceUnit: { churchId },
          ...(unitIds.length ? { serviceUnitId: { notIn: unitIds } } : {}),
        },
      });

      for (const serviceUnitId of unitIds) {
        await this.prisma.serviceUnitMember.upsert({
          where: { serviceUnitId_memberId: { serviceUnitId, memberId } },
          create: { serviceUnitId, memberId },
          update: {},
        });
      }
    }

    if (data.cellBranchId !== undefined) {
      const branchId = data.cellBranchId?.trim() || null;
      if (!branchId) {
        await this.prisma.cellBranchMember.deleteMany({ where: { memberId, churchId } });
        return;
      }

      const branch = await this.prisma.cellBranch.findFirst({
        where: { id: branchId, churchId },
      });
      if (!branch) throw new BadRequestException('Cell branch is invalid');

      await this.prisma.cellBranchMember.deleteMany({ where: { memberId, churchId } });
      await this.prisma.cellBranchMember.create({
        data: { churchId, branchId, memberId },
      });
    }
  }
}
