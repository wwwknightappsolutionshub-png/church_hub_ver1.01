import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginDemo, syncOutreachQueue } from './api';

export const QUEUE_KEY = 'outreach_offline_queue';
export const TOKEN_KEY = 'access_token';

export interface QueueItem {
  clientId: string;
  entityType: string;
  payload: Record<string, unknown>;
  capturedAt: string;
}

export async function getQueue(): Promise<QueueItem[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function addToQueue(item: QueueItem) {
  const queue = await getQueue();
  queue.push(item);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function clearSynced(clientIds: string[]) {
  const queue = await getQueue();
  const remaining = queue.filter((q) => !clientIds.includes(q.clientId));
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
}

export async function syncQueue(): Promise<{ synced: number; failed: number }> {
  const queue = await getQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let token = await AsyncStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = await loginDemo();
    if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  }
  if (!token) throw new Error('Not authenticated');

  const results = await syncOutreachQueue(queue, token);
  const syncedIds = results.filter((r: { status: string }) => r.status === 'SYNCED').map((r: { clientId: string }) => r.clientId);
  await clearSynced(syncedIds);

  return {
    synced: syncedIds.length,
    failed: queue.length - syncedIds.length,
  };
}
