import type { Session } from "@supabase/supabase-js";

/**
 * Lit la session Supabase déjà persistée (localStorage) sans appel réseau.
 * Clés typiques : `sb-<project-ref>-auth-token`.
 */
export function getStoredSupabaseSession(): Session | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith("sb-") && k.endsWith("-auth-token"));
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const inner = (parsed.session ?? parsed.currentSession ?? parsed) as Record<string, unknown> | Session;
      if (inner && typeof inner === "object" && "access_token" in inner && "user" in inner) {
        const u = inner.user as Session["user"];
        if (u?.id) return inner as Session;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}
