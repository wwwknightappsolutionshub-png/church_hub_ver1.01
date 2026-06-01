import { Logger } from '@nestjs/common';
import type { GeoPoint, OptimizedRoute } from './route-optimizer.service';

const logger = new Logger('RouteOptimizerOsrm');

/**
 * OSRM Trip API — returns ordered stops with distance/duration when available.
 * @see https://project-osrm.org/docs/v5.24.0/api/#trip-service
 */
export async function optimizeRouteWithOsrm(
  startLat: number,
  startLng: number,
  stops: GeoPoint[],
): Promise<OptimizedRoute | null> {
  const base = process.env.OSRM_BASE_URL?.replace(/\/$/, '');
  if (!base || stops.length === 0) return null;

  const coordinates = [
    `${startLng},${startLat}`,
    ...stops.map((s) => `${s.lng},${s.lat}`),
  ].join(';');

  const url = `${base}/trip/v1/driving/${coordinates}?source=first&roundtrip=false&geometries=geojson`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) {
      logger.warn(`OSRM trip HTTP ${res.status}`);
      return null;
    }
    const data = (await res.json()) as {
      code?: string;
      trips?: Array<{
        distance: number;
        duration: number;
        legs?: unknown[];
      }>;
      waypoints?: Array<{ waypoint_index: number }>;
    };

    if (data.code !== 'Ok' || !data.trips?.[0] || !data.waypoints) {
      logger.warn(`OSRM trip code: ${data.code ?? 'unknown'}`);
      return null;
    }

    const trip = data.trips[0];
    const orderedIndices = data.waypoints
      .map((wp, idx) => ({ idx, order: wp.waypoint_index }))
      .filter((w) => w.idx > 0)
      .sort((a, b) => a.order - b.order)
      .map((w) => w.idx - 1);

    const orderedStops = orderedIndices.map((i) => stops[i]).filter(Boolean);
    const totalDistanceKm = trip.distance / 1000;
    const estimatedMinutes = Math.max(1, Math.ceil(trip.duration / 60));

    return {
      orderedStops,
      totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
      estimatedMinutes,
      provider: 'osrm',
    };
  } catch (err) {
    logger.warn(`OSRM trip failed: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}
