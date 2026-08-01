import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '../auth/decorators';
import { PublicMembershipRegisterDto } from './dto/public-membership-register.dto';
import { LandingMembershipService } from './landing-membership.service';

function clientMeta(req: Request) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip =
    typeof forwarded === 'string'
      ? forwarded.split(',')[0]?.trim()
      : Array.isArray(forwarded)
        ? forwarded[0]
        : req.ip;
  return {
    ipAddress: ip || null,
    userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null,
  };
}

/**
 * Dedicated public routes for church landing membership (avoids stale :slug route shadowing).
 */
@ApiTags('church-landing-public')
@Controller('church-landing')
export class ChurchLandingPublicController {
  constructor(private readonly landingMembership: LandingMembershipService) {}

  @Public()
  @Get(':slug/membership/form')
  @ApiOperation({ summary: 'Public membership form config and service units' })
  getPublicMembershipForm(@Param('slug') slug: string) {
    return this.landingMembership.getPublicForm(slug);
  }

  @Public()
  @Post(':slug/membership/register')
  @ApiOperation({ summary: 'Register membership from public landing page' })
  registerMembership(
    @Param('slug') slug: string,
    @Body() body: PublicMembershipRegisterDto,
    @Req() req: Request,
  ) {
    return this.landingMembership.registerFromLanding(slug, body, clientMeta(req));
  }
}
