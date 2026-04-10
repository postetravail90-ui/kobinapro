import { useEffect, useRef, useState, useCallback } from 'react';
import { processQueue as runSync } from '@/lib/sync-processor';
import {
  getSyncQueueCount,
  getOfflineSales,
  getOfflineDepenses,
  getOfflineMessages,
  getLocalCreditsCount,
} from '@/lib/offline-db';
import { useOnlineStatus } from './useOnlineStatus';
import { toast } from 'sonner';

export function useSyncEngine() {
  const isOnline = useOnlineStatus();
  const syncing = useRef(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const updateCount = useCallback(async () => {
    const count = await getSyncQueueCount();
    const sales = (await getOfflineSales()).length;
    const depenses = (await getOfflineDepenses()).length;
    const messages = (await getOfflineMessages()).length;
    const credits = await getLocalCreditsCount();
    setPendingCount(count + sales + depenses + messages + credits);
  }, []);

  const processQueue = useCallback(async () => {
    if (syncing.current || !isOnline) return;
    syncing.current = true;

    try {
      const synced = await runSync();
      if (synced > 0) {
        toast.success(`${synced} action(s) synchronisée(s) ✓`, {
          description: 'Données hors-ligne envoyées au serveur',
        });
        setLastSync(new Date());
      }
    } finally {
      syncing.current = false;
      await updateCount();
    }
  }, [updateCount, isOnline]);

  // Auto sync when coming back online
  useEffect(() => {
    if (isOnline) {
      void processQueue();
    }
    void updateCount();
  }, [isOnline, processQueue, updateCount]);

  // Periodic retry every 30s when online
  useEffect(() => {
    if (!isOnline) return;
    const interval = setInterval(() => {
      void processQueue();
      void updateCount();
    }, 30000);
    return () => clearInterval(interval);
  }, [isOnline, processQueue, updateCount]);

  // Update count periodically
  useEffect(() => {
    const interval = setInterval(() => void updateCount(), 5000);
    return () => clearInterval(interval);
  }, [updateCount]);

  return { isOnline, processQueue, pendingCount, lastSync };
}
