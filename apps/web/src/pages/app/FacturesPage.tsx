import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCommerceIds } from '@/hooks/useCommerceIds';
import { FileText, CreditCard, Printer, Eye, User as UserIcon, Clock } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonList } from '@/components/ui/skeleton-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import ReceiptSheet from '@/components/receipt/ReceiptSheet';
import { printReceipt, type ReceiptData } from '@/lib/receipt-utils';
import { toast } from 'sonner';
import BackButton from '@/components/BackButton';

interface Facture {
  id: string;
  total_final: number;
  mode_paiement: string;
  statut: string;
  created_at: string;
  session_id: string;
  vendeur_nom?: string;
}

export default function FacturesPage() {
  const { user } = useAuth();
  const { commerceIds, commerces } = useCommerceIds();
  const [factures, setFactures] = useState<Facture[]>([]);
  const [loading, setLoading] = useState(true);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: comms } = await supabase.from('commerces').select('id').eq('proprietaire_id', user.id);
      const ids = comms?.map(c => c.id) || [];

      const { data: gerantData } = await supabase.from('gerants').select('commerce_id').eq('user_id', user.id).eq('actif', true);
      if (gerantData) gerantData.forEach(g => { if (!ids.includes(g.commerce_id)) ids.push(g.commerce_id); });

      if (ids.length > 0) {
        const { data: sessions } = await supabase.from('sessions').select('id, gerant_id').in('commerce_id', ids);
        const sIds = sessions?.map(s => s.id) || [];
        if (sIds.length > 0) {
          const { data } = await supabase.from('factures').select('*').in('session_id', sIds).order('created_at', { ascending: false });
          
          // Fetch gerant names for each session
          const gerantIds = [...new Set(sessions?.map(s => s.gerant_id).filter(Boolean) || [])];
          let gerantProfileMap: Record<string, string> = {};
          if (gerantIds.length > 0) {
            const { data: gerants } = await supabase.from('gerants').select('id, user_id').in('id', gerantIds);
            const userIds = gerants?.map(g => g.user_id) || [];
            if (userIds.length > 0) {
              const { data: profiles } = await supabase.from('profiles').select('id, nom').in('id', userIds);
              const profileMap = new Map(profiles?.map(p => [p.id, p.nom]) || []);
              gerants?.forEach(g => {
                gerantProfileMap[g.id] = profileMap.get(g.user_id) || 'Vendeur';
              });
            }
          }
          
          const sessionGerantMap = new Map(sessions?.map(s => [s.id, s.gerant_id]) || []);
          
          setFactures((data || []).map(f => ({
            ...f as Facture,
            vendeur_nom: gerantProfileMap[sessionGerantMap.get(f.session_id) || ''] || undefined,
          })));
        }
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const loadReceiptData = async (f: Facture) => {
    const { data: session } = await supabase
      .from('sessions')
      .select('commerce_id, gerant_id')
      .eq('id', f.session_id)
      .single();

    const { data: commandes } = await supabase
      .from('commandes')
      .select('quantite, prix_unitaire, produit_id')
      .eq('session_id', f.session_id);

    let items: ReceiptData['items'] = [];
    if (commandes && commandes.length > 0) {
      const produitIds = commandes.map(c => c.produit_id);
      const { data: produits } = await supabase
        .from('produits')
        .select('id, nom')
        .in('id', produitIds);

      const produitMap = new Map(produits?.map(p => [p.id, p.nom]) || []);
      items = commandes.map(c => ({
        nom: produitMap.get(c.produit_id) || 'Produit',
        quantite: c.quantite,
        prixUnitaire: Number(c.prix_unitaire),
        totalLigne: Number(c.prix_unitaire) * c.quantite,
      }));
    }

    const commerceName = commerces.find(c => c.id === session?.commerce_id)?.nom || 'Commerce';

    // Get vendeur name
    let vendeurName = f.vendeur_nom || user?.email || 'Vendeur';
    if (!f.vendeur_nom && session?.gerant_id) {
      const { data: gerant } = await supabase.from('gerants').select('user_id').eq('id', session.gerant_id).single();
      if (gerant) {
        const { data: profile } = await supabase.from('profiles').select('nom').eq('id', gerant.user_id).single();
        vendeurName = profile?.nom || vendeurName;
      }
    }

    const data: ReceiptData = {
      id: f.id,
      commerceName,
      date: f.created_at,
      vendeur: vendeurName,
      type: f.mode_paiement,
      items,
      sousTotal: Number(f.total_final),
      totalFinal: Number(f.total_final),
      reste: f.statut === 'credit' ? Number(f.total_final) : 0,
    };

    return data;
  };

  const handleViewReceipt = async (f: Facture) => {
    try {
      const data = await loadReceiptData(f);
      setReceiptData(data);
      setShowReceipt(true);
    } catch {
      toast.error('Impossible de charger le reçu');
    }
  };

  const handlePrint = async (f: Facture) => {
    try {
      const data = await loadReceiptData(f);
      printReceipt(data);
    } catch {
      toast.error('Impossible d\'imprimer');
    }
  };

  if (loading) return <div className="p-4"><SkeletonList /></div>;

  const payees = factures.filter(f => f.statut === 'payee');
  const credits = factures.filter(f => f.statut === 'credit');

  const FactureList = ({ items }: { items: Facture[] }) => (
    items.length === 0 ? <EmptyState icon={FileText} title="Aucune facture" description="Les factures apparaîtront ici" /> : (
      <div className="space-y-2">
        {items.map((f, i) => {
          const createdDate = new Date(f.created_at);
          return (
            <motion.div key={f.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
              className="bg-card rounded-xl p-4 border border-border"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${f.statut === 'payee' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                  {f.statut === 'payee' ? <FileText size={18} /> : <CreditCard size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm">{Number(f.total_final).toLocaleString()} FCFA</p>
                  <p className="text-xs text-muted-foreground">{f.mode_paiement} · {createdDate.toLocaleDateString('fr-FR')} · {createdDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 ${f.statut === 'payee' ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}`}>
                  {f.statut}
                </span>
              </div>

              {/* Operator signature */}
              <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1.5">
                <UserIcon size={10} />
                Réalisé par : <span className="font-semibold text-foreground">{f.vendeur_nom || '—'}</span>
                <span className="mx-1">·</span>
                <Clock size={10} />
                {createdDate.toLocaleDateString('fr-FR')} · {createdDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>

              {/* Receipt actions */}
              <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                <button
                  onClick={() => handleViewReceipt(f)}
                  className="flex-1 h-9 rounded-lg bg-accent text-accent-foreground text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform"
                >
                  <Eye size={14} /> Reçu
                </button>
                <button
                  onClick={() => handlePrint(f)}
                  className="flex-1 h-9 rounded-lg bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform"
                >
                  <Printer size={14} /> Imprimer
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    )
  );

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto pb-32">
      <BackButton fallback="/app" />
      <h1 className="text-xl font-bold text-foreground">Factures</h1>
      <Tabs defaultValue="all">
        <TabsList><TabsTrigger value="all">Toutes ({factures.length})</TabsTrigger><TabsTrigger value="payees">Payées ({payees.length})</TabsTrigger><TabsTrigger value="credits">Crédit ({credits.length})</TabsTrigger></TabsList>
        <TabsContent value="all"><FactureList items={factures} /></TabsContent>
        <TabsContent value="payees"><FactureList items={payees} /></TabsContent>
        <TabsContent value="credits"><FactureList items={credits} /></TabsContent>
      </Tabs>

      <ReceiptSheet open={showReceipt} onClose={() => setShowReceipt(false)} data={receiptData} />
    </div>
  );
}
