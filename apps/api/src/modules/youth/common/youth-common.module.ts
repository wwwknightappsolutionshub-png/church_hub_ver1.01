import { Global, Module } from '@nestjs/common';
import { YouthAccessService } from './youth-access.service';

/**
 * Shared youth utilities (safety filters, access context).
 */
@Global()
@Module({
  providers: [YouthAccessService],
  exports: [YouthAccessService],
})
export class YouthCommonModule {}
