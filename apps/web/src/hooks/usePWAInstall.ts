import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';

interface PWAInstallState {
  /** The deferred prompt is available and install can be triggered */
  canInstall: boolean;
  /** App is already running as installed PWA or standalone */
  isStandalone: boolean;
  /** Device is iOS (Safari doesn't support beforeinstallprompt) */
  isIOS: boolean;
  /** Install was triggered and user accepted */
  installed: boolean;
  /** Trigger native install prompt */
  install: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

export function usePWAInstall(): PWAInstallState {
  const deferredPrompt = useRef<any>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installed, setInstalled] = useState(false);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Sur Android/iOS natif (Capacitor), l'app est déjà installée.
      setIsStandalone(true);
      setCanInstall(false);
      setInstalled(true);
      return;
    }

    // Check standalone mode
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    if (standalone) {
      console.log('[PWA] App is running in standalone mode');
      return;
    }

    // Listen for the install prompt
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e;
      setCanInstall(true);
      console.log('[PWA] beforeinstallprompt captured ✓');
    };

    // Listen for successful install
    const onAppInstalled = () => {
      console.log('[PWA] App installed successfully ✓');
      setInstalled(true);
      setCanInstall(false);
      deferredPrompt.current = null;
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);

    // Also listen for display-mode changes
    const mq = window.matchMedia('(display-mode: standalone)');
    const onDisplayChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsStandalone(true);
        setCanInstall(false);
      }
    };
    mq.addEventListener('change', onDisplayChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
      mq.removeEventListener('change', onDisplayChange);
    };
  }, []);

  const install = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredPrompt.current) {
      console.log('[PWA] No deferred prompt available');
      return 'unavailable';
    }

    console.log('[PWA] Triggering install prompt...');
    deferredPrompt.current.prompt();

    const { outcome } = await deferredPrompt.current.userChoice;
    console.log('[PWA] User choice:', outcome);

    if (outcome === 'accepted') {
      setInstalled(true);
      setIsStandalone(true);
      setCanInstall(false);
    }

    deferredPrompt.current = null;
    setCanInstall(false);
    return outcome;
  }, []);

  return { canInstall, isStandalone, isIOS, installed, install };
}
