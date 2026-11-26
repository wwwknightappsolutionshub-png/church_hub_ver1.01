import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';

type ActiveCacheEntry = { active: boolean; expiresAt: number };

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  /** Short TTL cache to avoid a DB hit on every authenticated request. */
  private readonly activeCache = new Map<string, ActiveCacheEntry>();
  private readonly cacheTtlMs = 15_000;

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sid) {
      throw new UnauthorizedException('Session expired');
    }
    const session = await this.prisma.refreshToken.findUnique({
      where: { id: payload.sid },
      select: { userId: true, revokedAt: true, expiresAt: true },
    });
    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException('Session ended');
    }
    const active = await this.isUserActive(payload.sub);
    if (!active) {
      throw new UnauthorizedException('Account is inactive');
    }
    return {
      userId: payload.sub,
      churchId: payload.churchId,
      email: payload.email,
      sid: payload.sid,
    };
  }

  private async isUserActive(userId: string): Promise<boolean> {
    const now = Date.now();
    const cached = this.activeCache.get(userId);
    if (cached && cached.expiresAt > now) {
      return cached.active;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isActive: true },
    });
    const active = !!user?.isActive;
    this.activeCache.set(userId, { active, expiresAt: now + this.cacheTtlMs });

    // Bound memory for long-running processes
    if (this.activeCache.size > 5_000) {
      for (const [key, entry] of this.activeCache) {
        if (entry.expiresAt <= now) this.activeCache.delete(key);
      }
    }

    return active;
  }

  /** Call after deactivate / role revoke so the next request re-reads DB. */
  invalidateActiveCache(userId: string) {
    this.activeCache.delete(userId);
  }
}
