import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StatCard } from '@/components/ui/stat-card';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { DollarSign, TrendingUp, CreditCard, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'framer-motion';

const COLORS = ['hsl(145, 63%, 42%)', 'hsl(40, 95%, 55%)', 'hsl(210, 80%, 55%)', 'hsl(0, 72%, 51%)', 'hsl(270, 60%, 55%)'];

export default function AdminRevenuePage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalRevenue: 0, activeSubs: 0, avgRevenue: 0, totalVentes: 0 });
  const [planData, setPlanData] = useState<{ name: string; value: number; revenue: number }[]>([]);

  useEffect(() => {
    const load = async () => {
      const [subsRes, ventesRes] = await Promise.all([
        supabase.from('subscriptions').select('plan_type, status, montant').eq('status', 'active'),
        supabase.from('vue_total_ventes').select('total_ventes'),
      ]);

      const subs = subsRes.data || [];
      const totalRevenue = subs.reduce((s, r) => s + Number(r.montant), 0);
      const totalVentes = ventesRes.data?.reduce((s, r) => s + (Number(r.total_ventes) || 0), 0) || 0;

      // Plan breakdown
      const planMap: Record<string, { count: number; revenue: number }> = {};
      subs.forEach(s => {
        if (!planMap[s.plan_type]) planMap[s.plan_type] = { count: 0, revenue: 0 };
        planMap[s.plan_type].count++;
        planMap[s.plan_type].revenue += Number(s.montant);
      });

      setPlanData(Object.entries(planMap).map(([name, d]) => ({ name, value: d.count, revenue: d.revenue })));

      setStats({
        totalRevenue,
        activeSubs: subs.length,
        avgRevenue: subs.length > 0 ? Math.round(totalRevenue / subs.length) : 0,
        totalVentes,
      });
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="p-4 grid grid-cols-2 gap-3">{[1,2,3,4].map(i => <SkeletonCard key={i} />)}</div>;

  return (
    <div className="p-4 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-foreground">Revenus & Finances</h1>
        <p className="text-sm text-muted-foreground">Analyse financière de la plateforme</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Revenus abonnements" value={`${stats.totalRevenue.toLocaleString()} F`} icon={DollarSign} color="bg-success/10 text-success" />
        <StatCard label="Abonnements actifs" value={stats.activeSubs} icon={CreditCard} color="bg-primary/10 text-primary" delay={0.05} />
        <StatCard label="Revenu moyen / abo" value={`${stats.avgRevenue.toLocaleString()} F`} icon={TrendingUp} color="bg-info/10 text-info" delay={0.1} />
        <StatCard label="Total ventes plateforme" value={`${stats.totalVentes.toLocaleString()} F`} icon={DollarSign} color="bg-warning/10 text-warning" delay={0.15} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Revenue by plan */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl border border-border p-4"
        >
          <h2 className="font-semibold text-foreground mb-4">Revenus par plan</h2>
          {planData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={planData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" fontSize={11} tick={{ fill: 'hsl(var(--foreground))' }} />
                <YAxis fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="Revenu (F)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>
          )}
        </motion.div>

        {/* Subscribers by plan */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card rounded-xl border border-border p-4"
        >
          <h2 className="font-semibold text-foreground mb-4">Abonnés par plan</h2>
          {planData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={planData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                  {planData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>
          )}
        </motion.div>
      </div>

      {/* Plan details table */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-card rounded-xl border border-border overflow-hidden"
      >
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Détails par plan</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Plan</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Abonnés</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Revenu total</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Revenu moyen</th>
              </tr>
            </thead>
            <tbody>
              {planData.map((p, i) => (
                <tr key={p.name} className="border-b last:border-0 border-border">
                  <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                  <td className="px-4 py-3 text-right text-foreground">{p.value}</td>
                  <td className="px-4 py-3 text-right font-semibold text-primary">{p.revenue.toLocaleString()} F</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{p.value > 0 ? Math.round(p.revenue / p.value).toLocaleString() : 0} F</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
