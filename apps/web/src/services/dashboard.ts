import {
  getDashboardStatsFromLocal,
  getDailyReportFromLocal,
  getTopProduitsFromLocal,
  getTotalSalesCountLocal,
} from "@/lib/data/dashboard-local";
import type { Anomaly, DailyReport, DashboardStats } from "@/lib/data/dashboard-types";

export type { Anomaly, DailyReport, DashboardStats };

/**
 * Statistiques tableau de bord — 100 % SQLite (aucun appel Supabase).
 */
export async function fetchDashboardStats(
  commerceIds: string[],
  products: { stock: number; prix: number; prix_achat?: number }[]
): Promise<DashboardStats> {
  return getDashboardStatsFromLocal(commerceIds, products);
}

/**
 * Rapport quotidien — agrégations locales (SQLite).
 */
export async function fetchDailyReport(commerceIds: string[]): Promise<DailyReport> {
  return getDailyReportFromLocal(commerceIds);
}

/** Top produits (quantités vendues) depuis sale_items locaux. */
export async function fetchTopProduitsLocal(commerceIds: string[], limit = 6) {
  return getTopProduitsFromLocal(commerceIds, limit);
}

export async function fetchTotalSalesCountLocal(commerceIds: string[]): Promise<number> {
  return getTotalSalesCountLocal(commerceIds);
}
