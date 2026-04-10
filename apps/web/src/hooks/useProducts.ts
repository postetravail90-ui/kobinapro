import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/lib/data/products";
import type { Product } from "@/lib/data/types";

export type CachedProduct = Product;

export function useProducts(commerceIds: string[], opts?: { hideCosting?: boolean }) {
  const hideCost = opts?.hideCosting ?? false;
  const idsKey = commerceIds.slice().sort().join(",");

  const query = useQuery({
    queryKey: ["products", idsKey],
    queryFn: () => getProducts(commerceIds),
    staleTime: Infinity,
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
