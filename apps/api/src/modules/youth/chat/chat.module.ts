import { Module } from '@nestjs/common';
import { RealtimeModule } from '../../realtime/realtime.module';
import { YouthCommonModule } from '../common/youth-common.module';
import { YouthGamificationModule } from '../gamification/gamification.module';
import { YouthChatService } from './chat.service';

@Module({
  imports: [RealtimeModule, YouthCommonModule, YouthGamificationModule],
  providers: [YouthChatService],
  exports: [YouthChatService],
})
export class YouthChatModule {}
