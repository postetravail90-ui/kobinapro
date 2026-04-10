import type { SyncQueueItem } from '@/lib/local/local-types';

/** Sérialisation stable pour empreinte anti-doublon. */
export function stableSerialize(value: unknown): string {
  const seen = new WeakSet<object>();
  const walk = (v: unknown): unknown => {
    if (v === null || typeof v !== 'object') return v;
    if (seen.has(v as object)) return '[Circular]';
    seen.add(v as object);
    if (Array.isArray(v)) return v.map(walk);
    const o = v as Record<string, unknown>;
    const keys = Object.keys(o).sort();
    const out: Record<string, unknown> = {};
    for (const k of keys) {
      if (k === 'dedupe_key' || k === 'next_retry_at') continue;
      out[k] = walk(o[k]);
    }
    return out;
  };
  return JSON.stringify(walk(value));
}

export function buildSyncQueueDedupeKey(item: {
  table: string;
  action: string;
  payload: Record<string, unknown>;
}): string {
  return `sq:${item.table}:${item.action}:${stableSerialize(item.payload)}`;
}

export function isStockSyncItem(item: SyncQueueItem): boolean {
  if (item.table === 'produits') return true;
  const k = item.payload?._syncLane;
  return k === 'stock';
}

export function partitionSyncQueue(items: SyncQueueItem[]): {
  stock: SyncQueueItem[];
  other: SyncQueueItem[];
} {
  const stock: SyncQueueItem[] = [];
  const other: SyncQueueItem[] = [];
  for (const it of items) {
    if (isStockSyncItem(it)) stock.push(it);
    else other.push(it);
  }
  return { stock, other };
}

/** Erreur Postgres « unique violation » — souvent idempotence côté serveur déjà satisfaite. */
export function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const o = err as { code?: string; message?: string };
  if (o.code === '23505') return true;
  const m = (o.message || '').toLowerCase();
  return m.includes('duplicate key') || m.includes('unique constraint');
}
