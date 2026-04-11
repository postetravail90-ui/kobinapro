import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';

type ManagerPermRow = Database['public']['Tables']['manager_permissions']['Row'];
type ManagerPermInsert = Database['public']['Tables']['manager_permissions']['Insert'];
type ManagerPermUpdate = Database['public']['Tables']['manager_permissions']['Update'];
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Shield, Store, Phone, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface GerantWithPerms {
  id: string;
  user_id: string;
  actif: boolean;
  commerce_id: string;
  commerce_nom?: string;
  user_nom?: string;
  user_phone?: string;
  permissions: Record<string, boolean>;
  perm_id?: string;
}

const PERM_LABELS: Record<string, string> = {
  can_sell: 'Accès Vente',
  can_manage_products: 'Accès Produits',
  can_add_products: 'Ajout produit',
  can_add_stock: 'Ajout stock',
  can_use_sessions: 'Accès Session',
  can_add_expenses: 'Accès Dépenses',
  can_use_credit: 'Accès Crédit / Moitié',
  can_use_messaging: 'Accès Messagerie',
  can_scan_barcode: 'Scan code-barres',
  can_view_sales_history: 'Historique ventes',
  can_print_receipt: 'Impression reçu',
};

export default function ManagerPermissionsPanel() {
  const { user } = useAuth();
  const [gerants, setGerants] = useState<GerantWithPerms[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadGerants();
  }, [user]);

  const loadGerants = async () => {
    if (!user) return;
    setLoading(true);

    const { data: commerces } = await supabase
      .from('commerces')
      .select('id, nom')
      .eq('proprietaire_id', user.id);

    if (!commerces?.length) { setLoading(false); return; }

    const commerceMap = Object.fromEntries(commerces.map(c => [c.id, c.nom]));
    const commerceIds = commerces.map(c => c.id);

    const { data: gerantsData } = await supabase
      .from('gerants')
      .select('id, user_id, actif, commerce_id')
      .in('commerce_id', commerceIds);

    if (!gerantsData?.length) { setLoading(false); return; }

    const gerantIds = gerantsData.map(g => g.id);
    const { data: permsData } = await supabase
      .from('manager_permissions')
      .select('*')
      .in('manager_id', gerantIds);

    const permsMap = new Map((permsData || []).map((p) => [p.manager_id, p as ManagerPermRow]));

    const userIds = gerantsData.map(g => g.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nom, numero')
      .in('id', userIds);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    const result: GerantWithPerms[] = gerantsData.map(g => {
      const perm = permsMap.get(g.id);
      const profile = profileMap.get(g.user_id);
      const permObj: Record<string, boolean> = {};
      (Object.keys(PERM_LABELS) as (keyof typeof PERM_LABELS)[]).forEach((key) => {
        const col = key as keyof ManagerPermRow;
        const v = perm?.[col];
        permObj[key] = typeof v === 'boolean' ? v : true;
      });

      return {
        ...g,
        commerce_nom: commerceMap[g.commerce_id],
        user_nom: profile?.nom || 'Gérant',
        user_phone: profile?.numero || '',
        permissions: permObj,
        perm_id: perm?.id,
      };
    });

    setGerants(result);
    setLoading(false);
  };

  const togglePermission = async (gerant: GerantWithPerms, key: string, value: boolean) => {
    setGerants(prev => prev.map(g =>
      g.id === gerant.id
        ? { ...g, permissions: { ...g.permissions, [key]: value } }
        : g
    ));

    if (gerant.perm_id) {
      const patch: ManagerPermUpdate = {
        [key]: value,
        updated_at: new Date().toISOString(),
        updated_by: user?.id ?? null,
      } as ManagerPermUpdate;
      const { error } = await supabase
        .from('manager_permissions')
        .update(patch)
        .eq('id', gerant.perm_id);

      if (error) {
        toast.error('Erreur lors de la mise à jour');
        setGerants(prev => prev.map(g =>
          g.id === gerant.id
            ? { ...g, permissions: { ...g.permissions, [key]: !value } }
            : g
        ));
        return;
      }
    } else {
      const insertRow: ManagerPermInsert = {
        manager_id: gerant.id,
        [key]: value,
        updated_by: user?.id ?? null,
      } as ManagerPermInsert;
      const { data, error } = await supabase
        .from('manager_permissions')
        .insert(insertRow)
        .select()
        .single();

      if (error) {
        toast.error('Erreur lors de la création');
        return;
      }
      const row = data as ManagerPermRow | null;
      setGerants(prev => prev.map(g =>
        g.id === gerant.id ? { ...g, perm_id: row?.id } : g
      ));
    }

    toast.success('Permissions mises à jour');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  if (!gerants.length) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Aucun gérant trouvé. Ajoutez des gérants pour gérer leurs permissions.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Shield size={18} className="text-primary" />
        <h2 className="font-semibold text-foreground">Contrôle des accès gérant</h2>
      </div>

      {gerants.map((gerant) => {
        const isExpanded = expandedId === gerant.id;

        return (
          <div
            key={gerant.id}
            className="bg-card rounded-xl border border-border overflow-hidden"
          >
            {/* Collapsible Header */}
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : gerant.id)}
              className="w-full p-4 flex items-center gap-3 text-left active:bg-muted/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                {gerant.user_nom?.charAt(0)?.toUpperCase() || 'G'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">{gerant.user_nom}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {gerant.user_phone && (
                    <span className="flex items-center gap-1"><Phone size={10} />{gerant.user_phone}</span>
                  )}
                  <span className="flex items-center gap-1"><Store size={10} />{gerant.commerce_nom}</span>
                </div>
              </div>
              <Badge variant={gerant.actif ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                {gerant.actif ? 'Actif' : 'Inactif'}
              </Badge>
              {isExpanded ? <ChevronUp size={16} className="text-muted-foreground shrink-0" /> : <ChevronDown size={16} className="text-muted-foreground shrink-0" />}
            </button>

            {/* Collapsible Content */}
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 pt-1 border-t border-border space-y-3">
                    {Object.entries(PERM_LABELS).map(([key, label]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm text-foreground">{label}</span>
                        <Switch
                          checked={gerant.permissions[key] ?? true}
                          onCheckedChange={(v) => togglePermission(gerant, key, v)}
                        />
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
