import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type SecurityAuditAction =
  | 'READ_PASTORAL_NOTE'
  | 'CREATE_PASTORAL_NOTE'
  | 'UPDATE_PASTORAL_NOTE'
  | 'SOFT_DELETE_PASTORAL_NOTE'
  | 'RESTORE_PASTORAL_NOTE'
  | 'SOFT_DELETE_MEMBER'
  | 'RESTORE_MEMBER'
  | 'STAFF_ROLE_CHANGED'
  | 'STAFF_DEACTIVATED'
  | 'STAFF_PASSWORD_CHANGED'
  | 'CHURCH_SETTING_CHANGED'
  | 'MEMBER_CREATED'
  | 'MEMBER_UPDATED'
  | 'GDPR_ERASURE';

export type SecurityAuditTargetType =
  | 'PastoralNote'
  | 'Member'
  | 'User'
  | 'Church'
  | 'ChurchSetting'
  | 'Other';

@Injectable()
export class SecurityAuditService {
  private readonly logger = new Logger(SecurityAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Append-only audit writer. Intentionally has no update/delete methods.
   * Failures are logged but do not fail the primary request path.
   */
  async append(input: {
    churchId: string | null;
    actorId: string | null;
    action: SecurityAuditAction | string;
    targetType: SecurityAuditTargetType | string;
    targetId?: string | null;
    ip?: string | null;
    metadata?: Prisma.InputJsonValue;
  }) {
    try {
      return await this.prisma.securityAuditLog.create({
        data: {
          churchId: input.churchId,
          actorId: input.actorId,
          action: input.action,
          targetType: input.targetType,
          targetId: input.targetId ?? null,
          ip: input.ip ?? null,
          metadata: input.metadata ?? undefined,
        },
      });
    } catch (err) {
      this.logger.warn(
        `security audit append failed (${input.action}): ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  async listForChurch(churchId: string, opts?: { take?: number; action?: string }) {
    return this.prisma.securityAuditLog.findMany({
      where: {
        churchId,
        ...(opts?.action ? { action: opts.action } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(opts?.take ?? 100, 500),
    });
  }
}
