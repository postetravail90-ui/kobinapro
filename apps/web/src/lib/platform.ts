import { Capacitor } from '@capacitor/core';

/**
 * Platform detection utility for KOBINA PRO
 * Detects whether the app runs as Web, PWA, or Desktop (Tauri)
 */

export type AppPlatform = 'web' | 'pwa' | 'desktop' | 'android' | 'ios';

/** Check if running inside Tauri desktop wrapper */
export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

/** Check if running as installed PWA */
export const isPWA = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
};

/** Get the current platform */
export const getPlatform = (): AppPlatform => {
  if (Capacitor.isNativePlatform()) {
    const platform = Capacitor.getPlatform();
    if (platform === 'android' || platform === 'ios') return platform;
  }
  if (isTauri()) return 'desktop';
  if (isPWA()) return 'pwa';
  return 'web';
};

/** Human-readable platform label */
export const getPlatformLabel = (): string => {
  switch (getPlatform()) {
    case 'desktop': return 'Windows Desktop';
    case 'android': return 'Application Android';
    case 'ios': return 'Application iOS';
    case 'pwa': return 'Application installée (PWA)';
    case 'web': return 'Navigateur Web';
  }
};

/** App version — synced with package.json & tauri.conf.json */
export const APP_VERSION = '1.0.0';

/** App name */
export const APP_NAME = 'KOBINA PRO';

/** Windows download URL */
export const WINDOWS_DOWNLOAD_URL = 'https://www.kobinapro.com/downloads/KOBINA-PRO-Setup.exe';

/** Check if desktop notifications are available */
export const supportsDesktopNotifications = (): boolean => {
  if (isTauri()) return true;
  return 'Notification' in window;
};

/** Check if we should show desktop-optimized UI */
export const isDesktopMode = (): boolean => {
  if (Capacitor.isNativePlatform()) return false;
  return isTauri() || window.innerWidth >= 1024;
};

/** Send a desktop notification (works on both Tauri & Web) */
export const sendDesktopNotification = async (title: string, body: string): Promise<void> => {
  if (isTauri()) {
    try {
      // Dynamic import — only resolves inside Tauri runtime
      const tauri = (window as any).__TAURI__;
      if (tauri?.notification) {
        const granted = await tauri.notification.isPermissionGranted();
        if (!granted) await tauri.notification.requestPermission();
        tauri.notification.sendNotification({ title, body });
      }
    } catch {
      // Tauri API not available
    }
    return;
  }

  // Web/PWA fallback
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' });
  } else if (Notification.permission !== 'denied') {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  }
};
