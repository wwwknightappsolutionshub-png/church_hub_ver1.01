import { Module } from '@nestjs/common';
import { PlatformWhatsAppService } from './platform-whatsapp.service';

/** Shared WhatsApp gateway config — imported by Platform + Notifications (no cycles). */
@Module({
  providers: [PlatformWhatsAppService],
  exports: [PlatformWhatsAppService],
})
export class PlatformWhatsAppConfigModule {}
