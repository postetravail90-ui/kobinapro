import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, User, Bell, Shield, Crown, Camera, LogOut, Image, Store, Monitor } from 'lucide-react';
import AppInfoSection from '@/components/settings/AppInfoSection';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import ManagerPermissionsPanel from '@/components/manager/ManagerPermissionsPanel';
import { useSubscription } from '@/hooks/useSubscription';
import BackButton from '@/components/BackButton';
import type { Database } from '@/integrations/supabase/types';

type SubscriptionRow = Database['public']['Tables']['subscriptions']['Row'];
type CommerceBrandingInsert = Database['public']['Tables']['commerce_branding']['Insert'];

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

export default function ParametresPage() {
  const { user, role, signOut } = useAuth();
  const sub = useSubscription();
  const [profile, setProfile] = useState({ nom: '', numero: '', commune: '', photo_url: '' });
  const [saving, setSaving] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Branding state
  const [branding, setBranding] = useState({ display_name: '', phone: '', address: '', footer_message: '', logo_url: '' });
  const [brandingLoading, setBrandingLoading] = useState(false);
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [commerceId, setCommerceId] = useState<string | null>(null);

  const isOwner = role === 'proprietaire';

  useEffect(() => {
    if (!user) return;

    // Parallel fetch for all initial data
    const loadData = async () => {
      const [profileRes, subRes, commRes] = await Promise.all([
        supabase.from('profiles').select('nom, numero, commune, photo_url').eq('id', user.id).single(),
        supabase.from('subscriptions').select('*').eq('proprietaire_id', user.id).eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle(),
        isOwner ? supabase.from('commerces').select('id').eq('proprietaire_id', user.id).limit(1).maybeSingle() : Promise.resolve({ data: null }),
      ]);

      const profileData = profileRes.data;
      if (profileData) setProfile({ nom: profileData.nom || '', numero: profileData.numero || '', commune: profileData.commune || '', photo_url: profileData.photo_url || '' });

      setSubscription(subRes.data || null);

      if (isOwner && commRes.data) {
        const comm = commRes.data;
        setCommerceId(comm.id);
        const { data: b } = await supabase
          .from('commerce_branding')
          .select('*')
          .eq('commerce_id', comm.id)
          .maybeSingle();
        if (b) setBranding({
          display_name: b.display_name || '',
          phone: b.phone || '',
          address: b.address || '',
          footer_message: b.footer_message || '',
          logo_url: b.logo_url || '',
        });
      }
    };

    loadData();
  }, [user, isOwner]);

  const validateImage = (file: File): string | null => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return 'Format non supporté. Utilisez JPG, PNG ou WebP.';
    if (file.size > MAX_IMAGE_SIZE) return 'Image trop lourde (max 2 Mo).';
    return null;
  };

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const error = validateImage(file);
    if (error) { toast.error(error); return; }

    setPhotoUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${user.id}/profile.${ext}`;

      const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const photoUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      await supabase.from('profiles').update({ photo_url: photoUrl }).eq('id', user.id);
      setProfile(p => ({ ...p, photo_url: photoUrl }));
      toast.success('Photo de profil mise à jour');
    } catch (err: unknown) {
      toast.error('Impossible de charger l\'image pour le moment');
      console.error('Profile photo upload error:', err);
    } finally {
      setPhotoUploading(false);
    }
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ nom: profile.nom, numero: profile.numero, commune: profile.commune }).eq('id', user.id);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success('Profil mis à jour ✓');
  };

  const saveBranding = async () => {
    if (!commerceId) return;
    setBrandingSaving(true);
    const payload: CommerceBrandingInsert = {
      commerce_id: commerceId,
      display_name: branding.display_name || null,
      phone: branding.phone || null,
      address: branding.address || null,
      footer_message: branding.footer_message || 'Merci pour votre confiance 🙏',
      logo_url: branding.logo_url || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('commerce_branding')
      .upsert(payload, { onConflict: 'commerce_id' });

    setBrandingSaving(false);
    if (error) toast.error(error.message);
    else toast.success('Reçu personnalisé appliqué ✓');
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !commerceId) return;

    const error = validateImage(file);
    if (error) { toast.error(error); return; }

    setBrandingLoading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${commerceId}/logo.${ext}`;

      const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      setBranding(b => ({ ...b, logo_url: logoUrl }));
      toast.success('Logo mis à jour avec succès');
    } catch (err: unknown) {
      toast.error('Impossible de charger l\'image pour le moment');
      console.error('Logo upload error:', err);
    } finally {
      setBrandingLoading(false);
    }
  };

  const planLabel: Record<string, string> = { free: 'Gratuit', commerce_1: 'Formule 1', multi_3: 'Formule 2', multi_6: 'Formule 3', multi_10: 'Formule 4' };

  const ownerTabs = [
    { value: 'profil', icon: User, label: 'Profil' },
    { value: 'securite', icon: Shield, label: 'Sécurité' },
    { value: 'branding', icon: Image, label: 'Reçu' },
    { value: 'notifications', icon: Bell, label: 'Notifs' },
    { value: 'app', icon: Monitor, label: 'App' },
  ];

  const gerantTabs = [
    { value: 'profil', icon: User, label: 'Profil' },
    { value: 'securite', icon: Shield, label: 'Sécurité' },
    { value: 'notifications', icon: Bell, label: 'Notifs' },
    { value: 'app', icon: Monitor, label: 'App' },
  ];

  const tabs = isOwner ? ownerTabs : gerantTabs;

  const profileAvatar = profile.photo_url ? (
    <img
      src={profile.photo_url}
      alt="Photo de profil"
      className="w-20 h-20 rounded-2xl object-cover"
      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
    />
  ) : (
    <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
      {profile.nom?.charAt(0)?.toUpperCase() || 'U'}
    </div>
  );

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      <BackButton fallback="/app" />
      <h1 className="text-xl font-bold text-foreground">Paramètres</h1>

      <Tabs defaultValue="profil">
        <TabsList className="w-full flex">
          {tabs.map(t => (
            <TabsTrigger key={t.value} value={t.value} className="flex-1 gap-1.5">
              <t.icon size={14} /> {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="profil" className="space-y-4 mt-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              {profileAvatar}
              <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer">
                {photoUploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleProfilePhotoUpload} disabled={photoUploading} />
              </label>
            </div>
            <div>
              <p className="font-semibold text-foreground">{profile.nom || 'Mon profil'}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-2"><Label>Nom</Label><Input value={profile.nom} onChange={e => setProfile(p => ({ ...p, nom: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Téléphone</Label><Input value={profile.numero} onChange={e => setProfile(p => ({ ...p, numero: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Commune</Label><Input value={profile.commune} onChange={e => setProfile(p => ({ ...p, commune: e.target.value }))} /></div>
          <Button onClick={save} disabled={saving} className="w-full h-12">
            {saving && <Loader2 className="animate-spin mr-2" size={16} />} Enregistrer
          </Button>
        </TabsContent>

        <TabsContent value="securite" className="space-y-4 mt-4">
          <div className="bg-card rounded-xl p-4 border border-border space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground">Email</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Dernière connexion</p>
              <p className="text-sm text-muted-foreground">{user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('fr-FR') : 'N/A'}</p>
            </div>
          </div>

          {subscription && (
            <div className="bg-card rounded-xl p-4 border border-border space-y-2">
              <div className="flex items-center gap-2">
                <Crown size={16} className="text-primary" />
                <p className="text-sm font-medium text-foreground">Abonnement</p>
              </div>
              <p className="text-sm text-muted-foreground">Plan : {planLabel[subscription.plan_type] || subscription.plan_type}</p>
              {(subscription.end_date || subscription.trial_end_date) && (
                <p className="text-sm text-muted-foreground">Expire le : {new Date(subscription.end_date || subscription.trial_end_date).toLocaleDateString('fr-FR')}</p>
              )}
            </div>
          )}

          {isOwner && <ManagerPermissionsPanel />}

          <Button variant="destructive" onClick={signOut} className="w-full h-12">
            <LogOut size={16} className="mr-2" /> Se déconnecter
          </Button>
        </TabsContent>

        {isOwner && (
          <TabsContent value="branding" className="space-y-4 mt-4">
            <div className="bg-card rounded-xl p-4 border border-border space-y-4">
              <div className="flex items-center gap-2">
                <Store size={18} className="text-primary" />
                <h2 className="font-semibold text-foreground">Branding du reçu</h2>
              </div>

              {sub.isFreePlan && (
                <div className="bg-muted rounded-lg p-3 text-xs text-muted-foreground">
                  ⚠️ En plan Gratuit, le reçu affiche le branding KOBINA PRO. Passez à une formule payante pour personnaliser.
                </div>
              )}

              <div className="space-y-2">
                <Label>Logo du commerce</Label>
                <div className="flex items-center gap-3">
                  {branding.logo_url ? (
                    <img
                      src={branding.logo_url}
                      alt="Logo"
                      className="h-14 w-14 rounded-xl object-cover border border-border"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-xl bg-muted border border-border flex items-center justify-center">
                      <Store size={20} className="text-muted-foreground" />
                    </div>
                  )}
                  <label className="cursor-pointer">
                    <div className="h-10 px-4 rounded-xl bg-muted text-foreground text-sm font-medium flex items-center gap-2 hover:bg-accent transition-colors">
                      <Camera size={14} />
                      {brandingLoading ? 'Envoi...' : 'Téléverser logo'}
                    </div>
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoUpload} disabled={brandingLoading} />
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nom affiché sur le reçu</Label>
                <Input value={branding.display_name} onChange={e => setBranding(b => ({ ...b, display_name: e.target.value }))} placeholder="Nom du commerce" />
              </div>
              <div className="space-y-2">
                <Label>Téléphone commerce</Label>
                <Input value={branding.phone} onChange={e => setBranding(b => ({ ...b, phone: e.target.value }))} placeholder="+225 XX XX XX XX" />
              </div>
              <div className="space-y-2">
                <Label>Adresse commerce</Label>
                <Input value={branding.address} onChange={e => setBranding(b => ({ ...b, address: e.target.value }))} placeholder="Quartier, Ville" />
              </div>
              <div className="space-y-2">
                <Label>Message de fin de ticket</Label>
                <Input value={branding.footer_message} onChange={e => setBranding(b => ({ ...b, footer_message: e.target.value }))} placeholder="Merci pour votre confiance 🙏" />
              </div>

              <Button onClick={saveBranding} disabled={brandingSaving} className="w-full h-12">
                {brandingSaving && <Loader2 className="animate-spin mr-2" size={16} />} Enregistrer le branding
              </Button>
            </div>
          </TabsContent>
        )}

        <TabsContent value="notifications" className="mt-4 space-y-4">
          <div className="bg-card rounded-xl p-4 border border-border space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Notifications push</p>
                <p className="text-xs text-muted-foreground">Recevoir les alertes sur votre appareil</p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Alertes stock</p>
                <p className="text-xs text-muted-foreground">Produits avec stock faible</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Alertes crédit</p>
                <p className="text-xs text-muted-foreground">Crédits impayés ou en retard</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Résumé quotidien</p>
                <p className="text-xs text-muted-foreground">Résumé des ventes chaque soir</p>
              </div>
              <Switch />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="app" className="mt-4 space-y-4">
          <AppInfoSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
