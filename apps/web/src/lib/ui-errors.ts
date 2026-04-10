export function toUiErrorMessage(err: unknown, fallback = 'Une erreur est survenue'): string {
  const msg = err instanceof Error ? err.message : String(err || '');
  if (/failed to fetch|networkerror|load failed/i.test(msg)) {
    return 'Connexion reseau impossible. Verifiez Internet puis reessayez.';
  }
  return msg || fallback;
}
