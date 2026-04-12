import { useEffect, useState } from 'react';
import { WifiOff, CloudOff, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useSyncStore } from '@/store/syncStore';
import { offlineQueue } from '@/lib/offline-queue';

/** Avertissements session / mode hors ligne (détails sync : `SyncStatusBar`). */
export default function OfflineBanner() {
  const { isOnline, pendingCount: syncPending } = useSyncStore();
  const { isOfflineMode, softSessionWarning } = useAuth();
  const [lsPending, setLsPending] = useState(0);

  useEffect(() => {
    const tick = () => setLsPending(offlineQueue.count());
    tick();
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, [isOnline]);

  const pendingExtra = syncPending + lsPending;

  return (
    <AnimatePresence>
      {(isOfflineMode || !isOnline) && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-warning/15 border-b border-warning/30 px-4 py-2 flex items-center justify-between text-sm font-medium text-warning-foreground"
        >
          <div className="flex items-center gap-2">
            <WifiOff size={14} />
            <span>
              {isOfflineMode
                ? 'Session locale (réseau indisponible ou jeton expiré)'
                : pendingExtra > 0
                  ? `Mode hors ligne — ${pendingExtra} opération(s) en attente de synchronisation`
                  : 'Mode hors ligne — données affichées en cache local'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CloudOff size={12} />
            <span>Synchronisation automatique au retour du réseau</span>
          </div>
        </motion.div>
      )}

      {isOnline && lsPending > 0 && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-success/10 border-b border-success/25 px-4 py-2 text-sm text-success text-center font-medium"
        >
          Connexion rétablie — synchronisation des actions hors ligne…
        </motion.div>
      )}

      {softSessionWarning && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="bg-amber-500/10 border-b border-amber-500/25 px-4 py-2 flex items-center gap-2 text-sm text-amber-900 dark:text-amber-100"
        >
          <AlertTriangle size={14} className="shrink-0" />
          <span>
            Votre session n’a pas été rafraîchie en ligne depuis longtemps. Connectez-vous à Internet pour
            renforcer la sécurité du compte.
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
