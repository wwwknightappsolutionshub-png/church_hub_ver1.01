import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { DevotionalAiService } from '../src/modules/devotional-hub/services/devotional-ai.service';
import { PrismaService } from '../src/prisma/prisma.module';
import { shouldSkipE2e } from './e2e-env';

const describeE2e = shouldSkipE2e() ? describe.skip : describe;

describeE2e('DevotionalHubModule integration', () => {
  let ai: DevotionalAiService;
  let prisma: PrismaService;
  let churchId: string;
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    ai = app.get(DevotionalAiService);
    prisma = app.get(PrismaService);

    const church = await prisma.church.findFirst({ select: { id: true } });
    if (!church) throw new Error('No church in DB — run: pnpm --filter @church-hub/api prisma:seed');
    churchId = church.id;
  }, 120_000);

  afterAll(async () => {
    await app?.close();
  });

  it('generateFullStudyOutline persists artifact row', async () => {
    const out = await ai.generateFullStudyOutline({
      churchId,
      customTopic: 'Integration test topic',
      sourceType: 'CUSTOM_TOPIC',
      durationDays: 2,
    });
    expect(out.artifactId).toBeDefined();
    const row = await prisma.devotionalAiArtifact.findUnique({
      where: { id: out.artifactId },
    });
    expect(row?.type).toBe('STUDY_OUTLINE');
  });

  it('listArtifacts returns church-scoped rows', async () => {
    const list = await ai.listArtifacts(churchId, { limit: 5 });
    expect(Array.isArray(list)).toBe(true);
  });
});
