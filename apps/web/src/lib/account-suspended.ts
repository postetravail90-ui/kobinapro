import { supabase } from '@/integrations/supabase/client';

/** Retourne true si le compte doit être bloqué (colonne absente ou false → non suspendu). */
export async function isAccountSuspended(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('users')
    .select('account_suspended')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.warn('[account-suspended]', error.message);
    return false;
  }
  return data?.account_suspended === true;
}
