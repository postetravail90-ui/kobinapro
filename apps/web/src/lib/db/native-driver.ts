import { CapacitorSQLite, SQLiteConnection } from "@capacitor-community/sqlite";
import type { DBSQLiteValues, SQLiteDBConnection } from "@capacitor-community/sqlite";
import type { LocalDbDriver } from "./types";

const DB_NAME = "kobina_unified";
const sqlite = new SQLiteConnection(CapacitorSQLite);

function parseRows(res: DBSQLiteValues): Record<string, unknown>[] {
  const v = res.values;
  if (!v?.length) return [];
  const first = v[0];
  if (Array.isArray(first)) return [];
  return v as Record<string, unknown>[];
}

let conn: SQLiteDBConnection | null = null;

async function getConn(): Promise<SQLiteDBConnection> {
  if (conn) return conn;
  await sqlite.checkConnectionsConsistency();
  const isOpen = await sqlite.isConnection(DB_NAME, false);
  if (isOpen.result) {
    conn = await sqlite.retrieveConnection(DB_NAME, false);
  } else {
    conn = await sqlite.createConnection(DB_NAME, false, "no-encryption", 1, false);
    await conn.open();
  }
  return conn;
}

export async function createNativeDriver(): Promise<LocalDbDriver> {
  const db = await getConn();

  return {
    kind: "capacitor",
    execScript: async (sql: string) => {
      await db.execute(sql, false);
    },
    run: async (sql: string, params?: unknown[]) => {
      await db.run(sql, (params ?? []) as (string | number | null)[], false);
    },
    all: async <T extends Record<string, unknown> = Record<string, unknown>>(
      sql: string,
      params?: unknown[]
    ) => {
      const res = await db.query(sql, (params ?? []) as (string | number | null)[]);
      return parseRows(res) as T[];
    },
    get: async <T extends Record<string, unknown> = Record<string, unknown>>(
      sql: string,
      params?: unknown[]
    ) => {
      const rows = await db.query(sql, (params ?? []) as (string | number | null)[]);
      const parsed = parseRows(rows);
      return parsed[0] as T | undefined;
    },
    transaction: async <T>(fn: () => Promise<T>) => {
      await db.execute("BEGIN IMMEDIATE;", false);
      try {
        const r = await fn();
        await db.execute("COMMIT;", false);
        return r;
      } catch (e) {
        await db.execute("ROLLBACK;", false);
        throw e;
      }
    },
    close: async () => {
      /* La connexion reste ouverte pour toute la durée de l’app. */
    }
  };
}
