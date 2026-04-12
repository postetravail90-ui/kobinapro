import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kobinapro.app',
  appName: 'kobina-pro',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    /** Débogage : chrome://inspect — désactiver pour release. */
    webContentsDebuggingEnabled: true
  }
};

export default config;
