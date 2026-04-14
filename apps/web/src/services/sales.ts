import { supabase } from '@/integrations/supabase/client';
import { addOfflineSale, addLocalCredit, getLocalCredits, updateCachedProductStock } from '@/lib/offline-db';
import { requestBackgroundSync } from '@/lib/register-sw';
import { triggerSyncFlush } from '@/lib/sync/engine';
import { applyLocalStockAfterSale } from '@/lib/data/products';

export type PaymentMode = 'cash' | 'mobile_money' | 'credit';

export interface CartItem {
  produit: {
    id: string;
    nom: string;
    prix: number;
    stock: number;
    commerce_id: string;
  };
  quantity: number;
}

interface SaleParams {
  cart: CartItem[];
  mode: PaymentMode;
  userId: string;
  userName?: string;
  gerantId: string;
  commerceId: string;
  /** Conservé pour compatibilité appelants — toutes les ventes passent par la file locale + sync. */
  isOnline: boolean;
  partialAmount?: number;
  clientName?: string;
  promiseDate?: string;
}

/**
 * Enregistre une vente en local (IndexedDB / SQLite natif) puis synchronise en arrière-plan via `process_sale`.
 * Aucun appel réseau sur le chemin critique : retour immédiat avec l’id local de vente.
 */
export async function processSale(params: SaleParams): Promise<string> {
  const {
    cart,
    mode,
    userId,
    userName,
    gerantId,
    commerceId,
    partialAmount,
    clientName,
    promiseDate,
  } = params;

  const total = cart.reduce((sum, c) => sum + c.produit.prix * c.quantity, 0);
  const saleId = crypto.randomUUID();

  await addOfflineSale({
    id: saleId,
    commerce_id: commerceId,
    gerant_id: gerantId,
    user_id: userId,
    user_name: userName || 'unknown',
    mode,
    total,
    partial_amount: partialAmount ?? null,
    client_name: clientName ?? null,
    promise_date: promiseDate ?? null,
    items: cart.map((c) => ({
      produit_id: c.produit.id,
      produit_nom: c.produit.nom,
      quantite: c.quantity,
      prix_unitaire: c.produit.prix,
    })),
    created_at: new Date().toISOString(),
    sync_status: 'pending',
    sync_attempts: 0,
  });

  for (const item of cart) {
    const newStock = Math.max(0, item.produit.stock - item.quantity);
    await updateCachedProductStock(item.produit.id, newStock);
    await applyLocalStockAfterSale(item.produit.id, newStock);
  }

  void requestBackgroundSync();
  triggerSyncFlush();

  return saleId;
}

/**
 * Pay an existing credit (partial or full).
 * Note: idéalement à migrer aussi en RPC transactionnelle (update credit + update facture + log).
 */
/** Paiement crédit mis en file locale (sync au retour réseau). */
export async function queueOfflineCreditPayment(params: {
  creditId: string;
  amount: number;
  userId: string;
  userName: string;
  commerceId?: string;
}): Promise<void> {
  const pending = await getLocalCredits();
  const dup = pending.some(
    (c) =>
      String(c.credit_id) === String(params.creditId) &&
      Number(c.amount) === Number(params.amount) &&
      (c.sync_status === 'pending' ||
        c.sync_status === 'syncing' ||
        c.sync_status === undefined ||
        c.sync_status === null)
  );
  if (dup) return;

  const id = crypto.randomUUID();
  await addLocalCredit({
    id,
    credit_id: params.creditId,
    amount: params.amount,
    user_id: params.userId,
    user_name: params.userName,
    commerce_id: params.commerceId ?? null,
    created_at: new Date().toISOString(),
    sync_status: 'pending',
    sync_attempts: 0,
  });
  await requestBackgroundSync();
}

export async function payCredit(params: {
  creditId: string;
  amount: number;
  userId: string;
  userName: string;
  commerceId?: string;
}): Promise<void> {
  const { creditId, amount, userId, userName } = params;

  // Fetch current credit
  const { data: credit, error: fetchErr } = await supabase
    .from('credits')
    .select('*')
    .eq('id', creditId)
    .single();

  if (fetchErr || !credit) throw new Error(fetchErr?.message || 'Crédit introuvable');

  const remaining = Number(credit.montant_restant);
  if (amount > remaining) throw new Error('Le montant payé ne peut pas dépasser le solde restant');
  if (amount <= 0) throw new Error('Montant invalide');

  const newRemaining = remaining - amount;
  const newTotalPaid = Number(credit.total_paid || 0) + amount;
  const isFullyPaid = newRemaining <= 0;

  // Update credit
  const { error: updCreditErr } = await supabase
    .from('credits')
    .update({
      montant_restant: Math.max(0, newRemaining),
      total_paid: newTotalPaid,
      statut: isFullyPaid ? 'paye' : 'en_cours',
    })
    .eq('id', creditId);

  if (updCreditErr) throw updCreditErr;

  // Update facture total to add newly paid amount
  if (credit.facture_id) {
    const { data: facture, error: fetchFactErr } = await supabase
      .from('factures')
      .select('total_final')
      .eq('id', credit.facture_id)
      .single();

    if (fetchFactErr) throw fetchFactErr;

    const nextTotal = Number(facture?.total_final || 0) + amount;

    const { error: updFactErr } = await supabase
      .from('factures')
      .update({
        total_final: nextTotal,
        statut: isFullyPaid ? 'payee' : 'credit',
      })
      .eq('id', credit.facture_id);

    if (updFactErr) throw updFactErr;
  }

  // Log activity
  const { error: logErr } = await supabase.rpc('log_activity', {
    _user_id: userId,
    _action: 'paiement_credit',
    _metadata: {
      credit_id: creditId,
      amount,
      new_remaining: newRemaining,
      client_name: credit.client_name || '',
      vendeur: userName,
    },
  });

  if (logErr) throw logErr;
}

/**
 * Fetch recent sales for commerces (paginated).
 */
export async function fetchRecentSales(commerceIds: string[], page = 0, limit = 20) {
  if (commerceIds.length === 0) return [];

  const { data, error } = await supabase
    .from('factures')
    .select(
      `
      id, total_final, mode_paiement, statut, created_at,
      sessions!inner(commerce_id, gerant_id, numero_table)
    `
    )
    .in('sessions.commerce_id', commerceIds)
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (error) throw error;

  return data || [];
}
