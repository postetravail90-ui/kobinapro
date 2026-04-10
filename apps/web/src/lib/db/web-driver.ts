import initSqlJs, { type Database } from "sql.js";
import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import type { LocalDbDriver } from "./types";

export async function createWebDriver(): Promise<LocalDbDriver> {
  const SQL = await initSqlJs({
    locateFile: (file: string) => (file.endsWith("sql-wasm.wasm") ? sqlWasmUrl : file)
  });
  const db = new SQL.Database();

  const run = async (sql: string, params?: unknown[]) => {
    if (params?.length) {
      db.run(sql, params as (string | number | Uint8Array | null)[]);
    } else {
      db.run(sql);
    }
  };

  const all = async <T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<T[]> => {
    const stmt = db.prepare(sql);
    try {
      if (params?.length) {
        stmt.bind(params as (string | number | Uint8Array | null)[]);
      }
      const out: T[] = [];
      while (stmt.step()) {
        out.push(stmt.getAsObject() as T);
      }
      return out;
    } finally {
      stmt.free();
    }
  };

  const get = async <T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<T | undefined> => {
    const rows = await all<T>(sql, params);
    return rows[0];
  };

  return {
    kind: "sqljs",
    execScript: async (sql: string) => {
      db.exec(sql);
    },
    run,
    all,
    get,
    async transaction<T>(fn: () => Promise<T>): Promise<T> {
      await run("BEGIN IMMEDIATE");
      try {
        const r = await fn();
        await run("COMMIT");
        return r;
      } catch (e) {
        await run("ROLLBACK");
        throw e;
      }
    },
    async close() {
      db.close();
    }
  };
}
