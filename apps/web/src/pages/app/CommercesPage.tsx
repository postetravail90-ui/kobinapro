import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Store, MapPin, Loader2, Trash2, Image as ImageIcon } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonList } from '@/components/ui/skeleton-card';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { cacheGetStale, cacheSet } from '@/lib/cache';
import UpgradePrompt from '@/components/UpgradePrompt';
import BackButton from '@/components/BackButton';

interface Commerce {
  id: string;
  nom: string;
  type: string;
  adresse: string | null;
  statut: string;
  created_at: string;
}

export default function CommercesPage() {
  const { user } = useAuth();
  const sub = useSubscription();
  const [commerces, setCommerces] = useState<Commerce[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nom: '', type: 'boutique', adresse: '' });

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!user) return;
    const cacheKey = `commerces_list_${user.id}`;
    const stale = cacheGetStale<Commerce[]>(cacheKey);
    if (stale?.length && !opts?.silent) {
      setCommerces(stale);
      setLoading(false);
    }

    const { data, error } = await supabase
      .from('commerces')
      .select('*')
      .eq('proprietaire_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[CommercesPage] load', error);
      if (stale?.length) setCommerces(stale);
      else setCommerces([]);
      setLoading(false);
      return;
    }
    const rows = data ?? [];
    setCommerces(rows);
    cacheSet(cacheKey, rows, 86_400);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setCommerces([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    void load();
  }, [user, load]);

  const handleAdd = async () => {
    if (!form.nom || !user) { toast.error('Nom du commerce requis'); return; }

    // Check limit before adding
    if (!sub.canAddCommerce()) {
      toast.error(`Limite atteinte (${sub.limits.max_commerces} commerce${sub.limits.max_commerces > 1 ? 's' : ''}).`, {
        action: { label: 'Mettre à niveau', onClick: () => window.location.href = '/app/abonnements' },
      });
      return;
    }

    setSaving(true);
    const { data: inserted, error } = await supabase
      .from('commerces')
      .insert({
        nom: form.nom.trim(),
        type: form.type as any,
        adresse: form.adresse.trim() || null,
        proprietaire_id: user.id,
        statut: 'actif',
      })
      .select('*')
      .single();
    setSaving(false);

    if (error) {
      if (error.message.includes('Limite')) {
        toast.error('Limite atteinte ! Upgradez votre plan.', { action: { label: 'Upgrader', onClick: () => window.location.href = '/app/abonnements' } });
      } else {
        toast.error(error.message || 'Erreur lors de la création');
      }
      return;
    }

    if (inserted) {
      setCommerces((prev) => {
        const row = inserted as Commerce;
        return [row, ...prev.filter((c) => c.id !== row.id)];
      });
    }
    toast.success('Commerce créé avec succès ! 🎉');
    setOpen(false);
    setForm({ nom: '', type: 'boutique', adresse: '' });
    void sub.refresh();
    void load({ silent: true });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce commerce ?')) return;
    const { error } = await supabase.from('commerces').delete().eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Commerce supprimé'); load(); sub.refresh(); }
  };

  if (loading) return <div className="p-4"><SkeletonList count={3} /></div>;

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto pb-32">
      <BackButton fallback="/app" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Mes commerces</h1>
          <p className="text-sm text-muted-foreground">{commerces.length} / {sub.limits.max_commerces} commerce(s)</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={!sub.canAddCommerce()}>
              <Plus size={16} className="mr-1" /> Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouveau commerce</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Logo (facultatif)</Label>
                <div className="w-20 h-20 rounded-xl bg-muted border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                  <ImageIcon size={24} className="text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Nom du commerce *</Label>
                <Input placeholder="Ma Boutique" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boutique">Boutique</SelectItem>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="bar">Bar</SelectItem>
                    <SelectItem value="superette">Superette</SelectItem>
                    <SelectItem value="pharmacie">Pharmacie</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Localisation</Label>
                <Input placeholder="Cocody, Abidjan" value={form.adresse} onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))} />
              </div>
              <Button onClick={handleAdd} className="w-full h-12 text-base" disabled={saving}>
                {saving && <Loader2 className="animate-spin mr-2" size={16} />} Créer le commerce
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Limit warning */}
      {!sub.canAddCommerce() && (
        <UpgradePrompt message={`Limite de ${sub.limits.max_commerces} commerce(s) atteinte.`} />
      )}

      {commerces.length === 0 ? (
        <EmptyState icon={Store} title="Aucun commerce" description="Créez votre premier commerce pour commencer" actionLabel="Créer un commerce" onAction={() => setOpen(true)} />
      ) : (
        <div className="space-y-3">
          {commerces.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-xl p-4 border border-border card-float"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Store size={22} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{c.nom}</h3>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">{c.type}</p>
                    {c.adresse && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin size={12} /> {c.adresse}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${c.statut === 'actif' ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}`}>
                    {c.statut}
                  </span>
                  <button onClick={() => handleDelete(c.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
