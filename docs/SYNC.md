# Synchronisation offline

## Choix du stockage de file (web vs natif)

Dans `apps/web/src/lib/sync.ts`, **`ensureSyncEngine()`** construit une seule fois le moteur :

| Contexte | Store | Détail |
|----------|--------|--------|
| **Navigateur** (PWA, dev) | `LocalQueueStore` | File en `localStorage`. |
| **Capacitor natif** (iOS / Android) | SQLite via `openSqliteSyncStore()` | Détection avec `Capacitor.isNativePlatform()` (`@capacitor/core`, import statique dans `sync.ts`). |

Si l’ouverture SQLite échoue (plugin absent, erreur runtime), un **fallback** vers `LocalQueueStore` est journalisé dans la console.

`initOfflineSyncBindings()` dans `main.tsx` appelle `ensureSyncEngine()` de façon asynchrone puis branche `bindAutoSync` et un premier `flushOnce`. Les mutations hors ligne (`offline-mutations.ts`) appellent `await ensureSyncEngine()` avant `enqueue`.

**File d’attente + schéma prod** : `createWithOfflineQueue` enfile des **INSERT** sur les tables Supabase réelles `produits` et `depenses` (écrans Produits, Dépenses en ligne, ajout rapide produit en caisse). Les ventes passent toujours par `process_sale` / file offline existante (`offline-db`) — pas d’INSERT direct sur `factures`.

## Web (PWA)

- Edge Function `sync-batch` : authentification JWT + **100 requêtes / minute / utilisateur** via `consume_edge_rate_limit`.

## Mobile (Capacitor)

- **Plugin SQLite** : `@kobina/sync` déclare `@capacitor-community/sqlite` en **peer optionnelle** (voir `packages/sync/package.json`). Pour que `openSqliteSyncStore()` fonctionne sur iOS/Android, le projet Capacitor doit dépendre de ce plugin (version alignée avec Capacitor, ex. ^6.x). Dans ce monorepo, **`apps/mobile/package.json`** inclut déjà `@capacitor-community/sqlite` ; après ajout ou mise à jour, exécuter `pnpm cap:sync` depuis `apps/mobile` (ou `npx cap sync`). Sans le plugin natif correctement synchronisé, le code bascule sur le fallback `LocalQueueStore` (voir section ci-dessus).
- Après `pnpm --filter @kobina/web build`, lancer `pnpm mobile:sync` depuis la racine du monorepo.

Exemple manuel (équivalent à ce que fait le bootstrap web sur natif) :

```ts
import { OfflineSyncEngine, openSqliteSyncStore } from "@kobina/sync";

const store = await openSqliteSyncStore();
const engine = new OfflineSyncEngine(store, client, { onPendingCountChanged: ... });
```
