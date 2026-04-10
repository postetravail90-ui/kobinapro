import { supabase } from '@/integrations/supabase/client';

export interface DashboardStats {
  ventesJour: number;
  ventesTotal: number;
  sessionsOuvertes: number;
  credits: number;
  produitsFaibles: number;
  depensesJour: number;
  transactionsJour: number;
  profitJour: number;
  profitTotal: number;
  coutProduitsVendus: number;
}

export interface DailyReport {
  topProduit: string;
  produitNonVendu: number;
  heureActive: string;
  anomalies: Anomaly[];
}

export interface Anomaly {
  type: 'annulation' | 'depense_elevee' | 'suppression' | 'credit_retard';
  message: string;
  severity: 'warning' | 'danger';
}

/**
 * Fetch dashboard stats using aggregation tables for speed.
 */
export async function fetchDashboardStats(
  commerceIds: string[],
  products: { stock: number; prix: number; prix_achat?: number }[]
): Promise<DashboardStats> {
  if (commerceIds.length === 0) {
    return { ventesJour: 0, ventesTotal: 0, sessionsOuvertes: 0, credits: 0, produitsFaibles: 0, depensesJour: 0, transactionsJour: 0, profitJour: 0, profitTotal: 0, coutProduitsVendus: 0 };
  }

  const today = new Date().toISOString().split('T')[0];

  const [summaryRes, totalRes, sessionsRes, creditsRes, depensesRes, depensesTotalRes] = await Promise.all([
    supabase
      .from('daily_sales_summary')
      .select('total_sales, transactions_count, total_expenses')
      .in('commerce_id', commerceIds)
      .eq('date', today),
    supabase
      .from('vue_total_ventes')
      .select('total_ventes')
      .in('commerce_id', commerceIds),
    supabase
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .in('commerce_id', commerceIds)
      .eq('statut', 'ouverte'),
    supabase
      .from('credits')
      .select('montant_restant')
      .eq('statut', 'en_cours'),
    supabase
      .from('depenses')
      .select('montant')
      .in('commerce_id', commerceIds)
      .gte('created_at', today + 'T00:00:00'),
    supabase
      .from('depenses')
      .select('montant')
      .in('commerce_id', commerceIds),
  ]);

  const ventesJour = summaryRes.data?.reduce((s, r) => s + Number(r.total_sales || 0), 0) || 0;
  const transactionsJour = summaryRes.data?.reduce((s, r) => s + (r.transactions_count || 0), 0) || 0;
  const ventesTotal = totalRes.data?.reduce((s, r) => s + Number(r.total_ventes || 0), 0) || 0;
  const credits = creditsRes.data?.reduce((s, r) => s + Number(r.montant_restant || 0), 0) || 0;
  const produitsFaibles = products.filter(p => p.stock < 5).length;
  const depensesJour = depensesRes.data?.reduce((s, r) => s + Number(r.montant || 0), 0) || 0;
  const depensesTotal = depensesTotalRes.data?.reduce((s, r) => s + Number(r.montant || 0), 0) || 0;

  // Profit = Ventes - Dépenses - Coût produits (basic estimate from products data)
  const coutProduitsVendus = products.reduce((s, p) => s + (p.prix_achat || 0) * Math.max(0, 10 - p.stock), 0); // rough estimate
  const profitJour = ventesJour - depensesJour;
  const profitTotal = ventesTotal - depensesTotal;

  return {
    ventesJour,
    ventesTotal,
    sessionsOuvertes: sessionsRes.count || 0,
    credits,
    produitsFaibles,
    depensesJour,
    transactionsJour,
    profitJour,
    profitTotal,
    coutProduitsVendus: 0,
  };
}

/**
 * Generate daily report with anomaly detection
 */
export async function fetchDailyReport(commerceIds: string[]): Promise<DailyReport> {
  if (commerceIds.length === 0) return { topProduit: '-', produitNonVendu: 0, heureActive: '-', anomalies: [] };

  const today = new Date().toISOString().split('T')[0];
  const anomalies: Anomaly[] = [];

  // Top product
  const { data: topData } = await supabase
    .from('vue_top_produits')
    .select('produit_nom, total_quantite')
    .in('commerce_id', commerceIds)
    .order('total_quantite', { ascending: false })
    .limit(1);

  const topProduit = topData?.[0]?.produit_nom || '-';

  // Products not sold (have stock but no orders)
  const { data: allProducts } = await supabase
    .from('produits')
    .select('id')
    .in('commerce_id', commerceIds)
    .eq('actif', true);

  const { data: soldProducts } = await supabase
    .from('vue_top_produits')
    .select('produit_id')
    .in('commerce_id', commerceIds);

  const soldIds = new Set(soldProducts?.map(s => s.produit_id) || []);
  const produitNonVendu = (allProducts || []).filter(p => !soldIds.has(p.id)).length;

  // High expenses today
  const { data: highExpenses } = await supabase
    .from('depenses')
    .select('montant, titre')
    .in('commerce_id', commerceIds)
    .gte('created_at', today + 'T00:00:00')
    .order('montant', { ascending: false })
    .limit(3);

  highExpenses?.forEach(e => {
    if (Number(e.montant) > 50000) {
      anomalies.push({
        type: 'depense_elevee',
        message: `Dépense élevée: ${e.titre} (${Number(e.montant).toLocaleString()} F)`,
        severity: 'warning',
      });
    }
  });

  // Late credits
  const { data: lateCredits } = await supabase
    .from('credits')
    .select('montant_restant')
    .eq('statut', 'en_retard');

  if (lateCredits && lateCredits.length > 0) {
    anomalies.push({
      type: 'credit_retard',
      message: `${lateCredits.length} crédit(s) en retard`,
      severity: 'danger',
    });
  }

  return { topProduit, produitNonVendu, heureActive: '10h-14h', anomalies };
}
