import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { api } from '@/lib/api';

interface ChurchHubDB extends DBSchema {
  outreach_queue: {
    key: string;
    value: {
      clientId: string;
      entityType: string;
      payload: Record<string, unknown>;
      capturedAt: string;
      status: 'pending' | 'synced' | 'failed';
      lastError?: string;
    };
  };
  form_cache: {
    key: string;
    value: { formId: string; data: Record<string, unknown>; updatedAt: string };
  };
}

let dbPromise: Promise<IDBPDatabase<ChurchHubDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<ChurchHubDB>('church-hub-offline', 1, {
      upgrade(db) {
        db.createObjectStore('outreach_queue', { keyPath: 'clientId' });
        db.createObjectStore('form_cache', { keyPath: 'formId' });
      },
    });
  }
  return dbPromise;
}

export async function queueOutreachCapture(payload: Record<string, unknown>) {
  const db = await getDb();
  const clientId =
    typeof payload.clientId === 'string' ? payload.clientId : crypto.randomUUID();
  const item = {
    clientId,
    entityType: 'OUTREACH_CAPTURE',
    payload: { ...payload, clientId },
    capturedAt:
      typeof payload.capturedAt === 'string'
        ? payload.capturedAt
        : new Date().toISOString(),
    status: 'pending' as const,
  };
  await db.put('outreach_queue', item);
  return item;
}

export async function getPendingSyncItems() {
  const db = await getDb();
  const all = await db.getAll('outreach_queue');
  return all.filter((i) => i.status === 'pending' || i.status === 'failed');
}

export async function getAllQueueItems() {
  const db = await getDb();
  return db.getAll('outreach_queue');
}

export async function markSynced(clientId: string) {
  const db = await getDb();
  const item = await db.get('outreach_queue', clientId);
  if (item) await db.put('outreach_queue', { ...item, status: 'synced' });
}

export async function markFailed(clientId: string, error: string) {
  const db = await getDb();
  const item = await db.get('outreach_queue', clientId);
  if (item) await db.put('outreach_queue', { ...item, status: 'failed', lastError: error });
}

export async function removeFromQueue(clientId: string) {
  const db = await getDb();
  await db.delete('outreach_queue', clientId);
}

export async function syncPendingOutreach() {
  const pending = await getPendingSyncItems();
  if (pending.length === 0) {
    return { synced: 0, failed: 0, skipped: true };
  }

  if (!navigator.onLine) {
    throw new Error('Device is offline');
  }

  const { data } = await api.post<{
    synced: number;
    failed: number;
    results: Array<{ clientId: string; status: string }>;
  }>('/outreach/sync', {
    items: pending.map((item) => ({
      clientId: item.clientId,
      entityType: item.entityType,
      payload: item.payload,
      capturedAt: item.capturedAt,
    })),
  });

  for (const result of data.results ?? []) {
    if (result.status === 'SYNCED') {
      await markSynced(result.clientId);
    } else {
      await markFailed(result.clientId, 'Server sync failed');
    }
  }

  return {
    synced: data.synced ?? 0,
    failed: data.failed ?? 0,
    skipped: false,
  };
}

export async function cacheForm(formId: string, data: Record<string, unknown>) {
  const db = await getDb();
  await db.put('form_cache', { formId, data, updatedAt: new Date().toISOString() });
}

export async function getCachedForm(formId: string) {
  const db = await getDb();
  return db.get('form_cache', formId);
}

export async function clearCachedForm(formId: string) {
  const db = await getDb();
  await db.delete('form_cache', formId);
}

export const OUTREACH_FORM_CACHE_ID = 'outreach-capture-draft';
