import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSyncStore } from "@/store/syncStore";
import { processQueue } from "@/lib/sync/queue";
import { toast } from "sonner";

/**
 * Bandeau d’état sync : hors ligne + file d’attente, sync en cours, ou bref « synchronisé ».
 * Les erreurs de file affichent un toast non bloquant avec action « Réessayer ».
 */
export default function SyncStatusBar() {
  const { isOnline, isSyncing, pendingCount, syncErrors, refreshPendingCount, refreshSyncErrors } =
    useSyncStore();
  const [showGreen, setShowGreen] = useState(false);
  const prevSyncing = useRef(false);
  const errorToastKey = useRef("");

  useEffect(() => {
    void refreshPendingCount();
    void refreshSyncErrors();
    const id = setInterval(() => {
      void refreshPendingCount();
      void refreshSyncErrors();
    }, 15_000);
    return () => clearInterval(id);
  }, [refreshPendingCount, refreshSyncErrors]);

  const offlinePending = !isOnline && pendingCount > 0;

  useEffect(() => {
    if (isSyncing || offlinePending) setShowGreen(false);
  }, [isSyncing, offlinePending]);

  useEffect(() => {
    if (prevSyncing.current && !isSyncing && isOnline && pendingCount === 0 && syncErrors.length === 0) {
      setShowGreen(true);
      const t = setTimeout(() => setShowGreen(false), 3000);
      return () => clearTimeout(t);
    }
    prevSyncing.current = isSyncing;
  }, [isSyncing, isOnline, pendingCount, syncErrors.length]);

  useEffect(() => {
    if (syncErrors.length === 0) {
      errorToastKey.current = "";
      return;
    }
    const key = [...syncErrors.map((e) => e.id)].sort().join(",");
    if (key === errorToastKey.current) return;
    errorToastKey.current = key;
    toast.error(`${syncErrors.length} opération(s) ont échoué. Vérifiez votre connexion.`, {
      duration: 20_000,
      action: {
        label: "Réessayer",
        onClick: () => {
          void processQueue();
          void useSyncStore.getState().refreshSyncErrors();
          void useSyncStore.getState().refreshPendingCount();
        }
      }
    });
  }, [syncErrors]);

  type Mode = "yellow" | "red" | "green" | null;
  let mode: Mode = null;
  if (isSyncing) mode = "yellow";
  else if (offlinePending) mode = "red";
  else if (showGreen) mode = "green";

  if (!mode) return null;

  const className =
    mode === "yellow"
      ? "bg-amber-500/15 border-amber-500/30 text-amber-950 dark:text-amber-100"
      : mode === "red"
        ? "bg-destructive/15 border-destructive/30 text-destructive"
        : "bg-emerald-500/15 border-emerald-500/30 text-emerald-900 dark:text-emerald-100";

  const label =
    mode === "yellow"
      ? "🟡 Synchronisation en cours..."
      : mode === "red"
        ? `🔴 Hors ligne — ${pendingCount} opération(s) en attente`
        : "🟢 Synchronisé";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={mode}
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className={`border-b px-4 py-2 text-center text-sm font-medium ${className}`}
      >
        {label}
      </motion.div>
    </AnimatePresence>
  );
}
