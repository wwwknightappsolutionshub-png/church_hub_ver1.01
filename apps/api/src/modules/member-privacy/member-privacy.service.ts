import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MemberFieldEditability,
  MemberFieldPolicyScope,
  MemberFieldVisibility,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SecurityAuditService } from '../../common/security/security-audit.service';
import type { AuthUser } from '../auth/current-user.decorator';
import {
  MEMBER_PRIVACY_FIELD_CATALOG,
  RESTRICTED_MARKER,
  stricterEditability,
  stricterVisibility,
  type FieldEditability,
  type FieldVisibility,
  type MemberPrivacyFieldDef,
} from './member-privacy.catalog';

export type PrivacyViewer = {
  userId: string;
  roles: string[];
  isAdmin: boolean;
  isPastor: boolean;
  isLeadership: boolean;
  /** Cell minister / deputy / LEADER — receives ops projection */
  isOpsMasked: boolean;
};

export type ResolvedFieldPolicy = {
  fieldKey: string;
  visibility: FieldVisibility;
  editability: FieldEditability;
  source: 'hardcoded' | 'platform_global' | 'platform_tenant' | 'church';
};

function policyKeyOf(
  scope: MemberFieldPolicyScope,
  churchId: string | null,
  fieldKey: string,
): string {
  const tenant =
    scope === MemberFieldPolicyScope.PLATFORM_GLOBAL ? 'global' : churchId ?? 'unknown';
  return `${scope}:${tenant}:${fieldKey}`;
}

