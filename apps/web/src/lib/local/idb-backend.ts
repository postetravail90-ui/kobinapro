/**
 * Backend local IndexedDB (navigateur / PWA).
 * Conservé tel quel pour compatibilité ; les appels passent par offline-store.
 */
import { openDB, type IDBPDatabase } from 'idb';
import type { ProductCacheRow, SyncPriority, SyncQueueItem } from './local-types';
import { buildSyncQueueDedupeKey } from '@/lib/sync-engine/dedupe';
import { MAX_SYNC_ATTEMPTS } from '@/lib/sync-engine/config';

export type { SyncPriority, SyncQueueItem, ProductCacheRow } from './local-types';

const DB_NAME = 'kobina-offline';
const DB_VERSION = 3;

const PRIORITY_ORDER: Record<SyncPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains('produits')) {
          db.createObjectStore('produits', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('sync_queue')) {
          db.createObjectStore('sync_queue', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('cart')) {
          db.createObjectStore('cart', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains('offline_sales')) {
            db.createObjectStore('offline_sales', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('offline_depenses')) {
            db.createObjectStore('offline_depenses', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('loyalty_cards')) {
            db.createObjectStore('loyalty_cards', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('loyalty_settings')) {
            db.createObjectStore('loyalty_settings', { keyPath: 'commerce_id' });
          }
          if (!db.objectStoreNames.contains('dashboard_cache')) {
            db.createObjectStore('dashboard_cache', { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains('offline_messages')) {
            db.createObjectStore('offline_messages', { keyPath: 'id' });
          }
        }
        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains('local_credits')) {
            db.createObjectStore('local_credits', { keyPath: 'id' });
          }
        }
      },
    });
  }
  return dbPromise;
}

export async function cacheProducts(products: ProductCacheRow[]) {
  const db = await getDB();
  const tx = db.transaction('produits', 'readwrite');
  const store = tx.objectStore('produits');
  await store.clear();
  for (const p of products) {
    await store.put(p);
  }
  await tx.done;
}

export async function getCachedProducts(): Promise<ProductCacheRow[]> {
  const db = await getDB();
  return db.getAll('produits') as Promise<ProductCacheRow[]>;
}

export async function getCachedProductByBarcode(
  barcode: string
): Promise<ProductCacheRow | undefined> {
  const db = await getDB();
  const all = (await db.getAll('produits')) as ProductCacheRow[];
  return all.find((p) => p.code_barre === barcode);
}

export async function updateCachedProductStock(productId: string, newStock: number) {
  const db = await getDB();
  const product = (await db.get('produits', productId)) as ProductCacheRow | undefined;
  if (product) {
    product.stock = newStock;
    await db.put('produits', product);
  }
}

export async function addToSyncQueue(
  item: Omit<SyncQueueItem, 'id' | 'created_at' | 'retries'> & { retries?: number }
): Promise<string | null> {
  const db = await getDB();
  const dedupe_key = item.dedupe_key ?? buildSyncQueueDedupeKey(item);
  const existing = await db.getAll('sync_queue');
  const blocks = (existing as SyncQueueItem[]).some((q) => {
    const dk = q.dedupe_key ?? buildSyncQueueDedupeKey(q);
    if (dk !== dedupe_key) return false;
    const st = q.sync_status ?? 'pending';
    if (st === 'pending' || st === 'syncing') return true;
    if (st === 'failed' && (q.retries ?? 0) < MAX_SYNC_ATTEMPTS) return true;
    return false;
  });
  if (blocks) return null;

  const id = crypto.randomUUID();
  await db.add('sync_queue', {
    ...item,
    id,
    retries: item.retries ?? 0,
    created_at: new Date().toISOString(),
    sync_status: item.sync_status ?? 'pending',
    dedupe_key,
  });
  return id;
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getDB();
  const items = await db.getAll('sync_queue');
  return items.sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority || 'normal'] ?? 2;
    const pb = PRIORITY_ORDER[b.priority || 'normal'] ?? 2;
    if (pa !== pb) return pa - pb;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

export async function getSyncQueueCount(): Promise<number> {
  const db = await getDB();
  return (await db.getAll('sync_queue')).length;
}

export async function clearSyncQueue() {
  const db = await getDB();
  const tx = db.transaction('sync_queue', 'readwrite');
  await tx.objectStore('sync_queue').clear();
  await tx.done;
}

export async function removeSyncItem(id: string) {
  const db = await getDB();
  await db.delete('sync_queue', id);
}

export async function updateSyncItem(id: string, updates: Partial<SyncQueueItem>) {
  const db = await getDB();
  const item = await db.get('sync_queue', id);
  if (item) {
    await db.put('sync_queue', { ...item, ...updates });
  }
}

export async function setCache(key: string, data: unknown) {
  const db = await getDB();
  await db.put('cache', { key, data, updated_at: Date.now() });
}

export async function getCache<T = unknown>(key: string): Promise<T | null> {
  const db = await getDB();
  const result = await db.get('cache', key);
  return (result?.data as T) ?? null;
}

