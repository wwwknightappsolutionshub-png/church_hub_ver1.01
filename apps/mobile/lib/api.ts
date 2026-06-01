const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function loginDemo(): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@demo.church', password: 'ChurchHub123!' }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.accessToken as string;
  } catch {
    return null;
  }
}

export async function syncOutreachQueue(
  items: Array<{ clientId: string; entityType: string; payload: Record<string, unknown>; capturedAt: string }>,
  token: string,
) {
  const res = await fetch(`${API_URL}/api/v1/outreach/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error('Sync failed');
  return res.json();
}

export async function postDriverLocation(
  driverId: string,
  token: string,
  coords: { latitude: number; longitude: number; heading?: number; speed?: number },
) {
  const res = await fetch(`${API_URL}/api/v1/bus/drivers/${driverId}/location`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(coords),
  });
  if (!res.ok) throw new Error('Location update failed');
  return res.json();
}
