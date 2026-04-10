import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Users, ShoppingBag, Wallet, Clock, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface Gerant {
  id: string;
  user_id: string;
  commerce_id: string;
  actif: boolean;
  commerce_nom?: string;
  gerant_nom?: string;
  gerant_email?: string;
}

interface GerantStats {
  totalVentes: number;
  totalDepenses: number;
  sessionsOuvertes: number;
  lastSeen: string | null;
}

interface Props {
  gerant: Gerant | null;
  open: boolean;
  onClose: () => void;
  onToggle: (id: string, actif: boolean) => void;
  onDelete: (id: string) => void;
}

export default function GerantDetailSheet({ gerant, open, onClose, onToggle, onDelete }: Props) {
  const [stats, setStats] = useState<GerantStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !gerant) { setStats(null); return; }
    loadStats();
  }, [open, gerant?.id]);

  const loadStats = async () => {
    if (!gerant) return;
    setLoading(true);

    const [ventesRes, depensesRes, sessionsRes, presenceRes] = await Promise.all([
      // Total sales by this gerant (via sessions they opened)
      supabase
        .from('sessions')
        .select('total_actuel')
        .eq('gerant_id', gerant.id)
        .eq('statut', 'fermee'),
      // Expenses by this gerant
      supabase
        .from('depenses')
        .select('montant')
        .eq('created_by', gerant.user_id)
        .eq('commerce_id', gerant.commerce_id),
      // Open sessions
      supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('gerant_id', gerant.id)
        .eq('statut', 'ouverte'),
      // Last seen
      supabase
        .from('user_presence')
        .select('last_seen')
        .eq('user_id', gerant.user_id)
        .single(),
    ]);

    setStats({
      totalVentes: ventesRes.data?.reduce((s, r) => s + Number(r.total_actuel || 0), 0) || 0,
      totalDepenses: depensesRes.data?.reduce((s, r) => s + Number(r.montant || 0), 0) || 0,
      sessionsOuvertes: sessionsRes.count || 0,
      lastSeen: presenceRes.data?.last_seen || null,
    });
    setLoading(false);
  };

  if (!gerant) return null;

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="h-[75dvh] rounded-t-2xl overflow-y-auto pb-32">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${gerant.actif ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
              {(gerant.gerant_nom || 'G').charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{gerant.gerant_nom || 'Gérant'}</p>
              <p className="text-xs text-muted-foreground">{gerant.commerce_nom} · {gerant.actif ? '✅ Actif' : '⛔ Inactif'}</p>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          {/* Stats */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : stats && (
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={ShoppingBag} label="Ventes réalisées" value={`${stats.totalVentes.toLocaleString()} F`} color="text-primary" />
              <StatCard icon={Wallet} label="Dépenses enregistrées" value={`${stats.totalDepenses.toLocaleString()} F`} color="text-destructive" />
              <StatCard icon={Users} label="Sessions ouvertes" value={String(stats.sessionsOuvertes)} color="text-info" />
              <StatCard icon={Clock} label="Dernière connexion" value={stats.lastSeen ? new Date(stats.lastSeen).toLocaleDateString('fr-FR') + ' ' + new Date(stats.lastSeen).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'Jamais'} color="text-muted-foreground" />
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between bg-muted rounded-xl p-4">
              <div>
                <p className="text-sm font-semibold text-foreground">{gerant.actif ? 'Désactiver' : 'Activer'} le gérant</p>
                <p className="text-xs text-muted-foreground">{gerant.actif ? 'Le gérant ne pourra plus accéder au commerce' : 'Réactiver l\'accès'}</p>
              </div>
              <Switch checked={gerant.actif} onCheckedChange={() => { onToggle(gerant.id, gerant.actif); onClose(); }} />
            </div>

            <Button
              variant="outline"
              className="w-full h-12 justify-start gap-3 text-destructive hover:text-destructive"
              onClick={() => { onClose(); onDelete(gerant.id); }}
            >
              <Trash2 size={16} /> Supprimer le gérant
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-muted rounded-xl p-3">
      <Icon size={16} className={`${color} mb-1.5`} />
      <p className="text-[10px] text-muted-foreground uppercase font-semibold">{label}</p>
      <p className="text-sm font-bold text-foreground mt-0.5 truncate">{value}</p>
    </motion.div>
  );
}
