import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Plugins natifs (installés côté @kobina/web + @kobina/mobile pour `cap sync`) :
 * - @capacitor/network — connectivité
 * - @capacitor/app — premier plan / arrière-plan
 * - capacitor-secure-storage-plugin — jetons de session (Keychain / Keystore)
 * - @capacitor-community/sqlite — SQLite embarqué
 * Web : sql.js (fallback PWA), voir `apps/web/src/lib/db/web-driver.ts`.
 */
const config: CapacitorConfig = {
  appId: "pro.kobina.app",
  appName: "KOBINA PRO",
  webDir: "../web/dist",
  server: {
    androidScheme: "https"
  },
  plugins: {
    CapacitorSQLite: {
      iosDatabaseLocation: "Library/CapacitorDatabase",
      iosIsEncryption: false,
      androidIsEncryption: false,
      electronIsEncryption: false
    }
  }
};

export default config;
