export type SyncOperationType = "INSERT" | "UPDATE" | "DELETE";
export type SyncStatus = "pending" | "syncing" | "error";

export interface SyncOperation {
  id: string;
  table: string;
  operation: SyncOperationType;
  payload: Record<string, unknown>;
  created_at: number;
  retries: number;
  status: SyncStatus;
}

export type ConflictPolicy = "server_wins" | "client_wins_timestamp";

export interface SyncClient {
  pushBatch(
    ops: SyncOperation[],
    options: { conflictPolicyByTable: Record<string, ConflictPolicy> }
  ): Promise<void>;
}

export interface SyncStore {
  writeLocal(op: SyncOperation): Promise<void>;
  listPending(limit: number): Promise<SyncOperation[]>;
  markSynced(ids: string[]): Promise<void>;
  markRetry(id: string, retries: number): Promise<void>;
  markError(id: string): Promise<void>;
  pendingCount(): Promise<number>;
}

export const MAX_BATCH = 50;
export const MAX_RETRIES = 5;
const BASE_RETRY_MS = 1000;
const MAX_RETRY_MS = 30000;

/** Noms de tables Supabase (schéma kobina-main / prod). */
const DEFAULT_CONFLICT_POLICY: Record<string, ConflictPolicy> = {
  produits: "server_wins",
  factures: "client_wins_timestamp",
  depenses: "server_wins",
  credits: "server_wins"
};

function computeBackoffMs(retries: number): number {
  const exp = Math.min(Math.max(retries, 0), 5);
  return Math.min(BASE_RETRY_MS * 2 ** exp, MAX_RETRY_MS);
}

export class OfflineSyncEngine {
  private readonly store: SyncStore;
  private readonly client: SyncClient;
  private readonly conflictPolicyByTable: Record<string, ConflictPolicy>;
  private syncing = false;
  private onPendingCountChanged: ((count: number) => void) | undefined;

  constructor(
    store: SyncStore,
    client: SyncClient,
    options?: {
      conflictPolicyByTable?: Record<string, ConflictPolicy>;
      onPendingCountChanged?: (count: number) => void;
    }
  ) {
    this.store = store;
    this.client = client;
    this.conflictPolicyByTable = {
      ...DEFAULT_CONFLICT_POLICY,
      ...(options?.conflictPolicyByTable ?? {})
    };
    this.onPendingCountChanged = options?.onPendingCountChanged;
  }

  async enqueue(op: SyncOperation): Promise<void> {
    await this.store.writeLocal({ ...op, status: "pending", retries: 0 });
    await this.emitPendingCount();
  }

  async flushOnce(): Promise<void> {
    if (this.syncing) return;
    this.syncing = true;
    try {
      const pending = await this.store.listPending(MAX_BATCH);
      if (pending.length === 0) return;

      const syncingOps = pending.map((op) => ({ ...op, status: "syncing" as const }));
      await this.client.pushBatch(syncingOps, {
        conflictPolicyByTable: this.conflictPolicyByTable
      });
      await this.store.markSynced(syncingOps.map((x) => x.id));
      await this.emitPendingCount();
    } catch (_err) {
      const pending = await this.store.listPending(MAX_BATCH);
      for (const op of pending) {
        const nextRetries = op.retries + 1;
        if (nextRetries >= MAX_RETRIES) {
          await this.store.markError(op.id);
          continue;
        }
        await this.store.markRetry(op.id, nextRetries);
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), computeBackoffMs(nextRetries));
        });
      }
      await this.emitPendingCount();
    } finally {
      this.syncing = false;
    }
  }

  bindAutoSync(): () => void {
    const onlineHandler = () => {
      void this.flushOnce();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("online", onlineHandler);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", onlineHandler);
      }
    };
  }

  private async emitPendingCount(): Promise<void> {
    if (!this.onPendingCountChanged) return;
    const count = await this.store.pendingCount();
    this.onPendingCountChanged(count);
  }
}

export * from "./local-queue-store";
export { openSqliteSyncStore } from "./sqlite-queue-store";
