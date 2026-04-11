/**
 * Moteur de sync Phase 3 : priorités, lots (batch), retry exponentiel + fenêtre,
 * file stock séparée, anti-doublons (idempotence vente + file), curseur sortie.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from '@/integrations/supabase/types';

type PublicTable = keyof Database['public']['Tables'];
type PublicFn = keyof Database['public']['Functions'];
import { payCredit } from '@/services/sales';
import {
  getSyncQueue,
  removeSyncItem,
  updateSyncItem,
  getOfflineSales,
  removeOfflineSale,
  updateOfflineSale,
  getOfflineDepenses,
  removeOfflineDepense,
  updateOfflineDepense,
  getOfflineMessages,
  removeOfflineMessage,
  getLocalCredits,
  removeLocalCredit,
  updateLocalCredit,
  setCache,
} from '@/lib/offline-db';
import { isNetworkReachable } from '@/lib/network-reachability';
import {
  BATCH_SALES,
  BATCH_CREDITS,
  BATCH_STOCK_QUEUE,
  BATCH_DEPENSES,
  BATCH_MESSAGES,
  BATCH_GENERIC_QUEUE,
  MAX_SYNC_ATTEMPTS,
  KV_LAST_OUTBOUND_OK,
  KV_LAST_CYCLE_STATS,
} from '@/lib/sync-engine/config';
import { chunkArray, betweenBatches } from '@/lib/sync-engine/batch';
import { isReadyForRetry, nextRetryIso } from '@/lib/sync-engine/retry';
import { partitionSyncQueue, isUniqueViolation } from '@/lib/sync-engine/dedupe';
import type { SyncQueueItem } from '@/lib/local/local-types';

let syncing = false;

async function resetStuckOfflineSales() {
  const sales = await getOfflineSales();
  for (const s of sales) {
    if (s.sync_status === 'syncing') {
      await updateOfflineSale(String(s.id), { sync_status: 'pending' });
    }
  }
}

async function resetStuckDepenses() {
  const deps = await getOfflineDepenses();
  for (const d of deps) {
    if (d.sync_status === 'syncing') {
      await updateOfflineDepense(String(d.id), { sync_status: 'pending' });
    }
  }
}

async function resetStuckCredits() {
  const rows = await getLocalCredits();
  for (const r of rows) {
    if (r.sync_status === 'syncing') {
      await updateLocalCredit(String(r.id), { sync_status: 'pending' });
    }
  }
}

async function resetStuckSyncQueue() {
  const q = await getSyncQueue();
  for (const it of q) {
    if (it.sync_status === 'syncing') {
      await updateSyncItem(it.id, { sync_status: 'pending' });
    }
  }
}

function sortByCreatedAt(a: Record<string, unknown>, b: Record<string, unknown>): number {
  const ta = Date.parse(String(a.created_at || 0));
  const tb = Date.parse(String(b.created_at || 0));
  return (Number.isNaN(ta) ? 0 : ta) - (Number.isNaN(tb) ? 0 : tb);
}

function eligibleRow(row: Record<string, unknown>, attempts: number): boolean {
  if (attempts >= MAX_SYNC_ATTEMPTS) return false;
  return isReadyForRetry(row.next_retry_at);
}

async function processSaleBatch(syncedRef: { n: number }) {
  let all = (await getOfflineSales()).filter((s) => {
    const att = Number(s.sync_attempts || 0);
    return eligibleRow(s, att) && s.gerant_id && s.commerce_id && Array.isArray(s.items) && s.items.length;
  });
  all = [...all].sort(sortByCreatedAt);

  for (const batch of chunkArray(all, BATCH_SALES)) {
    for (const sale of batch) {
      const saleId = String(sale.id);
      const attempts = Number(sale.sync_attempts || 0);

      await updateOfflineSale(saleId, { sync_status: 'syncing' });

      try {
        const items = (
          sale.items as { produit_id: string; quantite: number; prix_unitaire: number }[]
        ).map((item) => ({
          produit_id: item.produit_id,
          quantite: item.quantite,
          prix_unitaire: item.prix_unitaire,
        }));

        const offlineMutationId = typeof sale.id === 'string' ? sale.id : String(sale.id ?? '');

        const { data: factureId, error: saleErr } = await supabase.rpc('process_sale', {
          p_commerce_id: String(sale.commerce_id),
          p_gerant_id: String(sale.gerant_id),
          p_mode: (sale.mode as 'cash' | 'mobile_money' | 'credit') || 'cash',
          p_items: items,
          p_partial_amount: sale.partial_amount != null ? Number(sale.partial_amount) : null,
          p_client_name: sale.client_name != null ? String(sale.client_name) : null,
          p_promise_date: sale.promise_date ? new Date(String(sale.promise_date)).toISOString() : null,
          p_user_name: sale.user_name != null ? String(sale.user_name) : null,
          p_client_mutation_id: offlineMutationId || null,
        });

        if (saleErr || !factureId) {
          if (isUniqueViolation(saleErr)) {
            await removeOfflineSale(saleId);
            syncedRef.n++;
            continue;
          }
          const msg = saleErr?.message || String(saleErr) || 'process_sale a échoué';
          await updateOfflineSale(saleId, {
            sync_status: 'failed',
            sync_error: msg,
            sync_attempts: attempts + 1,
            next_retry_at: nextRetryIso(attempts + 1),
          });
          continue;
        }

        if (sale.user_id) {
          const meta: Json = {
            mode: String(sale.mode ?? ''),
            total: Number(sale.total ?? 0),
            commerce_id: String(sale.commerce_id ?? ''),
            offline_id: String(sale.id ?? ''),
            offline_date: String(sale.created_at ?? ''),
            synced_by: String(sale.user_name || 'unknown'),
            facture_id: String(factureId),
          };
          await supabase.rpc('log_activity', {
            _user_id: String(sale.user_id),
            _action: 'vente_offline_sync',
            _metadata: meta,
          });
        }

        await removeOfflineSale(saleId);
        syncedRef.n++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erreur sync vente';
        await updateOfflineSale(saleId, {
          sync_status: 'failed',
          sync_error: msg,
          sync_attempts: attempts + 1,
          next_retry_at: nextRetryIso(attempts + 1),
        });
      }
    }
    await betweenBatches();
  }
}

async function processCreditsBatch(syncedRef: { n: number }) {
  let rows = (await getLocalCredits()).filter((r) => {
    const att = Number(r.sync_attempts || 0);
    return eligibleRow(r, att);
  });
  rows = [...rows].sort(sortByCreatedAt);

  for (const batch of chunkArray(rows, BATCH_CREDITS)) {
    for (const row of batch) {
      const id = String(row.id);
      const attempts = Number(row.sync_attempts || 0);

      await updateLocalCredit(id, { sync_status: 'syncing' });

      try {
        await payCredit({
          creditId: String(row.credit_id),
          amount: Number(row.amount),
          userId: String(row.user_id),
          userName: String(row.user_name || 'unknown'),
          commerceId: row.commerce_id ? String(row.commerce_id) : undefined,
        });
        await removeLocalCredit(id);
        syncedRef.n++;
      } catch (e) {
        if (isUniqueViolation(e)) {
          await removeLocalCredit(id);
          syncedRef.n++;
          continue;
        }
        const msg = e instanceof Error ? e.message : 'Erreur sync crédit';
        await updateLocalCredit(id, {
          sync_status: 'failed',
          sync_error: msg,
          sync_attempts: attempts + 1,
          next_retry_at: nextRetryIso(attempts + 1),
        });
      }
    }
    await betweenBatches();
  }
}

function queueItemReady(it: SyncQueueItem): boolean {
  const att = it.retries ?? 0;
  if (att >= MAX_SYNC_ATTEMPTS) return false;
  return isReadyForRetry(it.next_retry_at);
}

async function processOneSyncItem(item: SyncQueueItem, syncedRef: { n: number }) {
  await updateSyncItem(item.id, { sync_status: 'syncing', last_error: undefined });
  const attempts = item.retries || 0;

  try {
    let success = false;
    if (item.action === 'insert') {
      const { error } = await supabase
        .from(item.table as PublicTable)
        .insert(item.payload as never);
      success = !error;
      if (!success && isUniqueViolation(error)) success = true;
    } else if (item.action === 'update') {
      const { id: rowId, ...rest } = item.payload as { id: string; [key: string]: unknown };
      // Chaîne PostgREST + table dynamique : le typage union ne résout pas `.eq` ici.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from(item.table as PublicTable) as any).update(rest).eq('id', rowId);
      success = !error;
    } else if (item.action === 'rpc') {
      const { fn_name, ...args } = item.payload as { fn_name: string } & Record<string, unknown>;
      const { error } = await supabase.rpc(fn_name as PublicFn, args as never);
      success = !error;
    }

    if (success) {
      await removeSyncItem(item.id);
      syncedRef.n++;
    } else {
      await updateSyncItem(item.id, {
        retries: attempts + 1,
        sync_status: 'failed',
        last_error: 'Requête refusée ou erreur serveur',
        next_retry_at: nextRetryIso(attempts + 1),
      });
    }
  } catch (e) {
    const newRetries = attempts + 1;
    const msg = e instanceof Error ? e.message : 'Erreur';
    if (newRetries >= MAX_SYNC_ATTEMPTS) await removeSyncItem(item.id);
    else
      await updateSyncItem(item.id, {
        retries: newRetries,
        sync_status: 'failed',
        last_error: msg,
        next_retry_at: nextRetryIso(newRetries),
      });
  }
}

/** Re-lit la file à chaque lot pour éviter les doublons après suppression. */
async function drainSyncQueueLane(
  selectLane: (all: SyncQueueItem[]) => SyncQueueItem[],
  batchSize: number,
  syncedRef: { n: number }
) {
  while (true) {
    const all = await getSyncQueue();
    const lane = selectLane(all).filter(queueItemReady).sort((a, b) => {
      const pa = a.priority === 'critical' ? 0 : a.priority === 'high' ? 1 : a.priority === 'normal' ? 2 : 3;
      const pb = b.priority === 'critical' ? 0 : b.priority === 'high' ? 1 : b.priority === 'normal' ? 2 : 3;
      if (pa !== pb) return pa - pb;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
    if (!lane.length) break;
    const batch = lane.slice(0, batchSize);
    for (const item of batch) {
      await processOneSyncItem(item, syncedRef);
    }
    await betweenBatches();
  }
}

async function processDepensesBatch(syncedRef: { n: number }) {
  let deps = (await getOfflineDepenses()).filter((d) => {
    const att = Number(d.sync_attempts || 0);
    return eligibleRow(d, att);
  });
  deps = [...deps].sort(sortByCreatedAt);

  for (const batch of chunkArray(deps, BATCH_DEPENSES)) {
    for (const dep of batch) {
      const depId = String(dep.id);
      const attempts = Number(dep.sync_attempts || 0);

      await updateOfflineDepense(depId, { sync_status: 'syncing' });

      try {
        const depInsert: Database['public']['Tables']['depenses']['Insert'] = {
          commerce_id: String(dep.commerce_id),
          titre: String(dep.titre),
          description: dep.description != null ? String(dep.description) : null,
          montant: Number(dep.montant),
          created_by: String(dep.created_by || dep.user_id || ''),
        };
        const { error } = await supabase.from('depenses').insert(depInsert);
        if (error) {
          if (isUniqueViolation(error)) {
            await removeOfflineDepense(depId);
            syncedRef.n++;
            continue;
          }
          await updateOfflineDepense(depId, {
            sync_status: 'failed',
            sync_error: error.message,
            sync_attempts: attempts + 1,
            next_retry_at: nextRetryIso(attempts + 1),
          });
          continue;
        }
        await removeOfflineDepense(depId);
        syncedRef.n++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erreur sync dépense';
        await updateOfflineDepense(depId, {
          sync_status: 'failed',
          sync_error: msg,
          sync_attempts: attempts + 1,
          next_retry_at: nextRetryIso(attempts + 1),
        });
      }
    }
    await betweenBatches();
  }
}

async function processMessagesBatch(syncedRef: { n: number }) {
  const msgs = await getOfflineMessages();
  for (const batch of chunkArray(msgs, BATCH_MESSAGES)) {
    for (const msg of batch) {
      try {
        const msgInsert: Database['public']['Tables']['messages']['Insert'] = {
          sender_id: String(msg.sender_id),
          receiver_id: String(msg.receiver_id),
          commerce_id: String(msg.commerce_id),
          message: String(msg.message ?? ''),
          type: String(msg.type || 'text'),
        };
        const { error } = await supabase.from('messages').insert(msgInsert);
        if (!error) {
          await removeOfflineMessage(String(msg.id));
          syncedRef.n++;
        }
      } catch {
        /* retry */
      }
    }
    await betweenBatches();
  }
}

export async function processQueue(): Promise<number> {
  if (syncing || !(await isNetworkReachable())) return 0;
  syncing = true;
  const syncedRef = { n: 0 };

  try {
    await resetStuckOfflineSales();
    await resetStuckDepenses();
    await resetStuckCredits();
    await resetStuckSyncQueue();

    await processSaleBatch(syncedRef);
    await processCreditsBatch(syncedRef);

    await drainSyncQueueLane((all) => partitionSyncQueue(all).stock, BATCH_STOCK_QUEUE, syncedRef);

    await processDepensesBatch(syncedRef);

    await processMessagesBatch(syncedRef);

    await drainSyncQueueLane((all) => partitionSyncQueue(all).other, BATCH_GENERIC_QUEUE, syncedRef);

    await setCache(KV_LAST_OUTBOUND_OK, Date.now());
    await setCache(KV_LAST_CYCLE_STATS, {
      at: new Date().toISOString(),
      synced: syncedRef.n,
    });
  } finally {
    syncing = false;
  }

  return syncedRef.n;
}
