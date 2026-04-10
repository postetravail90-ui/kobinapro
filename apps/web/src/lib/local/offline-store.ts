/**
 * Point d’entrée unique du stockage local : IndexedDB (web/PWA) ou SQLite (Capacitor natif).
 * Réduit les changements dans le reste de l’app : `@/lib/offline-db` ré-exporte ce module.
 */
import { Capacitor } from '@capacitor/core';
import * as idb from './idb-backend';
import type { ProductCacheRow, SyncPriority, SyncQueueItem } from './local-types';

let backend: 'idb' | 'sqlite' = 'idb';
let sqliteModule: typeof import('./sqlite-backend') | null = null;

/**
 * À appeler une fois au démarrage (voir main.tsx) avant le rendu React.
 * Sur Android/iOS : ouvre SQLite. Sur navigateur : reste sur IndexedDB.
 */
export async function initLocalDataLayer(): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      sqliteModule = await import('./sqlite-backend');
      await sqliteModule.initSqlite();
      backend = 'sqlite';
      if (import.meta.env.DEV) {
        console.info('[Kobina] Stockage local : SQLite (natif)');
      }
      return;
    }
  } catch (e) {
    console.error('[Kobina] Échec SQLite, repli IndexedDB :', e);
    sqliteModule = null;
    backend = 'idb';
  }
  if (import.meta.env.DEV) {
    console.info('[Kobina] Stockage local : IndexedDB');
  }
}

function store(): typeof idb {
  if (backend === 'sqlite' && sqliteModule) {
    return sqliteModule;
  }
  return idb;
}

export type { SyncPriority, SyncQueueItem, ProductCacheRow, SyncEntityStatus } from './local-types';

export const cacheProducts = (products: ProductCacheRow[]) => store().cacheProducts(products);
export const getCachedProducts = () => store().getCachedProducts();
export const getCachedProductByBarcode = (barcode: string) =>
  store().getCachedProductByBarcode(barcode);
export const updateCachedProductStock = (productId: string, newStock: number) =>
  store().updateCachedProductStock(productId, newStock);

export function addToSyncQueue(
  item: Omit<SyncQueueItem, 'id' | 'created_at' | 'retries'> & { retries?: number }
): Promise<string | null> {
  return store().addToSyncQueue(item);
}
export const getSyncQueue = () => store().getSyncQueue();
export const getSyncQueueCount = () => store().getSyncQueueCount();
export const clearSyncQueue = () => store().clearSyncQueue();
export const removeSyncItem = (id: string) => store().removeSyncItem(id);
export const updateSyncItem = (id: string, updates: Partial<SyncQueueItem>) =>
  store().updateSyncItem(id, updates);

export const setCache = (key: string, data: unknown) => store().setCache(key, data);
export const getCache = <T = unknown>(key: string) => store().getCache<T>(key);

export const saveCart = (items: Record<string, unknown>[]) => store().saveCart(items);
export const getCart = () => store().getCart();
export const clearOfflineCart = () => store().clearOfflineCart();

export const addOfflineSale = (sale: Record<string, unknown>) => store().addOfflineSale(sale);
export const updateOfflineSale = (id: string, updates: Record<string, unknown>) =>
  store().updateOfflineSale(id, updates);
export const getOfflineSales = () => store().getOfflineSales();
export const removeOfflineSale = (id: string) => store().removeOfflineSale(id);

export const addOfflineDepense = (depense: Record<string, unknown>) =>
  store().addOfflineDepense(depense);
export const updateOfflineDepense = (id: string, updates: Record<string, unknown>) =>
  store().updateOfflineDepense(id, updates);
export const getOfflineDepenses = () => store().getOfflineDepenses();
export const removeOfflineDepense = (id: string) => store().removeOfflineDepense(id);

export const addLocalCredit = (row: Record<string, unknown>) => store().addLocalCredit(row);
export const getLocalCredits = () => store().getLocalCredits();
export const updateLocalCredit = (id: string, updates: Record<string, unknown>) =>
  store().updateLocalCredit(id, updates);
export const removeLocalCredit = (id: string) => store().removeLocalCredit(id);
export const getLocalCreditsCount = () => store().getLocalCreditsCount();

export const cacheLoyaltyCards = (cards: Record<string, unknown>[]) =>
  store().cacheLoyaltyCards(cards);
export const getCachedLoyaltyCards = () => store().getCachedLoyaltyCards();
export const updateCachedLoyaltyCard = (cardId: string, updates: Record<string, unknown>) =>
  store().updateCachedLoyaltyCard(cardId, updates);

export const cacheLoyaltySettings = (settings: Record<string, unknown>) =>
  store().cacheLoyaltySettings(settings);
export const getCachedLoyaltySettings = (commerceId: string) =>
  store().getCachedLoyaltySettings(commerceId);

export const cacheDashboardData = (key: string, data: unknown) =>
  store().cacheDashboardData(key, data);
export const getCachedDashboardData = <T = unknown>(key: string) =>
  store().getCachedDashboardData<T>(key);

export const addOfflineMessage = (message: Record<string, unknown>) =>
  store().addOfflineMessage(message);
export const getOfflineMessages = () => store().getOfflineMessages();
export const removeOfflineMessage = (id: string) => store().removeOfflineMessage(id);

/** Précise quel backend est actif (utile pour debug / UI). */
export function getLocalBackend(): 'idb' | 'sqlite' {
  return backend;
}
