import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'super_admin' | 'admin_staff' | 'proprietaire' | 'gerant';

/** Aligné sur `public.get_user_role` (priorité la plus élevée d’abord). */
const ROLE_PRIORITY: Record<AppRole, number> = {
  super_admin: 1,
  admin_staff: 2,
  proprietaire: 3,
  gerant: 4,
};

function pickHighestRole(roles: string[]): AppRole | null {
  let best: AppRole | null = null;
  let bestP = 99;
  for (const r of roles) {
    const role = r as AppRole;
    const p = ROLE_PRIORITY[role];
    if (p != null && p < bestP) {
      bestP = p;
      best = role;
    }
  }
  return best;
}

/**
 * Résout le rôle applicatif depuis la base.
 * 1) RPC get_user_role (SECURITY DEFINER)
 * 2) Lecture user_roles + tri par priorité (évite .limit(1) aléatoire)
 */
export async function fetchUserRole(userId: string): Promise<AppRole | null> {
  const { data: rpcRole, error: rpcErr } = await supabase.rpc('get_user_role', {
    _user_id: userId,
  });

  if (!rpcErr && rpcRole) {
    return rpcRole as AppRole;
  }

  const { data: rows, error } = await supabase.from('user_roles').select('role').eq('user_id', userId);

  if (error) {
    console.error('[auth-role] user_roles:', error);
    return null;
  }

  if (!rows?.length) return null;
  return pickHighestRole(rows.map((x) => x.role));
}
