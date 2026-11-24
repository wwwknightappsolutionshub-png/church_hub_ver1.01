import {
  MEMBER_PRIVACY_FIELD_CATALOG,
  RESTRICTED_MARKER,
  stricterVisibility,
} from './member-privacy.catalog';
import { MemberPrivacyService } from './member-privacy.service';

describe('MemberPrivacyService', () => {
  const audit = { append: jest.fn().mockResolvedValue(undefined) };
  const prisma = {
    memberFieldAccessPolicy: {
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn(),
    },
    memberCustomFieldDefinition: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    user: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    userRole: { findMany: jest.fn() },
    notification: { create: jest.fn() },
    cellBranch: { findFirst: jest.fn().mockResolvedValue(null) },
    cellProvince: { findFirst: jest.fn().mockResolvedValue(null) },
    cellLeadershipDeputy: { findFirst: jest.fn().mockResolvedValue(null) },
    securityAuditLog: { findFirst: jest.fn().mockResolvedValue(null) },
    member: { findFirst: jest.fn() },
  };

  const svc = new MemberPrivacyService(prisma as never, audit as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.memberFieldAccessPolicy.findMany.mockResolvedValue([]);
  });

  it('catalog includes locked ops-visible and leadership-restricted floors', () => {
    const email = MEMBER_PRIVACY_FIELD_CATALOG.find((f) => f.fieldKey === 'member.email');
    const city = MEMBER_PRIVACY_FIELD_CATALOG.find((f) => f.fieldKey === 'member.city');
    const pastoral = MEMBER_PRIVACY_FIELD_CATALOG.find(
      (f) => f.fieldKey === 'capability.pastoralNotes',
    );
    expect(email?.opsFloor).toBe('RESTRICTED');
    expect(city?.opsFloor).toBe('VISIBLE');
    expect(pastoral?.opsFloor).toBe('HIDDEN');
    expect(pastoral?.bucket).toBe('pastor_gated');
  });

  it('stricterVisibility never loosens a RESTRICTED floor to VISIBLE', () => {
    expect(stricterVisibility('RESTRICTED', 'VISIBLE')).toBe('RESTRICTED');
    expect(stricterVisibility('HIDDEN', 'RESTRICTED')).toBe('HIDDEN');
  });

  it('projects email/phone as Restricted for ops viewers', async () => {
    const viewer = svc.resolveViewer({
      userId: 'u1',
      churchId: 'c1',
      email: 'leader@demo.church',
      roles: ['LEADER'],
    } as never);
    expect(viewer.isOpsMasked).toBe(true);

    const projected = await svc.projectMember('c1', viewer, {
      id: 'm1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      phone: '07123456789',
      city: 'London',
      family: { id: 'f1', name: 'Lovelace' },
    });

    expect(projected.firstName).toBe('Ada');
    expect(projected.city).toBe('London');
    expect(projected.email).toEqual(RESTRICTED_MARKER);
    expect(projected.phone).toEqual(RESTRICTED_MARKER);
    expect((projected.family as { name: string }).name).toBe('Lovelace');
  });

  it('returns raw member for Admin/Pastor', async () => {
    const viewer = svc.resolveViewer({
      userId: 'u2',
      churchId: 'c1',
      email: 'pastor@demo.church',
      roles: ['PASTOR'],
    } as never);
    const member = {
      id: 'm1',
      firstName: 'Ada',
      email: 'ada@example.com',
    };
    const projected = await svc.projectMember('c1', viewer, member);
    expect(projected.email).toBe('ada@example.com');
    expect(prisma.memberFieldAccessPolicy.findMany).not.toHaveBeenCalled();
  });

  it('rejects church policy that loosens hardcoded floor', async () => {
    await expect(
      svc.upsertPolicies(
        { userId: 'u1', churchId: 'c1', email: 'a@b.c', roles: ['ADMIN'] } as never,
        'CHURCH' as never,
        'c1',
        [{ fieldKey: 'member.email', visibility: 'VISIBLE', editability: 'EDITABLE' }],
      ),
    ).rejects.toThrow(/Cannot loosen hardcoded floor/);
  });

  it('requestAccess notifies Admin/Pastor and audits', async () => {
    prisma.user.findMany.mockResolvedValue([{ id: 'admin1' }]);
    prisma.user.findFirst.mockResolvedValue({
      id: 'leader1',
      firstName: 'Cell',
      lastName: 'Leader',
      email: 'l@c.com',
    });
    prisma.notification.create.mockResolvedValue({ id: 'n1' });
    prisma.securityAuditLog.findFirst.mockResolvedValue(null);

    const result = await svc.requestAccess(
      { userId: 'leader1', churchId: 'c1', email: 'l@c.com', roles: ['LEADER'] } as never,
      'c1',
      { reason: 'Need phone for visit', memberId: undefined },
    );

    expect(result.notified).toBe(1);
    expect(result.deduped).toBe(false);
    expect(prisma.notification.create).toHaveBeenCalled();
    expect(audit.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'MEMBER_PRIVACY_ACCESS_REQUESTED',
        churchId: 'c1',
      }),
    );
  });

  it('requestAccess rejects non-ops church members', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'm1',
      firstName: 'Member',
      lastName: 'Only',
      email: 'm@c.com',
    });
    prisma.userRole.findMany.mockResolvedValue([]);
    prisma.cellBranch.findFirst.mockResolvedValue(null);
    prisma.cellProvince.findFirst.mockResolvedValue(null);
    prisma.cellLeadershipDeputy.findFirst.mockResolvedValue(null);
    await expect(
      svc.requestAccess(
        { userId: 'm1', churchId: 'c1', email: 'm@c.com', roles: ['MEMBER'] } as never,
        'c1',
        {},
      ),
    ).rejects.toThrow(/cell leadership or Leaders/);
  });

  it('sanitizeOpsMemberWritePayload strips privilege and sensitive fields', () => {
    const viewer = svc.resolveViewer({
      userId: 'u1',
      churchId: 'c1',
      email: 'l@c.com',
      roles: ['LEADER'],
    } as never);
    const out = svc.sanitizeOpsMemberWritePayload(viewer, {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      notes: 'secret care plan',
      dateOfBirth: '1815-12-10',
      roles: ['ADMIN', 'ADULT'],
      userId: 'link-user',
      address: '10 Downing St',
      city: 'London',
      customFields: { ssn: 'x' },
    });
    expect(out.firstName).toBe('Ada');
    expect(out.email).toBe('ada@example.com');
    expect(out.city).toBe('London');
    expect(out.notes).toBeUndefined();
    expect(out.dateOfBirth).toBeUndefined();
    expect(out.userId).toBeUndefined();
    expect(out.address).toBeUndefined();
    expect(out.customFields).toBeUndefined();
    expect(out.roles).toEqual(['ADULT']);
  });

  it('masks celebration age when DOB is restricted', async () => {
    const viewer = svc.resolveViewer({
      userId: 'u1',
      churchId: 'c1',
      email: 'l@c.com',
      roles: ['LEADER'],
    } as never);
    const projected = await svc.projectMember('c1', viewer, {
      id: 'm1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      age: 42,
      label: 'Dec 10',
      email: 'ada@example.com',
    });
    expect(projected.label).toBe('Dec 10');
    expect(projected.age).toEqual(RESTRICTED_MARKER);
    expect(projected.email).toEqual(RESTRICTED_MARKER);
  });

  it('projectFamily masks customFieldValues for ops', async () => {
    const viewer = svc.resolveViewer({
      userId: 'u1',
      churchId: 'c1',
      email: 'l@c.com',
      roles: ['LEADER'],
    } as never);
    const projected = await svc.projectFamily('c1', viewer, {
      id: 'f1',
      name: 'Lovelace',
      email: 'fam@example.com',
      customFieldValues: [{ value: 'secret' }],
      propertyAssignments: [{ id: 'p1' }],
      members: [{ id: 'm1', firstName: 'Ada', email: 'ada@example.com' }],
    });
    expect(projected.name).toBe('Lovelace');
    expect(projected.email).toEqual(RESTRICTED_MARKER);
    expect(projected.customFieldValues).toEqual(RESTRICTED_MARKER);
    expect(projected.propertyAssignments).toEqual(RESTRICTED_MARKER);
    expect((projected.members as Record<string, unknown>[])[0].email).toEqual(
      RESTRICTED_MARKER,
    );
  });
});
