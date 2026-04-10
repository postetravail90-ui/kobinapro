import { RETRY_BASE_DELAY_MS, RETRY_MAX_DELAY_MS } from './config';

/** Délai avant prochain essai (tentative 1 = premier échec → premier retry). */
export function computeBackoffMs(attemptAfterFailure: number): number {
  const n = Math.max(1, attemptAfterFailure);
  const raw = RETRY_BASE_DELAY_MS * Math.pow(2, n - 1);
  return Math.min(RETRY_MAX_DELAY_MS, raw);
}

export function nextRetryIso(attemptAfterFailure: number): string {
  return new Date(Date.now() + computeBackoffMs(attemptAfterFailure)).toISOString();
}

export function isReadyForRetry(nextRetryAt: unknown): boolean {
  if (nextRetryAt == null || nextRetryAt === '') return true;
  if (typeof nextRetryAt !== 'string') return true;
  const t = Date.parse(nextRetryAt);
  if (Number.isNaN(t)) return true;
  return t <= Date.now();
}
