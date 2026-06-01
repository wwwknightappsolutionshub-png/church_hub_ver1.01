/**
 * Phase 10 — Primary membership flows (Phases 3–9) in one auditable suite.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from './supertest';
import { AppModule } from '../src/app.module';
import { shouldSkipE2e } from './e2e-env';

const describeE2e = shouldSkipE2e() ? describe.skip : describe;

describeE2e('Phase 10 — Primary membership flows', () => {
  let app: INestApplication;
  let token: string;

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
    token = login.body.accessToken;
  }, 120_000);

  afterAll(async () => {
    await app?.close();
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });

  it('health is ok', async () => {
    await request(app.getHttpServer()).get('/api/v1/health').expect(200);
  });

  it('Phase 3 — membership config + members list', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/membership/church-services')
      .set(auth())
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/membership/members')
      .set(auth())
      .expect(200);
  });

  it('Phase 4 — pastoral care + follow-up automation rules', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/pastoral-care/cases')
      .set(auth())
      .expect(403);
    const pastorLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'pastor@demo.church', password: 'ChurchHub123!' });
    await request(app.getHttpServer())
      .get('/api/v1/pastoral-care/cases')
      .set('Authorization', `Bearer ${pastorLogin.body.accessToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/follow-up/automation-rules')
      .set(auth())
      .expect(200);
  });

  it('Phase 5 — analytics dashboard', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/membership/analytics')
      .set(auth())
      .expect(200);
    expect(res.body.summary).toBeDefined();
  });

  it('Phase 6 — outreach pipeline', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/outreach/pipeline')
      .set(auth())
      .expect(200);
  });

  it('Phase 7 — communications queue', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/communications/queue')
      .set(auth())
      .expect(200);
  });

  it('Phase 8 — department tools', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/v1/service-units/departments')
      .set(auth())
      .expect(200);
    expect(list.body.length).toBeGreaterThan(0);
    const id = list.body[0].id;
    await request(app.getHttpServer())
      .get(`/api/v1/service-units/departments/${id}/dashboard`)
      .set(auth())
      .expect(200);
  });

  it('Phase 9 — automation hub', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/automation/status')
      .set(auth())
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/automation/recommendations')
      .set(auth())
      .expect(200);
  });
});
