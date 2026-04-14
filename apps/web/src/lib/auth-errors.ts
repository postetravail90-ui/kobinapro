import { Capacitor } from '@capacitor/core';
import { getSupabaseConnectionInfo } from '@/integrations/supabase/client';

type MaybeError = unknown;

/** Vérification rapide de connectivité avant appel auth Supabase. */
export function assertNavigatorOnlineOrThrow(): void {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error(
      'Pas de connexion internet. Connectez-vous une première fois en ligne pour authentifier votre session.'
    );
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
    const allowedUrls = new Set<string>([`${origin}`, `${origin}/**`]);
    if (origin === 'https://localhost' || origin.startsWith('https://localhost:')) {
      // Capacitor Android/iOS utilise souvent cette origine.
      allowedUrls.add('https://localhost');
      allowedUrls.add('https://localhost/**');
    }
    if (import.meta.env.DEV) {
      // Aide explicite pour les tests Vite en local.
      allowedUrls.add('http://localhost:8080');
      allowedUrls.add('http://localhost:8080/**');
    }
    const allowedUrlsText = Array.from(allowedUrls).join(', ');
    return (
      'Impossible de joindre Supabase depuis ce navigateur (réseau, pare-feu ou blocage). ' +
      `Dans Supabase : Authentication → URL configuration, ajoutez ces URLs autorisées : ${allowedUrlsText}. ` +
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
