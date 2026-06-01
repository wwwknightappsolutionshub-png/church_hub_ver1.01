import { Module } from '@nestjs/common';
import { LoungeController } from './lounge.controller';
import { LoungeService } from './lounge.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { MemberProfileModule } from '../member-profile/member-profile.module';

@Module({
  imports: [RealtimeModule, MemberProfileModule],
  controllers: [LoungeController],
  providers: [LoungeService],
  exports: [LoungeService],
})
export class LoungeModule {}
