import { forwardRef } from 'react';
import { Monitor, Globe, Smartphone, Download, RefreshCw, Info, Keyboard, ExternalLink, Share } from 'lucide-react';
import {
  APP_VERSION,
  APP_NAME,
  WINDOWS_DOWNLOAD_URL,
  getPlatform,
  getPlatformLabel,
  isTauri,
  isDesktopMode,
  getTauriGlobal,
} from '@/lib/platform';
import { Button } from '@/components/ui/button';
import { useState, useCallback } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { toast } from 'sonner';

const AppInfoSection = forwardRef<HTMLDivElement>((_, ref) => {
  const platform = getPlatform();
  const { canInstall, isIOS, isStandalone, installed, install } = usePWAInstall();
  const [checking, setChecking] = useState(false);
  const [updateResult, setUpdateResult] = useState<string | null>(null);

  const handleInstallPWA = useCallback(async () => {
    if (canInstall) {
      const result = await install();
      if (result === 'accepted') toast.success('Application installée ! 🎉');
    } else if (isIOS) {
      toast(
        <div className="flex items-start gap-2">
          <Share size={18} className="text-primary mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Installation sur iOS</p>
            <p className="text-xs text-muted-foreground mt-1">
              Appuyez sur <strong>Partager</strong> puis <strong>"Sur l'écran d'accueil"</strong>
            </p>
          </div>
        </div>,
        { duration: 6000 }
      );
    }
  }, [canInstall, isIOS, install]);

  const handleCheckUpdate = useCallback(async () => {
    setChecking(true);
    setUpdateResult(null);

    if (isTauri()) {
      try {
        const tauri = getTauriGlobal();
        if (tauri?.updater) {
          const { shouldUpdate } = await tauri.updater.checkUpdate();
          setUpdateResult(shouldUpdate ? 'Mise à jour disponible ! Redémarrez l\'app.' : 'Vous êtes à jour ✓');
        } else {
          setUpdateResult('Updater non disponible');
        }
      } catch {
        setUpdateResult('Impossible de vérifier les mises à jour');
      }
    } else {
      await new Promise(r => setTimeout(r, 1500));
      setUpdateResult('Version web toujours à jour ✓');
    }
    setChecking(false);
  }, []);

  const PlatformIcon = platform === 'desktop' ? Monitor : platform === 'pwa' || platform === 'android' || platform === 'ios' ? Smartphone : Globe;

  const platformBadgeColor = {
    desktop: 'bg-info/10 text-info',
    android: 'bg-success/10 text-success',
    ios: 'bg-success/10 text-success',
    pwa: 'bg-warning/10 text-warning-foreground',
    web: 'bg-primary/10 text-primary',
  }[platform];

  const showInstallButton = platform === 'web' && !isStandalone && !installed && (canInstall || isIOS);

  return (
    <div ref={ref} className="space-y-4">
      {/* App Identity */}
      <div className="bg-card rounded-xl p-5 border border-border space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Info size={22} className="text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-foreground text-lg">{APP_NAME}</h2>
            <p className="text-xs text-muted-foreground">Gestion de commerce professionnelle</p>
          </div>
        </div>

        {/* Version & Mode */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Version</p>
            <p className="text-sm font-bold text-foreground">v{APP_VERSION}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Mode</p>
            <div className="flex items-center gap-1.5">
              <PlatformIcon size={14} className="text-muted-foreground" />
              <p className="text-sm font-bold text-foreground">
                {platform === 'desktop'
                  ? 'Desktop'
                  : platform === 'pwa'
                    ? 'PWA'
                    : platform === 'android'
                      ? 'Android'
                      : platform === 'ios'
                        ? 'iOS'
                        : 'Web'}
              </p>
            </div>
          </div>
        </div>

        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${platformBadgeColor}`}>
          <PlatformIcon size={12} />
          {getPlatformLabel()}
        </div>
      </div>

      {/* Actions */}
      <div className="bg-card rounded-xl p-4 border border-border space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Actions</h3>

        <Button variant="outline" size="sm" className="w-full gap-2 justify-start" onClick={handleCheckUpdate} disabled={checking}>
          <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
          {checking ? 'Vérification...' : 'Vérifier les mises à jour'}
        </Button>
        {updateResult && (
          <p className="text-xs text-muted-foreground pl-1">{updateResult}</p>
        )}

        {showInstallButton && (
          <Button variant="outline" size="sm" className="w-full gap-2 justify-start" onClick={handleInstallPWA}>
            <Download size={14} />
            {isIOS ? "Installer l'app (guide iOS)" : "Installer l'application (PWA)"}
          </Button>
        )}

        {platform !== 'desktop' && (
          <Button variant="outline" size="sm" className="w-full gap-2 justify-start" asChild>
            <a href={WINDOWS_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">
              <Monitor size={14} />
              Télécharger KOBINA PRO pour Windows
              <ExternalLink size={10} className="ml-auto opacity-50" />
            </a>
          </Button>
        )}
      </div>

      {/* Keyboard shortcuts */}
      {isDesktopMode() && (
        <div className="bg-card rounded-xl p-4 border border-border space-y-3">
          <div className="flex items-center gap-2">
            <Keyboard size={14} className="text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Raccourcis clavier</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['Ctrl + 1', 'Dashboard'],
              ['Ctrl + 2', 'Produits'],
              ['Ctrl + 3', 'Dépenses'],
              ['Ctrl + 4', 'Vente'],
              ['Ctrl + 5', 'Messages'],
              ['Ctrl + P', 'Paramètres'],
              ['Ctrl + N', 'Notifications'],
              ['F11', 'Plein écran'],
            ].map(([key, label]) => (
              <div key={key} className="flex items-center gap-2 text-xs">
                <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[10px] border border-border">
                  {key}
                </kbd>
                <span className="text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-muted/30 rounded-xl p-3 space-y-1">
        <p className="text-[10px] text-muted-foreground">
          © 2024 KOBINA PRO · Tous droits réservés
        </p>
        <p className="text-[10px] text-muted-foreground">
          Plateforme : {getPlatformLabel()} · Version {APP_VERSION}
        </p>
      </div>
    </div>
  );
});

AppInfoSection.displayName = 'AppInfoSection';

export default AppInfoSection;
