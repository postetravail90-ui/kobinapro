/**
 * Phase 3 — moteur de sync : batch, retry, priorités.
 * Ordre strict : ventes → crédits → stock (file) → dépenses → messages → reste de la file.
 */

/** Nombre max d’éléments traités par passe dans une même catégorie (évite de bloquer le thread). */
export const BATCH_SALES = 8;
export const BATCH_CREDITS = 6;
export const BATCH_STOCK_QUEUE = 10;
export const BATCH_DEPENSES = 8;
export const BATCH_MESSAGES = 15;
export const BATCH_GENERIC_QUEUE = 12;

/** Pause légère entre lots (ms) pour laisser respirer l’UI / le réseau. */
export const INTER_BATCH_DELAY_MS = 40;

export const MAX_SYNC_ATTEMPTS = 10;

/** Backoff exponentiel : base * 2^(attempt-1), plafonné. */
export const RETRY_BASE_DELAY_MS = 2_000;
export const RETRY_MAX_DELAY_MS = 120_000;

/** Clés KV pour curseurs / delta (sortie). */
export const KV_LAST_OUTBOUND_OK = 'sync:last_outbound_ok_at';
export const KV_LAST_CYCLE_STATS = 'sync:last_cycle_stats';
