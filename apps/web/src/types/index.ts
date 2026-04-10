/**
 * Centralized type definitions for KOBINA PRO
 */

export type AppRole = 'super_admin' | 'admin_staff' | 'proprietaire' | 'gerant';

export type PlanType = 'free' | 'commerce_1' | 'multi_3' | 'multi_6' | 'multi_10';

export type PlanName = 'free' | 'formule1' | 'formule2' | 'formule3' | 'formule4';

export type PaymentType = 'subscription' | 'add_commerce' | 'delete_commerce' | 'add_manager' | 'delete_manager';

export type CommerceType = 'restaurant' | 'boutique' | 'bar' | 'superette' | 'pharmacie' | 'autre';

export type ModePaiement = 'cash' | 'mobile_money' | 'credit';

export type SessionStatut = 'ouverte' | 'fermee';

export type CreditStatut = 'en_cours' | 'paye' | 'en_retard';

export type TicketPriority = 'critical' | 'high' | 'normal' | 'low';

export type TicketStatus = 'open' | 'pending' | 'in_progress' | 'resolved' | 'closed';

export interface SubscriptionInfo {
  plan: PlanName;
  plan_type?: PlanType;
  status: 'active' | 'trial' | 'expired' | 'free';
  is_trial: boolean;
  is_expired: boolean;
  trial_end_date?: string | null;
  end_date?: string | null;
  subscription_id?: string;
}

export interface ManagerPermissions {
  can_sell: boolean;
  can_add_products: boolean;
  can_manage_products: boolean;
  can_add_stock: boolean;
  can_view_sales_history: boolean;
  can_scan_barcode: boolean;
  can_use_messaging: boolean;
  can_use_credit: boolean;
  can_add_expenses: boolean;
  can_use_sessions: boolean;
  can_print_receipt: boolean;
}

export interface PlanLimits {
  plan: string;
  plan_code: string | null;
  max_commerces: number;
  max_managers: number;
  max_products: number;
  scanner: boolean;
  messagerie: boolean;
  credit_module: boolean;
  session_module: boolean;
  fidelite: boolean;
  rapport_avance: boolean;
  benefice: boolean;
  favoris: boolean;
  price: number;
}
