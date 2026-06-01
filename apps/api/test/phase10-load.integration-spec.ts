/**
 * Phase 10 — Load smoke: concurrent read requests (stress-lite).
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from './supertest';
import { AppModule } from '../src/app.module';
import { shouldSkipE2e } from './e2e-env';

const describeE2e = shouldSkipE2e() ? describe.skip : describe;

describeE2e('Phase 10 — Load / stress smoke', () => {
  let app: INestApplication;
  let token: string;
  const CONCURRENCY = 25;

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

  it(`handles ${CONCURRENCY} parallel health checks`, async () => {
    const server = app.getHttpServer();
    const started = Date.now();
    const results = await Promise.all(
      Array.from({ length: CONCURRENCY }, () =>
        request(server).get('/api/v1/health').expect(200),
      ),
    );
    const elapsed = Date.now() - started;
    expect(results).toHaveLength(CONCURRENCY);
    expect(elapsed).toBeLessThan(30_000);
  });

  it(`handles ${CONCURRENCY} parallel authenticated analytics reads`, async () => {
    const server = app.getHttpServer();
    const results = await Promise.all(
      Array.from({ length: CONCURRENCY }, () =>
        request(server)
          .get('/api/v1/membership/analytics')
          .set('Authorization', `Bearer ${token}`)
          .expect(200),
      ),
    );
    expect(results.every((r) => r.body.summary)).toBe(true);
  });
});
