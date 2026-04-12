import type { User } from "@supabase/supabase-js";

const KEY = (userId: string) => `kbv1:user:${userId}`;

export interface LocalUserProfileSnapshot {
  id: string;
  email?: string | null;
  phone?: string | null;
  user_metadata?: User["user_metadata"];
  app_metadata?: User["app_metadata"];
  cachedAt: number;
}

export function writeLocalUserProfile(user: User): void {
  if (typeof localStorage === "undefined" || !user?.id) return;
  try {
    const snap: LocalUserProfileSnapshot = {
      id: user.id,
      email: user.email,
      phone: user.phone,
      user_metadata: user.user_metadata,
      app_metadata: user.app_metadata,
      cachedAt: Date.now(),
    };
    localStorage.setItem(KEY(user.id), JSON.stringify(snap));
  } catch {
    /* quota / private */
  }
}

/** Profil minimal pour enrichir la session locale sans réseau. */
export function readLocalUserProfile(userId: string): LocalUserProfileSnapshot | null {
  if (typeof localStorage === "undefined" || !userId) return null;
  try {
    const raw = localStorage.getItem(KEY(userId));
    if (!raw) return null;
    return JSON.parse(raw) as LocalUserProfileSnapshot;
  } catch {
    return null;
  }
}

export function clearLocalUserProfile(userId: string): void {
  if (typeof localStorage === "undefined" || !userId) return;
  try {
    localStorage.removeItem(KEY(userId));
  } catch {
    /* ignore */
  }
}

export function mergeUserWithLocalProfile(user: User): User {
  const local = readLocalUserProfile(user.id);
  if (!local) return user;
  return {
    ...user,
    email: user.email ?? local.email ?? undefined,
    phone: user.phone ?? local.phone ?? undefined,
    user_metadata: { ...local.user_metadata, ...user.user_metadata },
    app_metadata: { ...local.app_metadata, ...user.app_metadata },
  } as User;
}
