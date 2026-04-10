import { supabase } from "@/integrations/supabase/client";
import { ensureBusinessLocalId } from "@/lib/data/business";

function defaultCommerceName(ownerName: string): string {
  const t = ownerName.trim();
  if (t.length > 0) return `${t} Commerce`;
  return "Mon commerce";
}

/** Crée un commerce par défaut si le propriétaire n’en a aucun (silencieux, en ligne uniquement). */
export async function ensureDefaultCommerce(userId: string, ownerName: string): Promise<string | null> {
  const { data: existing, error: e0 } = await supabase
    .from("commerces")
    .select("id")
    .eq("proprietaire_id", userId)
    .limit(1)
    .maybeSingle();

  if (e0) {
    if (import.meta.env.DEV) console.warn("[ensureDefaultCommerce] select", e0);
    return null;
  }
  if (existing?.id) return existing.id;

  const nom = defaultCommerceName(ownerName);
  const { data: created, error: e1 } = await supabase
    .from("commerces")
    .insert({
      proprietaire_id: userId,
      nom,
      type: "autre",
      statut: "actif",
    })
    .select("id, nom")
    .single();

  if (e1) {
    if (import.meta.env.DEV) console.warn("[ensureDefaultCommerce] insert", e1);
    return null;
  }

  if (created?.id) {
    try {
      await ensureBusinessLocalId(created.id, created.nom ?? nom);
    } catch {
      // SQLite optionnel (web / hors Capacitor) — ne bloque pas la création Supabase
    }
  }

  return created?.id ?? null;
}

/**
 * Garantit au moins un gérant actif par commerce (RPC process_sale).
 * Si aucun gérant : enregistrement technique propriétaire = vendeur, invisible dans l’UI gérants.
 */
export async function ensureOwnerGerantForCommerce(commerceId: string, ownerUserId: string): Promise<void> {
  const { data: anyGerant, error: e0 } = await supabase
    .from("gerants")
    .select("id")
    .eq("commerce_id", commerceId)
    .eq("actif", true)
    .limit(1)
    .maybeSingle();

  if (e0) {
    if (import.meta.env.DEV) console.warn("[ensureOwnerGerantForCommerce] select", e0);
    return;
  }
  if (anyGerant) return;

  const { error: e1 } = await supabase.from("gerants").insert({
    commerce_id: commerceId,
    user_id: ownerUserId,
    actif: true,
  });

  if (e1 && import.meta.env.DEV) console.warn("[ensureOwnerGerantForCommerce] insert", e1);
}

export async function ensureOwnerGerantsForProprietaireCommerces(
  commerceIds: string[],
  ownerUserId: string
): Promise<void> {
  if (commerceIds.length === 0) return;
  await Promise.all(commerceIds.map((id) => ensureOwnerGerantForCommerce(id, ownerUserId)));
}
