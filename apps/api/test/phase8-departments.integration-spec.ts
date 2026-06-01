import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from './supertest';
import { AppModule } from '../src/app.module';
import { shouldSkipE2e } from './e2e-env';

const describeE2e = shouldSkipE2e() ? describe.skip : describe;

describeE2e('Phase 8 — Department tools E2E', () => {
  let app: INestApplication;
  let accessToken: string;
  let departmentId: string;

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

  it('GET /service-units/departments returns Phase 8 units', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/service-units/departments')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(8);
    departmentId = res.body.find((u: { departmentCode: string }) => u.departmentCode === 'USHERING')?.id
      ?? res.body[0]?.id;
    expect(departmentId).toBeTruthy();
  });

  it('GET /service-units/departments/:id/dashboard', async () => {
    if (!departmentId) return;
    const res = await request(app.getHttpServer())
      .get(`/api/v1/service-units/departments/${departmentId}/dashboard`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.unit).toBeDefined();
    expect(res.body.volunteerConsistency).toBeDefined();
  });
});
