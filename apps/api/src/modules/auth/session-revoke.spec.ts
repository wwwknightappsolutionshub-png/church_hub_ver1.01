import { AuthService } from './auth.service';

describe('AuthService.refresh token revocation helpers', () => {
  it('revokeRefreshTokensForUser updates all active refresh tokens', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 2 });
    const prisma = { refreshToken: { updateMany } };
    const svc = Object.create(AuthService.prototype) as AuthService;
    (svc as unknown as { prisma: typeof prisma }).prisma = prisma;

    const result = await svc.revokeRefreshTokensForUser('user-1');
    expect(result).toEqual({ revoked: 2 });
    expect(updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });
});
