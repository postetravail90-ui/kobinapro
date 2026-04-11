import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';

type ManagerPermRow = Database['public']['Tables']['manager_permissions']['Row'];

export interface ManagerPermissions {
  can_sell: boolean;
  can_manage_products: boolean;
  can_add_stock: boolean;
  can_add_products: boolean;
  can_use_sessions: boolean;
  can_add_expenses: boolean;
  can_use_credit: boolean;
  can_use_messaging: boolean;
  can_scan_barcode: boolean;
  can_view_sales_history: boolean;
  can_print_receipt: boolean;
}

export type ManagerPermissionKey = keyof ManagerPermissions;

const ALL_ENABLED: ManagerPermissions = {
  can_sell: true,
  can_manage_products: true,
  can_add_stock: true,
  can_add_products: true,
  can_use_sessions: true,
  can_add_expenses: true,
  can_use_credit: true,
  can_use_messaging: true,
  can_scan_barcode: true,
  can_view_sales_history: true,
  can_print_receipt: true,
};

export function useManagerPermissions() {
  const { user, role } = useAuth();
  const [permissions, setPermissions] = useState<ManagerPermissions>(ALL_ENABLED);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    // Owners and admins have all permissions
    if (!user || role !== 'gerant') {
      setPermissions(ALL_ENABLED);
      setLoading(false);
      return;
    }

    try {
      // Find the gerant record for this user
      const { data: gerant } = await supabase
        .from('gerants')
        .select('id')
        .eq('user_id', user.id)
        .eq('actif', true)
        .limit(1)
        .maybeSingle();

      if (!gerant) {
        setPermissions(ALL_ENABLED);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('manager_permissions')
        .select('*')
        .eq('manager_id', gerant.id)
        .maybeSingle();

      if (data) {
        const row = data as ManagerPermRow;
        setPermissions({
          can_sell: row.can_sell ?? true,
          can_manage_products: row.can_manage_products ?? true,
          can_add_stock: row.can_add_stock ?? true,
          can_add_products: row.can_add_products ?? true,
          can_use_sessions: row.can_use_sessions ?? true,
          can_add_expenses: row.can_add_expenses ?? true,
          can_use_credit: row.can_use_credit ?? true,
          can_use_messaging: row.can_use_messaging ?? true,
          can_scan_barcode: row.can_scan_barcode ?? true,
          can_view_sales_history: row.can_view_sales_history ?? true,
          can_print_receipt: row.can_print_receipt ?? true,
        });
      }
    } catch {
      // Default to all enabled on error
    }
    setLoading(false);
  }, [user, role]);

  useEffect(() => { load(); }, [load]);

  return { permissions, loading, refresh: load, isManager: role === 'gerant' };
}
