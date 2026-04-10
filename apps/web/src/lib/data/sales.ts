import { getDb } from "@/lib/db";
import { enqueue } from "@/lib/sync/queue";
import { ensureBusinessLocalId } from "./business";
import type { CreateSaleInput, Sale, SaleFilters } from "./types";

export async function createSale(data: CreateSaleInput): Promise<Sale> {
  const db = getDb();
  const bl = await ensureBusinessLocalId(data.businessServerId);
  const localId = crypto.randomUUID();
  const now = Date.now();

  await db.run(
    `INSERT INTO sales (local_id, server_id, sync_status, updated_at, deleted_at, business_local_id,
      session_local_id, total_cents, payment_mode, client_name, extra_json)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [
      localId,
      null,
      "pending",
      now,
      null,
      bl,
      data.sessionLocalId ?? null,
      data.totalCents,
      data.paymentMode,
      data.clientName ?? null,
      JSON.stringify({ items: data.items ?? [] })
    ]
  );

  for (const it of data.items ?? []) {
    const ilid = crypto.randomUUID();
    await db.run(
      `INSERT INTO sale_items (local_id, server_id, sync_status, updated_at, deleted_at, sale_local_id,
        product_local_id, quantity, unit_price_cents, extra_json)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [ilid, null, "pending", now, null, localId, it.productLocalId, it.quantity, it.unitPriceCents, "{}"]
    );
  }

  await enqueue({
    table: "sales",
    operation: "INSERT",
    payload: { local_id: localId, ...data },
    local_id: localId,
    server_id: null
  });

  return {
    local_id: localId,
    server_id: null,
    business_server_id: data.businessServerId,
    total_cents: data.totalCents,
    payment_mode: data.paymentMode,
    client_name: data.clientName ?? null,
    sync_status: "pending",
    updated_at: now
  };
}

export async function getSales(businessServerId: string, _filters?: SaleFilters): Promise<Sale[]> {
  const db = getDb();
  const rows = await db.all<Record<string, unknown>>(
    `SELECT s.*, b.server_id AS business_server_id
     FROM sales s
     JOIN businesses b ON b.local_id = s.business_local_id
     WHERE s.deleted_at IS NULL AND b.server_id = ?`,
    [businessServerId]
  );
  return rows.map((r) => ({
    local_id: String(r.local_id),
    server_id: r.server_id != null ? String(r.server_id) : null,
    business_server_id: String(r.business_server_id),
    total_cents: Number(r.total_cents),
    payment_mode: r.payment_mode != null ? String(r.payment_mode) : null,
    client_name: r.client_name != null ? String(r.client_name) : null,
    sync_status: String(r.sync_status),
    updated_at: Number(r.updated_at)
  }));
}

export async function getSaleById(localId: string): Promise<Sale | null> {
  const db = getDb();
  const r = await db.get<Record<string, unknown>>(
    `SELECT s.*, b.server_id AS business_server_id
     FROM sales s
     JOIN businesses b ON b.local_id = s.business_local_id
     WHERE s.local_id = ? AND s.deleted_at IS NULL`,
    [localId]
  );
  if (!r) return null;
  return {
    local_id: String(r.local_id),
    server_id: r.server_id != null ? String(r.server_id) : null,
    business_server_id: String(r.business_server_id),
    total_cents: Number(r.total_cents),
    payment_mode: r.payment_mode != null ? String(r.payment_mode) : null,
    client_name: r.client_name != null ? String(r.client_name) : null,
    sync_status: String(r.sync_status),
    updated_at: Number(r.updated_at)
  };
}

/** Lignes de vente locales (SQLite) pour l’historique par produit dans l’UI. */
export interface ProductSaleHistoryRow {
  id: string;
  quantite: number;
  prix_unitaire: number;
  total_ligne: number;
  created_at: string;
}

export async function getProductSalesHistory(productId: string): Promise<ProductSaleHistoryRow[]> {
  const db = getDb();
  const rows = await db.all<{
    local_id: string;
    quantity: number;
    unit_price_cents: number;
    updated_at: number;
  }>(
    `SELECT si.local_id, si.quantity, si.unit_price_cents, si.updated_at
     FROM sale_items si
     JOIN products p ON p.local_id = si.product_local_id AND p.deleted_at IS NULL
     WHERE si.deleted_at IS NULL AND (p.server_id = ? OR p.local_id = ?)
     ORDER BY si.updated_at DESC
     LIMIT 50`,
    [productId, productId]
  );
  return rows.map((r) => {
    const qty = Number(r.quantity);
    const unit = Number(r.unit_price_cents) / 100;
    return {
      id: String(r.local_id),
      quantite: qty,
      prix_unitaire: unit,
      total_ligne: Math.round(qty * unit * 100) / 100,
      created_at: new Date(Number(r.updated_at)).toISOString()
    };
  });
}
