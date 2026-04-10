import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCommerceIds } from '@/hooks/useCommerceIds';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { getOfflineDepenses } from '@/lib/offline-db';
import { getExpenses, createExpense } from '@/lib/data/expenses';
import { getProfileNamesMap } from '@/lib/data/profile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Wallet, Loader2, WifiOff, User as UserIcon, Clock } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonList } from '@/components/ui/skeleton-card';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import BackButton from '@/components/BackButton';
import { toUiErrorMessage } from '@/lib/ui-errors';

interface Depense {
  id: string;
  titre: string;
  montant: number;
  description: string | null;
  created_at: string;
  created_by: string;
  created_by_name?: string;
  _offline?: boolean;
  sync_status?: string;
}

export default function DepensesPage() {
  const { user } = useAuth();
  const { commerceIds, loading: commerceLoading } = useCommerceIds();
  const isOnline = useOnlineStatus();
  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ titre: '', montant: '', description: '' });

  const load = async () => {
    if (!user || commerceIds.length === 0) { setLoading(false); return; }
    try {
      const offlineDeps = await getOfflineDepenses();
      const offlineItems: Depense[] = offlineDeps.map(d => ({
        id: d.id,
        titre: d.titre,
        montant: d.montant,
        description: d.description || null,
        created_at: d.created_at || new Date().toISOString(),
        created_by: d.created_by || d.user_id || '',
        _offline: true,
      }));

      const fromSql = await getExpenses(commerceIds);
      const sqlItems: Depense[] = fromSql.map((e) => ({
        id: e.id,
        titre: e.titre,
        montant: e.montant,
        description: e.description,
        created_at: e.created_at,
        created_by: e.created_by,
        sync_status: e.sync_status,
      }));

      const merged = [...offlineItems];
      const seen = new Set(merged.map((m) => m.id));
      for (const s of sqlItems) {
        if (!seen.has(s.id)) {
          merged.push(s);
          seen.add(s.id);
        }
      }

      const creatorIds = [...new Set(merged.map((d) => d.created_by).filter(Boolean))];
      const nameMap = await getProfileNamesMap(creatorIds);
      const enriched = merged.map((d) => ({
        ...d,
        created_by_name: nameMap[d.created_by] || d.created_by_name,
      }));

      enriched.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setDepenses(enriched);
    } catch (err: unknown) {
      toast.error(toUiErrorMessage(err, 'Impossible de charger les depenses'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user, isOnline, commerceLoading, commerceIds.join(',')]);

  const handleAdd = async () => {
    if (!form.titre || !form.montant || !user) {
      toast.error('Titre et montant requis');
      return;
    }
    if (commerceLoading) {
      toast.info('Chargement de votre espace…');
      return;
    }
    if (commerceIds.length === 0) {
      toast.error('Connexion requise pour enregistrer une dépense.');
      return;
    }
    setSaving(true);
    const commerceId = commerceIds[0];

    try {
      await createExpense({
        commerceServerId: commerceId,
        titre: form.titre,
        montant: Number(form.montant),
        description: form.description || null,
        createdBy: user.id,
      });
      toast.success(isOnline ? 'Dépense enregistrée ✓' : 'Dépense enregistrée localement ✓', {
        description: isOnline ? undefined : 'Synchronisation au retour du réseau',
      });
      setOpen(false);
      setForm({ titre: '', montant: '', description: '' });
      await load();
    } catch (err: unknown) {
      toast.error(toUiErrorMessage(err, 'Erreur lors de lenregistrement'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4"><SkeletonList /></div>;

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto pb-32">
      <BackButton fallback="/app" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dépenses</h1>
          <p className="text-sm text-muted-foreground">Gérez vos dépenses</p>
        </div>
        <div className="flex items-center gap-2">
          {!isOnline && (
            <span className="flex items-center gap-1 text-xs text-warning font-medium bg-warning/10 px-2 py-1 rounded-lg">
              <WifiOff size={12} /> Hors ligne
            </span>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus size={16} /> Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvelle dépense</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                <div className="space-y-1.5">
                  <Label>Titre *</Label>
                  <Input placeholder="Ex: Achat sacs" value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Montant (FCFA) *</Label>
                  <Input type="number" placeholder="5000" value={form.montant} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea placeholder="Détails..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
                </div>
                <Button onClick={handleAdd} className="w-full" disabled={saving}>
                  {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                  Enregistrer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {depenses.length === 0 ? (
        <EmptyState icon={Wallet} title="Aucune dépense" description="Ajoutez votre première dépense" />
      ) : (
        <div className="space-y-2">
          {depenses.map(dep => {
            const createdDate = new Date(dep.created_at);
            return (
              <motion.div
                key={dep.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-xl p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">{dep.titre}</p>
                      {dep._offline && (
                        <span className="text-[10px] bg-warning/15 text-warning px-1.5 py-0.5 rounded font-bold">
                          OFFLINE
                        </span>
                      )}
                      {dep.sync_status === 'pending' && (
                        <span className="h-2 w-2 rounded-full bg-muted-foreground/50 shrink-0" title="En attente de sync" />
                      )}
                    </div>
                    {dep.description && (
                      <p className="text-xs text-muted-foreground truncate">{dep.description}</p>
                    )}
                  </div>
                  <p className="text-sm font-bold text-destructive ml-3">
                    -{Number(dep.montant).toLocaleString()} F
                  </p>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border flex items-center gap-1.5">
                  <UserIcon size={10} />
                  Réalisé par : <span className="font-semibold text-foreground">{dep.created_by_name || '—'}</span>
                  <span className="mx-1">·</span>
                  <Clock size={10} />
                  {createdDate.toLocaleDateString('fr-FR')} · {createdDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
