import { Module } from '@nestjs/common';
import { YouthClipsService } from './clips.service';

@Module({
  providers: [YouthClipsService],
  exports: [YouthClipsService],
})
export class YouthClipsModule {}
