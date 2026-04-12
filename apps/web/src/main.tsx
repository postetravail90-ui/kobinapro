import { createRoot } from "react-dom/client";
import ErrorBoundary from "./components/ErrorBoundary";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "./lib/register-sw";
import { initLocalDataLayer } from "./lib/local/offline-store";
import { initLocalDB } from "@/lib/db";
import { startOfflineFirstSyncEngine, triggerSyncFlush } from "@/lib/sync/engine";
import { startNetworkWatcher } from "@/lib/sync/network";
import { useSyncStore } from "@/store/syncStore";

registerServiceWorker();

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("[Kobina] Élément #root introuvable dans index.html");
}

createRoot(rootEl).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

/** Initialisation hors-ligne après le premier rendu — évite un écran blanc si sql.js / WASM est lent ou bloqué. */
void (async () => {
  try {
    await initLocalDB().catch((e) => {
      console.error("[Kobina] initLocalDB :", e);
    });
    await initLocalDataLayer().catch((e) => {
      console.error("[Kobina] initLocalDataLayer a échoué — poursuite :", e);
    });
  } catch (e) {
    console.error("[Kobina] bootstrap local :", e);
  }

  startNetworkWatcher(
    () => {
      useSyncStore.getState().setOnline(true);
      triggerSyncFlush();
    },
    () => useSyncStore.getState().setOnline(false)
  );
  await useSyncStore.getState().refreshPendingCount();
  await useSyncStore.getState().refreshSyncErrors();
  startOfflineFirstSyncEngine();
})();
