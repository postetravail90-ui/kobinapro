type MaybeError = unknown;

/** Vérification synchrone uniquement — évite tout blocage async (plugin Network / import dynamique) sur Android. */
export function assertNavigatorOnlineOrThrow(): void {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('Connexion reseau impossible. Verifiez Internet puis reessayez.');
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

export function toAuthUiError(err: MaybeError, fallback: string): string {
  const msg = err instanceof Error ? err.message : String(err || '');
  if (isFetchFailure(err)) {
    if (err instanceof Error && err.name === 'AbortError') {
      return 'Le serveur met trop longtemps a repondre (reseau lent ou serveur charge). Reessayez, passez en Wi-Fi, ou attendez un peu — ce nest pas forcement une panne de votre connexion.';
    }
    return 'Connexion reseau impossible. Verifiez Internet puis reessayez.';
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
