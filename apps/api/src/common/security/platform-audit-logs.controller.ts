import { Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { RequirePlatformPermission, Roles } from '../../modules/auth/decorators';
import { AuthUser, CurrentUser } from '../../modules/auth/current-user.decorator';
import { runWithTenantBypassAsync } from '../../prisma/tenant-context';
import { resolveClientIpFromExpress } from './client-ip';
import { SecurityAuditService } from './security-audit.service';
import { AuditLogExportDto, AuditLogQueryDto } from './audit-logs.dto';

@ApiTags('platform-audit-logs')
@ApiBearerAuth()
@Controller('platform/audit-logs')
export class PlatformAuditLogsController {
  constructor(private readonly audit: SecurityAuditService) {}

  @Get()
  @Roles('PLATFORM_ADMIN')
  @RequirePlatformPermission('platform.privacy:read')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Global security audit (cross-tenant, audited bypass)' })
  list(@Query() query: AuditLogQueryDto) {
    return runWithTenantBypassAsync(() =>
      this.audit.query({
        crossTenant: true,
        churchId: query.churchId,
        dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
        dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
        action: query.action,
        actorId: query.actorId,
        targetType: query.targetType,
        ip: query.ip,
        search: query.search,
        cursor: query.cursor,
        take: query.take,
      }),
    );
  }

  @Post('export')
  @Roles('PLATFORM_ADMIN')
  @RequirePlatformPermission('platform.privacy:read')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Export global security audit (CSV/JSON)' })
  async export(
    @CurrentUser() user: AuthUser,
    @Query() query: AuditLogExportDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const format = query.format ?? 'csv';
    const result = await runWithTenantBypassAsync(() =>
      this.audit.exportRows(
        {
          crossTenant: true,
          churchId: query.churchId,
          dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
          dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
          action: query.action,
          actorId: query.actorId,
          targetType: query.targetType,
          ip: query.ip,
          search: query.search,
          take: query.exportTake ?? query.take ?? 5000,
        },
        format,
      ),
    );

    await runWithTenantBypassAsync(() =>
      this.audit.append({
        churchId: query.churchId ?? null,
        actorId: user.userId,
        action: 'AUDIT_LOG_EXPORTED',
        targetType: 'AuditLog',
        ip: resolveClientIpFromExpress(req),
        metadata: { format, rowCount: result.rowCount, scope: 'platform' },
      }),
    );

    const filename = `platform-audit.${format === 'json' ? 'json' : 'csv'}`;
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(result.body);
  }
}

