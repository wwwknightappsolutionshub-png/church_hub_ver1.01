import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BACKUPS_QUEUE, BackupQueueJob } from './backups.constants';
import { BackupsService } from './backups.service';

@Processor(BACKUPS_QUEUE)
export class BackupsProcessor extends WorkerHost {
  private readonly logger = new Logger(BackupsProcessor.name);

  constructor(private readonly backups: BackupsService) {
    super();
  }

  async process(job: Job<BackupQueueJob>) {
    this.logger.log(`Processing backup job ${job.data.jobId}`);
    await this.backups.processJob(job.data.jobId);
  }
}
