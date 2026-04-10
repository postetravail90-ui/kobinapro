import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/auth-role";
import * as vault from "./sessionVault";

export interface OfflineBootResult {
  session: Session;
  user: User;
  role: AppRole | null;
  /** Pas de réseau ou JWT expiré : on continue avec les données du coffre. */
  isOfflineMode: boolean;
  /** JWT expiré depuis longtemps : l’accès reste autorisé mais l’UI peut afficher un bandeau. */
  softSessionWarning: boolean;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function minimalUser(v: vault.SessionVaultPayload): User {
  return {
    id: v.user_id,
    aud: "authenticated",
    role: "authenticated",
    email: v.email ?? undefined,
    phone: v.phone ?? undefined,
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  } as User;
}

function syntheticSession(v: vault.SessionVaultPayload, user: User): Session {
  const nowSec = Math.floor(Date.now() / 1000);
  const exp = typeof v.expires_at === "number" ? v.expires_at : nowSec + 3600;
  return {
    access_token: v.access_token,
    refresh_token: v.refresh_token,
    token_type: "bearer",
    expires_in: Math.max(60, exp - nowSec),
    expires_at: exp,
    user
  } as Session;
}

/**
 * Restaure une session utilisable sans attendre le réseau (coffre + optionnellement refresh en ligne).
 */
export async function bootSession(): Promise<OfflineBootResult | null> {
  const raw = await vault.readVault();
  if (!raw?.access_token || !raw.user_id) {
    return null;
  }

  const user = minimalUser(raw);
  const online = typeof navigator !== "undefined" && navigator.onLine;
  const nowSec = Math.floor(Date.now() / 1000);

  if (online && raw.expires_at <= nowSec) {
    const { data, error } = await supabase.auth.setSession({
      access_token: raw.access_token,
      refresh_token: raw.refresh_token
    });
    if (!error && data.session && data.session.user) {
      await persistSession(data.session, data.session.user, raw.role as AppRole | null);
      return {
        session: data.session,
        user: data.session.user,
        role: (raw.role as AppRole) ?? null,
        isOfflineMode: false,
        softSessionWarning: false
      };
    }
  }

  if (raw.expires_at > nowSec) {
    const session = syntheticSession(raw, user);
    return {
      session,
      user,
      role: (raw.role as AppRole) ?? null,
      isOfflineMode: !online,
      softSessionWarning: false
    };
  }

  const softOk = Date.now() - raw.last_online_at <= THIRTY_DAYS_MS;
  const session = syntheticSession(raw, user);
  return {
    session,
    user,
    role: (raw.role as AppRole) ?? null,
    isOfflineMode: true,
    softSessionWarning: !softOk
  };
}

export async function persistSession(session: Session, user: User, role: AppRole | null): Promise<void> {
  const exp =
    session.expires_at != null
      ? session.expires_at
      : Math.floor(Date.now() / 1000) + (session.expires_in ?? 3600);
  await vault.writeVault({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: exp,
    user_id: user.id,
    email: user.email ?? null,
    phone: user.phone ?? null,
    profile_json: null,
    businesses_json: null,
    role: role ?? null,
    last_online_at: Date.now()
  });
}

export async function clearSession(): Promise<void> {
  await vault.clearVault();
}

export async function isSessionValid(): Promise<boolean> {
  const v = await vault.readVault();
  if (!v?.access_token) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  if (v.expires_at > nowSec) return true;
  return Date.now() - v.last_online_at <= THIRTY_DAYS_MS;
}
