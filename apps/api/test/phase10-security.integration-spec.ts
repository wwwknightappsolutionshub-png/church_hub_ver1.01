/**
 * Phase 10 — Security: protected membership routes reject unauthenticated access.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from './supertest';
import { AppModule } from '../src/app.module';
import { shouldSkipE2e } from './e2e-env';

const describeE2e = shouldSkipE2e() ? describe.skip : describe;

const PROTECTED_ROUTES: Array<{ method: 'get' | 'post'; path: string }> = [
  { method: 'get', path: '/api/v1/membership/members' },
  { method: 'get', path: '/api/v1/membership/analytics' },
  { method: 'get', path: '/api/v1/follow-up/stats' },
  { method: 'get', path: '/api/v1/pastoral-care/cases' },
  { method: 'get', path: '/api/v1/outreach/pipeline' },
  { method: 'get', path: '/api/v1/communications/queue' },
  { method: 'get', path: '/api/v1/service-units/departments' },
  { method: 'get', path: '/api/v1/automation/status' },
  { method: 'post', path: '/api/v1/automation/weekly' },
];

describeE2e('Phase 10 — Security (auth guards)', () => {
  let app: INestApplication;

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
  }, 120_000);

  afterAll(async () => {
    await app?.close();
  });

  it.each(PROTECTED_ROUTES)('$method $path returns 401 without token', async ({ method, path }) => {
    const res = await request(app.getHttpServer())[method](path);
    expect([401, 403]).toContain(res.status);
  });

  it('rejects invalid bearer token', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/membership/analytics')
      .set('Authorization', 'Bearer invalid-token');
    expect([401, 403]).toContain(res.status);
  });
});
