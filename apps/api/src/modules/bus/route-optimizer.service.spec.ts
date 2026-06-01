import { optimizeRoute } from './route-optimizer.service';

describe('RouteOptimizer', () => {
  it('returns empty route for no stops', async () => {
    const result = await optimizeRoute(0, 0, []);
    expect(result.orderedStops).toEqual([]);
    expect(result.totalDistanceKm).toBe(0);
  });

  it('orders stops using nearest neighbor + 2-opt', async () => {
    const stops = [
      { id: 'a', lat: 0.01, lng: 0 },
      { id: 'b', lat: 0.02, lng: 0.01 },
      { id: 'c', lat: 0.005, lng: 0.005 },
    ];
    const result = await optimizeRoute(0, 0, stops);
    expect(result.orderedStops).toHaveLength(3);
    expect(result.totalDistanceKm).toBeGreaterThan(0);
    expect(result.estimatedMinutes).toBeGreaterThan(0);
    expect(result.provider).toBe('heuristic');
  });
});
