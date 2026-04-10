/**
 * Backend SQLite via @capacitor-community/sqlite (Android / iOS natif).
 */
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import type { SQLiteDBConnection } from '@capacitor-community/sqlite';
import type { DBSQLiteValues } from '@capacitor-community/sqlite';
import type { ProductCacheRow, SyncPriority, SyncQueueItem } from './local-types';
import { buildSyncQueueDedupeKey } from '@/lib/sync-engine/dedupe';
import { MAX_SYNC_ATTEMPTS } from '@/lib/sync-engine/config';

export type { SyncPriority, SyncQueueItem, ProductCacheRow } from './local-types';

const DB_NAME = 'kobina_local';
const conn = new SQLiteConnection(CapacitorSQLite);

const PRIORITY_ORDER: Record<SyncPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

let dbConn: SQLiteDBConnection | null = null;

const MIGRATION_V1 = `
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS produits (
  id TEXT PRIMARY KEY NOT NULL,
  commerce_id TEXT,
  code_barre TEXT,
  payload TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_produits_commerce ON produits(commerce_id);
CREATE INDEX IF NOT EXISTS idx_produits_barcode ON produits(commerce_id, code_barre);

CREATE TABLE IF NOT EXISTS offline_sales (
  id TEXT PRIMARY KEY NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS offline_depenses (
  id TEXT PRIMARY KEY NOT NULL,
  payload TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY NOT NULL,
  priority INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  payload TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cart_items (
  slot_id TEXT PRIMARY KEY NOT NULL,
  payload TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS kv_store (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS loyalty_cards (
  id TEXT PRIMARY KEY NOT NULL,
  payload TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS loyalty_settings (
  commerce_id TEXT PRIMARY KEY NOT NULL,
  payload TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dashboard_cache (
  cache_key TEXT PRIMARY KEY NOT NULL,
  payload TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS offline_messages (
  id TEXT PRIMARY KEY NOT NULL,
  payload TEXT NOT NULL
);
`;

