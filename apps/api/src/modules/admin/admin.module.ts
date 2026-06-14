import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { MembershipModule } from '../membership/membership.module';

@Module({
  imports: [MembershipModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
