import { Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Roles } from '../../modules/auth/decorators';
import { AuthUser, ChurchId, CurrentUser } from '../../modules/auth/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveClientIpFromExpress } from './client-ip';
import { SecurityAuditService } from './security-audit.service';
import {
  ActivityLogQueryDto,
  AuditLogExportDto,
  AuditLogQueryDto,
  StageAuditQueryDto,
} from './audit-logs.dto';

@ApiTags('audit-logs')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditLogsController {
  constructor(
    private readonly audit: SecurityAuditService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @Roles('ADMIN', 'PASTOR')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Paginated church security audit log' })
  list(@ChurchId() churchId: string, @Query() query: AuditLogQueryDto) {
    return this.audit.query({
      churchId,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      action: query.action,
      actorId: query.actorId,
      targetType: query.targetType,
      search: query.search,
      cursor: query.cursor,
      take: query.take,
    });
  }

  @Post('export')
  @Roles('ADMIN', 'PASTOR')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Export filtered church audit logs (CSV/JSON)' })
  async export(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Query() query: AuditLogExportDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const format = query.format ?? 'csv';
    const result = await this.audit.exportRows(
      {
        churchId,
        dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
        dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
        action: query.action,
        actorId: query.actorId,
        targetType: query.targetType,
        search: query.search,
        take: query.take ?? 5000,
      },
      format,
    );

    await this.audit.append({
      churchId,
      actorId: user.userId,
      action: 'AUDIT_LOG_EXPORTED',
      targetType: 'AuditLog',
      ip: resolveClientIpFromExpress(req),
      metadata: { format, rowCount: result.rowCount, scope: 'tenant' },
    });

    const filename = `church-audit-${churchId.slice(0, 8)}.${format === 'json' ? 'json' : 'csv'}`;
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(result.body);
  }

  @Get('member-activity')
  @Roles('ADMIN', 'PASTOR')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Paginated member activity log (existing table)' })
  async memberActivity(@ChurchId() churchId: string, @Query() query: ActivityLogQueryDto) {
    const take = Math.min(Math.max(query.take ?? 50, 1), 100);
    const where = {
      churchId,
      ...(query.memberId ? { memberId: query.memberId } : {}),
      ...(query.type ? { type: query.type as never } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(query.search?.trim()
        ? { summary: { contains: query.search.trim(), mode: 'insensitive' as const } }
        : {}),
    };

    const rows = await this.prisma.memberActivityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: {
        actor: { select: { id: true, firstName: true, lastName: true, email: true } },
        member: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
      take,
    };
  }

  @Get('follow-up-stage')
  @Roles('ADMIN', 'PASTOR')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Paginated follow-up stage audits (existing table)' })
  async followUpStage(@ChurchId() churchId: string, @Query() query: StageAuditQueryDto) {
    const take = Math.min(Math.max(query.take ?? 50, 1), 100);
    const where = {
      churchId,
      ...(query.followUpId ? { followUpId: query.followUpId } : {}),
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.toStage ? { toStage: query.toStage } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
    };

    const rows = await this.prisma.followUpStageAudit.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: {
        actor: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
      take,
    };
  }
}

