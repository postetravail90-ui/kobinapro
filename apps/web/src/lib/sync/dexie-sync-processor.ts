/**
 * Traitement optionnel de la file Dexie — n’interfère pas avec `sync/engine.ts`.
 */
import { supabase } from "@/integrations/supabase/client";
import { dexieOutboundQueue } from "@/lib/sync/dexie-outbound-queue";
import type { LocalSyncQueue } from "@/lib/db/dexie-indexed-db";

function chunk<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
}

let dexieSyncRunning = false;

export async function runDexieSyncProcessor(): Promise<void> {
  if (dexieSyncRunning || typeof navigator !== "undefined" && !navigator.onLine) return;
  dexieSyncRunning = true;
  try {
    const pending = await dexieOutboundQueue.getPending();
    if (!pending.length) return;

    for (const batch of chunk(pending, 10)) {
      await Promise.allSettled(batch.map((op) => processOneDexieOp(op)));
    }
  } finally {
    dexieSyncRunning = false;
  }
}

async function processOneDexieOp(op: LocalSyncQueue): Promise<void> {
  try {
    const payload = JSON.parse(op.payload) as Record<string, unknown>;

    switch (op.operation) {
      case "INSERT":
      case "UPDATE": {
        const { error } = await supabase
          .from(op.table_name)
          .upsert(payload, { onConflict: "id", ignoreDuplicates: false });
        if (error) throw error;
        break;
      }
      case "DELETE": {
        const id = String(payload.id ?? "");
        const { error } = await supabase
          .from(op.table_name)
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
        break;
      }
      default:
        break;
    }

    await dexieOutboundQueue.markSynced(op.id);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await dexieOutboundQueue.markError(op.id, msg);
  }
}