@Injectable()
export class MemberPrivacyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: SecurityAuditService,
  ) {}

  resolveViewer(user: AuthUser, roleNames?: string[]): PrivacyViewer {
    const roles = roleNames ?? user.roles ?? [];
    const isAdmin = roles.includes('ADMIN');
    const isPastor = roles.includes('PASTOR');
    const isLeadership = isAdmin || isPastor;
    const isLeader = roles.includes('LEADER');
    return {
      userId: user.userId,
      roles,
      isAdmin,
      isPastor,
      isLeadership,
      isOpsMasked: !isLeadership,
    };
  }

  async resolveViewerFromDb(user: AuthUser, churchId: string): Promise<PrivacyViewer> {
    if (user.roles?.length) return this.resolveViewer(user);
    const rows = await this.prisma.userRole.findMany({
      where: { userId: user.userId, user: { churchId } },
      include: { role: true },
    });
    return this.resolveViewer(user, rows.map((r) => r.role.name));
  }

  catalog(includeCustom?: { fieldKey: string; label: string }[]): MemberPrivacyFieldDef[] {
    const base = [...MEMBER_PRIVACY_FIELD_CATALOG];
    for (const c of includeCustom ?? []) {
      base.push({
        fieldKey: c.fieldKey,
        label: c.label,
        group: 'Custom fields',
        opsFloor: 'RESTRICTED',
        bucket: 'leadership_only',
        entity: 'member',
      });
    }
    return base;
  }

  /**
   * Merge hardcoded floor + platform global + platform tenant + church.
   * Config may only tighten ops visibility (never loosen hardcoded RESTRICTED/HIDDEN).
   */
  async resolveFieldPolicies(
    churchId: string | null,
    opts?: { customFields?: { fieldKey: string; label: string }[] },
  ): Promise<ResolvedFieldPolicy[]> {
    const defs = this.catalog(opts?.customFields);
    const [globalRows, tenantRows, churchRows] = await Promise.all([
      this.prisma.memberFieldAccessPolicy.findMany({
        where: { scope: MemberFieldPolicyScope.PLATFORM_GLOBAL },
      }),
      churchId
        ? this.prisma.memberFieldAccessPolicy.findMany({
            where: {
              scope: MemberFieldPolicyScope.PLATFORM_TENANT,
              churchId,
            },
          })
        : Promise.resolve([]),
      churchId
        ? this.prisma.memberFieldAccessPolicy.findMany({
            where: { scope: MemberFieldPolicyScope.CHURCH, churchId },
          })
        : Promise.resolve([]),
    ]);

    const byKey = (rows: typeof globalRows) => {
      const m = new Map<string, (typeof rows)[0]>();
      for (const r of rows) m.set(r.fieldKey, r);
      return m;
    };
    const g = byKey(globalRows);
    const t = byKey(tenantRows);
    const c = byKey(churchRows);

    return defs.map((def) => {
      let visibility: FieldVisibility = def.opsFloor;
      let editability: FieldEditability = def.opsFloor === 'VISIBLE' ? 'EDITABLE' : 'LOCKED';
      let source: ResolvedFieldPolicy['source'] = 'hardcoded';

      const apply = (
        row: (typeof globalRows)[0] | undefined,
        src: ResolvedFieldPolicy['source'],
      ) => {
        if (!row) return;
        // Only tighten relative to current (hardcoded floor already applied)
        visibility = stricterVisibility(visibility, row.visibility);
        editability = stricterEditability(editability, row.editability);
        source = src;
      };

      apply(g.get(def.fieldKey), 'platform_global');
      apply(t.get(def.fieldKey), 'platform_tenant');
      apply(c.get(def.fieldKey), 'church');

      // Hardcoded floor cannot be loosened below catalog opsFloor
      visibility = stricterVisibility(def.opsFloor, visibility);

      return { fieldKey: def.fieldKey, visibility, editability, source };
    });
  }

  async getEffectiveMap(
    churchId: string | null,
  ): Promise<Map<string, ResolvedFieldPolicy>> {
    const list = await this.resolveFieldPolicies(churchId);
    return new Map(list.map((p) => [p.fieldKey, p]));
  }

  /**
   * Project a member-like object for the viewer.
   * Leadership gets raw values (C gates enforced at endpoints).
   * Ops get clear values only for VISIBLE fields; else Restricted marker or omit if HIDDEN.
   */
  async projectMember<T extends Record<string, unknown>>(
    churchId: string,
    viewer: PrivacyViewer,
    member: T,
  ): Promise<Record<string, unknown>> {
    if (viewer.isLeadership) return { ...member };
    const policyMap = await this.getEffectiveMap(churchId);
    return this.projectMemberWithMap(viewer, policyMap, member);
  }

  async projectMemberList<T extends Record<string, unknown>>(
    churchId: string,
    viewer: PrivacyViewer,
    members: T[],
  ): Promise<Record<string, unknown>[]> {
    if (viewer.isLeadership || members.length === 0) {
      return members.map((m) => ({ ...m }));
    }
    const policyMap = await this.getEffectiveMap(churchId);
    return members.map((m) => this.projectMemberWithMap(viewer, policyMap, m));
  }

  /**
   * Project a family record for the viewer (LEADER / ops: name + masked member contact).
   */
  async projectFamily(
    churchId: string,
    viewer: PrivacyViewer,
    family: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    if (viewer.isLeadership) return { ...family };

    const policyMap = await this.getEffectiveMap(churchId);
    const out: Record<string, unknown> = { id: family.id };

    const famNamePol = policyMap.get('family.name');
    if ((famNamePol?.visibility ?? 'VISIBLE') === 'VISIBLE') {
      out.name = family.name;
    } else if ((famNamePol?.visibility ?? 'VISIBLE') === 'RESTRICTED') {
      out.name = { ...RESTRICTED_MARKER };
    }

    const maskFam = (policyKey: string, rawKey: string) => {
      if (!(rawKey in family)) return;
      const pol = policyMap.get(policyKey);
      const vis = pol?.visibility ?? 'RESTRICTED';
      if (vis === 'HIDDEN') return;
      if (vis === 'RESTRICTED') {
        out[rawKey] = { ...RESTRICTED_MARKER };
        return;
      }
      out[rawKey] = family[rawKey];
    };

    for (const [pk, rk] of [
      ['family.address', 'address'],
      ['family.address2', 'address2'],
      ['family.city', 'city'],
      ['family.state', 'state'],
      ['family.zip', 'zip'],
      ['family.country', 'country'],
      ['family.homePhone', 'homePhone'],
      ['family.email', 'email'],
      ['family.homeCell', 'homeCell'],
      ['family.headMemberId', 'headMemberId'],
    ] as const) {
      maskFam(pk, rk);
    }

    // Pass through non-PII metadata (custom fields / properties stay leadership-only)
    for (const k of ['isActive', 'specialOccasion', 'specialOccasionDate', 'createdAt', 'updatedAt'] as const) {
      if (k in family) out[k] = family[k];
    }

    const customPol = policyMap.get('member.customFields');
    const propsPol = policyMap.get('member.properties');
    if ('customFieldValues' in family) {
      if (customPol?.visibility === 'VISIBLE') out.customFieldValues = family.customFieldValues;
      else if (customPol?.visibility === 'RESTRICTED') {
        out.customFieldValues = { ...RESTRICTED_MARKER };
      }
    }
    if ('propertyAssignments' in family) {
      if (propsPol?.visibility === 'VISIBLE') out.propertyAssignments = family.propertyAssignments;
      else if (propsPol?.visibility === 'RESTRICTED') {
        out.propertyAssignments = { ...RESTRICTED_MARKER };
      }
    }

    if (Array.isArray(family.members)) {
      const membersPol = policyMap.get('family.members');
      if (membersPol?.visibility === 'HIDDEN') {
        out.members = [];
      } else if (membersPol?.visibility === 'RESTRICTED') {
        // Show household roster identity only — contact fields restricted
        out.members = (family.members as Record<string, unknown>[]).map((m) =>
          this.projectMemberWithMap(viewer, policyMap, m),
        );
      } else {
        out.members = (family.members as Record<string, unknown>[]).map((m) =>
          this.projectMemberWithMap(viewer, policyMap, m),
        );
      }
    }

    return out;
  }

  private projectMemberWithMap(
    viewer: PrivacyViewer,
    policyMap: Map<string, ResolvedFieldPolicy>,
    member: Record<string, unknown>,
  ): Record<string, unknown> {
    if (viewer.isLeadership) return { ...member };

    const out: Record<string, unknown> = {};
    const setField = (key: string, rawKey: string, value: unknown) => {
      const pol = policyMap.get(key);
      const vis = pol?.visibility ?? 'RESTRICTED';
      if (vis === 'HIDDEN') return;
      if (vis === 'RESTRICTED') {
        out[rawKey] = { ...RESTRICTED_MARKER };
        return;
      }
      out[rawKey] = value;
    };

    const passthroughVisible = [
      'id',
      'firstName',
      'lastName',
      'title',
      'middleName',
      'suffix',
      'nickname',
      'avatarUrl',
      'gender',
      'status',
      'roles',
      'ministryInterests',
      'membershipDate',
      'friendDate',
      'onboardingStep',
      'specialOccasion',
      'specialOccasionDate',
      'bio',
      'bornAgain',
      'baptizedInHolySpirit',
      'city',
      'joinedAt',
      'createdAt',
      'updatedAt',
    ] as const;

    for (const k of passthroughVisible) {
      if (k in member) setField(`member.${k}`, k, member[k]);
    }

    // Celebration calendar labels (month/day) are operational; age derives from DOB — gate it
    for (const k of ['label', 'date', 'type', 'name', 'occasion'] as const) {
      if (k in member) out[k] = member[k];
    }
    if ('age' in member) {
      const dobPol = policyMap.get('member.dateOfBirth');
      const vis = dobPol?.visibility ?? 'RESTRICTED';
      if (vis === 'VISIBLE') out.age = member.age;
      else if (vis === 'RESTRICTED') out.age = { ...RESTRICTED_MARKER };
      // HIDDEN → omit
    }

    if ('classification' in member) {
      setField('member.classification', 'classification', member.classification);
    }
    if ('classificationId' in member) {
      setField('member.classification', 'classificationId', member.classificationId);
    }
    if ('familyRole' in member) {
      setField('member.familyRole', 'familyRole', member.familyRole);
    }
    if ('familyRoleId' in member) {
      setField('member.familyRole', 'familyRoleId', member.familyRoleId);
    }

    const restrictedKeys: Array<[string, string]> = [
      ['member.email', 'email'],
      ['member.workEmail', 'workEmail'],
      ['member.phone', 'phone'],
      ['member.homePhone', 'homePhone'],
      ['member.workPhone', 'workPhone'],
      ['member.cellPhone', 'cellPhone'],
      ['member.address', 'address'],
      ['member.address2', 'address2'],
      ['member.state', 'state'],
      ['member.zip', 'zip'],
      ['member.country', 'country'],
      ['member.dateOfBirth', 'dateOfBirth'],
      ['member.hideAge', 'hideAge'],
      ['member.facebook', 'facebook'],
      ['member.twitter', 'twitter'],
      ['member.linkedIn', 'linkedIn'],
      ['member.notes', 'notes'],
      ['member.userId', 'userId'],
      ['member.deletedAt', 'deletedAt'],
      ['member.familyId', 'familyId'],
      ['member.customFields', 'customFieldValues'],
      ['member.customFields', 'customFields'],
      ['member.properties', 'propertyAssignments'],
    ];

    for (const [policyKey, rawKey] of restrictedKeys) {
      if (rawKey in member) setField(policyKey, rawKey, member[rawKey]);
    }

    if (member.family && typeof member.family === 'object') {
      const fam = member.family as Record<string, unknown>;
      const famOut: Record<string, unknown> = {};
      const famNamePol = policyMap.get('family.name');
      if ((famNamePol?.visibility ?? 'VISIBLE') !== 'HIDDEN') {
        if ((famNamePol?.visibility ?? 'VISIBLE') === 'RESTRICTED') {
          famOut.name = { ...RESTRICTED_MARKER };
        } else if ('name' in fam) {
          famOut.name = fam.name;
        }
        if ('id' in fam) famOut.id = fam.id;
      }
      out.family = Object.keys(famOut).length ? famOut : null;
    } else if ('family' in member) {
      out.family = member.family ?? null;
    }

    if ('parentLinks' in member) {
      const pol = policyMap.get('family.parentChildLinks');
      if (pol?.visibility === 'VISIBLE') out.parentLinks = member.parentLinks;
      else if (pol?.visibility === 'RESTRICTED') out.parentLinks = { ...RESTRICTED_MARKER };
    }
    if ('childLinks' in member) {
      const pol = policyMap.get('family.parentChildLinks');
      if (pol?.visibility === 'VISIBLE') out.childLinks = member.childLinks;
      else if (pol?.visibility === 'RESTRICTED') out.childLinks = { ...RESTRICTED_MARKER };
    }

    return out;
  }

  /**
   * Ops create/update allowlist for cell flows.
   * Blocks privilege escalation (ADMIN/PASTOR member roles, userId link) and
   * leadership-only profile fields (notes, DOB, socials, full address, customs).
   * Contact may be captured on create (ops entered it) but responses are still projected.
   */
  sanitizeOpsMemberWritePayload(
    viewer: PrivacyViewer,
    payload: Record<string, unknown>,
  ): Record<string, unknown> {
    if (viewer.isLeadership) return { ...payload };

    const allow = new Set([
      'firstName',
      'lastName',
      'title',
      'middleName',
      'suffix',
      'nickname',
      'gender',
      'avatarUrl',
      'email',
      'workEmail',
      'phone',
      'homePhone',
      'workPhone',
      'cellPhone',
      'city',
      'status',
      'ministryInterests',
      'classificationId',
      'familyRoleId',
      'bornAgain',
      'baptizedInHolySpirit',
      'specialOccasion',
      'specialOccasionDate',
      'membershipDate',
      'friendDate',
      'startOnboarding',
      'requireContactFields',
      'cellBranchId',
      'serviceUnitIds',
      'createFamily',
    ]);

    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(payload)) {
      if (!allow.has(k) || v === undefined) continue;
      out[k] = v;
    }

    // Ops may set non-privileged member roles only (never ADMIN/PASTOR / user link)
    if (Array.isArray(payload.roles)) {
      const safe = (payload.roles as unknown[])
        .map((r) => String(r))
        .filter((r) => !['ADMIN', 'PASTOR'].includes(r));
      out.roles = safe.length ? safe : ['ADULT'];
    }

    return out;
  }

  /** @deprecated prefer sanitizeOpsMemberWritePayload — kept for callers that pass policyMap */
  filterWritablePayload(
    viewer: PrivacyViewer,
    _policyMap: Map<string, ResolvedFieldPolicy>,
    payload: Record<string, unknown>,
  ): Record<string, unknown> {
    return this.sanitizeOpsMemberWritePayload(viewer, payload);
  }

  assertPastorOnly(viewer: PrivacyViewer, capability: string) {
    if (!viewer.isPastor) {
      throw new ForbiddenException(`${capability} is restricted to Church Pastor`);
    }
  }

  assertLeadership(viewer: PrivacyViewer, capability: string) {
    if (!viewer.isLeadership) {
      throw new ForbiddenException(`${capability} requires Church Admin or Pastor`);
    }
  }

  async listPoliciesForEditor(
    scope: MemberFieldPolicyScope,
    churchId: string | null,
  ) {
    if (scope !== MemberFieldPolicyScope.PLATFORM_GLOBAL && !churchId) {
      throw new BadRequestException('churchId required for this scope');
    }
    let custom: { fieldKey: string; label: string }[] = [];
    if (churchId) {
      const defs = await this.prisma.memberCustomFieldDefinition.findMany({
        where: { churchId, isActive: true },
        select: { id: true, label: true, fieldKey: true },
        orderBy: { sortOrder: 'asc' },
      });
      custom = defs.map((d) => ({
        fieldKey: `custom:${d.id}`,
        label: d.label || d.fieldKey,
      }));
    }
    const effective = await this.resolveFieldPolicies(churchId, { customFields: custom });
    const stored = await this.prisma.memberFieldAccessPolicy.findMany({
      where:
        scope === MemberFieldPolicyScope.PLATFORM_GLOBAL
          ? { scope }
          : { scope, churchId: churchId! },
    });
    const storedMap = new Map(stored.map((s) => [s.fieldKey, s]));
    return effective.map((e) => {
      const row = storedMap.get(e.fieldKey);
      const def = this.catalog(custom).find((d) => d.fieldKey === e.fieldKey);
      return {
        fieldKey: e.fieldKey,
        label: def?.label ?? e.fieldKey,
        group: def?.group ?? 'Other',
        entity: def?.entity ?? 'member',
        hardcodedFloor: def?.opsFloor ?? 'RESTRICTED',
        effectiveVisibility: e.visibility,
        effectiveEditability: e.editability,
        effectiveSource: e.source,
        override: row
          ? {
              visibility: row.visibility,
              editability: row.editability,
              updatedAt: row.updatedAt,
            }
          : null,
      };
    });
  }

  async upsertPolicies(
    actor: AuthUser,
    scope: MemberFieldPolicyScope,
    churchId: string | null,
    items: Array<{
      fieldKey: string;
      visibility: MemberFieldVisibility;
      editability: MemberFieldEditability;
    }>,
  ) {
    if (scope !== MemberFieldPolicyScope.PLATFORM_GLOBAL && !churchId) {
      throw new BadRequestException('churchId required');
    }
    const catalogKeys = new Set(this.catalog().map((c) => c.fieldKey));
    const customIds = items
      .filter((i) => i.fieldKey.startsWith('custom:'))
      .map((i) => i.fieldKey.slice('custom:'.length));
    if (customIds.length) {
      if (!churchId) {
        throw new BadRequestException('custom field policies require a churchId');
      }
      const owned = await this.prisma.memberCustomFieldDefinition.findMany({
        where: { churchId, id: { in: customIds } },
        select: { id: true },
      });
      const ownedSet = new Set(owned.map((o) => o.id));
      for (const id of customIds) {
        if (!ownedSet.has(id)) {
          throw new BadRequestException(`Unknown or cross-tenant custom field: custom:${id}`);
        }
      }
    }

    for (const item of items) {
      if (!catalogKeys.has(item.fieldKey) && !item.fieldKey.startsWith('custom:')) {
        throw new BadRequestException(`Unknown fieldKey: ${item.fieldKey}`);
      }
      const def = MEMBER_PRIVACY_FIELD_CATALOG.find((c) => c.fieldKey === item.fieldKey);
      if (def) {
        const merged = stricterVisibility(def.opsFloor, item.visibility);
        if (merged !== item.visibility && visibilityLoosens(def.opsFloor, item.visibility)) {
          throw new BadRequestException(
            `Cannot loosen hardcoded floor for ${item.fieldKey} (floor=${def.opsFloor})`,
          );
        }
      } else if (item.fieldKey.startsWith('custom:')) {
        // Custom fields inherit leadership-only floor — cannot publish VISIBLE to ops
        if (visibilityLoosens('RESTRICTED', item.visibility)) {
          throw new BadRequestException(
            `Cannot loosen custom field floor for ${item.fieldKey} (floor=RESTRICTED)`,
          );
        }
      }
    }

    const results = [];
    for (const item of items) {
      const key = policyKeyOf(scope, churchId, item.fieldKey);
      const def = MEMBER_PRIVACY_FIELD_CATALOG.find((c) => c.fieldKey === item.fieldKey);
      const floor: FieldVisibility = def?.opsFloor ?? 'RESTRICTED';
      const visibility = stricterVisibility(floor, item.visibility);
      const row = await this.prisma.memberFieldAccessPolicy.upsert({
        where: { policyKey: key },
        create: {
          policyKey: key,
          scope,
          churchId: scope === MemberFieldPolicyScope.PLATFORM_GLOBAL ? null : churchId,
          fieldKey: item.fieldKey,
          visibility,
          editability: item.editability,
          updatedById: actor.userId,
        },
        update: {
          visibility,
          editability: item.editability,
          updatedById: actor.userId,
        },
      });
      results.push(row);
    }

    await this.audit.append({
      churchId: churchId,
      actorId: actor.userId,
      action: 'MEMBER_FIELD_POLICY_CHANGED',
      targetType: 'Other',
      targetId: scope,
      metadata: {
        scope,
        churchId,
        count: items.length,
        fields: items.map((i) => i.fieldKey),
      } as Prisma.InputJsonValue,
    });

    return { updated: results.length, policies: results };
  }

  /**
   * LEADER / cell ops request elevated member-data access — notifies Admin + Pastor only.
   * Dedupes within a short window to prevent notification flooding.
   */
  async requestAccess(
    user: AuthUser,
    churchId: string,
    body: { reason?: string; memberId?: string },
  ) {
    const viewer = await this.resolveViewerFromDb(user, churchId);
    if (viewer.isLeadership) {
      throw new BadRequestException('Church Admin/Pastor already have full profile access');
    }

    const active = await this.prisma.user.findFirst({
      where: { id: user.userId, churchId, isActive: true },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    if (!active) throw new ForbiddenException('Inactive or unknown church user');

    const isLeader = viewer.roles.includes('LEADER');
    const [cellLeader, cellProvinceLeader, cellDeputy] = await Promise.all([
      this.prisma.cellBranch.findFirst({
        where: { churchId, leaderUserId: user.userId },
        select: { id: true },
      }),
      this.prisma.cellProvince.findFirst({
        where: { churchId, leaderUserId: user.userId },
        select: { id: true },
      }),
      this.prisma.cellLeadershipDeputy.findFirst({
        where: { churchId, userId: user.userId },
        select: { id: true },
      }),
    ]);
    if (!isLeader && !cellLeader && !cellProvinceLeader && !cellDeputy) {
      throw new ForbiddenException(
        'Only cell leadership or Leaders may request elevated member-data access',
      );
    }

    if (body.memberId) {
      const member = await this.prisma.member.findFirst({
        where: { id: body.memberId, churchId },
        select: { id: true },
      });
      if (!member) throw new NotFoundException('Member not found in this church');
    }

    const since = new Date(Date.now() - 15 * 60 * 1000);
    const recent = await this.prisma.securityAuditLog.findFirst({
      where: {
        churchId,
        actorId: user.userId,
        action: 'MEMBER_PRIVACY_ACCESS_REQUESTED',
        createdAt: { gte: since },
        ...(body.memberId ? { targetId: body.memberId } : {}),
      },
      select: { id: true },
    });
    if (recent) {
      return { notified: 0, deduped: true as const };
    }

    const leadership = await this.prisma.user.findMany({
      where: {
        churchId,
        isActive: true,
        roles: { some: { role: { name: { in: ['ADMIN', 'PASTOR'] } } } },
      },
      select: { id: true },
      take: 10,
    });
    if (!leadership.length) {
      throw new NotFoundException('No Admin or Pastor found to receive this request');
    }

    const name = `${active.firstName} ${active.lastName}`.trim() || active.email;
    const title = 'Member data access request';
    const detail = [
      `${name} requested access to restricted member profile fields.`,
      body.memberId ? `Member id: ${body.memberId}` : null,
      body.reason?.trim() ? `Reason: ${body.reason.trim()}` : null,
      'No automatic unmask — review and share only what is appropriate.',
    ]
      .filter(Boolean)
      .join('\n');

    for (const lead of leadership) {
      await this.prisma.notification.create({
        data: {
          churchId,
          userId: lead.id,
          title,
          body: detail.slice(0, 2000),
          type: 'SYSTEM',
          data: {
            kind: 'MEMBER_PRIVACY_ACCESS_REQUEST',
            requesterId: user.userId,
            memberId: body.memberId ?? null,
          } as Prisma.InputJsonValue,
        },
      });
    }

    await this.audit.append({
      churchId,
      actorId: user.userId,
      action: 'MEMBER_PRIVACY_ACCESS_REQUESTED',
      targetType: 'Member',
      targetId: body.memberId ?? null,
      metadata: { notified: leadership.length, reason: body.reason ?? null },
    });

    return { notified: leadership.length, deduped: false as const };
  }
}

function visibilityLoosens(floor: FieldVisibility, requested: FieldVisibility): boolean {
  const rank = (v: FieldVisibility) =>
    v === 'HIDDEN' ? 2 : v === 'RESTRICTED' ? 1 : 0;
  return rank(requested) < rank(floor);
}
