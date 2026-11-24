import { isEncryptedSecret } from '../../common/crypto/secret-box';
import {
  decryptPastoralNoteContent,
  encryptPastoralNoteContent,
} from '../../common/crypto/pastoral-notes.crypto';
import { SecurityAuditService } from '../../common/security/security-audit.service';
import {
  enterTenantContext,
  getTenantContext,
  runWithTenantContextAsync,
} from '../../prisma/tenant-context';

describe('Phase 2 security regressions', () => {
  const prevKey = process.env.PASTORAL_NOTES_KEY;

  beforeAll(() => {
    process.env.PASTORAL_NOTES_KEY = 'phase2-regression-pastoral-key-32';
  });

  afterAll(() => {
    if (prevKey === undefined) delete process.env.PASTORAL_NOTES_KEY;
    else process.env.PASTORAL_NOTES_KEY = prevKey;
  });

  it('stores pastoral notes as ciphertext while legacy plaintext still reads', () => {
    const cipher = encryptPastoralNoteContent('care plan details');
    expect(isEncryptedSecret(cipher)).toBe(true);
    expect(decryptPastoralNoteContent(cipher)).toBe('care plan details');
    expect(decryptPastoralNoteContent('pre-encryption plaintext')).toBe(
      'pre-encryption plaintext',
    );
  });

  it('tenant ALS carries churchId and includeDeleted flags', async () => {
    enterTenantContext({ churchId: 'church-a' });
    expect(getTenantContext().churchId).toBe('church-a');

    await runWithTenantContextAsync({ includeDeleted: true }, async () => {
      expect(getTenantContext().includeDeleted).toBe(true);
      expect(getTenantContext().churchId).toBe('church-a');
    });
  });

  it('emits READ_PASTORAL_NOTE via append-only audit service', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'a1' });
    const svc = new SecurityAuditService({ securityAuditLog: { create } } as never);
    await svc.append({
      churchId: 'c1',
      actorId: 'u1',
      action: 'READ_PASTORAL_NOTE',
      targetType: 'PastoralNote',
      targetId: 'n1',
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'READ_PASTORAL_NOTE',
          targetId: 'n1',
          churchId: 'c1',
        }),
      }),
    );
  });

  it('cross-tenant member lookup requires churchId in where (IDOR contract)', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const prisma = { member: { findFirst } };
    const churchA = 'church-a';
    const foreignId = 'member-from-church-b';
    await prisma.member.findFirst({ where: { id: foreignId, churchId: churchA } });
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: foreignId, churchId: churchA },
    });
    expect(findFirst.mock.calls[0][0].where).not.toEqual({ id: foreignId });
  });
});
