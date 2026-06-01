import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RideStatus } from '@prisma/client';
import { BusService } from './bus.service';
import { ChurchId, CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { ModuleGate, Roles, BusDriver } from '../auth/decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  assignRideSchema,
  createRideSchema,
  driverLocationSchema,
  emergencySchema,
  optimizeRouteSchema,
  updateRideStatusSchema,
} from './bus.schemas';
import { BusDriverGuard } from './bus-driver.guard';

@ApiTags('bus')
@ApiBearerAuth()
@ModuleGate('busMinistry')
@Controller('bus')
export class BusController {
  constructor(private readonly busService: BusService) {}

  @Get('drivers/me')
  @BusDriver()
  @UseGuards(BusDriverGuard)
  @ApiOperation({ summary: 'Current user driver profile' })
  driverMe(@ChurchId() churchId: string, @CurrentUser() user: AuthUser) {
    return this.busService.getDriverProfileForUser(user.userId, churchId);
  }

  @Post('rides')
  @ApiOperation({ summary: 'Request a ride' })
  createRide(
    @ChurchId() churchId: string,
    @Body(new ZodValidationPipe(createRideSchema)) body: z.infer<typeof createRideSchema>,
  ) {
    return this.busService.createRideRequest(churchId, body);
  }

  @Get('rides')
  @ApiOperation({ summary: 'List ride requests' })
  listRides(
    @ChurchId() churchId: string,
    @Query('driverId') driverId?: string,
    @Query('status') status?: RideStatus,
    @Query('date') date?: string,
  ) {
    return this.busService.listRides(churchId, { driverId, status, date });
  }

  @Patch('rides/:id/status')
  @BusDriver()
  @UseGuards(BusDriverGuard)
  @ApiOperation({ summary: 'Update ride status (picked up / dropped off / no-show)' })
  updateStatus(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateRideStatusSchema)) body: { status: RideStatus },
  ) {
    return this.busService.updateRideStatus(churchId, id, body.status);
  }

  @Post('rides/:id/assign')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  @ApiOperation({ summary: 'Assign driver and bus to ride' })
  assign(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(assignRideSchema)) body: { driverId: string; busId?: string },
  ) {
    return this.busService.assignDriver(churchId, id, body.driverId, body.busId);
  }

  @Post('drivers/:driverId/location')
  @BusDriver()
  @UseGuards(BusDriverGuard)
  @ApiOperation({ summary: 'Update driver GPS location' })
  updateLocation(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('driverId') driverId: string,
    @Body(new ZodValidationPipe(driverLocationSchema))
    body: { latitude: number; longitude: number; heading?: number; speed?: number },
  ) {
    return this.busService.updateDriverLocation(user.userId, driverId, body, churchId);
  }

  @Post('routes/optimize')
  @Roles('ADMIN', 'PASTOR', 'LEADER')
  @ApiOperation({ summary: 'Optimize pickup route (OSRM or TSP heuristic)' })
  optimizeRoute(
    @Body(new ZodValidationPipe(optimizeRouteSchema))
    body: {
      startLat: number;
      startLng: number;
      stops: Array<{ id: string; lat: number; lng: number; label?: string }>;
    },
  ) {
    return this.busService.optimizeRoute(body.startLat, body.startLng, body.stops);
  }

  @Post('emergency')
  @BusDriver()
  @UseGuards(BusDriverGuard)
  @ApiOperation({ summary: 'Send bus emergency alert' })
  emergency(
    @ChurchId() churchId: string,
    @Body(new ZodValidationPipe(emergencySchema)) body: { driverId: string; message: string },
  ) {
    return this.busService.sendEmergencyAlert(churchId, body.driverId, body.message);
  }
}
