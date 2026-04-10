import { Capacitor } from "@capacitor/core";
import { Network } from "@capacitor/network";

/**
 * Surveille la connectivité : navigateur (`online` / `offline`) + plugin Capacitor sur natif.
 * Les callbacks sont aussi invoqués une fois au démarrage selon l’état courant.
 */
export function startNetworkWatcher(onOnline: () => void, onOffline: () => void): void {
  if (typeof window !== "undefined") {
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    if (typeof navigator !== "undefined" && navigator.onLine) {
      onOnline();
    } else {
      onOffline();
    }
  }

  if (Capacitor.isNativePlatform()) {
    void Network.addListener("networkStatusChange", (status) => {
      if (status.connected) {
        onOnline();
      } else {
        onOffline();
      }
    });
  }
}
