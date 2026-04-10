import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Users, Loader2, Eye, EyeOff } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonList } from '@/components/ui/skeleton-card';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import GerantDetailSheet from '@/components/gerants/GerantDetailSheet';
import UpgradePrompt from '@/components/UpgradePrompt';
import BackButton from '@/components/BackButton';

interface Gerant {
  id: string;
  user_id: string;
  commerce_id: string;
  actif: boolean;
  commerce_nom?: string;
  gerant_nom?: string;
  gerant_email?: string;
}

export default function GerantsPage() {
  const { user, role } = useAuth();
  const sub = useSubscription();
  const [gerants, setGerants] = useState<Gerant[]>([]);
  const [commerces, setCommerces] = useState<{ id: string; nom: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ nom: '', email: '', numero: '', password: '', commerce_id: '' });
  const [selectedGerant, setSelectedGerant] = useState<Gerant | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const addLock = useRef(false);

  const isOwner = role === 'proprietaire' || role === 'super_admin';

  const load = async () => {
    if (!user) return;
    const { data: comms } = await supabase.from('commerces').select('id, nom').eq('proprietaire_id', user.id);
    setCommerces(comms || []);
    const ids = comms?.map(c => c.id) || [];

    if (!isOwner) {
      const { data: gerantData } = await supabase.from('gerants').select('commerce_id').eq('user_id', user.id).eq('actif', true);
      gerantData?.forEach(g => { if (!ids.includes(g.commerce_id)) ids.push(g.commerce_id); });
    }

    if (ids.length > 0) {
      const { data } = await supabase.from('gerants').select('*').in('commerce_id', ids);
      const userIds = data?.map(g => g.user_id) || [];
      let profileMap: Record<string, { nom: string }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, nom').in('id', userIds);
        profiles?.forEach(p => { profileMap[p.id] = { nom: p.nom }; });
      }
      setGerants((data || []).map(g => ({
        ...g,
        commerce_nom: comms?.find(c => c.id === g.commerce_id)?.nom || 'Commerce',
        gerant_nom: profileMap[g.user_id]?.nom,
      })));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const handleAdd = async () => {
    if (addLock.current || saving) return;
    if (!form.nom || !form.email || !form.password || !form.commerce_id) {
      toast.error('Remplissez tous les champs obligatoires');
      return;
    }
    if (!sub.canAddGerant()) {
      toast.error(`Limite de ${sub.limits.max_managers} gérant(s) atteinte.`, {
        action: { label: 'Mettre à niveau', onClick: () => window.location.href = '/app/abonnements' },
      });
      return;
    }
    if (form.password.length < 6) { toast.error('Mot de passe : 6 caractères minimum'); return; }
    addLock.current = true;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-gerant', {
        body: { nom: form.nom, email: form.email, numero: form.numero, password: form.password, commerce_id: form.commerce_id },
      });

      if (error || data?.error) {
        toast.error(data?.error || error?.message || 'Erreur');
        return;
      }
      toast.success('Gérant créé ! Il peut se connecter immédiatement 🎉');
      setOpen(false);
      setForm({ nom: '', email: '', numero: '', password: '', commerce_id: '' });
      load();
    } finally {
      setSaving(false);
      addLock.current = false;
    }
  };

  const toggleGerant = async (id: string, actif: boolean) => {
    await supabase.from('gerants').update({ actif: !actif }).eq('id', id);
    toast.success(actif ? 'Gérant désactivé' : 'Gérant activé');
    load();
  };

  const deleteGerant = async (id: string) => {
    if (!confirm('Supprimer ce gérant ?')) return;
    const { error } = await supabase.from('gerants').delete().eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Gérant supprimé'); load(); }
  };

  if (loading) return <div className="p-4"><SkeletonList count={3} /></div>;

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto pb-32">
      <BackButton fallback="/app" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Gérants</h1>
          <p className="text-sm text-muted-foreground">{gerants.length} / {sub.limits.max_managers} gérant(s)</p>
        </div>
        {isOwner && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" disabled={!sub.canAddGerant()}><Plus size={16} className="mr-1" /> Ajouter</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Créer un gérant</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-1.5"><Label>Nom complet *</Label><Input placeholder="Amadou Diallo" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Email *</Label><Input type="email" placeholder="gerant@gmail.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Numéro de téléphone</Label><Input placeholder="+225 07 00 00 00" value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} /></div>
                <div className="space-y-1.5">
                  <Label>Mot de passe *</Label>
                  <div className="relative">
                    <Input type={showPassword ? 'text' : 'password'} placeholder="Min. 6 caractères" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Assigner à un commerce *</Label>
                  <Select value={form.commerce_id} onValueChange={v => setForm(f => ({ ...f, commerce_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Choisir un commerce" /></SelectTrigger>
                    <SelectContent>
                      {commerces.map(c => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAdd} className="w-full h-12 text-base" disabled={saving}>
                  {saving && <Loader2 className="animate-spin mr-2" size={16} />} Créer le gérant
                </Button>
                <p className="text-xs text-muted-foreground text-center">Le gérant pourra se connecter directement avec son email et mot de passe</p>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!sub.canAddGerant() && isOwner && (
        <UpgradePrompt message={`Limite de ${sub.limits.max_managers} gérant(s) atteinte.`} />
      )}

      {isOwner && commerces.length === 0 && (
        <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 text-sm text-foreground">
          ⚠️ Créez d'abord un commerce avant d'ajouter des gérants.
        </div>
      )}

      {gerants.length === 0 ? (
        <EmptyState icon={Users} title="Aucun gérant" description="Ajoutez des gérants pour gérer vos commerces" actionLabel={isOwner ? "Ajouter un gérant" : undefined} onAction={isOwner ? () => setOpen(true) : undefined} />
      ) : (
        <div className="space-y-2">
          {gerants.map((g, i) => (
            <motion.div key={g.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-xl p-4 border border-border active:scale-[0.98] transition-transform cursor-pointer"
              onClick={() => { setSelectedGerant(g); setDetailOpen(true); }}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${g.actif ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {(g.gerant_nom || 'G').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm">{g.gerant_nom || 'Gérant'}</p>
                  <p className="text-xs text-muted-foreground">{g.commerce_nom}</p>
                  <p className="text-[10px] text-muted-foreground">{g.actif ? '✅ Actif' : '⛔ Inactif'}</p>
                </div>
                <span className="text-xs text-muted-foreground">Voir détails →</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Gerant Detail Sheet */}
      {isOwner && (
        <GerantDetailSheet
          gerant={selectedGerant}
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          onToggle={toggleGerant}
          onDelete={deleteGerant}
        />
      )}
    </div>
  );
}
