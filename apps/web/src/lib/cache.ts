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

/** Alias pratique (TTL en ms) — mêmes clés `kobina_v1_*` que `cacheSet` / `cacheGet`. */
export const cache = {
  set(key: string, data: unknown, ttlMs = 1000 * 60 * 60 * 24) {
    cacheSet(key, data, Math.max(1, Math.floor(ttlMs / 1000)));
  },
  get: cacheGet,
  getStale: cacheGetStale,
  set_ts(key: string) {
    try {
      localStorage.setItem(`kobina_${CACHE_VERSION}_ts_${key}`, String(Date.now()));
    } catch {
      /* ignore */
    }
  },
  get_ts(key: string): number {
    try {
      return Number(localStorage.getItem(`kobina_${CACHE_VERSION}_ts_${key}`) ?? 0);
    } catch {
      return 0;
    }
  },
};
