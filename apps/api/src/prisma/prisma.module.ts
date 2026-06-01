import { Global, Module } from '@nestjs/common';
import { MigrationHealthService } from './migration-health.service';
import { PrismaService } from './prisma.service';

/** @deprecated Prefer importing from `./prisma.service` */
export { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService, MigrationHealthService],
  exports: [PrismaService, MigrationHealthService],
})
export class PrismaModule {}
