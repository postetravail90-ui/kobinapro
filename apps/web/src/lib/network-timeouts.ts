/**
 * Délais réseau mobile (4G instable, latence vers Supabase) : 45s coupait souvent des requêtes valides.
 * Ajuster ici si besoin.
 */
export const SUPABASE_FETCH_TIMEOUT_MS = 120_000; // 2 min par requête HTTP Supabase
/** Étape Mot de passe seul (évite spinner infini si /auth/v1 ne répond pas). */
export const SIGN_IN_MAX_MS = 75_000;
/** RPC + fallback user_roles après connexion. */
export const ROLE_RESOLVE_MAX_MS = 40_000;
/** Garde globale sur le formulaire de connexion. */
export const LOGIN_FLOW_MAX_MS = 130_000;
export const REGISTER_FLOW_MAX_MS = 300_000; // 5 min inscription + attente rôle
