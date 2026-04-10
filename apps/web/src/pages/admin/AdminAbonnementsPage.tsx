import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Crown, Check, X } from 'lucide-react';
import { SkeletonList } from '@/components/ui/skeleton-card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Sub { id: string; proprietaire_id: string; plan_type: string; status: string; montant: number; validated_by_admin: boolean; created_at: string; }

export default function AdminAbonnementsPage() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    supabase.from('subscriptions').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      setSubs(data || []);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const validate = async (id: string) => {
    const { error } = await supabase.from('subscriptions').update({ validated_by_admin: true }).eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Validé'); load(); }
  };

  if (loading) return <div className="p-4"><SkeletonList /></div>;

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      <h1 className="text-xl font-bold text-foreground">Gestion Abonnements</h1>
      <div className="space-y-2">
        {subs.map(s => (
          <div key={s.id} className="bg-card rounded-xl p-4 border border-border flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground text-sm">{s.plan_type} · {Number(s.montant).toLocaleString()} F</p>
              <p className="text-xs text-muted-foreground">{s.status} · {new Date(s.created_at).toLocaleDateString('fr-FR')}</p>
            </div>
            <div className="flex items-center gap-2">
              {s.validated_by_admin ? (
                <span className="text-xs font-medium text-success flex items-center gap-1"><Check size={14} /> Validé</span>
              ) : (
                <Button size="sm" onClick={() => validate(s.id)}>Valider</Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
