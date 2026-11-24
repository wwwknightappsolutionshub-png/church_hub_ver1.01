import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../auth/decorators';
import { AuthAccessGuard } from '../auth/auth-access.guard';
import { AuthAccessScope } from '../auth/auth-access-scope.decorator';
import { clientIpFromRequest } from '../auth/auth-client-ip.util';
import { MarketingTrialService } from './marketing-trial.service';

@ApiTags('marketing-trial')
@Controller('marketing/trial-access')
@UseGuards(AuthAccessGuard)
export class MarketingTrialController {
  constructor(private readonly trials: MarketingTrialService) {}

  @Public()
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post()
  @ApiOperation({ summary: 'Request SaaS trial access from marketing exit-intent modal' })
  requestAccess(
    @Body()
    body: {
      email: string;
      firstName?: string;
      lastName?: string;
    },
  ) {
    return this.trials.requestAccess(body);
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Get(':token')
  @ApiOperation({ summary: 'Preview trial lead for /login?trial=TOKEN' })
  preview(@Param('token') token: string) {
    return this.trials.preview(token);
  }

  @Public()
  @AuthAccessScope('trial-redeem')
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post('redeem')
  @ApiOperation({ summary: 'Redeem trial token + temporary password → register prefill' })
  redeem(@Req() req: Request, @Body() body: { token: string; password: string }) {
    return this.trials.redeem(body.token, body.password, {
      clientIp: clientIpFromRequest(req),
    });
  }
}
