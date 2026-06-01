import { MigrationHealthService } from './migration-health.service';

describe('MigrationHealthService', () => {
  const prisma = {
    $queryRaw: jest.fn(),
  };
  let service: MigrationHealthService;

  beforeEach(() => {
    service = new MigrationHealthService(prisma as never);
    jest.clearAllMocks();
  });

  it('reports ok when migrations and schema markers present', async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([
        { migration_name: '20260526200000_dept_feature_modules' },
        { migration_name: '20260530220000_phase8_department_tools' },
      ])
      .mockResolvedValueOnce([{ enumlabel: 'MEDICAL' }])
      .mockResolvedValueOnce([{ exists: true }]);

    const report = await service.check();
    expect(report.ok).toBe(true);
    expect(report.pendingMigrations).toHaveLength(0);
  });

  it('reports pending migrations', async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ exists: false }]);

    const report = await service.check();
    expect(report.ok).toBe(false);
    expect(report.pendingMigrations.length).toBeGreaterThan(0);
  });
});