/** Phase 2 : tables / vues logiques offline-first (local_* + crédits en attente). */
const MIGRATION_V2_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS local_credits (
    id TEXT PRIMARY KEY NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'pending'
  )`,
  `CREATE VIEW IF NOT EXISTS local_products AS SELECT id, commerce_id, code_barre, payload, updated_at FROM produits`,
  `CREATE VIEW IF NOT EXISTS local_sales AS SELECT id, payload, created_at FROM offline_sales`,
  `CREATE VIEW IF NOT EXISTS local_expenses AS SELECT id, payload FROM offline_depenses`,
  `CREATE VIEW IF NOT EXISTS local_stock AS SELECT id AS produit_id, commerce_id, payload, updated_at FROM produits`,
];

function parseRows(res: DBSQLiteValues): Record<string, unknown>[] {
  const v = res.values;
  if (!v?.length) return [];
  const first = v[0];
  if (Array.isArray(first)) {
    return [];
  }
  return v as Record<string, unknown>[];
}

function getPayloadColumn(rows: Record<string, unknown>[], col: string): string | null {
  const r = rows[0];
  if (!r || typeof r !== 'object') return null;
  const val = r[col];
  return typeof val === 'string' ? val : null;
}

async function getDb(): Promise<SQLiteDBConnection> {
  if (!dbConn) {
    throw new Error('[sqlite] Base non initialisée — appeler initSqlite()');
  }
  return dbConn;
}

export async function initSqlite(): Promise<void> {
  await conn.checkConnectionsConsistency();
  const isOpen = await conn.isConnection(DB_NAME, false);
  if (isOpen.result) {
    dbConn = await conn.retrieveConnection(DB_NAME, false);
  } else {
    dbConn = await conn.createConnection(DB_NAME, false, 'no-encryption', 1, false);
    await dbConn.open();
  }
  await dbConn.execute(MIGRATION_V1, false);
  for (const stmt of MIGRATION_V2_STATEMENTS) {
    try {
      await dbConn.execute(`${stmt};`, false);
    } catch (e) {
      console.warn('[sqlite] migration v2:', stmt.slice(0, 48), e);
    }
  }
}

export async function cacheProducts(products: ProductCacheRow[]) {
  const db = await getDb();
  await db.execute('DELETE FROM produits;', false);
  const now = Date.now();
  for (const p of products) {
    const id = String(p.id);
    const commerceId = p.commerce_id != null ? String(p.commerce_id) : null;
    const code = p.code_barre != null ? String(p.code_barre) : null;
    await db.run(
      'INSERT INTO produits (id, commerce_id, code_barre, payload, updated_at) VALUES (?,?,?,?,?)',
      [id, commerceId, code, JSON.stringify(p), now],
      false
    );
  }
}

export async function getCachedProducts(): Promise<ProductCacheRow[]> {
  const db = await getDb();
  const res = await db.query('SELECT payload FROM produits;', []);
  const rows = parseRows(res);
  return rows
    .map((row) => {
      const raw = row.payload ?? row.PAYLOAD;
      if (typeof raw !== 'string') return null;
      try {
        return JSON.parse(raw) as ProductCacheRow;
      } catch {
        return null;
      }
    })
    .filter((x): x is ProductCacheRow => x != null && typeof x.id === 'string');
}

export async function getCachedProductByBarcode(
  barcode: string
): Promise<ProductCacheRow | undefined> {
  const db = await getDb();
  const res = await db.query(
    'SELECT payload FROM produits WHERE code_barre = ? LIMIT 1;',
    [barcode]
  );
  const rows = parseRows(res);
  const raw = getPayloadColumn(rows, 'payload') ?? getPayloadColumn(rows, 'PAYLOAD');
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as ProductCacheRow;
  } catch {
    return undefined;
  }
}

export async function updateCachedProductStock(productId: string, newStock: number) {
  const db = await getDb();
  const res = await db.query('SELECT payload FROM produits WHERE id = ? LIMIT 1;', [productId]);
  const rows = parseRows(res);
  const raw = getPayloadColumn(rows, 'payload') ?? getPayloadColumn(rows, 'PAYLOAD');
  if (!raw) return;
  try {
    const obj = JSON.parse(raw) as ProductCacheRow;
    obj.stock = newStock;
    const commerceId = obj.commerce_id != null ? String(obj.commerce_id) : null;
    const code = obj.code_barre != null ? String(obj.code_barre) : null;
    await db.run(
      'UPDATE produits SET payload = ?, code_barre = ?, commerce_id = ?, updated_at = ? WHERE id = ?',
      [JSON.stringify(obj), code, commerceId, Date.now(), productId],
      false
    );
  } catch {
    /* ignore */
  }
}

function priorityNum(p: SyncPriority | undefined): number {
  return PRIORITY_ORDER[p ?? 'normal'] ?? 2;
}

export async function addToSyncQueue(
  item: Omit<SyncQueueItem, 'id' | 'created_at' | 'retries'> & { retries?: number }
): Promise<string | null> {
  const db = await getDb();
  const dedupe_key = item.dedupe_key ?? buildSyncQueueDedupeKey(item);
  const existing = await getSyncQueue();
  const blocks = existing.some((q) => {
    const dk = q.dedupe_key ?? buildSyncQueueDedupeKey(q);
    if (dk !== dedupe_key) return false;
    const st = q.sync_status ?? 'pending';
    if (st === 'pending' || st === 'syncing') return true;
    if (st === 'failed' && (q.retries ?? 0) < MAX_SYNC_ATTEMPTS) return true;
    return false;
  });
  if (blocks) return null;

  const full: SyncQueueItem = {
    ...item,
    id: crypto.randomUUID(),
    retries: item.retries ?? 0,
    created_at: new Date().toISOString(),
    sync_status: item.sync_status ?? 'pending',
    dedupe_key,
  };
  await db.run(
    'INSERT INTO sync_queue (id, priority, created_at, payload) VALUES (?,?,?,?)',
    [full.id, priorityNum(full.priority), full.created_at, JSON.stringify(full)],
    false
  );
  return full.id;
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getDb();
  const res = await db.query('SELECT payload FROM sync_queue ORDER BY priority ASC, created_at ASC;', []);
  const rows = parseRows(res);
  const items: SyncQueueItem[] = [];
  for (const row of rows) {
    const raw = row.payload ?? row.PAYLOAD;
    if (typeof raw !== 'string') continue;
    try {
      items.push(JSON.parse(raw) as SyncQueueItem);
    } catch {
      /* skip */
    }
  }
  return items;
}

export async function getSyncQueueCount(): Promise<number> {
  const db = await getDb();
  const cntRes = await db.query('SELECT COUNT(*) AS c FROM sync_queue;', []);
  const rows = parseRows(cntRes);
  const c = rows[0]?.c ?? rows[0]?.C;
  return typeof c === 'number' ? c : Number(c) || 0;
}

export async function clearSyncQueue() {
  const db = await getDb();
  await db.execute('DELETE FROM sync_queue;', false);
}

export async function removeSyncItem(id: string) {
  const db = await getDb();
  await db.run('DELETE FROM sync_queue WHERE id = ?', [id], false);
}

export async function updateSyncItem(id: string, updates: Partial<SyncQueueItem>) {
  const db = await getDb();
  const res = await db.query('SELECT payload FROM sync_queue WHERE id = ? LIMIT 1;', [id]);
  const rows = parseRows(res);
  const raw = getPayloadColumn(rows, 'payload') ?? getPayloadColumn(rows, 'PAYLOAD');
  if (!raw) return;
  try {
    const item = { ...JSON.parse(raw), ...updates } as SyncQueueItem;
    await db.run(
      'UPDATE sync_queue SET payload = ?, priority = ? WHERE id = ?',
      [JSON.stringify(item), priorityNum(item.priority), id],
      false
    );
  } catch {
    /* ignore */
  }
}

export async function setCache(key: string, data: unknown) {
  const db = await getDb();
  await db.run(
    'INSERT OR REPLACE INTO kv_store (key, value, updated_at) VALUES (?,?,?)',
    [key, JSON.stringify({ data }), Date.now()],
    false
  );
}

export async function getCache<T = unknown>(key: string): Promise<T | null> {
  const db = await getDb();
  const res = await db.query('SELECT value FROM kv_store WHERE key = ? LIMIT 1;', [key]);
  const rows = parseRows(res);
  const raw = getPayloadColumn(rows, 'value') ?? getPayloadColumn(rows, 'VALUE');
  if (!raw) return null;
  try {
    const wrap = JSON.parse(raw) as { data?: T };
    return wrap.data ?? null;
  } catch {
    return null;
  }
}

export async function saveCart(items: Record<string, unknown>[]) {
  const db = await getDb();
  await db.execute('DELETE FROM cart_items;', false);
  let i = 0;
  for (const item of items) {
    await db.run(
      'INSERT INTO cart_items (slot_id, payload) VALUES (?,?)',
      [`c${i++}`, JSON.stringify(item)],
      false
    );
  }
}

export async function getCart(): Promise<Record<string, unknown>[]> {
  const db = await getDb();
  const res = await db.query('SELECT payload FROM cart_items ORDER BY slot_id;', []);
  const rows = parseRows(res);
  const out: Record<string, unknown>[] = [];
  for (const row of rows) {
    const raw = row.payload ?? row.PAYLOAD;
    if (typeof raw !== 'string') continue;
    try {
      out.push(JSON.parse(raw) as Record<string, unknown>);
    } catch {
      /* skip */
    }
  }
  return out;
}

export async function clearOfflineCart() {
  const db = await getDb();
  await db.execute('DELETE FROM cart_items;', false);
}

export async function addOfflineSale(sale: Record<string, unknown>) {
  const db = await getDb();
  const id = typeof sale.id === 'string' ? sale.id : crypto.randomUUID();
  const created = typeof sale.created_at === 'string' ? sale.created_at : new Date().toISOString();
  const payload = {
    ...sale,
    id,
    sync_status: (sale.sync_status as string) || 'pending',
  };
  await db.run(
    'INSERT OR REPLACE INTO offline_sales (id, payload, created_at) VALUES (?,?,?)',
    [id, JSON.stringify(payload), created],
    false
  );
}

export async function updateOfflineSale(id: string, updates: Record<string, unknown>) {
  const db = await getDb();
  const res = await db.query('SELECT payload FROM offline_sales WHERE id = ? LIMIT 1;', [id]);
  const rows = parseRows(res);
  const raw = getPayloadColumn(rows, 'payload') ?? getPayloadColumn(rows, 'PAYLOAD');
  if (!raw) return;
  try {
    const merged = { ...JSON.parse(raw), ...updates };
    await db.run('UPDATE offline_sales SET payload = ? WHERE id = ?', [JSON.stringify(merged), id], false);
  } catch {
    /* ignore */
  }
}

export async function getOfflineSales(): Promise<Record<string, unknown>[]> {
  const db = await getDb();
  const res = await db.query('SELECT payload FROM offline_sales ORDER BY created_at;', []);
  const rows = parseRows(res);
  const out: Record<string, unknown>[] = [];
  for (const row of rows) {
    const raw = row.payload ?? row.PAYLOAD;
    if (typeof raw !== 'string') continue;
    try {
      out.push(JSON.parse(raw) as Record<string, unknown>);
    } catch {
      /* skip */
    }
  }
  return out;
}

export async function removeOfflineSale(id: string) {
  const db = await getDb();
  await db.run('DELETE FROM offline_sales WHERE id = ?', [id], false);
}

export async function addLocalCredit(row: Record<string, unknown>) {
  const db = await getDb();
  const id = typeof row.id === 'string' ? row.id : crypto.randomUUID();
  const created = typeof row.created_at === 'string' ? row.created_at : new Date().toISOString();
  const payload = {
    ...row,
    id,
    sync_status: (row.sync_status as string) || 'pending',
  };
  await db.run(
    'INSERT OR REPLACE INTO local_credits (id, payload, created_at, sync_status) VALUES (?,?,?,?)',
    [id, JSON.stringify(payload), created, String(payload.sync_status)],
    false
  );
}

export async function getLocalCredits(): Promise<Record<string, unknown>[]> {
  const db = await getDb();
  const res = await db.query('SELECT payload FROM local_credits ORDER BY created_at;', []);
  const rows = parseRows(res);
  const out: Record<string, unknown>[] = [];
  for (const row of rows) {
    const raw = row.payload ?? row.PAYLOAD;
    if (typeof raw !== 'string') continue;
    try {
      out.push(JSON.parse(raw) as Record<string, unknown>);
    } catch {
      /* skip */
    }
  }
  return out;
}

export async function updateLocalCredit(id: string, updates: Record<string, unknown>) {
  const db = await getDb();
  const res = await db.query('SELECT payload FROM local_credits WHERE id = ? LIMIT 1;', [id]);
  const rows = parseRows(res);
  const raw = getPayloadColumn(rows, 'payload') ?? getPayloadColumn(rows, 'PAYLOAD');
  if (!raw) return;
  try {
    const merged = { ...JSON.parse(raw), ...updates };
    const st = String(merged.sync_status ?? 'pending');
    await db.run(
      'UPDATE local_credits SET payload = ?, sync_status = ? WHERE id = ?',
      [JSON.stringify(merged), st, id],
      false
    );
  } catch {
    /* ignore */
  }
}

export async function removeLocalCredit(id: string) {
  const db = await getDb();
  await db.run('DELETE FROM local_credits WHERE id = ?', [id], false);
}

export async function getLocalCreditsCount(): Promise<number> {
  const db = await getDb();
  const cntRes = await db.query('SELECT COUNT(*) AS c FROM local_credits;', []);
  const rows = parseRows(cntRes);
  const c = rows[0]?.c ?? rows[0]?.C;
  return typeof c === 'number' ? c : Number(c) || 0;
}

export async function addOfflineDepense(depense: Record<string, unknown>) {
  const db = await getDb();
  const id = typeof depense.id === 'string' ? depense.id : crypto.randomUUID();
  const payload = {
    ...depense,
    id,
    sync_status: (depense.sync_status as string) || 'pending',
  };
  await db.run(
    'INSERT OR REPLACE INTO offline_depenses (id, payload) VALUES (?,?)',
    [id, JSON.stringify(payload)],
    false
  );
}

export async function updateOfflineDepense(id: string, updates: Record<string, unknown>) {
  const db = await getDb();
  const res = await db.query('SELECT payload FROM offline_depenses WHERE id = ? LIMIT 1;', [id]);
  const rows = parseRows(res);
  const raw = getPayloadColumn(rows, 'payload') ?? getPayloadColumn(rows, 'PAYLOAD');
  if (!raw) return;
  try {
    const merged = { ...JSON.parse(raw), ...updates };
    await db.run('UPDATE offline_depenses SET payload = ? WHERE id = ?', [JSON.stringify(merged), id], false);
  } catch {
    /* ignore */
  }
}

export async function getOfflineDepenses(): Promise<Record<string, unknown>[]> {
  const db = await getDb();
  const res = await db.query('SELECT payload FROM offline_depenses;', []);
  const rows = parseRows(res);
  const out: Record<string, unknown>[] = [];
  for (const row of rows) {
    const raw = row.payload ?? row.PAYLOAD;
    if (typeof raw !== 'string') continue;
    try {
      out.push(JSON.parse(raw) as Record<string, unknown>);
    } catch {
      /* skip */
    }
  }
  return out;
}

export async function removeOfflineDepense(id: string) {
  const db = await getDb();
  await db.run('DELETE FROM offline_depenses WHERE id = ?', [id], false);
}

export async function cacheLoyaltyCards(cards: Record<string, unknown>[]) {
  const db = await getDb();
  await db.execute('DELETE FROM loyalty_cards;', false);
  for (const c of cards) {
    const id = String(c.id ?? crypto.randomUUID());
    await db.run(
      'INSERT INTO loyalty_cards (id, payload) VALUES (?,?)',
      [id, JSON.stringify({ ...c, id })],
      false
    );
  }
}

export async function getCachedLoyaltyCards(): Promise<Record<string, unknown>[]> {
  const db = await getDb();
  const res = await db.query('SELECT payload FROM loyalty_cards;', []);
  const rows = parseRows(res);
  const out: Record<string, unknown>[] = [];
  for (const row of rows) {
    const raw = row.payload ?? row.PAYLOAD;
    if (typeof raw !== 'string') continue;
    try {
      out.push(JSON.parse(raw) as Record<string, unknown>);
    } catch {
      /* skip */
    }
  }
  return out;
}

export async function updateCachedLoyaltyCard(cardId: string, updates: Record<string, unknown>) {
  const db = await getDb();
  const res = await db.query('SELECT payload FROM loyalty_cards WHERE id = ? LIMIT 1;', [cardId]);
  const rows = parseRows(res);
  const raw = getPayloadColumn(rows, 'payload') ?? getPayloadColumn(rows, 'PAYLOAD');
  if (!raw) return;
  try {
    const card = { ...JSON.parse(raw), ...updates };
    await db.run(
      'UPDATE loyalty_cards SET payload = ? WHERE id = ?',
      [JSON.stringify(card), cardId],
      false
    );
  } catch {
    /* ignore */
  }
}

export async function cacheLoyaltySettings(settings: Record<string, unknown>) {
  const db = await getDb();
  const commerceId = String(settings.commerce_id ?? '');
  if (!commerceId) return;
  await db.run(
    'INSERT OR REPLACE INTO loyalty_settings (commerce_id, payload) VALUES (?,?)',
    [commerceId, JSON.stringify(settings)],
    false
  );
}

export async function getCachedLoyaltySettings(
  commerceId: string
): Promise<Record<string, unknown> | null> {
  const db = await getDb();
  const res = await db.query(
    'SELECT payload FROM loyalty_settings WHERE commerce_id = ? LIMIT 1;',
    [commerceId]
  );
  const rows = parseRows(res);
  const raw = getPayloadColumn(rows, 'payload') ?? getPayloadColumn(rows, 'PAYLOAD');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function cacheDashboardData(key: string, data: unknown) {
  const db = await getDb();
  await db.run(
    'INSERT OR REPLACE INTO dashboard_cache (cache_key, payload, updated_at) VALUES (?,?,?)',
    [key, JSON.stringify({ data }), Date.now()],
    false
  );
}

export async function getCachedDashboardData<T = unknown>(
  key: string
): Promise<{ data: T; updated_at: number } | null> {
  const db = await getDb();
  const res = await db.query(
    'SELECT payload, updated_at FROM dashboard_cache WHERE cache_key = ? LIMIT 1;',
    [key]
  );
  const rows = parseRows(res);
  if (!rows.length) return null;
  const row = rows[0];
  const raw = row.payload ?? row.PAYLOAD;
  const upd = row.updated_at ?? row.UPDATED_AT;
  if (typeof raw !== 'string') return null;
  try {
    const wrap = JSON.parse(raw) as { data?: T };
    return {
      data: wrap.data as T,
      updated_at: typeof upd === 'number' ? upd : Number(upd) || 0,
    };
  } catch {
    return null;
  }
}

export async function addOfflineMessage(message: Record<string, unknown>) {
  const db = await getDb();
  const id = typeof message.id === 'string' ? message.id : crypto.randomUUID();
  await db.run(
    'INSERT OR REPLACE INTO offline_messages (id, payload) VALUES (?,?)',
    [id, JSON.stringify({ ...message, id })],
    false
  );
}

export async function getOfflineMessages(): Promise<Record<string, unknown>[]> {
  const db = await getDb();
  const res = await db.query('SELECT payload FROM offline_messages;', []);
  const rows = parseRows(res);
  const out: Record<string, unknown>[] = [];
  for (const row of rows) {
    const raw = row.payload ?? row.PAYLOAD;
    if (typeof raw !== 'string') continue;
    try {
      out.push(JSON.parse(raw) as Record<string, unknown>);
    } catch {
      /* skip */
    }
  }
  return out;
}

export async function removeOfflineMessage(id: string) {
  const db = await getDb();
  await db.run('DELETE FROM offline_messages WHERE id = ?', [id], false);
}
