import { useEffect, useState } from 'react';
import { Bell, Volume2, ShoppingBag, TrendingDown, MessageSquare, AlertTriangle, CreditCard, Shield, ArrowLeft } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

interface Preferences {
  notify_sales: boolean;
  notify_expenses: boolean;
  notify_messages: boolean;
  notify_stock: boolean;
  notify_subscription: boolean;
  notify_security: boolean;
  sound_enabled: boolean;
}

const DEFAULT_PREFS: Preferences = {
  notify_sales: true,
  notify_expenses: true,
  notify_messages: true,
  notify_stock: true,
  notify_subscription: true,
  notify_security: true,
  sound_enabled: true,
};

const PREF_ITEMS = [
  { key: 'notify_sales' as const, label: 'Ventes', desc: 'Nouvelles ventes et paiements', icon: ShoppingBag, color: 'text-success' },
  { key: 'notify_expenses' as const, label: 'Dépenses', desc: 'Nouvelles dépenses ajoutées', icon: TrendingDown, color: 'text-orange-500' },
  { key: 'notify_messages' as const, label: 'Messages', desc: 'Nouveaux messages reçus', icon: MessageSquare, color: 'text-info' },
  { key: 'notify_stock' as const, label: 'Stock faible', desc: 'Alertes de stock bas', icon: AlertTriangle, color: 'text-warning' },
  { key: 'notify_subscription' as const, label: 'Abonnement', desc: 'Paiements et expirations', icon: CreditCard, color: 'text-primary' },
  { key: 'notify_security' as const, label: 'Sécurité', desc: 'Connexions et actions sensibles', icon: Shield, color: 'text-destructive' },
];

export default function NotificationSettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<string>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setPrefs({
          notify_sales: data.notify_sales,
          notify_expenses: data.notify_expenses,
          notify_messages: data.notify_messages,
          notify_stock: data.notify_stock,
          notify_subscription: data.notify_subscription,
          notify_security: data.notify_security,
          sound_enabled: data.sound_enabled,
        });
      }
      setLoading(false);
    })();
  }, [user]);

  const updatePref = async (key: keyof Preferences, value: boolean) => {
    if (!user) return;
    setPrefs(prev => ({ ...prev, [key]: value }));

    const next: Database['public']['Tables']['notification_preferences']['Insert'] = {
      user_id: user.id,
      updated_at: new Date().toISOString(),
      notify_sales: key === 'notify_sales' ? value : prefs.notify_sales,
      notify_expenses: key === 'notify_expenses' ? value : prefs.notify_expenses,
      notify_messages: key === 'notify_messages' ? value : prefs.notify_messages,
      notify_stock: key === 'notify_stock' ? value : prefs.notify_stock,
      notify_subscription: key === 'notify_subscription' ? value : prefs.notify_subscription,
      notify_security: key === 'notify_security' ? value : prefs.notify_security,
      sound_enabled: key === 'sound_enabled' ? value : prefs.sound_enabled,
    };
    const { error } = await supabase.from('notification_preferences').upsert(next, { onConflict: 'user_id' });

    if (error) {
      toast.error('Erreur de sauvegarde');
      setPrefs(prev => ({ ...prev, [key]: !value }));
    }
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Les notifications ne sont pas supportées sur cet appareil');
      return;
    }
    const permission = await Notification.requestPermission();
    setPermissionStatus(permission);
    if (permission === 'granted') {
      toast.success('Notifications activées !');
    } else {
      toast.error('Permission refusée. Activez les notifications dans les paramètres de votre navigateur.');
    }
  };

  if (loading) {
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-7 w-48" />
        {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-foreground">Notifications</h1>
      </div>

      {/* Permission status */}
      {permissionStatus !== 'granted' && (
        <div className="bg-warning/10 border border-warning/20 rounded-xl p-4">
          <p className="text-sm font-medium text-foreground mb-2">
            {permissionStatus === 'denied'
              ? 'Les notifications sont désactivées sur cet appareil.'
              : 'Activez les notifications pour ne rien manquer.'}
          </p>
          {permissionStatus !== 'denied' && (
            <button
              onClick={requestPermission}
              className="text-sm font-medium text-primary bg-primary/10 px-4 py-2 rounded-lg"
            >
              Activer les notifications
            </button>
          )}
          {permissionStatus === 'denied' && (
            <p className="text-xs text-muted-foreground">
              Allez dans les paramètres de votre navigateur pour réactiver les notifications.
            </p>
          )}
        </div>
      )}

      {/* Notification types */}
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Types de notifications</h2>
        {PREF_ITEMS.map((item) => (
          <div key={item.key} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <item.icon size={20} className={item.color} />
              <div>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
            <Switch
              checked={prefs[item.key]}
              onCheckedChange={(v) => updatePref(item.key, v)}
            />
          </div>
        ))}
      </div>

      {/* Sound */}
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Son</h2>
        <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <Volume2 size={20} className="text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Son de notification</p>
              <p className="text-xs text-muted-foreground">Jouer un son lors de la réception</p>
            </div>
          </div>
          <Switch
            checked={prefs.sound_enabled}
            onCheckedChange={(v) => updatePref('sound_enabled', v)}
          />
        </div>
      </div>
    </div>
  );
}
