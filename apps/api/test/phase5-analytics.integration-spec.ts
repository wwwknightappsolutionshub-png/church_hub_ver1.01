import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from './supertest';
import { AppModule } from '../src/app.module';
import { shouldSkipE2e } from './e2e-env';

const describeE2e = shouldSkipE2e() ? describe.skip : describe;

describeE2e('Phase 5 — Membership analytics E2E', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.setGlobalPrefix('api/v1');
    await app.init();

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@demo.church', password: 'ChurchHub123!' });
    accessToken = login.body.accessToken;
  }, 120_000);

  afterAll(async () => {
    await app?.close();
  });

  it('GET /membership/analytics returns full dashboard (no giving)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/membership/analytics?months=6')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.summary).toBeDefined();
        expect(res.body.growthTrends).toBeDefined();
        expect(res.body.absenteeTrends).toBeInstanceOf(Array);
        expect(res.body.attendancePerformance).toBeInstanceOf(Array);
        expect(res.body.departmentPerformance).toBeInstanceOf(Array);
        expect(res.body.followUpCompleteness).toBeInstanceOf(Array);
        expect(res.body.demographics).toBeDefined();
        expect(res.body.demographics.byGender).toBeInstanceOf(Array);
        expect(res.body.demographics.byAgeBand).toBeInstanceOf(Array);
        expect(res.body.targets).toBeDefined();
        expect(res.body.targetStatus).toBeInstanceOf(Array);
        expect(res.body.appliedFilters).toBeDefined();
        expect(res.body.range).toBeDefined();
        expect(res.body).not.toHaveProperty('giving');
        expect(res.body).not.toHaveProperty('donations');
      });
  });

  it('GET /membership/analytics supports date range + compare + filters', () => {
    return request(app.getHttpServer())
      .get(
        '/api/v1/membership/analytics?dateFrom=2026-01-01&dateTo=2026-06-30&compare=true&status=ACTIVE_MEMBER&serviceType=sunday&gender=MALE&family=with_family&ageBand=18-29',
      )
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.appliedFilters.compare).toBe(true);
        expect(res.body.appliedFilters.status).toBe('ACTIVE_MEMBER');
        expect(res.body.appliedFilters.serviceType).toBe('sunday');
        expect(res.body.appliedFilters.gender).toBe('MALE');
        expect(res.body.appliedFilters.family).toBe('with_family');
        expect(res.body.appliedFilters.ageBand).toBe('18-29');
        expect(res.body.comparison).toBeDefined();
        expect(res.body.comparison.priorSummary).toBeDefined();
        expect(res.body.comparison.delta).toBeDefined();
        expect(res.body.demographics.byGender).toBeInstanceOf(Array);
      });
  });

  it('GET /membership/analytics/growth-trends returns trend series', () => {
    return request(app.getHttpServer())
      .get('/api/v1/membership/analytics/growth-trends')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.memberGrowth).toBeInstanceOf(Array);
        expect(res.body.newConvertGrowth).toBeInstanceOf(Array);
        expect(res.body.firstTimerRetention).toBeInstanceOf(Array);
      });
  });

  it('PATCH /membership/analytics/targets persists benchmarks', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/membership/analytics/targets')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        retentionRate: 0.5,
        attendanceRate: 0.7,
        outreachCompletionRate: 0.4,
        monthlyNewMembers: 5,
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.retentionRate).toBe(0.5);
        expect(res.body.attendanceRate).toBe(0.7);
        expect(res.body.monthlyNewMembers).toBe(5);
      });

    await request(app.getHttpServer())
      .get('/api/v1/membership/analytics/targets')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.retentionRate).toBe(0.5);
        expect(res.body.monthlyNewMembers).toBe(5);
      });

    const dash = await request(app.getHttpServer())
      .get('/api/v1/membership/analytics?months=3')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(dash.body.targets.retentionRate).toBe(0.5);
    expect(dash.body.targetStatus.some((t: { key: string }) => t.key === 'retentionRate')).toBe(
      true,
    );
  });

  it('GET /membership/analytics/export returns CSV', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/membership/analytics/export?months=6')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(String(res.headers['content-type'])).toMatch(/text\/csv/);
    expect(String(res.text)).toContain('Section,Metric,Value');
    expect(String(res.text)).toContain('Total members');
  });
});
