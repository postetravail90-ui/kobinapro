# Mobile (Capacitor)

## Prérequis

- Build web : `pnpm --filter @kobina/web build`

## Plugins (PART 9)

| Rôle | Package |
|------|---------|
| Connectivité | `@capacitor/network` |
| Premier plan / arrière-plan | `@capacitor/app` |
| Jetons de session (Keychain / Keystore) | `capacitor-secure-storage-plugin@0.10.0` |
| SQLite natif | `@capacitor-community/sqlite` |
| Fallback PWA (bundlé dans le web) | `sql.js` |

La config SQLite (`CapacitorSQLite`) est dans `capacitor.config.ts`. Les jetons sont lus/écrits dans `apps/web/src/lib/auth/sessionVault.ts` (stockage sécurisé sur natif, `localStorage` dans le navigateur).

## Sync natif

```powershell
Set-Location "apps/mobile"
pnpm install
pnpm run cap:sync
pnpm run cap:open:android
```

- `webDir` pointe vers `../web/dist`
- Les plugins natifs doivent figurer dans **ce** `package.json` pour que `cap sync` enregistre Android/iOS.

## Checklist hors-ligne (manuel)

- [ ] App ouverte sans réseau → pas de crash, pas d’écran blanc
- [ ] Utilisateur déjà connecté → accès direct au tableau de bord (session + SQLite locaux)
- [ ] Vente créée hors ligne → visible tout de suite dans l’UI locale
- [ ] Wi-Fi réactivé → sync automatique sous ~5 s (moteur + retour réseau)
- [ ] Supabase (ou endpoint de sync) → la vente apparaît côté serveur
