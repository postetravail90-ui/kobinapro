import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getCache, setCache } from '@/lib/offline-db';

export function useCommerceIds() {
  const { user, role } = useAuth();
  const [commerceIds, setCommerceIds] = useState<string[]>([]);
  const [commerces, setCommerces] = useState<{ id: string; nom: string }[]>([]);
  const [gerantId, setGerantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const load = async () => {
      // Try cache first
      const cached = await getCache<{ ids: string[]; commerces: any[]; gerantId: string | null }>('commerce_ids');
      if (cached?.ids?.length) {
        setCommerceIds(cached.ids);
        setCommerces(cached.commerces);
        setGerantId(cached.gerantId);
        setLoading(false);
      }
      // Cache vide ou absent : garder loading jusqu'à la réponse réseau (évite "Nom et prix requis" à tort).

      if (role === 'super_admin') {
        const { data: allComms } = await supabase
          .from('commerces')
          .select('id, nom')
          .order('nom', { ascending: true })
          .limit(500);
        const ids = (allComms || []).map((c) => c.id);
        setCommerceIds(ids);
        setCommerces(allComms || []);
        setGerantId(null);
        setLoading(false);
        await setCache('commerce_ids', { ids, commerces: allComms || [], gerantId: null });
        return;
      }

      const { data: comms } = await supabase.from('commerces').select('id, nom').eq('proprietaire_id', user.id);
      const ids = comms?.map(c => c.id) || [];
      let gId: string | null = null;

      const { data: gerantData } = await supabase.from('gerants').select('id, commerce_id').eq('user_id', user.id).eq('actif', true);
      if (gerantData?.length) {
        gId = gerantData[0].id;
        gerantData.forEach(g => { if (!ids.includes(g.commerce_id)) ids.push(g.commerce_id); });
      }

      const uniqueIds = [...new Set(ids)];

      // If gerant and no owned commerces, also fetch commerce names
      let allCommerces = comms || [];
      if (gerantData?.length) {
        const gerantCommerceIds = gerantData.map(g => g.commerce_id).filter(id => !ids.includes(id) || !comms?.find(c => c.id === id));
        if (gerantCommerceIds.length > 0) {
          const { data: extraComms } = await supabase.from('commerces').select('id, nom').in('id', gerantCommerceIds);
          if (extraComms) allCommerces = [...allCommerces, ...extraComms];
        }
      }

      setCommerceIds(uniqueIds);
      setCommerces(allCommerces);
      setGerantId(gId);
      setLoading(false);

      // Cache for offline
      await setCache('commerce_ids', { ids: uniqueIds, commerces: allCommerces, gerantId: gId });
    };

    load();
  }, [user, role]);

  return { commerceIds, commerces, gerantId, loading };
}
