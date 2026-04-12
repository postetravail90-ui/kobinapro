import { getDb, tryGetDb } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";

let debouncedFlush: ReturnType<typeof setTimeout> | null = null;
function scheduleProcessDebounced(): void {
  if (debouncedFlush) clearTimeout(debouncedFlush);
  debouncedFlush = setTimeout(() => {
    debouncedFlush = null;
    void processQueue();
  }, 2000);
}

export interface SyncOperation {
  id: string;
  table: string;
  operation: "INSERT" | "UPDATE" | "DELETE";
  payload: Record<string, unknown>;
  local_id: string;
  server_id: string | null;
  created_at: number;
  retries: number;
  status: "pending" | "syncing" | "error";
  error_message: string | null;
}

function rowToOp(r: Record<string, unknown>): SyncOperation {
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(String(r.payload ?? "{}")) as Record<string, unknown>;
  } catch {
    payload = {};
  }
  return {
    id: String(r.id),
    table: String(r.table_name),
    operation: r.operation as SyncOperation["operation"],
    payload,
    local_id: String(r.local_id),
    server_id: r.server_id != null ? String(r.server_id) : null,
    created_at: Number(r.created_at),
    retries: Number(r.retries ?? 0),
    status: r.status as SyncOperation["status"],
    error_message: r.error_message != null ? String(r.error_message) : null
  };
}

export async function enqueue(
  op: Omit<SyncOperation, "id" | "created_at" | "retries" | "status" | "error_message">
): Promise<void> {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = Date.now();
  await db.run(
    `INSERT INTO sync_queue (id, table_name, operation, payload, local_id, server_id, created_at, retries, status, error_message)
     VALUES (?,?,?,?,?,?,?,0,'pending',NULL)`,
    [
      id,
      op.table,
      op.operation,
      JSON.stringify(op.payload),
      op.local_id,
      op.server_id,
      now
    ]
  );
  scheduleProcessDebounced();
}

export async function getPendingCount(): Promise<number> {
  const db = tryGetDb();
  if (!db) return 0;
  const row = await db.get<{ c: number }>(
    "SELECT COUNT(*) as c FROM sync_queue WHERE status IN ('pending','syncing')"
  );
  return row?.c ?? 0;
}

/** Inclut `error` pour ne jamais abandonner une opération : retry automatique à chaque flush. */
export async function listPending(limit = 50): Promise<SyncOperation[]> {
  const db = tryGetDb();
  if (!db) return [];
  const rows = await db.all<Record<string, unknown>>(
    "SELECT * FROM sync_queue WHERE status IN ('pending','error') ORDER BY created_at ASC LIMIT ?",
    [limit]
  );
  return rows.map(rowToOp);
}

export async function markSynced(id: string): Promise<void> {
  const db = getDb();
  await db.run("DELETE FROM sync_queue WHERE id = ?", [id]);
}

export async function markError(id: string, message: string, retries: number): Promise<void> {
  const db = getDb();
  await db.run(
    "UPDATE sync_queue SET status = 'error', error_message = ?, retries = ? WHERE id = ?",
    [message, retries, id]
  );
}

export async function markRetry(id: string, nextRetries: number): Promise<void> {
  const db = getDb();
  await db.run("UPDATE sync_queue SET status = 'pending', retries = ? WHERE id = ?", [nextRetries, id]);
}

export async function clearSynced(): Promise<void> {
  const db = getDb();
  await db.run("DELETE FROM sync_queue WHERE status = 'synced'");
}

export async function listErrors(limit = 50): Promise<SyncOperation[]> {
  const db = tryGetDb();
  if (!db) return [];
  const rows = await db.all<Record<string, unknown>>(
    "SELECT * FROM sync_queue WHERE status = 'error' ORDER BY created_at DESC LIMIT ?",
    [limit]
  );
  return rows.map(rowToOp);
}

export async function resetErrorToPending(id: string): Promise<void> {
  const db = getDb();
  await db.run(
    "UPDATE sync_queue SET status = 'pending', error_message = NULL WHERE id = ?",
    [id]
  );
}

/** Traite la file (à brancher sur l’Edge `sync-batch` ou appels Supabase directs). */
export async function processQueue(): Promise<void> {
  if (!tryGetDb()) return;
  const pending = await listPending(50);
  if (pending.length === 0) return;

  const endpoint = import.meta.env.VITE_SYNC_BATCH_ENDPOINT;
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  for (const op of pending) {
    if (endpoint && token) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            operations: [
              {
                id: op.id,
                table: op.table,
                operation: op.operation,
                payload: op.payload,
                created_at: op.created_at,
                retries: op.retries,
                status: "syncing"
              }
            ]
          })
        });
        if (res.ok) {
          await markSynced(op.id);
          continue;
        }
        await markError(op.id, `HTTP ${res.status}`, op.retries + 1);
      } catch (e) {
        await markError(op.id, e instanceof Error ? e.message : "sync error", op.retries + 1);
      }
    } else {
      /* Pas d’endpoint : on garde les entrées pour un sync ultérieur sans erreur bloquante. */
      break;
    }
  }
}
