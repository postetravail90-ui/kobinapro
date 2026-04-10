# KOBINA PRO (Monorepo Scaffold)

## Prerequis
- Node.js 20+
- pnpm 9+
- Supabase CLI

## Setup
```bash
pnpm install
supabase start
supabase db reset
pnpm dev
```

## Workspaces
- `apps/web` : React PWA
- `apps/mobile` : Capacitor wrapper
- `apps/desktop` : Tauri wrapper
- `packages/core` : logique metier pure
- `packages/sync` : moteur offline sync
- `packages/ui` : composants partages
- `packages/db` : Drizzle schema + migrations

## Security non-negotiable
- RLS activee sur toutes les tables metier
- Zero secret cote frontend
- Webhooks verifies (HMAC SHA-512)
- Audit logs pour actions sensibles
- Edge `sync-batch` : plafond **100 req/min/utilisateur** (voir migration `edge_rate_counters`)

## Docs
- `docs/SYNC.md` — offline + SQLite mobile
- `docs/PAYSTACK.md` — webhook + metadata
