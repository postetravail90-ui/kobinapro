# KOBINA PRO (monorepo)

Application commerçante : **web** (React + Vite), **mobile** (Capacitor Android), packages partagés (`core`, `sync`, `ui`, `db`).

## Prérequis

- **Node.js 20+** (voir `engines` dans le `package.json` racine)
- **pnpm 9+** : `npm install -g pnpm`
- **Supabase** : projet cloud (ou CLI en local pour le développement base de données)

## Démarrage rapide (web uniquement)

```bash
pnpm install
cp apps/web/.env.example apps/web/.env
# Éditer apps/web/.env (Supabase, sync, Firebase si besoin)
pnpm dev
```

Le serveur de dev est lancé par le workspace `@kobina/web`.

## Qualité avant release

```bash
pnpm validate
```

Enchaîne : **`typecheck:libs`** (`@kobina/core`, `db`, `sync`, `ui`, `mobile`) → **`tsc` web** → **tests** → **build** du web.

Style / dette ESLint : `pnpm lint:web` (la **CI** le lance en **non bloquant** tant que le legacy `any` / hooks est nettoyé).

## Build production (web)

```bash
pnpm build
```

Sortie : `apps/web/dist/`.

## Android (Capacitor)

Le projet Gradle est sous **`apps/mobile/android`** (versionné dans ce dépôt).

1. Builder le front et synchroniser les assets :

```bash
pnpm mobile:sync
```

2. Ouvrir Android Studio :

```bash
pnpm mobile:open
```

3. Dans Android Studio : choisir un appareil / émulateur → **Run**.

Pour les **notifications Firebase**, place `google-services.json` dans `apps/mobile/android/app/` (fichier ignoré par Git dans le sous-projet Android ; ne pas commiter sur un dépôt public).

## Workspaces

| Dossier | Rôle |
|---------|------|
| `apps/web` | PWA / app principale React |
| `apps/mobile` | Wrapper Capacitor (`webDir` → `../web/dist`) |
| `apps/desktop` | **Prévu** — emplacement réservé (pas d’app Tauri livrée ici pour l’instant) |
| `packages/core` | Logique métier partagée |
| `packages/sync` | Moteur offline / sync |
| `packages/ui` | Composants UI partagés |
| `packages/db` | Drizzle + migrations |

## Base de données locale (Supabase CLI)

Optionnel pour travailler avec une instance locale :

```bash
supabase start
supabase db reset
pnpm dev
```

## CI

Le workflow GitHub Actions **`.github/workflows/ci.yml`** exécute typecheck, lint, tests et build sur les branches `main` et `dev`.

## Sécurité (rappels)

- RLS activée sur les tables métier Supabase
- Pas de secret « service role » dans le front — uniquement clés **anon / publishable**
- Webhooks vérifiés (HMAC, etc.) côté backend
- Voir `docs/SYNC.md`, `docs/PAYSTACK.md`
