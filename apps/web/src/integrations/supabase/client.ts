import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import type { Database } from './types';
import { createFetchWithTimeout } from '@/lib/fetch-with-timeout';
import { SUPABASE_FETCH_TIMEOUT_MS } from '@/lib/network-timeouts';

/** En dev uniquement : évite le crash `supabaseKey is required` si `.env` est absent — l’API réelle échouera tant que vous ne renseignez pas le vrai projet. */
const DEV_PLACEHOLDER_URL = 'https://placeholder.supabase.co';
/** Chaîne non vide acceptée par `createClient` ; n’est pas une vraie clé anon. */
const DEV_PLACEHOLDER_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.dev-placeholder-not-a-real-jwt-signature';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = (
  (import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '') as string
).trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] Variables manquantes :', {
    url: supabaseUrl ? 'OK' : 'MISSING',
    key: supabaseAnonKey ? 'OK' : 'MISSING',
  });
}

const urlTrim = supabaseUrl;
const keyTrim = supabaseAnonKey;
/** Vrai config absente : placeholders pour éviter le crash `createClient` (écran blanc sur Android / web). */
const usingConfigPlaceholders = !urlTrim || !keyTrim;

const SUPABASE_URL = urlTrim || DEV_PLACEHOLDER_URL;
const SUPABASE_PUBLISHABLE_KEY = keyTrim || DEV_PLACEHOLDER_ANON_KEY;
const isNative = Capacitor.isNativePlatform();

if (usingConfigPlaceholders) {
  const msg =
    '[Supabase] VITE_SUPABASE_URL ou clé manquante — placeholders actifs : l’UI charge, mais connexion et données ne marcheront pas. Pour Android : placez apps/web/.env puis `pnpm run build` et `pnpm exec cap sync` depuis apps/web.';
  if (import.meta.env.DEV) {
    console.warn(msg);
  } else {
    console.error(msg);
  }
}

/** Même source que `createClient` — pour les messages d’erreur (évite un faux « .env vide » si Vite n’a pas rechargé un module). */
export function getSupabaseConnectionInfo(): {
  url: string;
  hasKey: boolean;
  /** Vrai si URL ou clé réelle absente au build (dev ou prod). */
  usingDevPlaceholders: boolean;
} {
  return {
    url: SUPABASE_URL,
    hasKey: Boolean(keyTrim),
    usingDevPlaceholders: usingConfigPlaceholders,
  };
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: window.localStorage,
    persistSession: true,
    autoRefreshToken: true,
    flowType: 'pkce',
    detectSessionInUrl: !isNative,
  },
  global: {
    fetch: createFetchWithTimeout(SUPABASE_FETCH_TIMEOUT_MS),
    headers: {
      'X-Client-Info': isNative ? 'kobina-pro-mobile' : 'kobina-pro-web',
    },
  },
});
