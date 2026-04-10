import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Activity } from 'lucide-react';
import { SkeletonList } from '@/components/ui/skeleton-card';
import { EmptyState } from '@/components/ui/empty-state';

interface LogRow { id: string; action: string; created_at: string; user_id: string | null; }

export default function MonitoringPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(50).then(({ data }) => {
      setLogs(data || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-4"><SkeletonList /></div>;

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      <h1 className="text-xl font-bold text-foreground">Monitoring</h1>
      {logs.length === 0 ? <EmptyState icon={Activity} title="Aucune activité" description="L'activité sera visible ici" /> : (
        <div className="space-y-2">
          {logs.map(l => (
            <div key={l.id} className="bg-card rounded-xl p-3 border border-border flex items-center gap-3">
              <Activity size={16} className="text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{l.action}</p>
                <p className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString('fr-FR')}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
