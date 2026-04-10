import { supabase } from '@/integrations/supabase/client';

export interface ProfitByProduct {
  produit_id: string;
  produit_nom: string;
  prix_vente: number;
  prix_achat: number;
  total_quantite: number;
  total_ventes: number;
  total_cout: number;
  total_benefice: number;
}

export interface ProfitByDay {
  jour: string;
  ventes: number;
  cout: number;
  benefice: number;
}

export interface ProfitReport {
  total_ventes: number;
  total_cout: number;
  total_benefice_brut: number;
  total_depenses: number;
  total_benefice_net: number;
  nb_produits_vendus: number;
  par_produit: ProfitByProduct[];
  par_jour: ProfitByDay[];
}

const emptyReport: ProfitReport = {
  total_ventes: 0, total_cout: 0, total_benefice_brut: 0,
  total_depenses: 0, total_benefice_net: 0, nb_produits_vendus: 0,
  par_produit: [], par_jour: [],
};

export async function fetchProfitReport(
  commerceIds: string[],
  dateFrom?: Date,
  dateTo?: Date,
): Promise<ProfitReport> {
  if (commerceIds.length === 0) return emptyReport;

  const { data, error } = await supabase.rpc('get_profit_report', {
    _commerce_ids: commerceIds,
    ...(dateFrom && { _date_from: dateFrom.toISOString() }),
    ...(dateTo && { _date_to: dateTo.toISOString() }),
  });

  if (error) {
    console.error('Profit report error:', error);
    return emptyReport;
  }

  return (data as unknown as ProfitReport) || emptyReport;
}

export type ProfitPeriod = 'today' | 'week' | 'month' | 'all';

export function getPeriodDates(period: ProfitPeriod): { from: Date; to: Date } {
  const now = new Date();
  const to = now;
  let from: Date;

  switch (period) {
    case 'today':
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      from = new Date(now);
      from.setDate(from.getDate() - 7);
      break;
    case 'month':
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'all':
      from = new Date(2020, 0, 1);
      break;
  }

  return { from, to };
}
