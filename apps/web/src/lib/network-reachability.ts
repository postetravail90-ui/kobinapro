import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';

const NETWORK_CHECK_MS = 5_000;

/**
 * Indique si le terminal peut joindre Internet.
 * Import statique (pas de `import()` dynamique) pour éviter un chargement de chunk bloqué sur WebView.
 */
export async function isNetworkReachable(): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      const s = await Promise.race([
        Network.getStatus(),
        new Promise<{ connected: boolean }>((resolve) =>
          setTimeout(() => resolve({ connected: true }), NETWORK_CHECK_MS)
        ),
      ]);
      return s.connected;
    }
  } catch {
    /* fallback */
  }
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}
