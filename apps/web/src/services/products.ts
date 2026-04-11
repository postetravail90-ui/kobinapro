import { supabase } from '@/integrations/supabase/client';
import { cacheProducts, getCachedProducts, getCachedProductByBarcode } from '@/lib/offline-db';
import type { ProductCacheRow } from '@/lib/local/local-types';

export interface Product {
  id: string;
  nom: string;
  prix: number;
  stock: number;
  code_barre: string | null;
  categorie: string | null;
  unite: string | null;
  commerce_id: string;
}

/**
 * Fetch products for given commerce IDs with pagination.
 * Always scoped to commerce_id for scale.
 */
export async function fetchProducts(commerceIds: string[], page = 0, limit = 100): Promise<Product[]> {
  if (commerceIds.length === 0) return [];

  const { data, error } = await supabase
    .from('produits')
    .select('id, nom, prix, stock, code_barre, categorie, unite, commerce_id')
    .in('commerce_id', commerceIds)
    .eq('actif', true)
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (error) throw error;
  return data || [];
}

/**
 * Fetch all products and cache them for offline use.
 */
export async function fetchAndCacheProducts(commerceIds: string[]): Promise<Product[]> {
  const products = await fetchProducts(commerceIds);
  await cacheProducts(products as unknown as ProductCacheRow[]);
  return products;
}

/**
 * Find product by barcode — local first, then server.
 */
export async function findByBarcode(barcode: string, commerceId?: string): Promise<Product | null> {
  // Local first
  const cached = await getCachedProductByBarcode(barcode);
  if (cached) return cached as unknown as Product;

  // Server fallback
  let query = supabase
    .from('produits')
    .select('id, nom, prix, stock, code_barre, categorie, unite, commerce_id')
    .eq('code_barre', barcode)
    .eq('actif', true)
    .limit(1);

  if (commerceId) query = query.eq('commerce_id', commerceId);

  const { data } = await query.single();
  return data || null;
}

/**
 * Update stock after a sale (decrement).
 */
export async function decrementStock(productId: string, quantity: number): Promise<void> {
  const { data: product } = await supabase
    .from('produits')
    .select('stock')
    .eq('id', productId)
    .single();

  if (product) {
    await supabase
      .from('produits')
      .update({ stock: Math.max(0, product.stock - quantity) })
      .eq('id', productId);
  }
}
