import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from './supertest';
import { AppModule } from '../src/app.module';
import { shouldSkipE2e } from './e2e-env';

const describeE2e = shouldSkipE2e() ? describe.skip : describe;

describeE2e('Phase 9 — Automation layer E2E', () => {
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

  it('GET /automation/status returns hub payload', () => {
    return request(app.getHttpServer())
      .get('/api/v1/automation/status')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.settings).toBeDefined();
        expect(res.body.syncQueue).toBeDefined();
        expect(Array.isArray(res.body.recentRuns)).toBe(true);
      });
  });

  it('GET /automation/recommendations returns array', () => {
    return request(app.getHttpServer())
      .get('/api/v1/automation/recommendations')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it('POST /automation/run/SYNC_ENGINE processes queue', () => {
    return request(app.getHttpServer())
      .post('/api/v1/automation/run/SYNC_ENGINE')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect((res) => {
        expect([200, 201]).toContain(res.status);
        expect(res.body).toHaveProperty('processed');
      });
  });
});
