# KOBINA PRO - Architecture Initiale

## Priorites
- Offline-first avec ecritures locales puis sync batch
- RLS stricte multi-tenant sans fuite inter-business
- UX mobile instantanee sur Android faible puissance
- TypeScript strict partout (zero `any`)

## Build Order implante (phase scaffold)
1. Monorepo pnpm workspaces
2. Supabase dossier local + migrations
3. Tables + indexes + RLS helper policies
4. Base auth (a brancher ensuite dans apps/web)
5. `packages/core`
6. `packages/sync`
7. `packages/ui`

## Next Steps (implementation)
- Ecrans web: Sale -> Products -> Credits -> Expenses -> Dashboard
- Capacitor SQLite + secure storage JWT
- Realtime limite a messages + alertes stock
- Webhooks Paystack idempotents + audit logs
- SuperAdmin panel + observabilite Sentry
