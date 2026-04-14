/**
 * File Dexie séparée de `sync/queue.ts` (SQLite) — pour évolutions futures sans casser la sync actuelle.
 */
import { dexieDb, type LocalSyncQueue } from "@/lib/db/dexie-indexed-db";

function uuid(): string {
  return crypto.randomUUID();
}

const RETRY_DELAYS = [2000, 5000, 15000, 30000, 60000];

export const dexieOutboundQueue = {
  async enqueue(op: {
    table_name: string;
    operation: "INSERT" | "UPDATE" | "DELETE";
    payload: string;
    local_id: string;
    server_id?: string;
  }): Promise<void> {
    const row: LocalSyncQueue = {
      id: uuid(),
      ...op,
      created_at: Date.now(),
      retries: 0,
      next_retry_at: Date.now(),
      status: "pending",
    };
    await dexieDb.dexie_sync_queue.add(row);
  },

  async getPending(): Promise<LocalSyncQueue[]> {
    const now = Date.now();
    const rows = await dexieDb.dexie_sync_queue
      .where("status")
      .anyOf(["pending", "error"])
      .filter((item) => item.next_retry_at <= now)
      .toArray();
    rows.sort((a, b) => a.created_at - b.created_at);
    return rows;
  },

  async count(): Promise<number> {
    const now = Date.now();
    return dexieDb.dexie_sync_queue
      .where("status")
      .anyOf(["pending", "error"])
      .filter((item) => item.next_retry_at <= now)
      .count();
  },

  async markSynced(id: string): Promise<void> {
    await dexieDb.dexie_sync_queue.delete(id);
  },

  async markError(id: string, error: string): Promise<void> {
    const item = await dexieDb.dexie_sync_queue.get(id);
    if (!item) return;
    const retries = item.retries + 1;
    const delay = RETRY_DELAYS[Math.min(retries - 1, RETRY_DELAYS.length - 1)] ?? 60_000;
    await dexieDb.dexie_sync_queue.update(id, {
      status: retries >= 5 ? "error" : "pending",
      error_message: error,
      retries,
      next_retry_at: Date.now() + delay,
    });
  },
};
