import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { RideStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { optimizeRoute, GeoPoint } from './route-optimizer.service';
import { BusAccessService } from './bus-access.service';

@Injectable()
export class BusService {
  private readonly logger = new Logger(BusService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    private readonly busAccess: BusAccessService,
  ) {}

  async createRideRequest(
    churchId: string,
    data: {
      memberId: string;
      pickupAddress: string;
      pickupLat?: number;
      pickupLng?: number;
      dropoffAddress: string;
      dropoffLat?: number;
      dropoffLng?: number;
      scheduledAt: string;
      isRecurring?: boolean;
      recurringRule?: string;
      notes?: string;
    },
  ) {
    return this.prisma.rideRequest.create({
      data: {
        churchId,
        memberId: data.memberId,
        pickupAddress: data.pickupAddress,
        pickupLat: data.pickupLat,
        pickupLng: data.pickupLng,
        dropoffAddress: data.dropoffAddress,
        dropoffLat: data.dropoffLat,
        dropoffLng: data.dropoffLng,
        scheduledAt: new Date(data.scheduledAt),
        isRecurring: data.isRecurring ?? false,
        recurringRule: data.recurringRule,
        notes: data.notes,
        status: 'REQUESTED',
      },
      include: { member: true },
    });
  }

  async listRides(churchId: string, filters?: { driverId?: string; status?: RideStatus; date?: string }) {
    const where: Record<string, unknown> = { churchId };
    if (filters?.driverId) where.driverId = filters.driverId;
    if (filters?.status) where.status = filters.status;
    if (filters?.date) {
      const day = new Date(filters.date);
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      where.scheduledAt = { gte: day, lt: next };
    }
    return this.prisma.rideRequest.findMany({
      where,
      include: { member: true, driver: { include: { user: true } }, bus: true },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async getDriverProfileForUser(userId: string, churchId: string) {
    const profile = await this.busAccess.resolveDriverForUser(userId, churchId);
    if (!profile) return null;
    return this.prisma.driverProfile.findUnique({
      where: { id: profile.id },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });
  }

  async updateRideStatus(churchId: string, rideId: string, status: RideStatus) {
    const ride = await this.prisma.rideRequest.findFirst({ where: { id: rideId, churchId } });
    if (!ride) throw new NotFoundException('Ride not found');

    const timestamps: Record<string, Date> = {};
    if (status === 'PICKED_UP') timestamps.pickedUpAt = new Date();
    if (status === 'DROPPED_OFF') timestamps.droppedOffAt = new Date();
    if (status === 'NO_SHOW') timestamps.noShowAt = new Date();

    const updated = await this.prisma.rideRequest.update({
      where: { id: rideId },
      data: { status, ...timestamps },
      include: { member: true },
    });

    if (status === 'PICKED_UP' || status === 'DROPPED_OFF') {
      await this.notifyParentsForRide(churchId, updated.id, status);
    }

    return updated;
  }

  async updateDriverLocation(
    userId: string,
    driverId: string,
    data: { latitude: number; longitude: number; heading?: number; speed?: number },
    churchId: string,
  ) {
    await this.busAccess.assertDriverIdForUser(userId, churchId, driverId);

    const location = await this.prisma.driverLocation.create({
      data: { driverId, ...data },
    });

    this.realtime.emitBusLocation({
      driverId,
      churchId,
      latitude: data.latitude,
      longitude: data.longitude,
      heading: data.heading,
      speed: data.speed,
      recordedAt: location.recordedAt.toISOString(),
    });

    await this.refreshRideEtasForDriver(churchId, driverId, data.latitude, data.longitude);

    return location;
  }

  private async refreshRideEtasForDriver(
    churchId: string,
    driverId: string,
    driverLat: number,
    driverLng: number,
  ) {
    const rides = await this.prisma.rideRequest.findMany({
      where: {
        churchId,
        driverId,
        status: { in: ['SCHEDULED', 'IN_TRANSIT'] },
        pickupLat: { not: null },
        pickupLng: { not: null },
      },
      take: 10,
      orderBy: { scheduledAt: 'asc' },
    });

    for (const ride of rides) {
      if (ride.pickupLat == null || ride.pickupLng == null) continue;
      const eta = await this.estimateEtaMinutes(driverLat, driverLng, ride.pickupLat, ride.pickupLng);
      if (eta == null) continue;

      const prev = ride.etaMinutes;
      if (prev === eta) continue;

      await this.prisma.rideRequest.update({
        where: { id: ride.id },
        data: { etaMinutes: eta, status: ride.status === 'SCHEDULED' ? 'IN_TRANSIT' : ride.status },
      });

      await this.notifyParentsForRide(churchId, ride.id, 'ETA', eta);
    }
  }

  private async estimateEtaMinutes(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
  ): Promise<number | null> {
    const base = process.env.OSRM_BASE_URL?.replace(/\/$/, '');
    if (base) {
      try {
        const url = `${base}/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=false`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (res.ok) {
          const json = (await res.json()) as { routes?: Array<{ duration: number }> };
          const seconds = json.routes?.[0]?.duration;
          if (seconds != null) return Math.max(1, Math.ceil(seconds / 60));
        }
      } catch (err) {
        this.logger.warn(`OSRM route ETA: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    const { optimizeRoute: heuristicOnly } = await import('./route-optimizer.service');
    const result = await heuristicOnly(fromLat, fromLng, [{ id: 'dest', lat: toLat, lng: toLng }]);
    return result.estimatedMinutes;
  }

  private async notifyParentsForRide(
    churchId: string,
    rideId: string,
    kind: 'ETA' | RideStatus,
    etaMinutes?: number,
  ) {
    const ride = await this.prisma.rideRequest.findFirst({
      where: { id: rideId, churchId },
      include: { member: true },
    });
    if (!ride?.member) return;

    const links = await this.prisma.parentGuardianLink.findMany({
      where: { childId: ride.memberId },
      include: { parent: { include: { user: true } } },
    });
    const parents = links.map((l) => l.parent);

    if (!parents.length) return;

    let title: string;
    let body: string;
    if (kind === 'ETA' && etaMinutes != null) {
      title = 'Bus ETA update';
      body = `${ride.member.firstName}'s pickup is approximately ${etaMinutes} minutes away.`;
    } else if (kind === 'PICKED_UP') {
      title = 'Picked up';
      body = `${ride.member.firstName} has been picked up by the church bus.`;
    } else if (kind === 'DROPPED_OFF') {
      title = 'Dropped off';
      body = `${ride.member.firstName} has been dropped off by the church bus.`;
    } else {
      return;
    }

    for (const parent of parents) {
      if (!parent.userId) continue;
      await this.prisma.notification.create({
        data: {
          churchId,
          userId: parent.userId,
          title,
          body,
          type: 'BUS_PARENT_ETA',
          data: { rideId, memberId: ride.memberId, etaMinutes: etaMinutes ?? ride.etaMinutes },
        },
      });
    }
  }

  async assignDriver(churchId: string, rideId: string, driverId: string, busId?: string) {
    const bus = busId
      ? await this.prisma.bus.findFirst({ where: { id: busId, churchId } })
      : null;
    if (busId && !bus) throw new NotFoundException('Bus not found');

    const activeRides = await this.prisma.rideRequest.count({
      where: { busId, status: { in: ['SCHEDULED', 'IN_TRANSIT', 'PICKED_UP'] } },
    });
    if (bus && activeRides >= bus.capacity) {
      throw new BadRequestException('Bus at capacity');
    }

    return this.prisma.rideRequest.update({
      where: { id: rideId },
      data: { driverId, busId, status: 'SCHEDULED' },
    });
  }

  async optimizeRoute(startLat: number, startLng: number, stops: GeoPoint[]) {
    return optimizeRoute(startLat, startLng, stops);
  }

  async sendEmergencyAlert(churchId: string, driverId: string, message: string) {
    const notification = await this.prisma.notification.create({
      data: {
        churchId,
        title: 'Bus Emergency Alert',
        body: message,
        type: 'BUS_EMERGENCY',
        data: { driverId, timestamp: new Date().toISOString() },
      },
    });

    this.realtime.emitEmergency(churchId, {
      driverId,
      message,
      notificationId: notification.id,
      timestamp: new Date().toISOString(),
    });

    return notification;
  }
}
