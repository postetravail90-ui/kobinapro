import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ShieldAlert } from 'lucide-react';
import { SkeletonList } from '@/components/ui/skeleton-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Alert { id: string; type_alerte: string; niveau_risque: string; resolved: boolean; created_at: string; commerce_id: string | null; }

export default function FraudePage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    supabase.from('fraud_alerts').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      setAlerts(data || []);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const resolve = async (id: string) => {
    const { error } = await supabase.from('fraud_alerts').update({ resolved: true }).eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Résolu'); load(); }
  };

  if (loading) return <div className="p-4"><SkeletonList /></div>;

  const riskColor: Record<string, string> = { faible: 'bg-info/15 text-info', moyen: 'bg-warning/15 text-warning', eleve: 'bg-destructive/15 text-destructive', critique: 'bg-destructive text-destructive-foreground' };

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      <h1 className="text-xl font-bold text-foreground">Alertes Fraude</h1>
      {alerts.length === 0 ? <EmptyState icon={ShieldAlert} title="Aucune alerte" description="Tout est en ordre" /> : (
        <div className="space-y-2">
          {alerts.map(a => (
            <div key={a.id} className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${riskColor[a.niveau_risque] || 'bg-muted text-muted-foreground'}`}>
                  {a.niveau_risque}
                </span>
                {a.resolved && <span className="text-[10px] font-medium text-success">Résolu</span>}
              </div>
              <p className="text-sm font-medium text-foreground">{a.type_alerte}</p>
              <p className="text-xs text-muted-foreground mt-1">{new Date(a.created_at).toLocaleString('fr-FR')}</p>
              {!a.resolved && <Button size="sm" variant="outline" className="mt-2" onClick={() => resolve(a.id)}>Résoudre</Button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
