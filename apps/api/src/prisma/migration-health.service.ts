import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/** Required migrations / schema markers for production department + bus features. */
const REQUIRED_MIGRATION_NAMES = [
  '20260526200000_dept_feature_modules',
  '20260530220000_phase8_department_tools',
] as const;

export interface MigrationHealthReport {
  ok: boolean;
  pendingMigrations: string[];
  schemaChecks: { medicalEnum: boolean; deptTables: boolean };
  message: string;
}

@Injectable()
export class MigrationHealthService implements OnModuleInit {
  private readonly logger = new Logger(MigrationHealthService.name);
  private lastReport: MigrationHealthReport | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const report = await this.check();
    this.lastReport = report;
    if (!report.ok) {
      const strict = process.env.REQUIRE_MIGRATIONS === 'true';
      const msg = `[MigrationHealth] ${report.message}`;
      if (strict) {
        throw new Error(msg);
      }
      this.logger.warn(msg);
      if (report.pendingMigrations.length) {
        this.logger.warn(
          `Run: pnpm --filter @church-hub/api exec prisma migrate deploy`,
        );
      }
    } else {
      this.logger.log('Database migrations and schema checks OK');
    }
  }

  getLastReport(): MigrationHealthReport | null {
    return this.lastReport;
  }

  async check(): Promise<MigrationHealthReport> {
    const pendingMigrations = await this.findPendingMigrations();
    const schemaChecks = await this.checkSchemaMarkers();
    const ok =
      pendingMigrations.length === 0 &&
      schemaChecks.medicalEnum &&
      schemaChecks.deptTables;

    let message = 'All required migrations applied.';
    if (pendingMigrations.length) {
      message = `Pending migrations: ${pendingMigrations.join(', ')}`;
    } else if (!schemaChecks.medicalEnum) {
      message = 'DepartmentCode enum missing MEDICAL — run prisma migrate deploy';
    } else if (!schemaChecks.deptTables) {
      message = 'Department module tables missing — run prisma migrate deploy';
    }

    return { ok, pendingMigrations, schemaChecks, message };
  }

  private async findPendingMigrations(): Promise<string[]> {
    try {
      const applied = await this.prisma.$queryRaw<Array<{ migration_name: string }>>`
        SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL
      `;
      const appliedSet = new Set(applied.map((r) => r.migration_name));
      return REQUIRED_MIGRATION_NAMES.filter((name) => !appliedSet.has(name));
    } catch {
      return [...REQUIRED_MIGRATION_NAMES];
    }
  }

  private async checkSchemaMarkers(): Promise<{
    medicalEnum: boolean;
    deptTables: boolean;
  }> {
    let medicalEnum = false;
    let deptTables = false;
    try {
      const enumRow = await this.prisma.$queryRaw<Array<{ enumlabel: string }>>`
        SELECT e.enumlabel
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'DepartmentCode' AND e.enumlabel = 'MEDICAL'
      `;
      medicalEnum = enumRow.length > 0;
    } catch {
      medicalEnum = false;
    }
    try {
      const tableRow = await this.prisma.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'dept_schedules'
        ) AS exists
      `;
      deptTables = tableRow[0]?.exists === true;
    } catch {
      deptTables = false;
    }
    return { medicalEnum, deptTables };
  }
}
