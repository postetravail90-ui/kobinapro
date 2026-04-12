import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/lib/data/products";
import type { Product } from "@/lib/data/types";
import { cacheGet, cacheGetStale, cacheSet } from "@/lib/cache";

export type CachedProduct = Product;

export function useProducts(commerceIds: string[], opts?: { hideCosting?: boolean }) {
  const hideCost = opts?.hideCosting ?? false;
  const idsKey = commerceIds.slice().sort().join(",");
  const cacheKey = `products_rq:${idsKey}`;
  const produitsKey = `produits:${idsKey}`;

  const query = useQuery({
    queryKey: ["products", idsKey],
    queryFn: async () => {
      const data = await getProducts(commerceIds);
      cacheSet(cacheKey, data, 3600 * 24);
      cacheSet(produitsKey, data, 3600 * 24);
      return data;
    },
    initialData: () =>
      cacheGet<Product[]>(produitsKey) ?? cacheGet<Product[]>(cacheKey) ?? undefined,
    placeholderData: () =>
      cacheGetStale<Product[]>(produitsKey) ?? cacheGetStale<Product[]>(cacheKey) ?? [],
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30,
    enabled: true,
  });

  const raw = query.data ?? [];
  const products = hideCost ? raw.map((p) => ({ ...p, prix_achat: 0 })) : raw;

  return {
    products,
    loading: query.isLoading,
    refresh: () => query.refetch()
  };
}
