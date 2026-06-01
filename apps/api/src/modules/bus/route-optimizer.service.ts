export interface GeoPoint {
  id: string;
  lat: number;
  lng: number;
  label?: string;
}

export interface OptimizedRoute {
  orderedStops: GeoPoint[];
  totalDistanceKm: number;
  estimatedMinutes: number;
  provider?: 'osrm' | 'heuristic';
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function nearestNeighborRoute(start: { lat: number; lng: number }, stops: GeoPoint[]): GeoPoint[] {
  const remaining = [...stops];
  const route: GeoPoint[] = [];
  let current = start;

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(current, remaining[i]);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    }
    const next = remaining.splice(nearestIdx, 1)[0];
    route.push(next);
    current = next;
  }

  return route;
}

function twoOptImprove(start: { lat: number; lng: number }, route: GeoPoint[]): GeoPoint[] {
  if (route.length < 3) return route;

  const dist = (r: GeoPoint[]) => {
    let total = haversineKm(start, r[0]);
    for (let i = 0; i < r.length - 1; i++) {
      total += haversineKm(r[i], r[i + 1]);
    }
    return total;
  };

  let improved = true;
  let best = [...route];

  while (improved) {
    improved = false;
    for (let i = 0; i < best.length - 1; i++) {
      for (let j = i + 2; j < best.length; j++) {
        const newRoute = [
          ...best.slice(0, i + 1),
          ...best.slice(i + 1, j + 1).reverse(),
          ...best.slice(j + 1),
        ];
        if (dist(newRoute) < dist(best)) {
          best = newRoute;
          improved = true;
        }
      }
    }
  }

  return best;
}

export async function optimizeRoute(
  startLat: number,
  startLng: number,
  stops: GeoPoint[],
): Promise<OptimizedRoute> {
  const { optimizeRouteWithOsrm } = await import('./route-optimizer-osrm');
  const osrm = await optimizeRouteWithOsrm(startLat, startLng, stops);
  if (osrm) return osrm;

  const start = { lat: startLat, lng: startLng };
  if (stops.length === 0) {
    return { orderedStops: [], totalDistanceKm: 0, estimatedMinutes: 0, provider: 'heuristic' };
  }

  const nnRoute = nearestNeighborRoute(start, stops);
  const optimized = twoOptImprove(start, nnRoute);

  let totalDistanceKm = haversineKm(start, optimized[0]);
  for (let i = 0; i < optimized.length - 1; i++) {
    totalDistanceKm += haversineKm(optimized[i], optimized[i + 1]);
  }

  const avgSpeedKmh = 30;
  const estimatedMinutes = Math.ceil((totalDistanceKm / avgSpeedKmh) * 60);

  return {
    orderedStops: optimized,
    totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
    estimatedMinutes,
    provider: 'heuristic',
  };
}
