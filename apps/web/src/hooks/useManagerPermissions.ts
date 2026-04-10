import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
        .from('manager_permissions' as any)
        .select('*')
        .eq('manager_id', gerant.id)
        .maybeSingle();

      if (data) {
        setPermissions({
          can_sell: (data as any).can_sell ?? true,
          can_manage_products: (data as any).can_manage_products ?? true,
          can_add_stock: (data as any).can_add_stock ?? true,
          can_add_products: (data as any).can_add_products ?? true,
          can_use_sessions: (data as any).can_use_sessions ?? true,
          can_add_expenses: (data as any).can_add_expenses ?? true,
          can_use_credit: (data as any).can_use_credit ?? true,
          can_use_messaging: (data as any).can_use_messaging ?? true,
          can_scan_barcode: (data as any).can_scan_barcode ?? true,
          can_view_sales_history: (data as any).can_view_sales_history ?? true,
          can_print_receipt: (data as any).can_print_receipt ?? true,
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
