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
        expect(res.body).not.toHaveProperty('giving');
        expect(res.body).not.toHaveProperty('donations');
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
});
