import { processQueue } from './sync-processor';

export function registerServiceWorker() {
  // En dev, le SW casse Vite (/@vite/client, HMR, modules). On désinscrit les SW résiduels.
  if (import.meta.env.DEV) {
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const r of regs) void r.unregister();
      });
    }
    return;
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');

        // Register Background Sync if supported
        if ('sync' in reg) {
          // Will be triggered when we go back online
          await (reg as any).sync.register('sync-data').catch(() => {});
        }

        // Listen for sync requests from SW
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'SYNC_REQUESTED') {
            processQueue();
          }
        });
      } catch {
        // SW registration failed — not critical
      }
    });
  }
}

// Re-register background sync whenever we queue offline data
export async function requestBackgroundSync() {
  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.ready;
    if ('sync' in reg) {
      await (reg as any).sync.register('sync-data').catch(() => {});
    }
  }
}
