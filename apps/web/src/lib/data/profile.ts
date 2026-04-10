import { supabase } from "@/integrations/supabase/client";

/** Nom affiché profil — uniquement via couche data (pas dans les composants). */
export async function getProfileDisplayName(userId: string): Promise<string> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return "";
  }
  const { data } = await supabase.from("profiles").select("nom").eq("id", userId).single();
  return data?.nom?.trim() || "";
}

export async function getProfileNamesMap(userIds: string[]): Promise<Record<string, string>> {
  const uniq = [...new Set(userIds.filter(Boolean))];
  if (uniq.length === 0) return {};
  if (typeof navigator !== "undefined" && !navigator.onLine) return {};
  const { data } = await supabase.from("profiles").select("id, nom").in("id", uniq);
  const map: Record<string, string> = {};
  data?.forEach((p) => {
    if (p.id && p.nom) map[p.id] = p.nom;
  });
  return map;
}
