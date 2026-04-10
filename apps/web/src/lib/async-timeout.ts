/** Filet de sécurité si une promesse ne se termine jamais (WebView / réseau capricieux). */
export function withUiTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            `${label} : delai total ${Math.round(ms / 60_000)} min depasse. Reessayez en Wi-Fi ou plus tard (reseau mobile tres lent).`
          )
        );
      }, ms);
    }),
  ]);
}
