import { useState, useEffect } from 'react';
import { X, Download, Smartphone, Share } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { toast } from 'sonner';

export default function InstallBanner() {
  const { canInstall, isStandalone, isIOS, installed, install } = usePWAInstall();
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isStandalone || installed || dismissed) return;

    // Check 7-day dismiss cooldown
    const dismissedAt = localStorage.getItem('pwa_install_dismissed');
    if (dismissedAt && Date.now() - parseInt(dismissedAt, 10) < 7 * 24 * 60 * 60 * 1000) {
      setDismissed(true);
      return;
    }

    // Show banner after delay when install is possible or on iOS
    if (canInstall || isIOS) {
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [canInstall, isIOS, isStandalone, installed, dismissed]);

  const handleInstall = async () => {
    if (canInstall) {
      const result = await install();
      if (result === 'accepted') {
        setShow(false);
        toast.success('Application installée ! 🎉');
      }
    } else if (isIOS) {
      toast(
        <div className="flex items-start gap-2">
          <Share size={18} className="text-primary mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Installation sur iOS</p>
            <p className="text-xs text-muted-foreground mt-1">
              Appuyez sur <strong>Partager</strong> (⬆️) puis <strong>"Sur l'écran d'accueil"</strong>
            </p>
          </div>
        </div>,
        { duration: 8000 }
      );
    }
  };

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    localStorage.setItem('pwa_install_dismissed', Date.now().toString());
  };

  if (isStandalone || installed || !show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-[68px] lg:bottom-4 left-3 right-3 z-40 max-w-md mx-auto"
      >
        <div className="bg-card border border-border rounded-2xl p-4 shadow-lg flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Smartphone size={22} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Installer KOBINA PRO</p>
            <p className="text-xs text-muted-foreground">
              {isIOS
                ? 'Utilisez Partager → Écran d\'accueil'
                : 'Accédez plus vite depuis votre écran d\'accueil'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstall}
              className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-transform"
            >
              <Download size={14} /> {isIOS ? 'Guide' : 'Installer'}
            </button>
            <button
              onClick={handleDismiss}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
