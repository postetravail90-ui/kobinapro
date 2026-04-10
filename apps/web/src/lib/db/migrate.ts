import type { LocalDbDriver } from "./types";
import { MIGRATION_001, SCHEMA_VERSION } from "./schema";

export async function applyMigrations(driver: LocalDbDriver): Promise<void> {
  const marker = await driver.get<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='users'`
  );
  if (!marker) {
    await driver.execScript(MIGRATION_001);
    await driver.run("INSERT INTO _schema_migrations (version, applied_at) VALUES (?, ?)", [
      SCHEMA_VERSION,
      Date.now()
    ]);
    return;
  }

  const row = await driver.get<{ v: number | null }>("SELECT MAX(version) as v FROM _schema_migrations");
  const current = row?.v ?? 0;
  if (current >= SCHEMA_VERSION) return;
  // Migrations incrémentales futures : exécuter le DDL puis insérer la version.
  await driver.run("INSERT INTO _schema_migrations (version, applied_at) VALUES (?, ?)", [
    SCHEMA_VERSION,
    Date.now()
  ]);
}
