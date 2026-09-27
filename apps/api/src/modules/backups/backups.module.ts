import { DynamicModule, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BACKUPS_QUEUE } from './backups.constants';
import { BackupCryptoService } from './backup-crypto.service';
import { BackupStorageService } from './backup-storage.service';
import { FullDbBackupService } from './full-db-backup.service';
import { TenantExportService } from './tenant-export.service';
import { BackupsService } from './backups.service';
import { BackupSchedulerService } from './backup-scheduler.service';
import { BackupsProcessor } from './backups.processor';
import { PlatformBackupsController } from './platform-backups.controller';
import { TenantBackupsController } from './tenant-backups.controller';

@Module({})
export class BackupsModule {
  static forRoot(): DynamicModule {
    const redisEnabled = process.env.REDIS_ENABLED !== 'false';

    return {
      module: BackupsModule,
      imports: [...(redisEnabled ? [BullModule.registerQueue({ name: BACKUPS_QUEUE })] : [])],
      controllers: [PlatformBackupsController, TenantBackupsController],
      providers: [
        BackupCryptoService,
        BackupStorageService,
        FullDbBackupService,
        TenantExportService,
        BackupsService,
        BackupSchedulerService,
        ...(redisEnabled ? [BackupsProcessor] : []),
      ],
      exports: [BackupsService],
    };
  }
}
