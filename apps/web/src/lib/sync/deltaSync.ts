/**
 * Synchronisation incrémentale en arrière-plan : pousse la file locale puis ré-importe les miroirs Supabase.
 * Ne bloque jamais l’UI.
 */
import { triggerSyncFlush } from "@/lib/sync/engine";
import { pullProductsFromRemote } from "@/lib/data/products";
import { pullExpensesFromRemote } from "@/lib/data/expenses";
import { pullCreditsFromRemote } from "@/lib/data/credits";
import { initLocalDB } from "@/lib/db";

export async function deltaSync(commerceServerIds: string[]): Promise<void> {
  if (commerceServerIds.length === 0) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  try {
    triggerSyncFlush();
    await initLocalDB();
    await Promise.all([
      pullProductsFromRemote(commerceServerIds),
      pullExpensesFromRemote(commerceServerIds),
      pullCreditsFromRemote(commerceServerIds),
    ]);
  } catch (e) {
    console.warn("[DeltaSync]", e);
  }
}
