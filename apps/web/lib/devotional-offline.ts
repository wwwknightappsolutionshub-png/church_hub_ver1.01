import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { DevotionalPlanDto, DevotionalTodayDto } from '@church-hub/shared-types';

export type DevotionalOfflinePendingType = 'PLAN_COMPLETE';

export interface DevotionalOfflinePending {
  clientId: string;
  type: DevotionalOfflinePendingType;
  payload: Record<string, unknown>;
  capturedAt: string;
  status: 'pending' | 'synced' | 'failed';
  lastError?: string;
}

interface DevotionalOfflineDB extends DBSchema {
  snapshots: {
    key: string;
    value: { key: string; data: unknown; updatedAt: string };
  };
  pending: {
    key: string;
    value: DevotionalOfflinePending;
  };
}

let dbPromise: Promise<IDBPDatabase<DevotionalOfflineDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<DevotionalOfflineDB>('church-hub-devotional-offline', 1, {
      upgrade(db) {
        db.createObjectStore('snapshots', { keyPath: 'key' });
        db.createObjectStore('pending', { keyPath: 'clientId' });
      },
    });
  }
  return dbPromise;
}

export async function saveDevotionalSnapshot(key: string, data: unknown) {
  const db = await getDb();
  await db.put('snapshots', {
    key,
    data,
    updatedAt: new Date().toISOString(),
  });
}

export async function readDevotionalSnapshot<T>(key: string): Promise<T | null> {
  const db = await getDb();
  const row = await db.get('snapshots', key);
  return (row?.data as T) ?? null;
}

export async function cachePlansOffline(items: DevotionalPlanDto[]) {
  await saveDevotionalSnapshot('plans', { items, total: items.length });
}

export async function cacheTodayOffline(planId: string, data: DevotionalTodayDto) {
  await saveDevotionalSnapshot(`today:${planId}`, data);
}

export async function readOfflinePlans(): Promise<{ items: DevotionalPlanDto[]; total: number } | null> {
  return readDevotionalSnapshot('plans');
}

export async function readOfflineToday(planId: string): Promise<DevotionalTodayDto | null> {
  return readDevotionalSnapshot(`today:${planId}`);
}

export async function queueDevotionalPending(
  type: DevotionalOfflinePendingType,
  payload: Record<string, unknown>,
) {
  const db = await getDb();
  const clientId =
    typeof payload.clientId === 'string' ? payload.clientId : crypto.randomUUID();
  const item: DevotionalOfflinePending = {
    clientId,
    type,
    payload: { ...payload, clientId },
    capturedAt: new Date().toISOString(),
    status: 'pending',
  };
  await db.put('pending', item);
  return item;
}

export async function getDevotionalPendingItems() {
  const db = await getDb();
  const all = await db.getAll('pending');
  return all.filter((i) => i.status === 'pending' || i.status === 'failed');
}

export async function markDevotionalPendingSynced(clientId: string) {
  const db = await getDb();
  const item = await db.get('pending', clientId);
  if (item) await db.put('pending', { ...item, status: 'synced' });
}

export async function markDevotionalPendingFailed(clientId: string, error: string) {
  const db = await getDb();
  const item = await db.get('pending', clientId);
  if (item) await db.put('pending', { ...item, status: 'failed', lastError: error });
}
