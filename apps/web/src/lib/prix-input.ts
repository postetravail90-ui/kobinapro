/** Prix saisi (virgule française ou point, espaces). */
export function parsePrixInput(raw: string): number | null {
  const s = String(raw ?? '')
    .trim()
    .replace(/\s/g, '')
    .replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}
