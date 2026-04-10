import { supabase } from "@/integrations/supabase/client";
import { getDb } from "@/lib/db";
import { enqueue } from "@/lib/sync/queue";
import { ensureBusinessLocalId } from "./business";
import type { CreateCreditInput, Credit } from "./types";

async function fetchCreditsFromServer(commerceServerIds: string[]): Promise<Credit[]> {
  if (commerceServerIds.length === 0) return [];
  if (typeof navigator !== "undefined" && !navigator.onLine) return [];

  const { data: sessions } = await supabase.from("sessions").select("id").in("commerce_id", commerceServerIds);
  const sIds = sessions?.map((s) => s.id) ?? [];
  if (sIds.length === 0) return [];

  const { data: factures } = await supabase.from("factures").select("id").in("session_id", sIds);
  const fIds = factures?.map((f) => f.id) ?? [];
  if (fIds.length === 0) return [];

  const { data, error } = await supabase
    .from("credits")
    .select("*")
    .in("facture_id", fIds)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((c) => ({
    id: c.id,
    montant_restant: Number(c.montant_restant),
    total_amount: Number(c.total_amount ?? c.montant_restant),
    total_paid: Number(c.total_paid ?? 0),
    client_name: c.client_name ?? "",
    created_by_name: "",
    promise_date: c.promise_date ?? null,
    statut: c.statut ?? "en_cours",
    date_echeance: c.date_echeance ?? null,
    created_at: c.created_at ?? new Date().toISOString(),
    sync_status: "synced"
  })) as Credit[];
}

async function persistCreditsLocal(rows: Credit[], commerceServerIds: string[]): Promise<void> {
  if (rows.length === 0) return;
  const db = getDb();
  const now = Date.now();
  const bl = await ensureBusinessLocalId(commerceServerIds[0]);
  for (const c of rows) {
    await db.run(
      `INSERT INTO credits (local_id, server_id, sync_status, updated_at, deleted_at, business_local_id,
        sale_local_id, client_name, amount_cents, remaining_cents, status, extra_json)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(local_id) DO UPDATE SET
        remaining_cents=excluded.remaining_cents,
        status=excluded.status,
        extra_json=excluded.extra_json,
        updated_at=excluded.updated_at`,
      [
        c.id,
        c.id,
        "synced",
        now,
        null,
        bl,
        null,
        c.client_name,
        Math.round(c.total_amount * 100),
        Math.round(c.montant_restant * 100),
        c.statut,
        JSON.stringify(c)
      ]
    );
  }
}

export async function getCredits(commerceServerIds: string[]): Promise<Credit[]> {
  const fromServer = await fetchCreditsFromServer(commerceServerIds);
  if (fromServer.length && commerceServerIds.length) {
    await persistCreditsLocal(fromServer, commerceServerIds);
  }

  const db = getDb();
  const ph = commerceServerIds.map(() => "?").join(",");
  const localRows = await db.all<Record<string, unknown>>(
    `SELECT c.*, b.server_id AS commerce_server_id
     FROM credits c
     JOIN businesses b ON b.local_id = c.business_local_id
     WHERE c.deleted_at IS NULL AND b.server_id IN (${ph})`,
    commerceServerIds
  );

  const byId = new Map<string, Credit>();
  for (const r of localRows) {
    try {
      const extra = JSON.parse(String(r.extra_json || "{}")) as Credit;
      if (extra.id) {
        byId.set(extra.id, { ...extra, sync_status: String(r.sync_status) });
      } else {
        const id = String(r.server_id ?? r.local_id);
        byId.set(id, {
          id,
          montant_restant: Number(r.remaining_cents) / 100,
          total_amount: Number(r.amount_cents) / 100,
          total_paid: 0,
          client_name: String(r.client_name ?? ""),
          created_by_name: "",
          promise_date: null,
          statut: String(r.status ?? "en_cours"),
          date_echeance: null,
          created_at: new Date(Number(r.updated_at)).toISOString(),
          sync_status: String(r.sync_status)
        });
      }
    } catch {
      /* ignore row */
    }
  }

  for (const c of fromServer) {
    if (!byId.has(c.id)) byId.set(c.id, c);
  }

  return [...byId.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function createCredit(input: CreateCreditInput): Promise<Credit> {
  const db = getDb();
  const bl = await ensureBusinessLocalId(input.businessServerId);
  const localId = crypto.randomUUID();
  const now = Date.now();

  const credit: Credit = {
    id: localId,
    montant_restant: input.remainingCents / 100,
    total_amount: input.amountCents / 100,
    total_paid: 0,
    client_name: input.clientName,
    created_by_name: "",
    promise_date: null,
    statut: "en_cours",
    date_echeance: null,
    created_at: new Date(now).toISOString(),
    sync_status: "pending"
  };

  await db.run(
    `INSERT INTO credits (local_id, server_id, sync_status, updated_at, deleted_at, business_local_id,
      sale_local_id, client_name, amount_cents, remaining_cents, status, extra_json)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      localId,
      null,
      "pending",
      now,
      null,
      bl,
      input.saleLocalId ?? null,
      input.clientName,
      input.amountCents,
      input.remainingCents,
      "en_cours",
      JSON.stringify({ ...credit, ...input.extra })
    ]
  );

  await enqueue({
    table: "credits",
    operation: "INSERT",
    payload: { ...input, local_id: localId },
    local_id: localId,
    server_id: null
  });

  return credit;
}

export async function recordCreditPayment(creditId: string, amount: number): Promise<void> {
  const db = getDb();
  const row = await db.get<Record<string, unknown>>(
    "SELECT * FROM credits WHERE (server_id = ? OR local_id = ?) AND deleted_at IS NULL",
    [creditId, creditId]
  );
  if (!row) throw new Error("Crédit introuvable en local");

  const localId = String(row.local_id);
  const payId = crypto.randomUUID();
  const now = Date.now();
  const amountCents = Math.round(amount * 100);

  await db.run(
    `INSERT INTO credit_payments (local_id, server_id, sync_status, updated_at, deleted_at, credit_local_id, amount_cents, extra_json)
     VALUES (?,?,?,?,?,?,?,?)`,
    [payId, null, "pending", now, null, localId, amountCents, "{}"]
  );

  const rem = Math.max(0, Number(row.remaining_cents) - amountCents);
  await db.run(
    `UPDATE credits SET remaining_cents=?, status=?, updated_at=?, sync_status='pending' WHERE local_id=?`,
    [rem, rem <= 0 ? "paye" : "en_cours", now, localId]
  );

  await enqueue({
    table: "credit_payments",
    operation: "INSERT",
    payload: { credit_id: creditId, amount, local_payment_id: payId },
    local_id: payId,
    server_id: null
  });
}
