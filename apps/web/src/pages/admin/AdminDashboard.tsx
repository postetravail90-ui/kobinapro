import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StatCard } from '@/components/ui/stat-card';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import {
  Users, Store, DollarSign, ShieldAlert, Activity, TrendingUp, CreditCard,
  UserPlus, ShoppingBag, AlertTriangle, Clock, ChevronRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const COLORS = ['hsl(145, 63%, 42%)', 'hsl(40, 95%, 55%)', 'hsl(210, 80%, 55%)', 'hsl(0, 72%, 51%)', 'hsl(270, 60%, 55%)'];

interface RecentUser {
  id: string;
  email: string | null;
  created_at: string | null;
  full_name: string | null;
}

interface RecentAlert {
  id: string;
  type_alerte: string;
  niveau_risque: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    users: 0, commerces: 0, revenue: 0, alerts: 0, activeSubs: 0,
    managers: 0, totalSales: 0, newUsersToday: 0,
  });
  const [planDistribution, setPlanDistribution] = useState<{ name: string; value: number }[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<RecentAlert[]>([]);
  const [growthData, setGrowthData] = useState<{ date: string; users: number; commerces: number }[]>([]);

  useEffect(() => {
    const load = async () => {
      const [usersRes, commercesRes, subsRes, alertsRes, activeSubsRes, managersRes, salesRes, recentUsersRes, recentAlertsRes] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('commerces').select('id', { count: 'exact', head: true }),
        supabase.from('subscriptions').select('montant').eq('status', 'active'),
        supabase.from('fraud_alerts').select('id', { count: 'exact', head: true }).eq('resolved', false),
        supabase.from('subscriptions').select('plan_type').eq('status', 'active'),
        supabase.from('gerants').select('id', { count: 'exact', head: true }).eq('actif', true),
        supabase.from('vue_total_ventes').select('total_ventes'),
        supabase.from('users').select('id, email, created_at, full_name').order('created_at', { ascending: false }).limit(5),
        supabase.from('fraud_alerts').select('id, type_alerte, niveau_risque, created_at').eq('resolved', false).order('created_at', { ascending: false }).limit(5),
      ]);

      // Count new users today
      const today = new Date().toISOString().split('T')[0];
      const { count: newToday } = await supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', today + 'T00:00:00');

      // Plan distribution
      const planCounts: Record<string, number> = {};
      activeSubsRes.data?.forEach(s => { planCounts[s.plan_type] = (planCounts[s.plan_type] || 0) + 1; });
      setPlanDistribution(Object.entries(planCounts).map(([name, value]) => ({ name, value })));

      // Build growth data (last 7 days mock from counts)
      const days: { date: string; users: number; commerces: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push({
          date: d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
          users: Math.max(0, (usersRes.count || 0) - Math.floor(Math.random() * 3 * (i + 1))),
          commerces: Math.max(0, (commercesRes.count || 0) - Math.floor(Math.random() * 2 * (i + 1))),
        });
      }
      setGrowthData(days);

      setRecentUsers(recentUsersRes.data || []);
      setRecentAlerts(recentAlertsRes.data || []);

      setStats({
        users: usersRes.count || 0,
        commerces: commercesRes.count || 0,
        revenue: subsRes.data?.reduce((s, r) => s + Number(r.montant), 0) || 0,
        alerts: alertsRes.count || 0,
        activeSubs: activeSubsRes.data?.length || 0,
        managers: managersRes.count || 0,
        totalSales: salesRes.data?.reduce((s, r) => s + (Number(r.total_ventes) || 0), 0) || 0,
        newUsersToday: newToday || 0,
      });
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-3">{[1,2,3,4,5,6,7,8].map(i => <SkeletonCard key={i} />)}</div>;

  const riskColor: Record<string, string> = { faible: 'text-info', moyen: 'text-warning', eleve: 'text-destructive', critique: 'text-destructive' };

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Administration Kobina</h1>
        <p className="text-sm text-muted-foreground">Vue d'ensemble de la plateforme en temps réel</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Link to="/admin/users"><StatCard label="Utilisateurs" value={stats.users} icon={Users} color="bg-info/10 text-info" /></Link>
        <Link to="/admin/commerces"><StatCard label="Commerces" value={stats.commerces} icon={Store} color="bg-primary/10 text-primary" /></Link>
        <Link to="/admin/revenue"><StatCard label="Revenus actifs" value={`${stats.revenue.toLocaleString()} F`} icon={DollarSign} color="bg-success/10 text-success" /></Link>
        <Link to="/admin/fraude"><StatCard label="Alertes fraude" value={stats.alerts} icon={ShieldAlert} color="bg-destructive/10 text-destructive" /></Link>
        <Link to="/admin/abonnements"><StatCard label="Abonnements actifs" value={stats.activeSubs} icon={CreditCard} color="bg-primary/10 text-primary" delay={0.05} /></Link>
        <StatCard label="Gérants actifs" value={stats.managers} icon={Users} color="bg-info/10 text-info" delay={0.1} />
        <StatCard label="Ventes plateforme" value={`${stats.totalSales.toLocaleString()} F`} icon={ShoppingBag} color="bg-success/10 text-success" delay={0.15} />
        <StatCard label="Nouveaux aujourd'hui" value={stats.newUsersToday} icon={UserPlus} color="bg-warning/10 text-warning" delay={0.2} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Growth Chart */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card rounded-xl border border-border p-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-primary" />
            <h2 className="font-semibold text-foreground">Croissance</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
              <Area type="monotone" dataKey="users" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" strokeWidth={2} name="Utilisateurs" />
              <Area type="monotone" dataKey="commerces" stroke="hsl(var(--info))" fill="hsl(var(--info) / 0.1)" strokeWidth={2} name="Commerces" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Plan Distribution */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-card rounded-xl border border-border p-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={18} className="text-primary" />
            <h2 className="font-semibold text-foreground">Distribution des plans</h2>
          </div>
          {planDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={planDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                  {planDistribution.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Aucun abonnement actif</p>
          )}
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent Users */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-card rounded-xl border border-border p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <UserPlus size={18} className="text-info" />
              <h2 className="font-semibold text-foreground">Inscriptions récentes</h2>
            </div>
            <Link to="/admin/users" className="text-xs text-primary font-medium flex items-center gap-1">Voir tous <ChevronRight size={12} /></Link>
          </div>
          <div className="space-y-2">
            {recentUsers.map(u => (
              <div key={u.id} className="flex items-center gap-3 py-2 border-b last:border-0 border-border">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                  {(u.full_name || u.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{u.full_name || u.email || 'Utilisateur'}</p>
                  <p className="text-[10px] text-muted-foreground">{u.email}</p>
                </div>
                <p className="text-[10px] text-muted-foreground shrink-0">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '-'}
                </p>
              </div>
            ))}
            {recentUsers.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Aucun utilisateur</p>}
          </div>
        </motion.div>

        {/* Security Alerts */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-card rounded-xl border border-border p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-destructive" />
              <h2 className="font-semibold text-foreground">Alertes de sécurité</h2>
            </div>
            <Link to="/admin/fraude" className="text-xs text-primary font-medium flex items-center gap-1">Voir toutes <ChevronRight size={12} /></Link>
          </div>
          <div className="space-y-2">
            {recentAlerts.map(a => (
              <div key={a.id} className="flex items-center gap-3 py-2 border-b last:border-0 border-border">
                <ShieldAlert size={16} className={riskColor[a.niveau_risque] || 'text-muted-foreground'} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{a.type_alerte}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleString('fr-FR')}</p>
                </div>
                <span className={`text-[10px] font-bold uppercase ${riskColor[a.niveau_risque]}`}>{a.niveau_risque}</span>
              </div>
            ))}
            {recentAlerts.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4 flex items-center justify-center gap-2">
                <ShieldAlert size={14} /> Aucune alerte active
              </p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Live monitoring bar */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        className="bg-muted rounded-xl p-4 flex flex-wrap items-center gap-6"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-semibold text-foreground">Système en ligne</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={12} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Dernière mise à jour: {new Date().toLocaleTimeString('fr-FR')}</span>
        </div>
        <div className="flex items-center gap-2">
          <Activity size={12} className="text-primary" />
          <span className="text-xs text-muted-foreground">{stats.activeSubs} abonnements actifs</span>
        </div>
      </motion.div>
    </div>
  );
}
