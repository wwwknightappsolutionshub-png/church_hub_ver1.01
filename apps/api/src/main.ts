import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useBodyParser('json', {
    limit: '12mb',
    verify: (req: import('express').Request, _res: import('express').Response, buf: Buffer) => {
      const url = req.originalUrl ?? '';
      if (url.includes('/wisdom365/webhooks/stripe')) {
        (req as import('express').Request & { rawBody?: Buffer }).rawBody = buf;
      }
    },
  });
  app.useBodyParser('urlencoded', { limit: '12mb', extended: true });

  // Trust reverse-proxy hops so req.ip is the real client (never parse raw XFF in app code).
  // TRUST_PROXY: number of hops (default 1 in production), or "false" to disable.
  const trustProxyRaw = (process.env.TRUST_PROXY ?? (isProdEnv() ? '1' : 'false')).toLowerCase();
  if (trustProxyRaw !== 'false' && trustProxyRaw !== '0' && trustProxyRaw !== 'off') {
    const hops = parseInt(trustProxyRaw, 10);
    app.set('trust proxy', Number.isFinite(hops) && hops > 0 ? hops : 1);
  }

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/api/v1/uploads/',
  });
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') ?? [
      'http://localhost:3001',
      'http://localhost:3000',
      'http://localhost:8081',
    ],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api/v1');

  const isProd = isProdEnv();
  const swaggerEnabled =
    !isProd || process.env.ENABLE_SWAGGER === 'true' || process.env.ENABLE_SWAGGER === '1';

  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Church_Hub API')
      .setDescription('Church community management platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.API_PORT ?? 4000;
  await app.listen(port);
  logger.log(`Church_Hub API running on http://localhost:${port}`);
  if (swaggerEnabled) {
    logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
  } else {
    logger.log('Swagger docs disabled in production');
  }
}

function isProdEnv() {
  return (process.env.NODE_ENV ?? '').toLowerCase() === 'production';
}

bootstrap();
