import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators';
import { SubmitMarketingInboundDto } from './dto/submit-marketing-inbound.dto';
import { MarketingInboundService } from './marketing-inbound.service';

@ApiTags('marketing-inbound')
@Controller('marketing/inbound')
export class MarketingInboundController {
  constructor(private readonly inbound: MarketingInboundService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 600_000 } })
  @Post()
  @ApiOperation({ summary: 'Submit contact or feedback from the public marketing site' })
  submit(
    @Body() body: SubmitMarketingInboundDto,
  ) {
    return this.inbound.submit(body);
  }
}
