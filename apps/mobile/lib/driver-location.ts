import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

export const DRIVER_LOCATION_TASK = 'CHURCH_HUB_DRIVER_BG_LOCATION';

export interface DriverLocationPayload {
  driverId: string;
  token: string;
}

type LocationCallback = (
  coords: { latitude: number; longitude: number; heading?: number; speed?: number },
) => void | Promise<void>;

let foregroundCallback: LocationCallback | null = null;

TaskManager.defineTask(DRIVER_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('[DriverLocationTask]', error.message);
    return;
  }
  const locations = (data as { locations?: Location.LocationObject[] })?.locations;
  const latest = locations?.[locations.length - 1];
  if (!latest || !foregroundCallback) return;
  await foregroundCallback({
    latitude: latest.coords.latitude,
    longitude: latest.coords.longitude,
    heading: latest.coords.heading ?? undefined,
    speed: latest.coords.speed ?? undefined,
  });
});

export async function requestLocationPermissions(): Promise<boolean> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return false;
  const bg = await Location.requestBackgroundPermissionsAsync();
  return bg.status === 'granted';
}

export async function startForegroundTracking(onUpdate: LocationCallback) {
  foregroundCallback = onUpdate;
  return Location.watchPositionAsync(
    { accuracy: Location.Accuracy.High, distanceInterval: 40, timeInterval: 15_000 },
    (loc) => {
      void onUpdate({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        heading: loc.coords.heading ?? undefined,
        speed: loc.coords.speed ?? undefined,
      });
    },
  );
}

export async function startBackgroundTracking() {
  const started = await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK);
  if (started) return;
  await Location.startLocationUpdatesAsync(DRIVER_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 60,
    timeInterval: 30_000,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Church Hub Driver',
      notificationBody: 'Sharing live location for bus ministry',
    },
  });
}

export async function stopBackgroundTracking() {
  const started = await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK);
  if (started) await Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK);
}

export function setBackgroundLocationCallback(cb: LocationCallback) {
  foregroundCallback = cb;
}
