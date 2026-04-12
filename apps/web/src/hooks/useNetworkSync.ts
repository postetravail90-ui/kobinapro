import { useEffect } from "react";
import { queryClient } from "@/lib/query-client";
import { triggerSyncFlush } from "@/lib/sync/engine";
import { offlineQueue } from "@/lib/offline-queue";

/** Au retour réseau : file localStorage + flush SQLite + rafraîchissement React Query. */
export function useNetworkSync(): void {
  useEffect(() => {
    const handleOnline = async () => {
      await offlineQueue.processAll();
      triggerSyncFlush();
      await queryClient.invalidateQueries();
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);
}
