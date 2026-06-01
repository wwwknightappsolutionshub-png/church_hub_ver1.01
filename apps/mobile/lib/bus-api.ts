const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface DriverRide {
  id: string;
  status: string;
  pickupAddress: string;
  dropoffAddress: string;
  etaMinutes?: number | null;
  member: { firstName: string; lastName: string };
}

export interface DriverProfile {
  id: string;
  userId: string;
}

async function apiFetch(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function fetchDriverProfile(token: string): Promise<DriverProfile | null> {
  try {
    return await apiFetch('/bus/drivers/me', token);
  } catch {
    return null;
  }
}

export async function fetchDriverRides(
  token: string,
  driverId: string,
  date?: string,
): Promise<DriverRide[]> {
  const q = new URLSearchParams({ driverId });
  if (date) q.set('date', date);
  return apiFetch(`/bus/rides?${q.toString()}`, token);
}

export async function updateRideStatus(
  token: string,
  rideId: string,
  status: 'PICKED_UP' | 'DROPPED_OFF' | 'NO_SHOW',
) {
  return apiFetch(`/bus/rides/${rideId}/status`, token, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function postDriverLocation(
  driverId: string,
  token: string,
  coords: { latitude: number; longitude: number; heading?: number; speed?: number },
) {
  return apiFetch(`/bus/drivers/${driverId}/location`, token, {
    method: 'POST',
    body: JSON.stringify(coords),
  });
}

export async function postBusEmergency(
  token: string,
  driverId: string,
  message: string,
) {
  return apiFetch('/bus/emergency', token, {
    method: 'POST',
    body: JSON.stringify({ driverId, message }),
  });
}
