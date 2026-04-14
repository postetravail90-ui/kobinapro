import type { User } from "@supabase/supabase-js";
import type { AppRole } from "@/lib/auth-role";
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
    const msg = String(e1.message || "");
    const dup =
      (e1 as { code?: string }).code === "23505" ||
      /duplicate|unique|already exists/i.test(msg);
    if (dup) {
      const { data: again, error: e2 } = await supabase
        .from("commerces")
        .select("id")
        .eq("proprietaire_id", userId)
        .limit(1)
        .maybeSingle();
      if (!e2 && again?.id) return again.id;
    }
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

/** Libellé affichage pour nommer le commerce par défaut. */
export function ownerDisplayLabel(user: User): string {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const fromMeta =
    typeof meta?.full_name === "string"
      ? meta.full_name
      : typeof meta?.name === "string"
        ? meta.name
        : "";
  const t = fromMeta.trim();
  if (t.length > 0) return t;
  return user.email?.split("@")[0] ?? "Propriétaire";
}

/**
 * Garantit au moins un commerce + enregistrement gérant technique (caisse) pour un propriétaire.
 * À utiliser avant ajout produit / vente si aucun commerce n’est encore chargé.
 */
export async function ensurePrimaryCommerceForOwner(user: User): Promise<string | null> {
  const id = await ensureDefaultCommerce(user.id, ownerDisplayLabel(user));
  if (id) await ensureOwnerGerantForCommerce(id, user.id);
  return id;
}

/**
 * Résout un `commerce_id` pour produits / caisse : ids du hook, puis requête directe Supabase,
 * puis création silencieuse (propriétaire ou super_admin uniquement).
 * Contourne un cache `useCommerceIds` vide ou un `role` pas encore hydraté.
 */
export async function resolveCommerceServerIdForSession(
  user: User,
  role: AppRole | null,
  commerceIdsFromHook: string[]
): Promise<string | null> {
  if (commerceIdsFromHook.length > 0) return commerceIdsFromHook[0];

  const { data: ownedRows, error: ownedErr } = await supabase
    .from("commerces")
    .select("id")
    .eq("proprietaire_id", user.id)
    .limit(1);

  if (!ownedErr && ownedRows?.[0]?.id) return ownedRows[0].id;

  const { data: gerantRow, error: gerantErr } = await supabase
    .from("gerants")
    .select("commerce_id")
    .eq("user_id", user.id)
    .eq("actif", true)
    .limit(1)
    .maybeSingle();

  if (!gerantErr && gerantRow?.commerce_id) return gerantRow.commerce_id;

  if (role === "proprietaire" || role === "super_admin") {
    return ensurePrimaryCommerceForOwner(user);
  }

  return null;
}
