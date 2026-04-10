/** Types partagés entre IndexedDB (web) et SQLite (Capacitor natif). */

export type SyncPriority = 'critical' | 'high' | 'normal' | 'low';

/** Statut de synchronisation vers Supabase (file + entités hors-ligne). */
export type SyncEntityStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface SyncQueueItem {
  id: string;
  table: string;
  action: 'insert' | 'update' | 'delete' | 'rpc';
  payload: Record<string, unknown>;
  priority: SyncPriority;
  retries: number;
  created_at: string;
  user_id?: string;
  user_name?: string;
  sync_status?: SyncEntityStatus;
  last_error?: string;
  /** Anti-doublon file générique (même table/action/payload stable). */
  dedupe_key?: string;
  /** ISO — ne pas retenter avant cette date (retry exponentiel). */
  next_retry_at?: string;
}

/** Vente / dépense / crédit stockés localement avant sync. */
export interface OfflineSalePayload extends Record<string, unknown> {
  id: string;
  sync_status?: SyncEntityStatus;
  sync_error?: string;
  sync_attempts?: number;
}

export interface LocalCreditPaymentPayload extends Record<string, unknown> {
  id: string;
  credit_id: string;
  amount: number;
  user_id: string;
  user_name: string;
  commerce_id?: string;
  created_at: string;
  sync_status?: SyncEntityStatus;
  sync_error?: string;
}

/** Produit tel que renvoyé par Supabase / mis en cache localement. */
export type ProductCacheRow = Record<string, unknown> & {
  id: string;
  stock: number;
};
