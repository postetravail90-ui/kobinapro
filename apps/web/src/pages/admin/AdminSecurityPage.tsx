import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Globe, Clock, Users, AlertTriangle, Activity } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { SkeletonList, SkeletonCard } from '@/components/ui/skeleton-card';
import { EmptyState } from '@/components/ui/empty-state';
import { motion } from 'framer-motion';

interface PresenceRow {
  user_id: string;
  is_online: boolean;
  last_seen: string;
}

export default function AdminSecurityPage() {
  const [loading, setLoading] = useState(true);
  const [activeSessions, setActiveSessions] = useState<PresenceRow[]>([]);
  const [fraudAlerts, setFraudAlerts] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);

  useEffect(() => {
    const load = async () => {
      const [presenceRes, alertsRes, usersRes] = await Promise.all([
        supabase.from('user_presence').select('*').eq('is_online', true).order('last_seen', { ascending: false }).limit(50),
        supabase.from('fraud_alerts').select('id', { count: 'exact', head: true }).eq('resolved', false),
        supabase.from('users').select('id', { count: 'exact', head: true }),
      ]);
      setActiveSessions(presenceRes.data || []);
      setFraudAlerts(alertsRes.count || 0);
      setTotalUsers(usersRes.count || 0);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="p-4"><div className="grid grid-cols-2 gap-3 mb-4">{[1,2,3,4].map(i => <SkeletonCard key={i} />)}</div><SkeletonList /></div>;

  return (
    <div className="p-4 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-foreground">Centre de Sécurité</h1>
        <p className="text-sm text-muted-foreground">Surveillance de la plateforme en temps réel</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Sessions actives" value={activeSessions.length} icon={Activity} color="bg-primary/10 text-primary" />
        <StatCard label="Alertes non résolues" value={fraudAlerts} icon={AlertTriangle} color="bg-destructive/10 text-destructive" delay={0.05} />
        <StatCard label="Utilisateurs total" value={totalUsers} icon={Users} color="bg-info/10 text-info" delay={0.1} />
        <StatCard label="Système" value="En ligne" icon={Shield} color="bg-success/10 text-success" delay={0.15} />
      </div>

      {/* Active sessions */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl border border-border p-4"
      >
        <div className="flex items-center gap-2 mb-4">
          <Globe size={18} className="text-primary" />
          <h2 className="font-semibold text-foreground">Sessions actives ({activeSessions.length})</h2>
        </div>
        {activeSessions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Aucune session active</p>
        ) : (
          <div className="space-y-2">
            {activeSessions.map((s, i) => (
              <motion.div key={s.user_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                className="flex items-center gap-3 py-2 border-b last:border-0 border-border"
              >
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono text-foreground truncate">{s.user_id.slice(0, 8)}...{s.user_id.slice(-4)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(s.last_seen).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Security alerts summary */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-card rounded-xl border border-border p-4"
      >
        <div className="flex items-center gap-2 mb-4">
          <Shield size={18} className="text-info" />
          <h2 className="font-semibold text-foreground">Politique de sécurité</h2>
        </div>
        <div className="space-y-3">
          <SecurityCheck label="Authentification requise" status="active" />
          <SecurityCheck label="Row-Level Security (RLS)" status="active" />
          <SecurityCheck label="CORS configuré" status="active" />
          <SecurityCheck label="JWT Validation" status="active" />
          <SecurityCheck label="Rate Limiting" status="info" description="Géré par Supabase" />
        </div>
      </motion.div>
    </div>
  );
}

function SecurityCheck({ label, status, description }: { label: string; status: 'active' | 'warning' | 'info'; description?: string }) {
  const colors = { active: 'bg-primary', warning: 'bg-warning', info: 'bg-info' };
  return (
    <div className="flex items-center gap-3 py-2">
      <div className={`w-2 h-2 rounded-full ${colors[status]}`} />
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <span className="text-[10px] font-semibold uppercase text-muted-foreground">{status === 'active' ? 'Actif' : status === 'warning' ? 'Attention' : 'Info'}</span>
    </div>
  );
}