export async function saveCart(items: Record<string, unknown>[]) {
  const db = await getDB();
  const tx = db.transaction('cart', 'readwrite');
  const store = tx.objectStore('cart');
  await store.clear();
  for (const item of items) {
    await store.put(item);
  }
  await tx.done;
}

export async function getCart(): Promise<Record<string, unknown>[]> {
  const db = await getDB();
  return db.getAll('cart') as Promise<Record<string, unknown>[]>;
}

export async function clearOfflineCart() {
  const db = await getDB();
  const tx = db.transaction('cart', 'readwrite');
  await tx.objectStore('cart').clear();
  await tx.done;
}

export async function addOfflineSale(sale: Record<string, unknown>) {
  const db = await getDB();
  const id = typeof sale.id === 'string' ? sale.id : crypto.randomUUID();
  await db.put('offline_sales', {
    ...sale,
    id,
    sync_status: sale.sync_status || 'pending',
  });
}

export async function updateOfflineSale(id: string, updates: Record<string, unknown>) {
  const db = await getDB();
  const row = await db.get('offline_sales', id);
  if (!row) return;
  await db.put('offline_sales', { ...(row as object), ...updates });
}

export async function getOfflineSales(): Promise<Record<string, unknown>[]> {
  const db = await getDB();
  return db.getAll('offline_sales');
}

export async function removeOfflineSale(id: string) {
  const db = await getDB();
  await db.delete('offline_sales', id);
}

export async function addOfflineDepense(depense: Record<string, unknown>) {
  const db = await getDB();
  const id = typeof depense.id === 'string' ? depense.id : crypto.randomUUID();
  await db.put('offline_depenses', {
    ...depense,
    id,
    sync_status: depense.sync_status || 'pending',
  });
}

export async function updateOfflineDepense(id: string, updates: Record<string, unknown>) {
  const db = await getDB();
  const row = await db.get('offline_depenses', id);
  if (!row) return;
  await db.put('offline_depenses', { ...(row as object), ...updates });
}

export async function getOfflineDepenses(): Promise<Record<string, unknown>[]> {
  const db = await getDB();
  return db.getAll('offline_depenses');
}

export async function removeOfflineDepense(id: string) {
  const db = await getDB();
  await db.delete('offline_depenses', id);
}

export async function cacheLoyaltyCards(cards: Record<string, unknown>[]) {
  const db = await getDB();
  const tx = db.transaction('loyalty_cards', 'readwrite');
  const store = tx.objectStore('loyalty_cards');
  await store.clear();
  for (const c of cards) await store.put(c);
  await tx.done;
}

export async function getCachedLoyaltyCards(): Promise<Record<string, unknown>[]> {
  const db = await getDB();
  return db.getAll('loyalty_cards');
}

export async function updateCachedLoyaltyCard(cardId: string, updates: Record<string, unknown>) {
  const db = await getDB();
  const card = await db.get('loyalty_cards', cardId);
  if (card) {
    await db.put('loyalty_cards', { ...card, ...updates });
  }
}

export async function cacheLoyaltySettings(settings: Record<string, unknown>) {
  const db = await getDB();
  await db.put('loyalty_settings', settings);
}

export async function getCachedLoyaltySettings(
  commerceId: string
): Promise<Record<string, unknown> | null> {
  const db = await getDB();
  return (await db.get('loyalty_settings', commerceId)) ?? null;
}

export async function cacheDashboardData(key: string, data: unknown) {
  const db = await getDB();
  await db.put('dashboard_cache', { key, data, updated_at: Date.now() });
}

export async function getCachedDashboardData<T = unknown>(
  key: string
): Promise<{ data: T; updated_at: number } | null> {
  const db = await getDB();
  const result = await db.get('dashboard_cache', key);
  return result ?? null;
}

export async function addOfflineMessage(message: Record<string, unknown>) {
  const db = await getDB();
  const id = typeof message.id === 'string' ? message.id : crypto.randomUUID();
  await db.put('offline_messages', { ...message, id });
}

export async function getOfflineMessages(): Promise<Record<string, unknown>[]> {
  const db = await getDB();
  return db.getAll('offline_messages');
}

export async function removeOfflineMessage(id: string) {
  const db = await getDB();
  await db.delete('offline_messages', id);
}

export async function addLocalCredit(row: Record<string, unknown>) {
  const db = await getDB();
  const id = typeof row.id === 'string' ? row.id : crypto.randomUUID();
  await db.put('local_credits', {
    ...row,
    id,
    sync_status: row.sync_status || 'pending',
    created_at: row.created_at || new Date().toISOString(),
  });
}

export async function getLocalCredits(): Promise<Record<string, unknown>[]> {
  const db = await getDB();
  return db.getAll('local_credits');
}

export async function updateLocalCredit(id: string, updates: Record<string, unknown>) {
  const db = await getDB();
  const row = await db.get('local_credits', id);
  if (!row) return;
  await db.put('local_credits', { ...(row as object), ...updates });
}

export async function removeLocalCredit(id: string) {
  const db = await getDB();
  await db.delete('local_credits', id);
}

export async function getLocalCreditsCount(): Promise<number> {
  const db = await getDB();
  return (await db.getAll('local_credits')).length;
}
