import { Capacitor } from '@capacitor/core';
import { getSupabaseConnectionInfo } from '@/integrations/supabase/client';

type MaybeError = unknown;

/**
 * Sur **natif** uniquement : `navigator.onLine` évite des blocages async (plugin Network).
 * Sur **navigateur**, on ne bloque pas : `navigator.onLine` est souvent faux (accès par IP LAN,
 * Windows, onglet restauré, etc.) et affichait « Connexion réseau impossible » alors que le réseau marche.
 */
export function assertNavigatorOnlineOrThrow(): void {
  if (!Capacitor.isNativePlatform()) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('Connexion réseau impossible. Vérifiez Internet puis réessayez.');
  }
}

export function isFetchFailure(err: MaybeError): boolean {
  if (!err) return false;
  const name = err instanceof Error ? err.name : '';
  if (name === 'AbortError') return true;
  if (err instanceof TypeError && /failed to fetch|networkerror|load failed/i.test(err.message)) {
    return true;
  }
  if (typeof err === 'object' && err !== null) {
    const msg = String((err as { message?: unknown }).message || '');
    return /failed to fetch|networkerror|load failed|aborted|abort/i.test(msg);
  }
  return false;
}

/** Message utilisateur quand un fetch vers l’API (ex. Supabase) échoue au niveau réseau. */
export function supabaseFetchFailureHint(): string {
  const { url, hasKey, usingDevPlaceholders } = getSupabaseConnectionInfo();
  if (!url?.trim() || !hasKey || usingDevPlaceholders) {
    return (
      'Impossible de joindre Supabase : renseignez VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY (ou VITE_SUPABASE_ANON_KEY) ' +
      'dans apps/web/.env, enregistrez le fichier, puis redémarrez complètement pnpm dev (Vite n’injecte les variables qu’au démarrage du serveur).'
    );
  }
  if (url.includes('placeholder.supabase.co')) {
    return 'Supabase n’est pas configuré (URL placeholder). Mettez la vraie URL du projet dans apps/web/.env, enregistrez, puis redémarrez pnpm dev.';
  }
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    return (
      'Impossible de joindre Supabase depuis ce navigateur (réseau, pare-feu ou blocage). ' +
      `Dans Supabase : Authentication → URL configuration, ajoutez l’URL exacte utilisée ici (ex. ${origin}/**). ` +
      'Vérifiez aussi que l’URL du projet dans .env correspond bien à ce projet Supabase.'
    );
  }
  return 'Impossible de joindre Supabase. Vérifiez Internet, le pare-feu et la configuration du projet.';
}

export function toAuthUiError(err: MaybeError, fallback: string): string {
  const msg = err instanceof Error ? err.message : String(err || '');
  if (isFetchFailure(err)) {
    if (err instanceof Error && err.name === 'AbortError') {
      return 'Le serveur met trop longtemps à répondre (réseau lent ou serveur chargé). Réessayez, passez en Wi‑Fi ou attendez un peu — ce n’est pas forcément une panne de votre connexion.';
    }
    return supabaseFetchFailureHint();
  }
  if (/invalid login credentials/i.test(msg)) {
    return 'Identifiant ou mot de passe incorrect.';
  }
  if (/email not confirmed/i.test(msg)) {
    return 'Email non confirme. Verifiez votre boite mail.';
  }
  if (msg.includes('delai total') && msg.includes('depasse')) {
    return msg;
  }
  return msg || fallback;
}

/** Compat : plus d’appel réseau async (pouvait ne jamais se résoudre sur certains appareils). */
export async function ensureOnlineOrThrow(): Promise<void> {
  assertNavigatorOnlineOrThrow();
}
