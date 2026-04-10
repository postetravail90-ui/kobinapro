import { supabase } from "@/integrations/supabase/client";
import { ensureSyncEngine } from "@/lib/sync";

/** Tables pour les INSERT simples file + Supabase (aligné schéma prod). */
export type OfflineInsertTable = "produits" | "depenses";

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

  const { data, error } = await supabase.from(table).insert({ id, ...payload }).select("*").single();

  if (error) {
    return { error: new Error(error.message), data: null };
  }

  await engine.flushOnce();
  return { error: null, data: data as T | null };
}
