import { INTER_BATCH_DELAY_MS } from './config';

export function chunkArray<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function betweenBatches(): Promise<void> {
  if (INTER_BATCH_DELAY_MS > 0) await sleep(INTER_BATCH_DELAY_MS);
}
