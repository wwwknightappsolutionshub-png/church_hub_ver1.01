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
  | 'GDPR_ERASURE'
  | 'AUTHZ_DENIED'
  | 'AUTHZ_ABUSE_DETECTED'
  | 'AUDIT_LOG_EXPORTED'
  | 'AUDIT_ARCHIVE_COMPLETED';

export type SecurityAuditTargetType =
  | 'PastoralNote'
  | 'Member'
  | 'User'
  | 'Church'
  | 'ChurchSetting'
  | 'Authz'
  | 'AuditLog'
  | 'Other';

export type SecurityAuditQuery = {
  churchId?: string | null;
  /** When true (platform only), omit churchId filter entirely. */
  crossTenant?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  action?: string;
  actorId?: string;
  targetType?: string;
  ip?: string;
  search?: string;
  cursor?: string;
  take?: number;
};

const SENSITIVE_META_KEYS = new Set([
  'password',
  'token',
  'refreshToken',
  'accessToken',
  'content',
  'pastoralContent',
  'noteContent',
  'noteBody',
  'plaintext',
  'body',
  'secret',
  'authorization',
  'otp',
  'code',
  'raw',
]);

const SENSITIVE_KEY_RE =
  /(password|token|secret|authorization|pastoral|plaintext|notecontent|notebody|otp|refresh|cookie)/i;

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
          metadata: this.sanitizeMetadata(input.metadata) ?? undefined,
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

  /** Paginated, filterable query. Always capped. */
  async query(opts: SecurityAuditQuery) {
    const take = Math.min(Math.max(opts.take ?? 50, 1), 100);
    const where = this.buildWhere(opts);

    const rows = await this.prisma.securityAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
      include: {
        actor: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        church: { select: { id: true, name: true, slug: true } },
      },
    });

    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    return {
      items: items.map((r) => ({
        ...r,
        metadata: this.sanitizeMetadata(r.metadata as Prisma.InputJsonValue) ?? null,
      })),
      nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
      take,
    };
  }

  async exportRows(opts: SecurityAuditQuery, format: 'csv' | 'json') {
    const take = Math.min(Math.max(opts.take ?? 5000, 1), 5000);
    const where = this.buildWhere(opts);
    const rows = await this.prisma.securityAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        actor: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        church: { select: { id: true, name: true, slug: true } },
      },
    });

    const safe = rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      churchId: r.churchId,
      churchName: r.church?.name ?? null,
      actorId: r.actorId,
      actorName: r.actor
        ? `${r.actor.firstName ?? ''} ${r.actor.lastName ?? ''}`.trim()
        : null,
      actorEmail: r.actor?.email ?? null,
      action: r.action,
      targetType: r.targetType,
      targetId: r.targetId,
      ip: r.ip,
      metadata: this.sanitizeMetadata(r.metadata as Prisma.InputJsonValue) ?? null,
    }));

    if (format === 'json') {
      return {
        contentType: 'application/json',
        body: JSON.stringify(safe, null, 2),
        rowCount: safe.length,
      };
    }

    const headers = [
      'id',
      'createdAt',
      'churchId',
      'churchName',
      'actorId',
      'actorName',
      'actorEmail',
      'action',
      'targetType',
      'targetId',
      'ip',
      'metadata',
    ];
    const escape = (v: unknown) => {
      const s = v == null ? '' : typeof v === 'string' ? v : JSON.stringify(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const lines = [
      headers.join(','),
      ...safe.map((row) =>
        headers.map((h) => escape((row as Record<string, unknown>)[h])).join(','),
      ),
    ];
    return {
      contentType: 'text/csv; charset=utf-8',
      body: lines.join('\n'),
      rowCount: safe.length,
    };
  }

  async countSince(opts: {
    actorId?: string;
    ip?: string;
    churchId?: string | null;
    action: string;
    since: Date;
  }) {
    return this.prisma.securityAuditLog.count({
      where: {
        action: opts.action,
        createdAt: { gte: opts.since },
        ...(opts.actorId ? { actorId: opts.actorId } : {}),
        ...(opts.ip ? { ip: opts.ip } : {}),
        ...(opts.churchId !== undefined ? { churchId: opts.churchId } : {}),
      },
    });
  }

  private buildWhere(opts: SecurityAuditQuery): Prisma.SecurityAuditLogWhereInput {
    const and: Prisma.SecurityAuditLogWhereInput[] = [];

    if (!opts.crossTenant) {
      if (!opts.churchId) {
        and.push({ churchId: '__never__' });
      } else {
        and.push({ churchId: opts.churchId });
      }
    } else if (opts.churchId) {
      and.push({ churchId: opts.churchId });
    }

    if (opts.dateFrom || opts.dateTo) {
      and.push({
        createdAt: {
          ...(opts.dateFrom ? { gte: opts.dateFrom } : {}),
          ...(opts.dateTo ? { lte: opts.dateTo } : {}),
        },
      });
    }
    if (opts.action) and.push({ action: opts.action });
    if (opts.actorId) and.push({ actorId: opts.actorId });
    if (opts.targetType) and.push({ targetType: opts.targetType });
    if (opts.ip) and.push({ ip: opts.ip });
    if (opts.search?.trim()) {
      const q = opts.search.trim();
      and.push({
        OR: [
          { action: { contains: q, mode: 'insensitive' } },
          { targetType: { contains: q, mode: 'insensitive' } },
          { targetId: { contains: q, mode: 'insensitive' } },
          { ip: { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    return and.length ? { AND: and } : {};
  }

  /** Strip secrets / pastoral plaintext from metadata before persist, archive, or return. */
  sanitizeMetadata(metadata?: Prisma.InputJsonValue | null): Prisma.InputJsonValue | null {
    if (metadata == null) return null;
    return this.sanitizeValue(metadata, 0) as Prisma.InputJsonValue;
  }

  private sanitizeValue(value: unknown, depth: number): unknown {
    if (depth > 6) return '[truncated]';
    if (value == null) return value;
    if (typeof value === 'string') {
      return value.length > 500 ? `${value.slice(0, 500)}…` : value;
    }
    if (typeof value !== 'object') return value;
    if (Array.isArray(value)) {
      return value.slice(0, 50).map((v) => this.sanitizeValue(v, depth + 1));
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_META_KEYS.has(k) || SENSITIVE_KEY_RE.test(k)) {
        out[k] = '[redacted]';
        continue;
      }
      out[k] = this.sanitizeValue(v, depth + 1);
    }
    return out;
  }
}
