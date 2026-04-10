import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

export type AdminScopeKey =
  | 'dashboard'
  | 'users'
  | 'commerces'
  | 'billing'
  | 'analytics'
  | 'fraude'
  | 'security'
  | 'support'
  | 'logs'
  | 'settings'
  | 'monitoring';

export type AdminStaffScopesRow = Database['public']['Tables']['admin_staff_scopes']['Row'];

export function useAdminScopes() {
  const { user, role } = useAuth();
  const [scopesRow, setScopesRow] = useState<AdminStaffScopesRow | null>(null);
  const [loading, setLoading] = useState(role === 'admin_staff');

  const refresh = useCallback(async () => {
    if (role !== 'admin_staff' || !user) {
      setScopesRow(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('admin_staff_scopes')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) console.error('[useAdminScopes]', error);
    setScopesRow(data ?? null);
    setLoading(false);
  }, [role, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const can = useCallback(
    (key: AdminScopeKey): boolean => {
      if (role === 'super_admin') return true;
      if (role !== 'admin_staff' || !scopesRow) return false;
      switch (key) {
        case 'dashboard':
          return scopesRow.scope_dashboard;
        case 'users':
          return scopesRow.scope_users;
        case 'commerces':
          return scopesRow.scope_commerces;
        case 'billing':
          return scopesRow.scope_billing;
        case 'analytics':
          return scopesRow.scope_analytics;
        case 'fraude':
          return scopesRow.scope_fraude;
        case 'security':
          return scopesRow.scope_security;
        case 'support':
          return scopesRow.scope_support;
        case 'logs':
          return scopesRow.scope_logs;
        case 'settings':
          return scopesRow.scope_settings;
        case 'monitoring':
          return scopesRow.scope_monitoring;
        default:
          return false;
      }
    },
    [role, scopesRow]
  );

  return { loading, scopesRow, can, refresh, isSuper: role === 'super_admin', isStaff: role === 'admin_staff' };
}
