import { supabase } from "@/integrations/supabase/client";
import { getDb } from "@/lib/db";
import { enqueue } from "@/lib/sync/queue";
import { ensureBusinessLocalId } from "./business";
import type { CreateExpenseInput, Expense } from "./types";

async function hydrateExpenses(commerceServerIds: string[]): Promise<void> {
  if (commerceServerIds.length === 0) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  const { data, error } = await supabase
    .from("depenses")
    .select("id, titre, montant, description, created_at, created_by, commerce_id")
    .in("commerce_id", commerceServerIds)
    .order("created_at", { ascending: false });

  if (error || !data?.length) return;

  const db = getDb();
  const now = Date.now();
  for (const d of data) {
    const bl = await ensureBusinessLocalId(d.commerce_id);
    const lid = String(d.id);
    await db.run(
      `INSERT INTO expenses (local_id, server_id, sync_status, updated_at, deleted_at, business_local_id,
        title, amount_cents, description, created_by, extra_json)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(local_id) DO UPDATE SET
        title=excluded.title,
        amount_cents=excluded.amount_cents,
        description=excluded.description,
        updated_at=excluded.updated_at,
        extra_json=excluded.extra_json`,
      [
        lid,
        d.id,
        "synced",
        now,
        null,
        bl,
        d.titre,
        Math.round(Number(d.montant) * 100),
        d.description ?? null,
        d.created_by,
        JSON.stringify({ created_at: d.created_at })
      ]
    );
  }
}

export async function getExpenses(commerceServerIds: string[]): Promise<Expense[]> {
  if (commerceServerIds.length === 0) return [];
  await hydrateExpenses(commerceServerIds);

  const db = getDb();
  const ph = commerceServerIds.map(() => "?").join(",");
  const rows = await db.all<Record<string, unknown>>(
    `SELECT e.*, b.server_id AS commerce_server_id
     FROM expenses e
     JOIN businesses b ON b.local_id = e.business_local_id
     WHERE e.deleted_at IS NULL AND b.server_id IN (${ph})
     ORDER BY e.updated_at DESC`,
    commerceServerIds
  );

  return rows.map((r) => {
    let createdAt = new Date(Number(r.updated_at)).toISOString();
    try {
      const ex = JSON.parse(String(r.extra_json || "{}")) as { created_at?: string };
      if (ex.created_at) createdAt = ex.created_at;
    } catch {
      /* ignore */
    }
    return {
      id: (r.server_id as string) || (r.local_id as string),
      titre: String(r.title ?? ""),
      montant: Number(r.amount_cents ?? 0) / 100,
      description: (r.description as string) ?? null,
      created_at: createdAt,
      created_by: String(r.created_by ?? ""),
      commerce_id: String(r.commerce_server_id),
      sync_status: String(r.sync_status)
    };
  });
}

export async function createExpense(input: CreateExpenseInput): Promise<Expense> {
  const db = getDb();
  const bl = await ensureBusinessLocalId(input.commerceServerId);
  const localId = crypto.randomUUID();
  const now = Date.now();
  const amountCents = Math.round(input.montant * 100);

  await db.run(
    `INSERT INTO expenses (local_id, server_id, sync_status, updated_at, deleted_at, business_local_id,
      title, amount_cents, description, created_by, extra_json)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [
      localId,
      null,
      "pending",
      now,
      null,
      bl,
      input.titre,
      amountCents,
      input.description,
      input.createdBy,
      JSON.stringify({ created_at: new Date(now).toISOString() })
    ]
  );

  await enqueue({
    table: "depenses",
    operation: "INSERT",
    payload: {
      id: localId,
      commerce_id: input.commerceServerId,
      titre: input.titre,
      montant: input.montant,
      description: input.description,
      created_by: input.createdBy
    },
    local_id: localId,
    server_id: null
  });

  return {
    id: localId,
    titre: input.titre,
    montant: input.montant,
    description: input.description,
    created_at: new Date(now).toISOString(),
    created_by: input.createdBy,
    commerce_id: input.commerceServerId,
    sync_status: "pending"
  };
}
