import { Capacitor } from "@capacitor/core";
import type { LocalDbDriver } from "./types";
import { applyMigrations } from "./migrate";

let driver: LocalDbDriver | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Ouvre la base SQLite unifiée (sql.js en PWA / SQLite natif sur device),
 * applique les migrations, puis rend le contrôle — **sans aucun appel réseau**.
 */
export async function initLocalDB(): Promise<void> {
  if (initPromise) {
    await initPromise;
    return;
  }
  initPromise = (async () => {
    if (driver) return;
    if (Capacitor.isNativePlatform()) {
      const { createNativeDriver } = await import("./native-driver");
      driver = await createNativeDriver();
    } else {
      const { createWebDriver } = await import("./web-driver");
      driver = await createWebDriver();
    }
    await applyMigrations(driver);
    if (import.meta.env.DEV) {
      console.info("[Kobina DB] initLocalDB OK —", driver.kind);
    }
  })().catch((e) => {
    initPromise = null;
    throw e;
  });
  await initPromise;
}

export function getDb(): LocalDbDriver {
  if (!driver) {
    throw new Error("[db] initLocalDB() doit être appelé avant getDb()");
  }
  return driver;
}

export function tryGetDb(): LocalDbDriver | null {
  return driver;
}

export type { LocalDbDriver } from "./types";
