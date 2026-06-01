import { Global, Module } from '@nestjs/common';
import { ModuleAccessService } from './module-access.service';

@Global()
@Module({
  providers: [ModuleAccessService],
  exports: [ModuleAccessService],
})
export class AccessModule {}
