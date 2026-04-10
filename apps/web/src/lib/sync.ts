import {
  LocalQueueStore,
  OfflineSyncEngine,
  openSqliteSyncStore,
  type ConflictPolicy,
  type SyncClient,
  type SyncOperation,
  type SyncStore
} from "@kobina/sync";
import { Capacitor } from "@capacitor/core";
import { useOfflineStore } from "@/stores/offline-store";
import { supabase } from "@/integrations/supabase/client";

class EdgeSyncClient implements SyncClient {
  async pushBatch(
    ops: SyncOperation[],
    options: { conflictPolicyByTable: Record<string, ConflictPolicy> }
  ): Promise<void> {
    const endpoint = import.meta.env.VITE_SYNC_BATCH_ENDPOINT;
    if (!endpoint) {
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ operations: ops, conflictPolicy: options.conflictPolicyByTable })
    });
    if (!response.ok) {
      throw new Error(`sync failed (${response.status})`);
    }
  }
}

let initPromise: Promise<OfflineSyncEngine> | null = null;

async function pickQueueStore(): Promise<SyncStore> {
  try {
    if (Capacitor.isNativePlatform()) {
      return await openSqliteSyncStore();
    }
  } catch (err) {
    console.warn("[sync] SQLite indisponible, retour au localStorage", err);
  }
  return new LocalQueueStore();
}

async function createEngine(): Promise<OfflineSyncEngine> {
  const store = await pickQueueStore();
  const client = new EdgeSyncClient();
  return new OfflineSyncEngine(store, client, {
    onPendingCountChanged: (count) => useOfflineStore.getState().setPendingCount(count)
  });
}

/**
 * Initialise une seule fois le moteur (SQLite natif ou localStorage web).
 */
export function ensureSyncEngine(): Promise<OfflineSyncEngine> {
  if (!initPromise) {
    initPromise = createEngine().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

export async function initOfflineSyncBindings(): Promise<() => void> {
  const engine = await ensureSyncEngine();

  const onOnline = () => useOfflineStore.getState().setOffline(false);
  const onOffline = () => useOfflineStore.getState().setOffline(true);
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  const unbindAutoSync = engine.bindAutoSync();
  void engine.flushOnce();

  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
    unbindAutoSync();
  };
}
