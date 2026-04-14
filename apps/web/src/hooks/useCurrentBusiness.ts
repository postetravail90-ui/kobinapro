import { useCommerceIds } from "@/hooks/useCommerceIds";

/**
 * Commerce « courant » : délègue à `useCommerceIds` (une seule source, pas de requête Dexie
 * dupliquée par page — évite N lectures IndexedDB identiques quand plusieurs écrans sont montés).
 */
export function useCurrentBusiness() {
  const commerceCtx = useCommerceIds();

  const fromHook = commerceCtx.commerceIds[0]
    ? {
        id: commerceCtx.commerceIds[0],
        nom:
          commerceCtx.commerces.find((c) => c.id === commerceCtx.commerceIds[0])?.nom ?? "",
      }
    : null;

  const business = fromHook;
  const businessId = business?.id ?? null;

  return {
    ...commerceCtx,
    business,
    businessId,
    isReady: true,
  };
}
