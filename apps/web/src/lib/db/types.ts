/** Pilote SQLite unifié (sql.js web / Capacitor natif). */
export interface LocalDbDriver {
  readonly kind: "sqljs" | "capacitor";
  /** Exécute un script SQL multi-instructions (CREATE TABLE, etc.). */
  execScript(sql: string): Promise<void>;
  run(sql: string, params?: unknown[]): Promise<void>;
  /** Retourne des objets { col: val } (noms de colonnes en minuscules si possible). */
  all<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<T[]>;
  get<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<T | undefined>;
  transaction<T>(fn: () => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
