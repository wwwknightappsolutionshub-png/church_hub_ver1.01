import { SecurityAuditService } from '../../common/security/security-audit.service';
import { AuthzDenialService } from '../../common/security/authz-denial.service';
import { resolveClientIp } from '../../common/security/client-ip';

describe('Phase 3 security regressions', () => {
  it('tenant audit query always scopes by churchId (IDOR contract)', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      securityAuditLog: { findMany, create: jest.fn(), count: jest.fn() },
    };
    const svc = new SecurityAuditService(prisma as never);
    await svc.query({ churchId: 'church-a', take: 20 });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([expect.objectContaining({ churchId: 'church-a' })]),
        }),
      }),
    );
    const where = findMany.mock.calls[0][0].where;
    expect(JSON.stringify(where)).not.toContain('church-b');
  });

  it('tenant query without churchId and without crossTenant fails closed', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const svc = new SecurityAuditService({
      securityAuditLog: { findMany, create: jest.fn() },
    } as never);
    await svc.query({ take: 10 });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([expect.objectContaining({ churchId: '__never__' })]),
        }),
      }),
    );
  });

  it('platform cross-tenant query can filter by churchId without inventing a foreign church', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      securityAuditLog: { findMany, create: jest.fn(), count: jest.fn() },
    };
    const svc = new SecurityAuditService(prisma as never);
    await svc.query({ crossTenant: true, churchId: 'church-a', take: 10 });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([expect.objectContaining({ churchId: 'church-a' })]),
        }),
      }),
    );
  });

  it('sanitizes nested pastoral/password metadata on append', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'a1' });
    const svc = new SecurityAuditService({
      securityAuditLog: { create, findMany: jest.fn().mockResolvedValue([]) },
    } as never);
    await svc.append({
      churchId: 'c1',
      actorId: 'u1',
      action: 'UPDATE_PASTORAL_NOTE',
      targetType: 'PastoralNote',
      metadata: {
        route: '/ok',
        diff: { content: 'pastoral plaintext', noteBody: 'secret care plan' },
        password: 'secret',
      },
    });
    const meta = create.mock.calls[0][0].data.metadata as Record<string, unknown>;
    expect(meta.password).toBe('[redacted]');
    expect((meta.diff as Record<string, unknown>).content).toBe('[redacted]');
    expect((meta.diff as Record<string, unknown>).noteBody).toBe('[redacted]');
    expect(meta.route).toBe('/ok');
  });

  it('export emits AUDIT_LOG_EXPORTED via append contract', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'e1' });
    const findMany = jest.fn().mockResolvedValue([
      {
        id: '1',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        churchId: 'c1',
        actorId: 'u1',
        action: 'AUTHZ_DENIED',
        targetType: 'Authz',
        targetId: null,
        ip: '1.2.3.4',
        metadata: null,
        actor: { id: 'u1', firstName: 'A', lastName: 'B', email: 'a@b.com' },
        church: { id: 'c1', name: 'Church A', slug: 'a' },
      },
    ]);
    const svc = new SecurityAuditService({
      securityAuditLog: { create, findMany },
    } as never);

    const exported = await svc.exportRows({ churchId: 'c1', take: 100 }, 'csv');
    expect(exported.rowCount).toBe(1);
    expect(exported.contentType).toContain('csv');
    expect(exported.body).toContain('AUTHZ_DENIED');

    await svc.append({
      churchId: 'c1',
      actorId: 'admin-1',
      action: 'AUDIT_LOG_EXPORTED',
      targetType: 'AuditLog',
      metadata: { format: 'csv', rowCount: exported.rowCount, scope: 'tenant' },
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'AUDIT_LOG_EXPORTED' }),
      }),
    );
  });

  it('abuse detector uses DB counts (multi-instance safe) after threshold', async () => {
    process.env.AUTHZ_ABUSE_THRESHOLD = '3';
    process.env.AUTHZ_ABUSE_WINDOW_MINUTES = '15';
    process.env.AUTHZ_DENIED_DEDUPE_SECONDS = '0';

    let denialCount = 0;
    const auditAppend = jest.fn().mockResolvedValue({ id: 'x' });
    const countSince = jest.fn().mockImplementation(async () => {
      denialCount += 1;
      return denialCount;
    });
    const audit = {
      append: auditAppend,
      countSince,
    } as unknown as SecurityAuditService;
    const createMany = jest.fn().mockResolvedValue({ count: 1 });
    const emailSend = jest.fn().mockResolvedValue({ success: true, messageId: 'm1' });
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'u1',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@church.test',
          churchId: 'c1',
          roles: [{ role: { name: 'LEADER' } }],
        }),
        findMany: jest.fn().mockResolvedValue([
          { id: 'admin1', email: 'admin@church.test', firstName: 'Ada' },
        ]),
      },
      notification: { createMany },
    };
    const config = {
      get: (k: string) => process.env[k],
    };

    const denial = new AuthzDenialService(
      config as never,
      prisma as never,
      audit,
      { send: emailSend } as never,
    );

    for (let i = 0; i < 3; i++) {
      await denial.recordDenialAsync({
        actorId: 'u1',
        churchId: 'c1',
        ip: '10.0.0.1',
        route: `GET /secret-${i}`,
        reason: 'Insufficient permissions',
        required: ['ADMIN'],
        gate: 'RolesGuard',
      });
    }

    expect(auditAppend).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'AUTHZ_DENIED' }),
    );
    expect(auditAppend).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'AUTHZ_ABUSE_DETECTED' }),
    );
    expect(countSince).toHaveBeenCalled();
    expect(createMany).toHaveBeenCalled();
    expect(emailSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'admin@church.test',
        subject: expect.stringContaining('Security alert'),
      }),
    );
    const html = emailSend.mock.calls[0][0].html as string;
    expect(html).toContain('Jane Doe');
    expect(html).toContain('jane@church.test');
    expect(html).toContain('LEADER');
  });

  it('caps query page size at 100', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const svc = new SecurityAuditService({
      securityAuditLog: { findMany, create: jest.fn() },
    } as never);
    await svc.query({ churchId: 'c1', take: 999 });
    expect(findMany.mock.calls[0][0].take).toBe(101); // take+1 for cursor
  });

  it('resolveClientIp does not prefer spoofable X-Forwarded-For first hop', () => {
    const spoofed = {
      ip: '10.0.0.9',
      headers: { 'x-forwarded-for': '1.2.3.4, 10.0.0.9' },
      socket: { remoteAddress: '10.0.0.9' },
    };
    // Helper only reads Express-computed req.ip / socket — not raw XFF.
    expect(resolveClientIp(spoofed)).toBe('10.0.0.9');
    expect(resolveClientIp({ ip: '::ffff:203.0.113.10' })).toBe('203.0.113.10');
  });
});
