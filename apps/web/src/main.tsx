import { createRoot } from "react-dom/client";
import ErrorBoundary from "./components/ErrorBoundary";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./lib/register-sw";
import { initLocalDataLayer } from "./lib/local/offline-store";
import { initLocalDB } from "@/lib/db";
import { startOfflineFirstSyncEngine, triggerSyncFlush } from "@/lib/sync/engine";
import { startNetworkWatcher } from "@/lib/sync/network";
import { useSyncStore } from "@/store/syncStore";

registerServiceWorker();

void initLocalDB()
  .catch((e) => {
    console.error("[Kobina] initLocalDB :", e);
  })
  .then(() =>
    initLocalDataLayer().catch((e) => {
      console.error("[Kobina] initLocalDataLayer a échoué — démarrage de l’app quand même :", e);
    })
  )
  .then(async () => {
    startNetworkWatcher(
      () => {
        useSyncStore.getState().setOnline(true);
        triggerSyncFlush();
      },
      () => useSyncStore.getState().setOnline(false)
    );
    await useSyncStore.getState().refreshPendingCount();
    await useSyncStore.getState().refreshSyncErrors();

    createRoot(document.getElementById("root")!).render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
    startOfflineFirstSyncEngine();
  });
