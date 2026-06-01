import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.module';
import { MigrationHealthService } from '../../prisma/migration-health.service';
import { Public } from '../auth/decorators';

@ApiTags('health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly migrations: MigrationHealthService,
  ) {}

  @Public()
  @Get()
  async check() {
    await this.prisma.$queryRaw`SELECT 1`;
    return {
      status: 'ok',
      service: 'church-hub-api',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('migrations')
  async migrationStatus() {
    const report = await this.migrations.check();
    return {
      status: report.ok ? 'ok' : 'degraded',
      ...report,
      timestamp: new Date().toISOString(),
    };
  }
}
