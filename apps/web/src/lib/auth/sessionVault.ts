import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";

const KEY = "kobina_offline_session_v1";

export interface SessionVaultPayload {
  access_token: string;
  refresh_token: string;
  /** Unix timestamp (secondes), aligné sur Session Supabase */
  expires_at: number;
  user_id: string;
  email: string | null;
  phone: string | null;
  profile_json: string | null;
  businesses_json: string | null;
  role: string | null;
  /** Dernière fois qu’une session valide a été obtenue en ligne (ms). */
  last_online_at: number;
}

async function readSecureNative(): Promise<string | null> {
  try {
    const { value } = await SecureStoragePlugin.get({ key: KEY });
    return value ?? null;
  } catch {
    return null;
  }
}

/** Ancien emplacement (Preferences) → migrer vers le stockage sécurisé une seule fois. */
async function migrateLegacyPreferencesToSecure(): Promise<SessionVaultPayload | null> {
  try {
    const { value } = await Preferences.get({ key: KEY });
    if (!value) return null;
    await SecureStoragePlugin.set({ key: KEY, value });
    await Preferences.remove({ key: KEY });
    return JSON.parse(value) as SessionVaultPayload;
  } catch {
    return null;
  }
}

export async function readVault(): Promise<SessionVaultPayload | null> {
  try {
    if (Capacitor.isNativePlatform()) {
      const secure = await readSecureNative();
      if (secure) return JSON.parse(secure) as SessionVaultPayload;
      return migrateLegacyPreferencesToSecure();
    }
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    return raw ? (JSON.parse(raw) as SessionVaultPayload) : null;
  } catch {
    return null;
  }
}

export async function writeVault(payload: SessionVaultPayload): Promise<void> {
  const s = JSON.stringify(payload);
  if (Capacitor.isNativePlatform()) {
    await SecureStoragePlugin.set({ key: KEY, value: s });
    await Preferences.remove({ key: KEY });
  } else if (typeof localStorage !== "undefined") {
    localStorage.setItem(KEY, s);
  }
}

/**
 * Lecture synchrone du coffre web (localStorage uniquement) pour amorcer l’UI sans attendre le réseau.
 * Sur natif, retourne null — utiliser `readVault()`.
 */
export function readVaultSync(): SessionVaultPayload | null {
  if (Capacitor.isNativePlatform()) return null;
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    return raw ? (JSON.parse(raw) as SessionVaultPayload) : null;
  } catch {
    return null;
  }
}

export async function clearVault(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await SecureStoragePlugin.remove({ key: KEY });
    } catch {
      /* clé absente */
    }
    await Preferences.remove({ key: KEY });
  } else if (typeof localStorage !== "undefined") {
    localStorage.removeItem(KEY);
  }
}
