import { supabase } from "@/integrations/supabase/client";
import { getDb } from "@/lib/db";
import { enqueue } from "@/lib/sync/queue";
import { ensureBusinessLocalId } from "./business";
import type { CreateProductInput, Product } from "./types";

function rowToProduct(
  r: Record<string, unknown>,
  commerceServerId: string,
  favori = false
): Product {
  const priceCents = Number(r.price_cents ?? 0);
  const costCents = Number(r.cost_cents ?? 0);
  return {
    id: (r.server_id as string) || (r.local_id as string),
    nom: String(r.name ?? ""),
    prix: priceCents / 100,
    prix_achat: costCents / 100,
    stock: Number(r.stock_qty ?? 0),
    code_barre: (r.barcode as string) ?? null,
    categorie: (r.category as string) ?? null,
    unite: (r.unit as string) ?? "piece",
    commerce_id: commerceServerId,
    favori,
    sync_status: r.sync_status as Product["sync_status"],
    local_id: r.local_id as string
  };
}

async function hydrateProductsFromServer(commerceServerIds: string[]): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  const { data, error } = await supabase
    .from("produits")
    .select(
      "id, nom, prix, prix_achat, stock, code_barre, categorie, unite, commerce_id, favori, actif, created_at"
    )
    .in("commerce_id", commerceServerIds)
    .eq("actif", true)
    .order("created_at", { ascending: false });

  if (error || !data?.length) return;

  const db = getDb();
  const now = Date.now();
  for (const p of data) {
    const bl = await ensureBusinessLocalId(p.commerce_id);
    const localId = String(p.id);
    const priceCents = Math.round(Number(p.prix) * 100);
    const costCents = Math.round(Number(p.prix_achat ?? 0) * 100);
    await db.run(
      `INSERT INTO products (local_id, server_id, sync_status, sync_error, updated_at, deleted_at,
        business_local_id, sku, name, unit, price_cents, cost_cents, stock_qty, barcode, category, extra_json)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(local_id) DO UPDATE SET
        server_id=excluded.server_id,
        sync_status='synced',
        updated_at=excluded.updated_at,
        business_local_id=excluded.business_local_id,
        name=excluded.name,
        unit=excluded.unit,
        price_cents=excluded.price_cents,
        cost_cents=excluded.cost_cents,
        stock_qty=excluded.stock_qty,
        barcode=excluded.barcode,
        category=excluded.category,
        extra_json=excluded.extra_json`,
      [
        localId,
        p.id,
        "synced",
        null,
        now,
        null,
        bl,
        null,
        p.nom,
        p.unite ?? "piece",
        priceCents,
        costCents,
        Number(p.stock ?? 0),
        p.code_barre ?? null,
        p.categorie ?? null,
        JSON.stringify({ favori: p.favori ?? false })
      ]
    );
  }
}

export async function getProducts(commerceServerIds: string[]): Promise<Product[]> {
  if (commerceServerIds.length === 0) return [];

  await hydrateProductsFromServer(commerceServerIds);

  const db = getDb();
  const placeholders = commerceServerIds.map(() => "?").join(",");
  const rows = await db.all<Record<string, unknown>>(
    `SELECT p.*, b.server_id AS commerce_server_id,
            json_extract(p.extra_json, '$.favori') AS favori_json
     FROM products p
     JOIN businesses b ON b.local_id = p.business_local_id AND b.deleted_at IS NULL
     WHERE p.deleted_at IS NULL AND b.server_id IN (${placeholders})
     ORDER BY p.updated_at DESC`,
    commerceServerIds
  );

  return rows.map((r) => {
    const cid = String(r.commerce_server_id);
    const fav =
      r.favori_json === 1 ||
      r.favori_json === true ||
      String(r.favori_json) === "true";
    return rowToProduct(r, cid, fav);
  });
}

