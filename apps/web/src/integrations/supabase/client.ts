import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import type { Database } from './types';
import { createFetchWithTimeout } from '@/lib/fetch-with-timeout';
import { SUPABASE_FETCH_TIMEOUT_MS } from '@/lib/network-timeouts';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

if (import.meta.env.DEV) {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    console.warn(
      '[Supabase] Définissez VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY (ou VITE_SUPABASE_ANON_KEY) dans apps/web/.env'
    );
  }
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    flowType: 'pkce',
    detectSessionInUrl: !Capacitor.isNativePlatform(),
  },
  global: {
    fetch: createFetchWithTimeout(SUPABASE_FETCH_TIMEOUT_MS),
  },
});
