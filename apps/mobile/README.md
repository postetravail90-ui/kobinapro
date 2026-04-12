# KOBINA PRO — couche mobile (Capacitor Android)

Ce workspace embarque la **PWA** construite dans `apps/web/dist` dans une coque Android (Capacitor 6). La configuration Capacitor est dans `capacitor.config.ts` (`webDir: ../web/dist`).

## Prérequis

| Outil | Détail |
|--------|--------|
| **Android Studio** | Version récente (p. ex. Ladybug / Koala) avec Android SDK |
| **JDK 17** | Requis par Android Gradle Plugin 8.2 — dans Studio : *File → Settings* (ou *Android Studio → Settings* sur macOS) → *Build, Execution, Deployment → Build Tools → Gradle* → **Gradle JDK** = **17** (souvent « jbr-17 » intégré à Studio) |
| **SDK Android** | **API 34** (compileSdk du projet) : *SDK Manager* → cocher *Android 14.0 (API 34)* + *Android SDK Build-Tools* |
| **Node + pnpm** | Depuis la **racine** du monorepo : Node 20+, `pnpm install` |

## 1. Variables d’environnement (web)

L’app embarquée lit la config au **build** Vite. Avant un sync :

1. À la racine du repo : `cp apps/web/.env.example apps/web/.env`
2. Renseigner au minimum `VITE_SUPABASE_URL` et la clé publishable (voir `.env.example`).

Sans `.env`, le build peut passer avec des placeholders, mais l’app ne parlera pas à votre vrai backend.

## 2. Build web + synchronisation Capacitor

Toujours depuis la racine **`kobina-pro`** :

```bash
pnpm mobile:sync
```

Cela enchaîne : **build production** de `@kobina/web` → copie des assets dans `android/app/src/main/assets/public` + mise à jour des plugins natifs.

Équivalent manuel depuis `apps/mobile` :

```bash
pnpm run prepare:native
```

À refaire **après chaque changement** du front que vous voulez voir sur l’émulateur ou le téléphone.

## 3. Ouvrir le projet dans Android Studio

1. Lancer **Android Studio**.
2. **File → Open…** (pas « Import »).
3. Sélectionner le dossier :

   **`kobina-pro/apps/mobile/android`**

   C’est le projet Gradle racine (`settings.gradle`, `build.gradle`).  
   **Ne pas** ouvrir seulement `apps/mobile` ni `apps/web` — Studio attend le module Android.

4. Laisser **Gradle Sync** se terminer (barre de statut en bas). La première fois, le téléchargement des dépendances peut être long.

### JDK / Gradle

Si le sync échoue avec une erreur de version Java : régler **Gradle JDK** sur **17** (voir tableau prérequis).

## 4. Lancer l’app (Run / Debug)

1. **Device Manager** : créer un **AVD** (émulateur) API 33 ou 34 si besoin, ou brancher un téléphone avec **débogage USB** activé.
2. Choisir l’appareil dans la liste déroulante en haut.
3. **Run → Run ‘app’** (ou ▶️). Le variant **debug** signe automatiquement l’APK pour le développement.

Ou depuis le terminal (ouvre Android Studio sur le module Android) :

```bash
pnpm mobile:open
```

(équivalent à `pnpm --filter @kobina/mobile cap:open:android` depuis la racine).

## 5. Firebase / `google-services.json` (optionnel)

Pour **FCM** (notifications push natives), placez le fichier **`google-services.json`** fourni par la console Firebase dans :

`apps/mobile/android/app/`

Il est **ignoré par Git** (voir `android/.gitignore`) : ne le commitez pas sur un dépôt public. Sans ce fichier, le build reste valide ; le plugin Google Services n’est appliqué que si le fichier est présent (`app/build.gradle`).

## 6. Dépannage

| Symptôme | Piste |
|----------|--------|
| Écran blanc ou assets anciens | Relancer `pnpm mobile:sync` puis **Run** à nouveau. |
| Erreur « SDK not found » / compileSdk | Installer **API 34** + build-tools dans SDK Manager. |
| Gradle sync impossible | Vérifier **JDK 17**, connexion réseau, proxy éventuel. |
| Nouveau plugin Capacitor ajouté | `pnpm install` puis `pnpm exec cap sync` depuis `apps/mobile` (ou `mobile:sync` depuis la racine). |

## 7. iOS

Non généré dans ce dépôt. Quand vous en aurez besoin : depuis `apps/mobile`, `pnpm exec cap add ios` puis ouvrir le workspace Xcode.
