import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Store, Search, Users, Package, ShoppingBag, Loader2, MapPin } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonList } from '@/components/ui/skeleton-card';
import { motion } from 'framer-motion';

interface Commerce {
  id: string;
  nom: string;
  type: string;
  statut: string;
  adresse: string | null;
  created_at: string;
  proprietaire_id: string;
}

interface CommerceDetail {
  commerce: Commerce;
  ownerName: string;
  gerantsCount: number;
  produitsCount: number;
  totalVentes: number;
}

export default function AdminCommercesPage() {
  const [commerces, setCommerces] = useState<Commerce[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedDetail, setSelectedDetail] = useState<CommerceDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    supabase.from('commerces').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      setCommerces(data || []);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    let list = commerces;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => c.nom.toLowerCase().includes(q) || c.adresse?.toLowerCase().includes(q));
    }
    if (filterType !== 'all') list = list.filter(c => c.type === filterType);
    return list;
  }, [commerces, search, filterType]);

  const openDetail = async (c: Commerce) => {
    setDetailOpen(true);
    setDetailLoading(true);

    const [ownerRes, gerantsRes, produitsRes, ventesRes] = await Promise.all([
      supabase.from('profiles').select('nom').eq('id', c.proprietaire_id).single(),
      supabase.from('gerants').select('id', { count: 'exact', head: true }).eq('commerce_id', c.id).eq('actif', true),
      supabase.from('produits').select('id', { count: 'exact', head: true }).eq('commerce_id', c.id).eq('actif', true),
      supabase.from('vue_total_ventes').select('total_ventes').eq('commerce_id', c.id).single(),
    ]);

    setSelectedDetail({
      commerce: c,
      ownerName: ownerRes.data?.nom || 'Inconnu',
      gerantsCount: gerantsRes.count || 0,
      produitsCount: produitsRes.count || 0,
      totalVentes: Number(ventesRes.data?.total_ventes || 0),
    });
    setDetailLoading(false);
  };

  const types = ['all', ...new Set(commerces.map(c => c.type))];

  if (loading) return <div className="p-4"><SkeletonList count={6} /></div>;

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-foreground">Gestion Commerces</h1>
        <p className="text-sm text-muted-foreground">{commerces.length} commerce(s)</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            {types.map(t => <SelectItem key={t} value={t}>{t === 'all' ? 'Tous les types' : t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Store} title="Aucun commerce" description="Les commerces apparaîtront ici" />
      ) : (
        <div className="space-y-2">
          {filtered.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
              className="bg-card rounded-xl p-4 border border-border cursor-pointer active:scale-[0.99] transition-transform"
              onClick={() => openDetail(c)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Store size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{c.nom}</p>
                  <div className="flex gap-2 text-xs text-muted-foreground mt-0.5">
                    <span className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-medium">{c.type}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${c.statut === 'actif' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>{c.statut}</span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground shrink-0">{new Date(c.created_at).toLocaleDateString('fr-FR')}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Sheet open={detailOpen} onOpenChange={v => { if (!v) setDetailOpen(false); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>Détails commerce</SheetTitle></SheetHeader>
          {detailLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>
          ) : selectedDetail && (
            <div className="space-y-4 mt-4">
              <div className="bg-muted rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Nom</span>
                  <span className="text-sm font-semibold text-foreground">{selectedDetail.commerce.nom}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Type</span>
                  <span className="text-sm font-semibold text-foreground">{selectedDetail.commerce.type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Statut</span>
                  <span className={`text-sm font-semibold ${selectedDetail.commerce.statut === 'actif' ? 'text-primary' : 'text-destructive'}`}>{selectedDetail.commerce.statut}</span>
                </div>
                {selectedDetail.commerce.adresse && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Adresse</span>
                    <span className="text-sm text-foreground">{selectedDetail.commerce.adresse}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Propriétaire</span>
                  <span className="text-sm font-semibold text-foreground">{selectedDetail.ownerName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Création</span>
                  <span className="text-sm text-foreground">{new Date(selectedDetail.commerce.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted rounded-xl p-3 text-center">
                  <Users size={16} className="mx-auto text-info mb-1" />
                  <p className="text-lg font-bold text-foreground">{selectedDetail.gerantsCount}</p>
                  <p className="text-[10px] text-muted-foreground">Gérants</p>
                </div>
                <div className="bg-muted rounded-xl p-3 text-center">
                  <Package size={16} className="mx-auto text-primary mb-1" />
                  <p className="text-lg font-bold text-foreground">{selectedDetail.produitsCount}</p>
                  <p className="text-[10px] text-muted-foreground">Produits</p>
                </div>
                <div className="bg-muted rounded-xl p-3 text-center">
                  <ShoppingBag size={16} className="mx-auto text-success mb-1" />
                  <p className="text-lg font-bold text-foreground">{selectedDetail.totalVentes.toLocaleString()} F</p>
                  <p className="text-[10px] text-muted-foreground">Ventes</p>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
