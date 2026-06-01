import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from './supertest';
import { AppModule } from '../src/app.module';
import { shouldSkipE2e } from './e2e-env';

const describeE2e = shouldSkipE2e() ? describe.skip : describe;

describeE2e('Phase 4 — Follow-up automation & pastoral care E2E', () => {
  let app: INestApplication;
  let adminToken: string;
  let pastorToken: string;

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

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@demo.church', password: 'ChurchHub123!' });
    adminToken = adminLogin.body.accessToken;

    const pastorLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'pastor@demo.church', password: 'ChurchHub123!' });
    pastorToken = pastorLogin.body.accessToken;
  }, 120_000);

  afterAll(async () => {
    await app?.close();
  });

  it('GET /follow-up/automation-rules returns seeded rules', () => {
    return request(app.getHttpServer())
      .get('/api/v1/follow-up/automation-rules')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
      });
  });

  it('GET /pastoral-care/stats rejects church admin', () => {
    return request(app.getHttpServer())
      .get('/api/v1/pastoral-care/stats')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403);
  });

  it('GET /pastoral-care/stats returns counts for pastor', () => {
    return request(app.getHttpServer())
      .get('/api/v1/pastoral-care/stats')
      .set('Authorization', `Bearer ${pastorToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({
          openCases: expect.any(Number),
          openPrayers: expect.any(Number),
          notesCount: expect.any(Number),
        });
      });
  });

  it('GET /pastoral-care/cases returns array', () => {
    return request(app.getHttpServer())
      .get('/api/v1/pastoral-care/cases')
      .set('Authorization', `Bearer ${pastorToken}`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it('GET /pastoral-care/prayer-requests returns array', () => {
    return request(app.getHttpServer())
      .get('/api/v1/pastoral-care/prayer-requests')
      .set('Authorization', `Bearer ${pastorToken}`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it('GET /pastoral-care/notes returns array (staff-filtered)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/pastoral-care/notes')
      .set('Authorization', `Bearer ${pastorToken}`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });
});
