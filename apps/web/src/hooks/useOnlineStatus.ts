import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * État réseau : sur natif Capacitor, utilise @capacitor/network (plus fiable qu’online/offline seuls).
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    let cancelled = false;
    let removeListener: (() => void) | undefined;

    const useCapNetwork = async () => {
      const { Network } = await import('@capacitor/network');
      const status = await Network.getStatus();
      if (!cancelled) setIsOnline(status.connected);
      const h = await Network.addListener('networkStatusChange', (s) => {
        if (!cancelled) setIsOnline(s.connected);
      });
      removeListener = () => {
        void h.remove();
      };
    };

    if (Capacitor.isNativePlatform()) {
      void useCapNetwork();
      return () => {
        cancelled = true;
        removeListener?.();
      };
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
