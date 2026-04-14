import { useEffect, useRef } from "react";
import { queryClient } from "@/lib/query-client";
import { triggerSyncFlush } from "@/lib/sync/engine";
import { offlineQueue } from "@/lib/offline-queue";
import { runDexieSyncProcessor } from "@/lib/sync/dexie-sync-processor";

/** Au retour réseau : file localStorage + flush SQLite + file Dexie optionnelle + invalidation React Query. */
export function useNetworkSync(): void {
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const flush = async () => {
      await offlineQueue.processAll();
      triggerSyncFlush();
      void runDexieSyncProcessor();
      await queryClient.invalidateQueries();
    };

    const handleOnline = () => {
      void flush();
    };

    window.addEventListener("online", handleOnline);
    intervalRef.current = setInterval(() => {
      if (navigator.onLine) void runDexieSyncProcessor();
    }, 30_000);
    if (navigator.onLine) void runDexieSyncProcessor();

    return () => {
      window.removeEventListener("online", handleOnline);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);
}
