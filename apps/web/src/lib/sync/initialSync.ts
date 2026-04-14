/**
 * Premier remplissage SQLite après connexion (seul moment où on attend le réseau pour l’import).
 * Les lectures courantes passent uniquement par SQLite via getProducts / getExpenses / getCredits.
 */
import { pullProductsFromRemote } from "@/lib/data/products";
import { pullExpensesFromRemote } from "@/lib/data/expenses";
import { pullCreditsFromRemote } from "@/lib/data/credits";
import { initLocalDB } from "@/lib/db";

const SEEDED_KEY = "kbv1:seeded";

export async function initialSync(userId: string, commerceServerIds: string[]): Promise<void> {
  if (commerceServerIds.length === 0) return;

  const key = `${SEEDED_KEY}:${userId}:${commerceServerIds.slice().sort().join(",")}`;
  if (typeof localStorage !== "undefined" && localStorage.getItem(key)) {
    return;
  }
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return;
  }

  try {
    await initLocalDB();
    await Promise.all([
      pullProductsFromRemote(commerceServerIds),
      pullExpensesFromRemote(commerceServerIds),
      pullCreditsFromRemote(commerceServerIds),
    ]);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, "1");
    }
    if (import.meta.env.DEV) {
      console.info("[InitialSync] SQLite à jour pour", commerceServerIds.length, "commerce(s)");
    }
  } catch (e) {
    console.warn("[InitialSync] échec (l’app reste utilisable hors ligne) :", e);
  }
}
