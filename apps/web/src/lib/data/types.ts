/** Produit aligné sur l’UI existante (CachedProduct). */
export interface Product {
  id: string;
  nom: string;
  prix: number;
  prix_achat: number;
  stock: number;
  code_barre: string | null;
  categorie: string | null;
  unite: string | null;
  commerce_id: string;
  favori: boolean;
  /** Métadonnée locale pour indicateur de sync UI */
  sync_status?: "pending" | "synced" | "error";
  local_id?: string;
}

export interface CreateProductInput {
  commerceServerId: string;
  nom: string;
  prix: number;
  prix_achat: number;
  stock: number;
  categorie: string | null;
  code_barre: string | null;
  unite: string;
}

export interface Sale {
  local_id: string;
  server_id: string | null;
  business_server_id: string;
  total_cents: number;
  payment_mode: string | null;
  client_name: string | null;
  sync_status: string;
  updated_at: number;
}

export interface CreateSaleInput {
  businessServerId: string;
  sessionLocalId?: string | null;
  totalCents: number;
  paymentMode: string;
  clientName?: string | null;
  items?: { productLocalId: string; quantity: number; unitPriceCents: number }[];
}

export interface Credit {
  id: string;
  montant_restant: number;
  total_amount: number;
  total_paid: number;
  client_name: string;
  created_by_name: string;
  promise_date: string | null;
  statut: string;
  date_echeance: string | null;
  created_at: string;
  sync_status?: string;
}

export interface CreateCreditInput {
  businessServerId: string;
  saleLocalId?: string | null;
  clientName: string;
  amountCents: number;
  remainingCents: number;
  extra?: Record<string, unknown>;
}

export interface Expense {
  id: string;
  titre: string;
  montant: number;
  description: string | null;
  created_at: string;
  created_by: string;
  commerce_id: string;
  sync_status?: string;
}

export interface CreateExpenseInput {
  commerceServerId: string;
  titre: string;
  montant: number;
  description: string | null;
  createdBy: string;
}

export interface SaleFilters {
  from?: number;
  to?: number;
}
