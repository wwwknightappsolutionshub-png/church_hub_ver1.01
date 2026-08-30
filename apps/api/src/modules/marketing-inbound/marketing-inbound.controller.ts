import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { MarketingInboundType } from '@prisma/client';
import { Public } from '../auth/decorators';
import { MarketingInboundService } from './marketing-inbound.service';

@ApiTags('marketing-inbound')
@Controller('marketing/inbound')
export class MarketingInboundController {
  constructor(private readonly inbound: MarketingInboundService) {}

  @Public()
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @Post()
  @ApiOperation({ summary: 'Submit contact or feedback from the public marketing site' })
  submit(
    @Body()
    body: {
      type: MarketingInboundType;
      name: string;
      email: string;
      organization?: string;
      subject?: string;
      message: string;
      rating?: number;
    },
  ) {
    return this.inbound.submit(body);
  }
}
