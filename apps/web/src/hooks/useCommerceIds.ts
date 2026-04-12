import { useState, useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getCache, setCache } from "@/lib/offline-db";
import { cacheGet, cacheGetStale, cacheSet } from "@/lib/cache";
import {
  ensureDefaultCommerce,
  ensureOwnerGerantsForProprietaireCommerces,
} from "@/lib/auth/ensureDefaultCommerce";

export interface CommerceIdsPayload {
  ids: string[];
  commerces: { id: string; nom: string }[];
  gerantId: string | null;
}

function cacheKeyFor(userId: string, role: string | null) {
  return `commerce_ids_${userId}_${role ?? ""}`;
}

function applyPayload(
  setCommerceIds: (v: string[]) => void,
  setCommerces: (v: { id: string; nom: string }[]) => void,
  setGerantId: (v: string | null) => void,
  p: CommerceIdsPayload
) {
  setCommerceIds(p.ids);
  setCommerces(p.commerces);
  setGerantId(p.gerantId);
}

export function useCommerceIds() {
  const { user, role } = useAuth();
  const [commerceIds, setCommerceIds] = useState<string[]>([]);
  const [commerces, setCommerces] = useState<{ id: string; nom: string }[]>([]);
  const [gerantId, setGerantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!user) {
      setCommerceIds([]);
      setCommerces([]);
      setGerantId(null);
      setLoading(false);
      hydratedRef.current = false;
      return;
    }

    const key = cacheKeyFor(user.id, role);
    const stale = cacheGetStale<CommerceIdsPayload>(key);
    const fresh = cacheGet<CommerceIdsPayload>(key);
    const initial = fresh ?? stale;
    if (initial?.ids?.length) {
      applyPayload(setCommerceIds, setCommerces, setGerantId, initial);
      setLoading(false);
      hydratedRef.current = true;
    } else {
      setLoading(true);
    }

    let cancelled = false;

    const load = async () => {
      try {
        const idbCached = await getCache<CommerceIdsPayload>("commerce_ids");
        if (!cancelled && idbCached?.ids?.length && !hydratedRef.current) {
          applyPayload(setCommerceIds, setCommerces, setGerantId, idbCached);
          setLoading(false);
          hydratedRef.current = true;
        }

        /** Sur le navigateur, `navigator.onLine` est souvent faux (IP LAN, Windows) — on tente quand même le bootstrap Supabase. Sur natif, on respecte l’indicateur pour éviter des inserts inutiles hors-ligne. */
        const allowRemoteCommerceBootstrap =
          !Capacitor.isNativePlatform() ||
          (typeof navigator !== "undefined" && navigator.onLine);

        if (role === "proprietaire" && allowRemoteCommerceBootstrap) {
          const meta = user.user_metadata as Record<string, unknown> | undefined;
          const fromMeta =
            typeof meta?.full_name === "string"
              ? meta.full_name
              : typeof meta?.name === "string"
                ? meta.name
                : "";
          const ownerLabel =
            fromMeta.trim() ||
            (user.email?.split("@")[0] ?? "Propriétaire");
          await ensureDefaultCommerce(user.id, ownerLabel);
        }

        if (role === "super_admin") {
          const { data: allComms, error } = await supabase
            .from("commerces")
            .select("id, nom")
            .order("nom", { ascending: true })
            .limit(500);
          if (cancelled) return;
          if (error) throw error;
          const ids = (allComms || []).map((c) => c.id);
          const payload: CommerceIdsPayload = {
            ids,
            commerces: allComms || [],
            gerantId: null
          };
          applyPayload(setCommerceIds, setCommerces, setGerantId, payload);
          cacheSet(key, payload, 86_400);
          await setCache("commerce_ids", payload);
          return;
        }

        const { data: comms, error: e1 } = await supabase
          .from("commerces")
          .select("id, nom")
          .eq("proprietaire_id", user.id);
        if (cancelled) return;
        if (e1) throw e1;

        const ids = comms?.map((c) => c.id) || [];

        if (role === "proprietaire" && allowRemoteCommerceBootstrap && ids.length > 0) {
          await ensureOwnerGerantsForProprietaireCommerces(ids, user.id);
        }

        let gId: string | null = null;

        const { data: gerantData, error: e2 } = await supabase
          .from("gerants")
          .select("id, commerce_id")
          .eq("user_id", user.id)
          .eq("actif", true);
        if (cancelled) return;
        if (e2) throw e2;

        if (gerantData?.length) {
          gId = gerantData[0].id;
          gerantData.forEach((g) => {
            if (!ids.includes(g.commerce_id)) ids.push(g.commerce_id);
          });
        }

        const uniqueIds = [...new Set(ids)];
        let allCommerces = comms || [];

        if (gerantData?.length) {
          const needNames = [...new Set(gerantData.map((g) => g.commerce_id))].filter(
            (cid) => !allCommerces.some((c) => c.id === cid)
          );
          if (needNames.length > 0) {
            const { data: extraComms, error: e3 } = await supabase
              .from("commerces")
              .select("id, nom")
              .in("id", needNames);
            if (cancelled) return;
            if (e3) throw e3;
            if (extraComms) allCommerces = [...allCommerces, ...extraComms];
          }
        }

        const payload: CommerceIdsPayload = {
          ids: uniqueIds,
          commerces: allCommerces,
          gerantId: gId
        };
        if (!cancelled) {
          applyPayload(setCommerceIds, setCommerces, setGerantId, payload);
          cacheSet(key, payload, 86_400);
          await setCache("commerce_ids", payload);
        }
      } catch (err) {
        if (import.meta.env.DEV) console.warn("[useCommerceIds]", err);
        if (!cancelled) {
          const fallback =
            cacheGetStale<CommerceIdsPayload>(key) ??
            (await getCache<CommerceIdsPayload>("commerce_ids").catch(() => null));
          if (fallback?.ids?.length) {
            applyPayload(setCommerceIds, setCommerces, setGerantId, fallback);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [user, role]);

  return { commerceIds, commerces, gerantId, loading };
}
