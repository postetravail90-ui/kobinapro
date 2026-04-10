import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, TrendingUp, Package, Clock } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [topProduits, setTopProduits] = useState<any[]>([]);
  const [longSessions, setLongSessions] = useState<any[]>([]);
  const [totalVentes, setTotalVentes] = useState(0);

  useEffect(() => {
    const load = async () => {
      const [topRes, longRes, ventesRes] = await Promise.all([
        supabase.from('vue_top_produits').select('*').order('total_quantite', { ascending: false }).limit(10),
        supabase.from('vue_sessions_longues').select('*').order('heures_ouvertes', { ascending: false }).limit(10),
        supabase.from('vue_total_ventes').select('total_ventes'),
      ]);
      setTopProduits(topRes.data || []);
      setLongSessions(longRes.data || []);
      setTotalVentes(ventesRes.data?.reduce((s, r) => s + (Number(r.total_ventes) || 0), 0) || 0);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="p-4 grid grid-cols-2 gap-3">{[1,2].map(i => <SkeletonCard key={i} />)}</div>;

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-foreground">Analytics globaux</h1>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard label="Total ventes plateforme" value={`${totalVentes.toLocaleString()} F`} icon={TrendingUp} color="bg-primary/10 text-primary" />
        <StatCard label="Top produits" value={topProduits.length} icon={Package} color="bg-info/10 text-info" />
        <StatCard label="Sessions longues" value={longSessions.length} icon={Clock} color="bg-warning/10 text-warning" />
      </div>

      {/* Top products chart */}
      {topProduits.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-primary" />
            <h2 className="font-semibold text-foreground">Top produits vendus</h2>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topProduits.map(p => ({ nom: p.produit_nom, quantite: Number(p.total_quantite) }))} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" fontSize={12} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis type="category" dataKey="nom" width={120} fontSize={11} tick={{ fill: 'hsl(var(--foreground))' }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="quantite" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Long sessions */}
      {longSessions.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-warning" />
            <h2 className="font-semibold text-foreground">Sessions longues</h2>
          </div>
          <div className="space-y-2">
            {longSessions.map((s, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0 border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">{s.commerce_nom} – {s.numero_table || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground">{new Date(s.date_ouverture).toLocaleString('fr-FR')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-warning">{Number(s.heures_ouvertes).toFixed(1)}h</p>
                  <p className="text-xs text-muted-foreground">{Number(s.total_actuel).toLocaleString()} F</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
