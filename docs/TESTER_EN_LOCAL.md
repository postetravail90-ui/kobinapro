# Tester et enregistrer en local (Kobina PRO)

Ce guide permet de **lancer l’app**, de **créer un compte**, d’**enregistrer des données** (ventes, produits, etc.) et de **valider** le projet avant un push.

## 1. Préparer l’environnement

À la racine du monorepo :

```bash
pnpm install
```

Copier les variables du front :

```bash
cp apps/web/.env.example apps/web/.env
```

Éditer `apps/web/.env` et renseigner au minimum :

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (ou `VITE_SUPABASE_ANON_KEY`)
- `VITE_SYNC_BATCH_ENDPOINT` (URL de l’Edge Function `sync-batch`, même projet que Supabase)

Sans ces valeurs, l’API Supabase ne répond pas : **inscription et sauvegardes échoueront**.

## 2. Lancer le front en développement

```bash
pnpm dev
```

Ouvrir l’URL affichée par Vite (souvent **http://localhost:8080/** — port dans `apps/web/vite.config.ts`). Si vous testez depuis un **autre appareil** ou par **IP locale** (ex. `http://192.168.x.x:8080/`), ajoutez **exactement** cette origine dans Supabase → **Authentication → URL configuration** → **Redirect URLs** (ex. `http://192.168.100.18:8083/**`), sinon la connexion peut échouer avec une erreur réseau.

## 3. Supabase : autoriser localhost (indispensable pour l’inscription)

Dans le tableau Supabase du projet :

1. **Authentication → URL configuration**
   - **Site URL** : `http://localhost:8080` (ou laisser la prod mais ajouter les redirect ci‑dessous).
   - **Redirect URLs** : ajouter au moins  
     `http://localhost:8080/**`  
     et si besoin :  
     `http://localhost:8080/auth/login`  
     `http://localhost:8080/auth/reset-password`

2. **Authentication → Providers → Email**  
   Pour tester vite sans mail : vous pouvez **désactiver temporairement « Confirm email »** (uniquement en dev). Sinon, après inscription, l’utilisateur doit confirmer par e‑mail avant d’avoir une session.

3. **RLS / policies** : les tables métier (`profiles`, `commerces`, etc.) doivent avoir des politiques qui **autorisent insert/update** pour les rôles attendus. Si une sauvegarde « échoue sans message » : vérifier l’onglet **Network** du navigateur et les logs Supabase.

## 4. Parcours de test typique

1. Aller sur **Inscription** (`/auth/register`), créer un compte.  
2. Si le message indique que le **rôle** n’est pas encore attribué : vérifier les triggers / table `user_roles` côté SQL (voir doc métier / migrations du projet).  
3. Une fois connecté : créer un **commerce**, des **produits**, une **vente** ou une **dépense** selon les écrans disponibles.  
4. Mode **hors ligne** : couper le réseau puis refaire une action : les mutations partent en file d’attente et se synchronisent au retour en ligne (si l’Edge Function et RLS sont corrects).

## 5. « Enregistrer » le code (Git)

Après vos changements :

```bash
git status
git add …
git commit -m "votre message"
git push
```

## 6. Écran blanc au démarrage

L’interface se monte **tout de suite** ; SQLite (sql.js) s’initialise en arrière-plan. Si un écran reste vide : ouvrez la **console** du navigateur (F12), vérifiez les erreurs réseau (WASM, modules), rechargez avec **Ctrl+Shift+R**. Assurez-vous d’ouvrir l’URL affichée par Vite (souvent `http://localhost:8080/`).

## 7. Vérifier la qualité avant de pousser

```bash
pnpm validate
```

Enchaîne typecheck (libs + web), lint web, tests et build de production du web.

## 8. Tester la coque Android (optionnel)

```bash
pnpm mobile:sync
pnpm mobile:open
```

Puis **Run** dans Android Studio. Voir `apps/mobile/README.md`.
