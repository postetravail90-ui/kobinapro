/**
 * Normalise un numéro de téléphone (supprime espaces, +, etc.)
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';

  return phone
    .replace(/\s+/g, '')       // enlever espaces
    .replace(/-/g, '')         // enlever tirets
    .replace(/\(/g, '')        // enlever parenthèses
    .replace(/\)/g, '')
    .replace(/^\+/, '');       // enlever le +
}