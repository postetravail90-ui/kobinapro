import { getDb } from "@/lib/db";

/** Retourne `local_id` pour un commerce Supabase (`commerces.id`), crée la ligne si besoin. */
export async function ensureBusinessLocalId(serverCommerceId: string, name?: string | null): Promise<string> {
  const db = getDb();
  const row = await db.get<{ local_id: string }>(
    "SELECT local_id FROM businesses WHERE server_id = ? AND deleted_at IS NULL",
    [serverCommerceId]
  );
  if (row?.local_id) return row.local_id;

  const localId = crypto.randomUUID();
  const now = Date.now();
  await db.run(
    `INSERT INTO businesses (local_id, server_id, sync_status, updated_at, deleted_at, name)
     VALUES (?, ?, 'synced', ?, NULL, ?)`,
    [localId, serverCommerceId, now, name ?? null]
  );
  return localId;
}