export async function createProduct(data: CreateProductInput): Promise<Product> {
  const db = getDb();
  const bl = await ensureBusinessLocalId(data.commerceServerId);
  const localId = crypto.randomUUID();
  const now = Date.now();
  const priceCents = Math.round(data.prix * 100);
  const costCents = Math.round(data.prix_achat * 100);

  await db.run(
    `INSERT INTO products (local_id, server_id, sync_status, sync_error, updated_at, deleted_at,
      business_local_id, name, unit, price_cents, cost_cents, stock_qty, barcode, category, extra_json)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      localId,
      null,
      "pending",
      null,
      now,
      null,
      bl,
      data.nom,
      data.unite,
      priceCents,
      costCents,
      data.stock,
      data.code_barre,
      data.categorie,
      JSON.stringify({ favori: false })
    ]
  );

  const payload = {
    id: localId,
    nom: data.nom,
    prix: data.prix,
    prix_achat: data.prix_achat,
    stock: data.stock,
    categorie: data.categorie,
    code_barre: data.code_barre,
    unite: data.unite,
    commerce_id: data.commerceServerId,
    actif: true
  };

  await enqueue({
    table: "produits",
    operation: "INSERT",
    payload,
    local_id: localId,
    server_id: null
  });

  return rowToProduct(
    {
      local_id: localId,
      server_id: null,
      sync_status: "pending",
      name: data.nom,
      unit: data.unite,
      price_cents: priceCents,
      cost_cents: costCents,
      stock_qty: data.stock,
      barcode: data.code_barre,
      category: data.categorie
    },
    data.commerceServerId,
    false
  );
}

export async function updateProduct(
  productId: string,
  patch: Partial<{
    nom: string;
    prix: number;
    prix_achat: number;
    stock: number;
    categorie: string | null;
    code_barre: string | null;
    unite: string;
    favori: boolean;
    /** false = désactivation locale (soft delete) */
    actif: boolean;
  }>
): Promise<void> {
  const db = getDb();
  const row = await db.get<Record<string, unknown>>(
    "SELECT * FROM products WHERE (server_id = ? OR local_id = ?) AND deleted_at IS NULL LIMIT 1",
    [productId, productId]
  );
  if (!row) throw new Error("Produit introuvable en local");

  const localId = String(row.local_id);
  const now = Date.now();
  const extra = JSON.parse(String(row.extra_json || "{}")) as Record<string, unknown>;
  if (patch.favori !== undefined) extra.favori = patch.favori;

  const name = patch.nom ?? row.name;
  const unit = patch.unite ?? row.unit;
  const priceCents =
    patch.prix != null ? Math.round(patch.prix * 100) : Number(row.price_cents);
  const costCents =
    patch.prix_achat != null ? Math.round(patch.prix_achat * 100) : Number(row.cost_cents);
  const stock = patch.stock != null ? patch.stock : Number(row.stock_qty);
  const barcode = patch.code_barre !== undefined ? patch.code_barre : row.barcode;
  const category = patch.categorie !== undefined ? patch.categorie : row.category;
  const deletedAt = patch.actif === false ? now : null;

  await db.run(
    `UPDATE products SET name=?, unit=?, price_cents=?, cost_cents=?, stock_qty=?, barcode=?, category=?,
     extra_json=?, updated_at=?, sync_status='pending', deleted_at=COALESCE(?, deleted_at)
     WHERE local_id=?`,
    [
      name,
      unit,
      priceCents,
      costCents,
      stock,
      barcode,
      category,
      JSON.stringify(extra),
      now,
      deletedAt,
      localId
    ]
  );

  const serverId = row.server_id ? String(row.server_id) : null;
  await enqueue({
    table: "produits",
    operation: "UPDATE",
    payload: {
      id: serverId ?? localId,
      ...patch,
      commerce_id: undefined
    },
    local_id: localId,
    server_id: serverId
  });
}

export async function searchProducts(query: string, commerceServerIds: string[]): Promise<Product[]> {
  const all = await getProducts(commerceServerIds);
  const q = query.trim().toLowerCase();
  if (!q) return all;
  return all.filter(
    (p) =>
      p.nom.toLowerCase().includes(q) ||
      (p.code_barre && p.code_barre.toLowerCase().includes(q)) ||
      (p.categorie && p.categorie.toLowerCase().includes(q))
  );
}
