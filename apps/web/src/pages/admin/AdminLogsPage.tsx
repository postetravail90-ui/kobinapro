import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Activity, Clock, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonList } from '@/components/ui/skeleton-card';
import { motion } from 'framer-motion';
import type { Json } from '@/integrations/supabase/types';

interface LogRow {
  id: string;
  action: string;
  created_at: string;
  user_id: string | null;
  metadata: Json | null;
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('all');

  useEffect(() => {
    supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(100).then(({ data }) => {
      setLogs(data || []);
      setLoading(false);
    });
  }, []);

  const actions = ['all', ...new Set(logs.map(l => l.action))];
  const filtered = filterAction === 'all' ? logs : logs.filter(l => l.action === filterAction);

  if (loading) return <div className="p-4"><SkeletonList count={8} /></div>;

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Logs & Audit</h1>
          <p className="text-sm text-muted-foreground">{logs.length} entrée(s)</p>
        </div>
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filtrer" /></SelectTrigger>
          <SelectContent>
            {actions.map(a => <SelectItem key={a} value={a}>{a === 'all' ? 'Toutes les actions' : a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title="Aucun log" description="Les actions seront enregistrées ici" />
      ) : (
        <div className="space-y-1.5">
          {filtered.map((l, i) => (
            <motion.div key={l.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }}
              className="bg-card rounded-lg p-3 border border-border flex items-start gap-3"
            >
              <Activity size={14} className="text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{l.action}</p>
                {l.metadata && Object.keys(l.metadata).length > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate">{JSON.stringify(l.metadata)}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock size={10} />
                  {new Date(l.created_at).toLocaleString('fr-FR')}
                </p>
                {l.user_id && (
                  <p className="text-[9px] text-muted-foreground font-mono mt-0.5">{l.user_id.slice(0, 8)}...</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
