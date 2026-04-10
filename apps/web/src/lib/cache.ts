const CACHE_VERSION = "v1";

export function cacheSet(key: string, data: unknown, ttlSeconds = 3600): void {
  try {
    localStorage.setItem(
      `kobina_${CACHE_VERSION}_${key}`,
      JSON.stringify({
        data,
        cachedAt: Date.now(),
        expiresAt: Date.now() + ttlSeconds * 1000
      })
    );
  } catch {
    /* quota / private mode */
  }
}

export function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`kobina_${CACHE_VERSION}_${key}`);
    if (!raw) return null;
    const { data, expiresAt } = JSON.parse(raw) as { data: T; expiresAt: number };
    if (Date.now() > expiresAt) return null;
    return data as T;
  } catch {
    return null;
  }
}

/** Données même expirées — repli hors ligne / erreur réseau. */
export function cacheGetStale<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`kobina_${CACHE_VERSION}_${key}`);
    if (!raw) return null;
    return (JSON.parse(raw) as { data: T }).data;
  } catch {
    return null;
  }
}

export function cacheClear(key: string): void {
  try {
    localStorage.removeItem(`kobina_${CACHE_VERSION}_${key}`);
  } catch {
    /* ignore */
  }
}
