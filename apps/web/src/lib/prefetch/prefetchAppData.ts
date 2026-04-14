import type { QueryClient } from '@tanstack/react-query';
import { getProducts } from '@/lib/data/products';
import { getCredits } from '@/lib/data/credits';
import { getExpenses } from '@/lib/data/expenses';
import { getOfflineDepenses } from '@/lib/offline-db';
import { getProfileNamesMap } from '@/lib/data/profile';
import { cacheSet } from '@/lib/cache';

function idsKey(ids: string[]) {
  return [...ids].sort().join(',');
}

export async function prefetchProducts(queryClient: QueryClient, commerceIds: string[]) {
  if (!commerceIds.length) return;
  const key = idsKey(commerceIds);
  await queryClient.prefetchQuery({
    queryKey: ['products', key],
    queryFn: async () => {
      const data = await getProducts(commerceIds);
      cacheSet(`products_rq:${key}`, data, 3600 * 24);
      cacheSet(`produits:${key}`, data, 3600 * 24);
      return data;
    },
    staleTime: Infinity,
  });
}

export async function warmCreditsCache(userId: string, commerceIds: string[]) {
  if (!userId || !commerceIds.length) return;
  const idsSorted = idsKey(commerceIds);
  const cacheKeyPrimary = `credits:${idsSorted}`;
  const cacheKeyLegacy = `credits_page_${userId}_${idsSorted}`;
  const rows = await getCredits(commerceIds);
  cacheSet(cacheKeyPrimary, rows, 86_400);
  cacheSet(cacheKeyLegacy, rows, 86_400);
}

interface DepenseRow {
  id: string;
  titre: string;
  montant: number;
  description: string | null;
  created_at: string;
  created_by: string;
  created_by_name?: string;
  _offline?: boolean;
  sync_status?: string;
}

export async function warmDepensesCache(userId: string, commerceIds: string[]) {
  if (!userId || !commerceIds.length) return;
  const idsSorted = idsKey(commerceIds);
  const cacheKeyPrimary = `depenses:${idsSorted}`;
  const cacheKeyLegacy = `depenses_page_${userId}_${idsSorted}`;

  const offlineDeps = await getOfflineDepenses();
  const offlineItems: DepenseRow[] = offlineDeps.map((d) => ({
    id: String(d.id),
    titre: String(d.titre ?? ''),
    montant: Number(d.montant ?? 0),
    description: d.description != null ? String(d.description) : null,
    created_at: String(d.created_at || new Date().toISOString()),
    created_by: String(d.created_by || d.user_id || ''),
    _offline: true,
  }));

  const fromSql = await getExpenses(commerceIds);
  const sqlItems: DepenseRow[] = fromSql.map((e) => ({
    id: e.id,
    titre: e.titre,
    montant: e.montant,
    description: e.description,
    created_at: e.created_at,
    created_by: e.created_by,
    sync_status: e.sync_status,
  }));

  const merged: DepenseRow[] = [...offlineItems];
  const seen = new Set(merged.map((m) => m.id));
  for (const s of sqlItems) {
    if (!seen.has(s.id)) {
      merged.push(s);
      seen.add(s.id);
    }
  }

  const creatorIds = [...new Set(merged.map((d) => d.created_by).filter(Boolean))];
  const nameMap = await getProfileNamesMap(creatorIds);
  const enriched = merged.map((d) => ({
    ...d,
    created_by_name: nameMap[d.created_by] || d.created_by_name,
  }));
  enriched.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  cacheSet(cacheKeyPrimary, enriched, 86_400);
  cacheSet(cacheKeyLegacy, enriched, 86_400);
}

/** Précharge produits, crédits et dépenses après connexion / changement de commerces (arrière-plan). */
export async function prefetchAllAppData(
  queryClient: QueryClient,
  userId: string,
  commerceIds: string[]
): Promise<void> {
  if (!userId || !commerceIds.length) return;
  await Promise.allSettled([
    prefetchProducts(queryClient, commerceIds),
    warmCreditsCache(userId, commerceIds),
    warmDepensesCache(userId, commerceIds),
  ]);
}

/** Préchargement au survol / touch sur un lien de navigation. */
export function prefetchAppNavTarget(
  queryClient: QueryClient,
  to: string,
  userId: string | undefined,
  commerceIds: string[]
): void {
  if (!commerceIds.length) return;
  const p = to.replace(/\/$/, '') || '/';

  if (p === '/app' || p.startsWith('/app/')) {
    if (p.startsWith('/app/produits')) {
      void prefetchProducts(queryClient, commerceIds);
      return;
    }
    if (p.startsWith('/app/credits') && userId) {
      void warmCreditsCache(userId, commerceIds);
      return;
    }
    if (p.startsWith('/app/depenses') && userId) {
      void warmDepensesCache(userId, commerceIds);
      return;
    }
  }
}
