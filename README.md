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

Le serveur de dev est lancé par le workspace `@kobina/web` (souvent **http://localhost:8080**).

**Inscription / sauvegardes en local** : configurer Supabase (URLs de redirection, e‑mail, RLS). Guide pas à pas : **`docs/TESTER_EN_LOCAL.md`**.

## Qualité avant release

```bash
pnpm validate
```

Enchaîne : **`typecheck:libs`** → **typecheck web** → **`lint:web`** → **tests web** → **build web** (voir `package.json` racine).

À part : `pnpm lint:web` seul pour itérer sur le style ESLint.

## Build production (web)

```bash
pnpm build
```

Sortie : `apps/web/dist/`.

## Android (Capacitor + Android Studio)

Le projet Gradle est sous **`apps/mobile/android`** (versionné dans ce dépôt).

1. **Configurer le web** : `apps/web/.env` (voir `.env.example`) — nécessaire pour un build qui pointe vers votre Supabase.
2. **Build web + copie dans Android** :

```bash
pnpm mobile:sync
```

3. **Android Studio** : *File → Open* → sélectionner le dossier **`apps/mobile/android`** (pas `apps/web`). JDK **17**, SDK **API 34**. Guide pas à pas : **`apps/mobile/README.md`**.

4. Ou ouvrir le module depuis le terminal :

```bash
pnpm mobile:open
```

5. Choisir un émulateur ou un téléphone → **Run** (variante **debug**).

**Firebase / FCM** : placer `google-services.json` dans `apps/mobile/android/app/` (ignoré par Git — ne pas publier sur un dépôt public).

## Workspaces

| Dossier | Rôle |
|---------|------|
| `apps/web` | PWA / app principale React |
| `apps/mobile` | Wrapper Capacitor (`webDir` → `../web/dist`) — voir **`apps/mobile/README.md`** pour Android Studio |
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
