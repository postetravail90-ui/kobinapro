import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCommerceIds } from '@/hooks/useCommerceIds';
import { fetchProfitReport, getPeriodDates, type ProfitReport, type ProfitPeriod } from '@/services/profit';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { StatCard } from '@/components/ui/stat-card';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, DollarSign, Wallet, Package,
  BarChart3, AlertTriangle, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, ResponsiveContainer,
  Tooltip, CartesianGrid, Legend
} from 'recharts';
import { Navigate } from 'react-router-dom';
import BackButton from '@/components/BackButton';

const PERIODS: { label: string; value: ProfitPeriod }[] = [
  { label: "Aujourd'hui", value: 'today' },
  { label: '7 jours', value: 'week' },
  { label: 'Ce mois', value: 'month' },
  { label: 'Tout', value: 'all' },
];

export default function BeneficePage() {
  const { role } = useAuth();
  const { commerceIds, loading: commerceLoading } = useCommerceIds();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<ProfitPeriod>('month');
  const [report, setReport] = useState<ProfitReport | null>(null);

  const isOwner = role === 'proprietaire' || role === 'super_admin';

  useEffect(() => {
    if (commerceLoading || commerceIds.length === 0) return;
    setLoading(true);
    const { from, to } = getPeriodDates(period);
    fetchProfitReport(commerceIds, from, to).then(r => {
      setReport(r);
      setLoading(false);
    });
  }, [commerceIds, commerceLoading, period]);

  // Block managers
  if (!isOwner) return <Navigate to="/app" replace />;

  if (loading || commerceLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  const r = report || {
    total_ventes: 0, total_cout: 0, total_benefice_brut: 0,
    total_depenses: 0, total_benefice_net: 0, nb_produits_vendus: 0,
    par_produit: [], par_jour: [],
  };

  const margePercent = r.total_ventes > 0
    ? ((r.total_benefice_brut / r.total_ventes) * 100).toFixed(1)
    : '0';

  const isPositive = r.total_benefice_net >= 0;

  // Negative profit products
  const negativeProducts = r.par_produit.filter(p => p.total_benefice < 0);

  return (
    <div className="p-4 space-y-6 max-w-5xl mx-auto pb-32">
      <BackButton fallback="/app" />
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bénéfice & Rentabilité</h1>
        <p className="text-sm text-muted-foreground">Analyse confidentielle — Propriétaire uniquement</p>
      </div>

      {/* Period selector */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {PERIODS.map(p => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              period === p.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Bénéfice net"
          value={`${r.total_benefice_net.toLocaleString()} F`}
          icon={isPositive ? TrendingUp : TrendingDown}
          color={isPositive ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}
          delay={0}
        />
        <StatCard
          label="Chiffre d'affaires"
          value={`${r.total_ventes.toLocaleString()} F`}
          icon={DollarSign}
          color="bg-info/10 text-info"
          delay={0.05}
        />
        <StatCard
          label="Coût produits"
          value={`${r.total_cout.toLocaleString()} F`}
          icon={Package}
          color="bg-warning/10 text-warning"
          delay={0.1}
        />
        <StatCard
          label="Dépenses"
          value={`${r.total_depenses.toLocaleString()} F`}
          icon={Wallet}
          color="bg-destructive/10 text-destructive"
          delay={0.15}
        />
      </div>

      {/* Margin indicator */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className={`rounded-xl p-4 flex items-center justify-between ${
          isPositive ? 'bg-primary/5 border border-primary/20' : 'bg-destructive/5 border border-destructive/20'
        }`}
      >
        <div className="flex items-center gap-3">
          {isPositive ? (
            <ArrowUpRight size={20} className="text-primary" />
          ) : (
            <ArrowDownRight size={20} className="text-destructive" />
          )}
          <div>
            <p className="text-sm font-semibold text-foreground">Marge brute : {margePercent}%</p>
            <p className="text-xs text-muted-foreground">
              Bénéfice brut: {r.total_benefice_brut.toLocaleString()} F — Net: {r.total_benefice_net.toLocaleString()} F
            </p>
          </div>
        </div>
      </motion.div>

      {/* Negative profit alert */}
      {negativeProducts.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 space-y-2"
        >
          <p className="text-sm font-semibold text-destructive flex items-center gap-2">
            <AlertTriangle size={16} /> Produits à bénéfice négatif
          </p>
          {negativeProducts.map(p => (
            <div key={p.produit_id} className="text-xs text-foreground flex justify-between">
              <span>{p.produit_nom}</span>
              <span className="text-destructive font-bold">{p.total_benefice.toLocaleString()} F</span>
            </div>
          ))}
        </motion.div>
      )}

      {/* Profit evolution chart */}
      {r.par_jour.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-card rounded-xl border border-border p-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-primary" />
            <h2 className="font-semibold text-foreground">Évolution du bénéfice</h2>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={r.par_jour} margin={{ left: 0, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="jour"
                fontSize={11}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={v => new Date(v).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
              />
              <YAxis fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 12,
                  fontSize: 12,
                }}
                formatter={(v: number) => [`${v.toLocaleString()} F`]}
                labelFormatter={v => new Date(v).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'long' })}
              />
              <Legend />
              <Line type="monotone" dataKey="ventes" name="Ventes" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="benefice" name="Bénéfice" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Profit by product table */}
      {r.par_produit.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-card rounded-xl border border-border p-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <Package size={18} className="text-primary" />
            <h2 className="font-semibold text-foreground">Bénéfice par produit</h2>
          </div>

          {/* Bar chart */}
          <ResponsiveContainer width="100%" height={Math.min(r.par_produit.length * 40 + 40, 300)}>
            <BarChart data={r.par_produit.slice(0, 10)} layout="vertical" margin={{ left: 0, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis type="category" dataKey="produit_nom" width={100} fontSize={11} tick={{ fill: 'hsl(var(--foreground))' }} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }}
                formatter={(v: number) => [`${v.toLocaleString()} F`]}
              />
              <Bar dataKey="total_benefice" name="Bénéfice" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>

          {/* Detailed table */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2 px-1 font-semibold">Produit</th>
                  <th className="text-right py-2 px-1 font-semibold">Qté</th>
                  <th className="text-right py-2 px-1 font-semibold">Vente</th>
                  <th className="text-right py-2 px-1 font-semibold">Coût</th>
                  <th className="text-right py-2 px-1 font-semibold">Bénéfice</th>
                </tr>
              </thead>
              <tbody>
                {r.par_produit.map(p => (
                  <tr key={p.produit_id} className="border-b border-border/50">
                    <td className="py-2 px-1 font-medium text-foreground">{p.produit_nom}</td>
                    <td className="py-2 px-1 text-right text-muted-foreground">{p.total_quantite}</td>
                    <td className="py-2 px-1 text-right text-foreground">{Number(p.total_ventes).toLocaleString()} F</td>
                    <td className="py-2 px-1 text-right text-warning">{Number(p.total_cout).toLocaleString()} F</td>
                    <td className={`py-2 px-1 text-right font-bold ${Number(p.total_benefice) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {Number(p.total_benefice).toLocaleString()} F
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Empty state */}
      {r.par_produit.length === 0 && !loading && (
        <div className="text-center py-16 text-muted-foreground">
          <BarChart3 size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aucune donnée de bénéfice</p>
          <p className="text-xs mt-1">Les bénéfices apparaîtront après vos premières ventes</p>
        </div>
      )}
    </div>
  );
}
