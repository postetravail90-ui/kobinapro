/**
 * IndexedDB (Dexie) — couche optionnelle pour extensions futures.
 * La source de vérité métier reste SQLite (sql.js / Capacitor) + sync_queue existante.
 */
import Dexie, { type Table } from "dexie";

export interface LocalSale {
  id: string;
  local_id: string;
  server_id?: string;
  business_id: string;
  manager_id: string;
  total: number;
  paid_amount: number;
  credit_amount: number;
  payment_method: string;
  status: "complete" | "partial" | "credit";
  items: LocalSaleItem[];
  sync_status: "pending" | "synced" | "error";
  sync_error?: string;
  created_at: number;
  updated_at: number;
  deleted_at?: number;
}

export interface LocalSaleItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface LocalProduct {
  id: string;
  local_id: string;
  server_id?: string;
  business_id: string;
  name: string;
  price: number;
  cost_price: number;
  barcode?: string;
  category?: string;
  stock_quantity: number;
  alert_threshold: number;
  sync_status: "pending" | "synced" | "error";
  created_at: number;
  updated_at: number;
  deleted_at?: number;
}

export interface LocalCredit {
  id: string;
  local_id: string;
  server_id?: string;
  business_id: string;
  client_name: string;
  client_phone?: string;
  total_amount: number;
  paid_amount: number;
  status: "pending" | "partial" | "paid";
  sync_status: "pending" | "synced" | "error";
  created_at: number;
  updated_at: number;
}

export interface LocalExpense {
  id: string;
  local_id: string;
  server_id?: string;
  business_id: string;
  manager_id: string;
  amount: number;
  category: string;
  description?: string;
  sync_status: "pending" | "synced" | "error";
  created_at: number;
  updated_at: number;
}

export interface LocalSyncQueue {
  id: string;
  table_name: string;
  operation: "INSERT" | "UPDATE" | "DELETE";
  payload: string;
  local_id: string;
  server_id?: string;
  created_at: number;
  retries: number;
  next_retry_at: number;
  status: "pending" | "syncing" | "error";
  error_message?: string;
}

export interface LocalBusiness {
  id: string;
  local_id: string;
  server_id?: string;
  owner_id: string;
  name: string;
  type: string;
  is_default: boolean;
  is_active: boolean;
  sync_status: "pending" | "synced" | "error";
  created_at: number;
  updated_at: number;
}

class KobinaDexieDB extends Dexie {
  sales!: Table<LocalSale, string>;
  products!: Table<LocalProduct, string>;
  credits!: Table<LocalCredit, string>;
  expenses!: Table<LocalExpense, string>;
  dexie_sync_queue!: Table<LocalSyncQueue, string>;
  businesses!: Table<LocalBusiness, string>;

  constructor() {
    super("KobinaProDexie");
    this.version(1).stores({
      sales: "id, local_id, server_id, business_id, sync_status, created_at, status",
      products: "id, local_id, server_id, business_id, barcode, sync_status, name",
      credits: "id, local_id, server_id, business_id, sync_status, status",
      expenses: "id, local_id, server_id, business_id, sync_status, created_at",
      dexie_sync_queue: "id, table_name, status, created_at, next_retry_at",
      businesses: "id, local_id, server_id, owner_id, sync_status, is_default",
    });
  }
}

export const dexieDb = new KobinaDexieDB();

export async function initDexieProDB(): Promise<void> {
  await dexieDb.open();
  if (import.meta.env.DEV) {
    console.info("[KobinaDexie] ready, version:", dexieDb.verno);
  }
}
