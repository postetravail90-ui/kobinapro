import { supabase } from "@/integrations/supabase/client";
import { ensureSyncEngine } from "@/lib/sync";

/**
 * Tables pour les INSERT file + Supabase.
 * Schéma prod : `produits`, `depenses`. Les autres noms viennent de pages legacy / démo.
 */
export type OfflineInsertTable = string;

/**
 * Enfile une opération puis tente l’INSERT tout de suite.
 * En cas d’échec réseau, l’entrée reste en queue (@kobina/sync) pour retry.
 */
export async function createWithOfflineQueue<T extends Record<string, unknown> = Record<string, unknown>>(
  table: OfflineInsertTable,
  payload: Record<string, unknown>
): Promise<{ error: Error | null; data: T | null }> {
  const engine = await ensureSyncEngine();
  const id = crypto.randomUUID();
  const now = Date.now();

  await engine.enqueue({
    id,
    table,
    operation: "INSERT",
    payload: { id, ...payload },
    created_at: now,
    retries: 0,
    status: "pending"
  });

  const row = { id, ...payload };
  // Table dynamique (schéma prod + pages legacy) — le client typé n'accepte qu'un union fini.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).from(table).insert(row).select("*").single();

  if (error) {
    return { error: new Error(error.message), data: null };
  }

  await engine.flushOnce();
  return { error: null, data: data as unknown as T | null };
}
