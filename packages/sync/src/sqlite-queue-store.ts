import type { SQLiteDBConnection } from "@capacitor-community/sqlite";
import type { SyncOperation, SyncStore } from "./index";

/**
 * Queue SQLite (Capacitor). Import dynamique pour ne pas casser le bundle web.
 * peer: `@capacitor-community/sqlite`
 */
export async function openSqliteSyncStore(connectionName = "kobina_sync_queue"): Promise<SyncStore> {
  const { CapacitorSQLite, SQLiteConnection } = await import("@capacitor-community/sqlite");

  const sqlite = new SQLiteConnection(CapacitorSQLite);

  const existing = await sqlite.isConnection(connectionName, false);
  let db: SQLiteDBConnection;
  if (existing.result) {
    db = await sqlite.retrieveConnection(connectionName, false);
  } else {
    db = await sqlite.createConnection(connectionName, false, "no-encryption", 1, false);
    await db.open();
  }

  await db.execute(
    `
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY NOT NULL,
      table_name TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      retries INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL
    );
  `,
    false,
    true
  );

  const parseRows = (values: unknown[] | undefined): SyncOperation[] => {
    if (!values?.length) return [];
    const out: SyncOperation[] = [];
    for (const row of values) {
      if (!Array.isArray(row) || row.length < 7) continue;
      const op: SyncOperation = {
        id: String(row[0]),
        table: String(row[1]),
        operation: row[2] as SyncOperation["operation"],
        payload: JSON.parse(String(row[3])) as Record<string, unknown>,
        created_at: Number(row[4]),
        retries: Number(row[5]),
        status: row[6] as SyncOperation["status"]
      };
      out.push(op);
    }
    return out;
  };

  return {
    async writeLocal(op: SyncOperation): Promise<void> {
      await db.run(
        `INSERT OR REPLACE INTO sync_queue (id, table_name, operation, payload, created_at, retries, status)
         VALUES (?,?,?,?,?,?,?)`,
        [op.id, op.table, op.operation, JSON.stringify(op.payload), op.created_at, op.retries, op.status]
      );
    },

    async listPending(limit: number): Promise<SyncOperation[]> {
      const res = await db.query(
        `SELECT id, table_name, operation, payload, created_at, retries, status
         FROM sync_queue
         WHERE status IN ('pending','syncing')
         ORDER BY created_at ASC
         LIMIT ?`,
        [limit]
      );
      return parseRows(res.values);
    },

    async markSynced(ids: string[]): Promise<void> {
      if (ids.length === 0) return;
      const placeholders = ids.map(() => "?").join(",");
      await db.run(`DELETE FROM sync_queue WHERE id IN (${placeholders})`, ids);
    },

    async markRetry(id: string, retries: number): Promise<void> {
      await db.run(`UPDATE sync_queue SET retries = ?, status = 'pending' WHERE id = ?`, [retries, id]);
    },

    async markError(id: string): Promise<void> {
      await db.run(`UPDATE sync_queue SET status = 'error' WHERE id = ?`, [id]);
    },

    async pendingCount(): Promise<number> {
      const res = await db.query(
        `SELECT COUNT(*) FROM sync_queue WHERE status IN ('pending','syncing')`,
        []
      );
      const v = res.values?.[0];
      const cell = Array.isArray(v) ? v[0] : undefined;
      return typeof cell === "number" ? cell : Number(cell ?? 0);
    }
  };
}
