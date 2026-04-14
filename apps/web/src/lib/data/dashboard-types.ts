/** Types partagés tableau de bord (évite les imports circulaires services ↔ agrégations locales). */

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

export interface Anomaly {
  type: "annulation" | "depense_elevee" | "suppression" | "credit_retard";
  message: string;
  severity: "warning" | "danger";
}

export interface DailyReport {
  topProduit: string;
  produitNonVendu: number;
  heureActive: string;
  anomalies: Anomaly[];
}
