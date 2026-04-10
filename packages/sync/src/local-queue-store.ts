import type { SyncOperation, SyncStore } from "./index";

const KEY = "kobina_sync_queue_v1";

function readQueue(): SyncOperation[] {
  if (typeof localStorage === "undefined") return [];
  const raw = localStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SyncOperation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: SyncOperation[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(queue));
}

export class LocalQueueStore implements SyncStore {
  async writeLocal(op: SyncOperation): Promise<void> {
    const queue = readQueue();
    queue.push(op);
    writeQueue(queue);
  }

  async listPending(limit: number): Promise<SyncOperation[]> {
    return readQueue()
      .filter((op) => op.status === "pending" || op.status === "syncing")
      .sort((a, b) => a.created_at - b.created_at)
      .slice(0, limit);
  }

  async markSynced(ids: string[]): Promise<void> {
    const idSet = new Set(ids);
    const queue = readQueue().filter((op) => !idSet.has(op.id));
    writeQueue(queue);
  }

  async markRetry(id: string, retries: number): Promise<void> {
    const queue = readQueue().map((op) =>
      op.id === id ? { ...op, retries, status: "pending" as const } : op
    );
    writeQueue(queue);
  }

  async markError(id: string): Promise<void> {
    const queue = readQueue().map((op) =>
      op.id === id ? { ...op, status: "error" as const } : op
    );
    writeQueue(queue);
  }

  async pendingCount(): Promise<number> {
    return readQueue().filter((op) => op.status === "pending" || op.status === "syncing").length;
  }
}
