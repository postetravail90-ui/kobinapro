/**
 * Statistiques tableau de bord 100 % locales (SQLite) — aucun appel réseau.
 */
import { getDb, initLocalDB } from "@/lib/db";
import type { Anomaly, DailyReport, DashboardStats } from "@/lib/data/dashboard-types";

function startOfTodayMs(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfMonthMs(): number {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

async function resolveBusinessLocalIds(commerceServerIds: string[]): Promise<string[]> {
  if (commerceServerIds.length === 0) return [];
  const ph = commerceServerIds.map(() => "?").join(",");
  const rows = await getDb().all<{ local_id: string }>(
    `SELECT local_id FROM businesses WHERE deleted_at IS NULL AND server_id IN (${ph})`,
    commerceServerIds
  );
  return rows.map((r) => r.local_id);
}

export async function getDashboardStatsFromLocal(
  commerceServerIds: string[],
  products: { stock: number; prix: number; prix_achat?: number }[]
): Promise<DashboardStats> {
  if (commerceServerIds.length === 0) {
    return {
      ventesJour: 0,
      ventesTotal: 0,
      sessionsOuvertes: 0,
      credits: 0,
      produitsFaibles: 0,
      depensesJour: 0,
      transactionsJour: 0,
      profitJour: 0,
      profitTotal: 0,
      coutProduitsVendus: 0,
    };
  }

  await initLocalDB();
  const db = getDb();
  const blIds = await resolveBusinessLocalIds(commerceServerIds);
  if (blIds.length === 0) {
    return {
      ventesJour: 0,
      ventesTotal: 0,
      sessionsOuvertes: 0,
      credits: 0,
      produitsFaibles: products.filter((p) => p.stock < 5).length,
      depensesJour: 0,
      transactionsJour: 0,
      profitJour: 0,
      profitTotal: 0,
      coutProduitsVendus: 0,
    };
  }

  const ph = blIds.map(() => "?").join(",");
  const todayMs = startOfTodayMs();
  const monthMs = startOfMonthMs();

  const salesRows = await db.all<{ total_cents: number; updated_at: number }>(
    `SELECT total_cents, updated_at FROM sales
     WHERE deleted_at IS NULL AND business_local_id IN (${ph})`,
    blIds
  );

  let ventesJour = 0;
  let ventesTotal = 0;
  let transactionsJour = 0;
  let ventesMonth = 0;
  for (const s of salesRows) {
    const t = Number(s.total_cents ?? 0) / 100;
    ventesTotal += t;
    const ts = Number(s.updated_at);
    if (ts >= todayMs) {
      ventesJour += t;
      transactionsJour += 1;
    }
    if (ts >= monthMs) {
      ventesMonth += t;
    }
  }

  const sessionsRow = await db.get<{ c: number }>(
    `SELECT COUNT(*) as c FROM sessions
     WHERE deleted_at IS NULL AND business_local_id IN (${ph}) AND (status = 'ouverte' OR status IS NULL)`,
    blIds
  );
  const sessionsOuvertes = Number(sessionsRow?.c ?? 0);

  const creditRows = await db.all<{ remaining_cents: number }>(
    `SELECT remaining_cents FROM credits
     WHERE deleted_at IS NULL AND business_local_id IN (${ph})
       AND (status = 'en_cours' OR status = 'partial')`,
    blIds
  );
  const credits = creditRows.reduce((s, r) => s + Number(r.remaining_cents ?? 0) / 100, 0);

  const depensesToday = await db.all<{ amount_cents: number }>(
    `SELECT amount_cents FROM expenses
     WHERE deleted_at IS NULL AND business_local_id IN (${ph}) AND updated_at >= ?`,
    [...blIds, todayMs]
  );
  const depensesJour = depensesToday.reduce((s, r) => s + Number(r.amount_cents ?? 0) / 100, 0);

  const depensesAll = await db.all<{ amount_cents: number }>(
    `SELECT amount_cents FROM expenses WHERE deleted_at IS NULL AND business_local_id IN (${ph})`,
    blIds
  );
  const depensesTotal = depensesAll.reduce((s, r) => s + Number(r.amount_cents ?? 0) / 100, 0);

  const produitsFaibles = products.filter((p) => p.stock < 5).length;

  const profitJour = ventesJour - depensesJour;
  const profitTotal = ventesTotal - depensesTotal;

  return {
    ventesJour,
    ventesTotal,
    sessionsOuvertes,
    credits,
    produitsFaibles,
    depensesJour,
    transactionsJour,
    profitJour,
    profitTotal,
    coutProduitsVendus: 0,
  };
}

export async function getTopProduitsFromLocal(commerceServerIds: string[], limit = 6): Promise<{ nom: string; total: number }[]> {
  if (commerceServerIds.length === 0) return [];
  await initLocalDB();
  const blIds = await resolveBusinessLocalIds(commerceServerIds);
  if (blIds.length === 0) return [];
  const ph = blIds.map(() => "?").join(",");
  const rows = await getDb().all<{ name: string | null; total: number }>(
    `SELECT p.name as name, SUM(si.quantity) as total
     FROM sale_items si
     JOIN sales s ON s.local_id = si.sale_local_id AND s.deleted_at IS NULL
     JOIN products p ON p.local_id = si.product_local_id AND p.deleted_at IS NULL
     WHERE s.business_local_id IN (${ph})
     GROUP BY p.name
     ORDER BY total DESC
     LIMIT ?`,
    [...blIds, limit]
  );
  return rows.map((r) => ({ nom: String(r.name ?? ""), total: Number(r.total) || 0 }));
}

export async function getTotalSalesCountLocal(commerceServerIds: string[]): Promise<number> {
  if (commerceServerIds.length === 0) return 0;
  await initLocalDB();
  const blIds = await resolveBusinessLocalIds(commerceServerIds);
  if (blIds.length === 0) return 0;
  const ph = blIds.map(() => "?").join(",");
  const row = await getDb().get<{ c: number }>(
    `SELECT COUNT(*) as c FROM sales WHERE deleted_at IS NULL AND business_local_id IN (${ph})`,
    blIds
  );
  return Number(row?.c ?? 0);
}

export async function getDailyReportFromLocal(commerceServerIds: string[]): Promise<DailyReport> {
  const top = await getTopProduitsFromLocal(commerceServerIds, 1);
  const topProduit = top[0]?.nom ?? "-";
  const anomalies: Anomaly[] = [];

  await initLocalDB();
  const blIds = await resolveBusinessLocalIds(commerceServerIds);
  if (blIds.length > 0) {
    const ph = blIds.map(() => "?").join(",");
    const late = await getDb().get<{ c: number }>(
      `SELECT COUNT(*) as c FROM credits
       WHERE deleted_at IS NULL AND business_local_id IN (${ph}) AND status = 'en_retard'`,
      blIds
    );
    if (Number(late?.c ?? 0) > 0) {
      anomalies.push({
        type: "credit_retard",
        message: `${late?.c} crédit(s) en retard`,
        severity: "danger",
      });
    }
  }

  return {
    topProduit,
    produitNonVendu: 0,
    heureActive: "-",
    anomalies,
  };
}
