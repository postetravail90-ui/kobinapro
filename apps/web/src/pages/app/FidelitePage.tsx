import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCommerceIds } from '@/hooks/useCommerceIds';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import {
  cacheLoyaltyCards, getCachedLoyaltyCards,
  cacheLoyaltySettings, getCachedLoyaltySettings,
  updateCachedLoyaltyCard, addToSyncQueue,
} from '@/lib/offline-db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Award, Plus, Search, Settings, QrCode, Phone, Loader2, WifiOff } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonList } from '@/components/ui/skeleton-card';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface LoyaltyCard {
  id: string;
  client_name: string;
  client_phone: string | null;
  card_code: string;
  points: number;
  total_spent: number;
  created_at: string;
  commerce_id?: string;
}

interface LoyaltySettings {
  points_per_fcfa: number;
  reward_threshold: number;
  reward_value: number;
  commerce_id?: string;
}

export default function FidelitePage() {
  const { role } = useAuth();
  const { commerceIds, loading: commerceLoading } = useCommerceIds();
  const isOnline = useOnlineStatus();
  const isOwner = role === 'proprietaire' || role === 'super_admin';

  const [cards, setCards] = useState<LoyaltyCard[]>([]);
  const [settings, setSettings] = useState<LoyaltySettings>({ points_per_fcfa: 100, reward_threshold: 1000, reward_value: 500 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openAdd, setOpenAdd] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ client_name: '', client_phone: '' });
  const [settingsForm, setSettingsForm] = useState({ points_per_fcfa: '100', reward_threshold: '1000', reward_value: '500' });

  const load = useCallback(async () => {
    if (commerceIds.length === 0) { setLoading(false); return; }
    const commerceId = commerceIds[0];

    if (isOnline) {
      const [cardsRes, settingsRes] = await Promise.all([
        supabase.from('loyalty_cards').select('*').eq('commerce_id', commerceId).order('created_at', { ascending: false }),
        supabase.from('loyalty_settings').select('*').eq('commerce_id', commerceId).maybeSingle(),
      ]);

      const cardsData = cardsRes.data || [];
      setCards(cardsData);
      await cacheLoyaltyCards(cardsData);

      if (settingsRes.data) {
        setSettings(settingsRes.data);
        await cacheLoyaltySettings(settingsRes.data);
        setSettingsForm({
          points_per_fcfa: String(settingsRes.data.points_per_fcfa),
          reward_threshold: String(settingsRes.data.reward_threshold),
          reward_value: String(settingsRes.data.reward_value),
        });
      }
    } else {
      // Offline: load from cache
      const cachedCards = await getCachedLoyaltyCards();
      setCards(cachedCards.filter(c => c.commerce_id === commerceId));

      const cachedSettings = await getCachedLoyaltySettings(commerceId);
      if (cachedSettings) {
        setSettings(cachedSettings);
        setSettingsForm({
          points_per_fcfa: String(cachedSettings.points_per_fcfa),
          reward_threshold: String(cachedSettings.reward_threshold),
          reward_value: String(cachedSettings.reward_value),
        });
      }
    }
    setLoading(false);
  }, [commerceIds, isOnline]);

  useEffect(() => { if (!commerceLoading) load(); }, [commerceLoading, load]);

  const generateCode = () => 'KC-' + Math.random().toString(36).substring(2, 8).toUpperCase();

  const handleAddCard = async () => {
    if (!form.client_name || commerceIds.length === 0) { toast.error('Nom du client requis'); return; }
    setSaving(true);

    const newCard = {
      id: crypto.randomUUID(),
      commerce_id: commerceIds[0],
      client_name: form.client_name,
      client_phone: form.client_phone || null,
      card_code: generateCode(),
      points: 0,
      total_spent: 0,
      created_at: new Date().toISOString(),
    };

    if (!isOnline) {
      // Save locally and queue for sync
      await cacheLoyaltyCards([newCard, ...cards]);
      await addToSyncQueue({
        table: 'loyalty_cards',
        action: 'insert',
        payload: {
          commerce_id: newCard.commerce_id,
          client_name: newCard.client_name,
          client_phone: newCard.client_phone,
          card_code: newCard.card_code,
        },
        priority: 'normal',
      });
      setSaving(false);
      toast.success('Carte créée hors-ligne ✓');
      setOpenAdd(false);
      setForm({ client_name: '', client_phone: '' });
      load();
      return;
    }

    const { error } = await supabase.from('loyalty_cards').insert({
      commerce_id: newCard.commerce_id,
      client_name: newCard.client_name,
      client_phone: newCard.client_phone,
      card_code: newCard.card_code,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success('Carte fidélité créée ✓');
      setOpenAdd(false);
      setForm({ client_name: '', client_phone: '' });
      load();
    }
  };

  const handleSaveSettings = async () => {
    if (commerceIds.length === 0) return;
    setSaving(true);
    const payload = {
      commerce_id: commerceIds[0],
      points_per_fcfa: parseInt(settingsForm.points_per_fcfa) || 100,
      reward_threshold: parseInt(settingsForm.reward_threshold) || 1000,
      reward_value: parseInt(settingsForm.reward_value) || 500,
    };

    if (!isOnline) {
      await cacheLoyaltySettings(payload);
      await addToSyncQueue({
        table: 'loyalty_settings',
        action: 'insert', // upsert handled server-side
        payload,
        priority: 'normal',
      });
      setSaving(false);
      toast.success('Paramètres sauvegardés hors-ligne ✓');
      setOpenSettings(false);
      load();
      return;
    }

    const { error } = await supabase.from('loyalty_settings').upsert(payload, { onConflict: 'commerce_id' });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success('Paramètres fidélité mis à jour ✓');
      setOpenSettings(false);
      load();
    }
  };

  const filtered = cards.filter(c =>
    c.client_name.toLowerCase().includes(search.toLowerCase()) ||
    c.card_code.toLowerCase().includes(search.toLowerCase()) ||
    c.client_phone?.includes(search)
  );

  if (loading || commerceLoading) return <div className="p-4"><SkeletonList /></div>;

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Cartes de fidélité</h1>
          <p className="text-sm text-muted-foreground">
            {cards.length} client(s)
            {!isOnline && <span className="text-warning ml-1">· hors-ligne</span>}
          </p>
        </div>
        <div className="flex gap-2">
          {isOwner && (
            <Dialog open={openSettings} onOpenChange={setOpenSettings}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><Settings size={14} className="mr-1" /> Réglages</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Paramètres fidélité</DialogTitle>
                  <DialogDescription>Définissez le ratio points/achats pour vos clients</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                  <div className="space-y-1.5">
                    <Label>Points par FCFA dépensé</Label>
                    <Input type="number" value={settingsForm.points_per_fcfa} onChange={e => setSettingsForm(f => ({ ...f, points_per_fcfa: e.target.value }))} />
                    <p className="text-[10px] text-muted-foreground">Ex: 100 = 1 point tous les 100 F</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Seuil de récompense (points)</Label>
                    <Input type="number" value={settingsForm.reward_threshold} onChange={e => setSettingsForm(f => ({ ...f, reward_threshold: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Valeur récompense (FCFA)</Label>
                    <Input type="number" value={settingsForm.reward_value} onChange={e => setSettingsForm(f => ({ ...f, reward_value: e.target.value }))} />
                    <p className="text-[10px] text-muted-foreground">Réduction offerte quand le seuil est atteint</p>
                  </div>
                  {!isOnline && (
                    <div className="flex items-center gap-2 text-xs text-warning bg-warning/10 rounded-lg px-3 py-2">
                      <WifiOff size={12} /> Sera synchronisé au retour
                    </div>
                  )}
                  <Button onClick={handleSaveSettings} className="w-full h-12" disabled={saving}>
                    {saving && <Loader2 className="animate-spin mr-2" size={16} />} Enregistrer
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus size={14} className="mr-1" /> Nouvelle carte</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer une carte fidélité</DialogTitle>
                <DialogDescription>Un code unique sera généré automatiquement</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label>Nom du client *</Label>
                  <Input placeholder="Amadou Diallo" value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Téléphone</Label>
                  <Input placeholder="+225 07 00 00 00" value={form.client_phone} onChange={e => setForm(f => ({ ...f, client_phone: e.target.value }))} />
                </div>
                {!isOnline && (
                  <div className="flex items-center gap-2 text-xs text-warning bg-warning/10 rounded-lg px-3 py-2">
                    <WifiOff size={12} /> Carte créée hors-ligne, sync auto
                  </div>
                )}
                <Button onClick={handleAddCard} className="w-full h-12" disabled={saving}>
                  {saving && <Loader2 className="animate-spin mr-2" size={16} />} Créer la carte
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Settings summary */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs text-foreground">
        <span className="font-medium">Règle :</span> 1 point / {settings.points_per_fcfa} F dépensé — Récompense {settings.reward_value.toLocaleString()} F à {settings.reward_threshold} points
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Rechercher un client ou code..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Cards list */}
      {filtered.length === 0 ? (
        <EmptyState icon={Award} title="Aucune carte fidélité" description="Créez des cartes pour fidéliser vos clients" actionLabel="Créer une carte" onAction={() => setOpenAdd(true)} />
      ) : (
        <div className="space-y-2">
          {filtered.map((card, i) => {
            const progress = Math.min(100, (card.points / settings.reward_threshold) * 100);
            return (
              <motion.div key={card.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="bg-card rounded-xl p-4 border border-border"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {card.client_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">{card.client_name}</p>
                      {card.client_phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone size={10} /> {card.client_phone}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-xs font-mono bg-muted px-2 py-1 rounded-md">
                      <QrCode size={12} /> {card.card_code}
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{card.points} / {settings.reward_threshold} points</span>
                    <span className="font-semibold text-foreground">{Number(card.total_spent).toLocaleString()} F dépensé</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  {card.points >= settings.reward_threshold && (
                    <p className="text-[10px] text-primary font-semibold mt-1">🎉 Récompense disponible !</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
