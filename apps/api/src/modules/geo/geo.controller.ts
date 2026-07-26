import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators';
import { GeoService } from './geo.service';

@ApiTags('geo')
@Controller('geo')
export class GeoController {
  constructor(private readonly geo: GeoService) {}

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get('postcode/:code')
  @ApiOperation({ summary: 'Validate UK postcode and return lat/lng via postcodes.io' })
  lookup(@Param('code') code: string) {
    return this.geo.lookupPostcode(code);
  }

  @Public()
  @Throttle({ default: { limit: 40, ttl: 60000 } })
  @Get('postcode-autocomplete')
  @ApiOperation({ summary: 'UK postcode autocomplete suggestions via postcodes.io' })
  autocomplete(@Query('q') q: string) {
    return this.geo.autocompletePostcode(q ?? '');
  }
}
