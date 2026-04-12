import type { AppRole } from "@/lib/auth-role";
import { cacheGet, cacheGetStale, cacheSet } from "@/lib/cache";

const TTL_SEC = 60 * 60 * 24 * 14;

export function appRoleCacheKey(userId: string): string {
  return `app_role:${userId}`;
}

export function readCachedAppRole(userId: string): AppRole | null {
  return cacheGet<AppRole>(appRoleCacheKey(userId));
}

export function readCachedAppRoleStale(userId: string): AppRole | null {
  return cacheGetStale<AppRole>(appRoleCacheKey(userId));
}

export function writeCachedAppRole(userId: string, role: AppRole | null): void {
  if (!role) return;
  cacheSet(appRoleCacheKey(userId), role, TTL_SEC);
}
