import { getDb } from "@/lib/db";
import { getProducts } from "./products";
import type { Product } from "./types";

export async function getStockLevel(productId: string): Promise<number> {
  const db = getDb();
  const row = await db.get<{ stock_qty: number }>(
    "SELECT stock_qty FROM products WHERE (server_id = ? OR local_id = ?) AND deleted_at IS NULL",
    [productId, productId]
  );
  return Number(row?.stock_qty ?? 0);
}

export async function adjustStock(productId: string, delta: number, _reason: string): Promise<void> {
  const current = await getStockLevel(productId);
  const { updateProduct } = await import("./products");
  await updateProduct(productId, { stock: current + delta });
}

export async function getLowStockProducts(
  commerceServerIds: string[],
  threshold = 5
): Promise<Product[]> {
  const products = await getProducts(commerceServerIds);
  return products.filter((p) => p.stock <= threshold);
}
