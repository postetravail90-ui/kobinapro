import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  DollarSign, ShoppingBag, CreditCard, AlertTriangle, Package, TrendingUp,
  BarChart3, Wallet, WifiOff, Hash, TrendingDown, Award, Clock, FileWarning,
  Star, ChevronRight, Plus, Users, Crown, Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCommerceIds } from '@/hooks/useCommerceIds';
import { useProducts } from '@/hooks/useProducts';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { fetchDashboardStats, fetchDailyReport, type DashboardStats, type DailyReport } from '@/services/dashboard';
import { cacheDashboardData, getCachedDashboardData, getOfflineSales } from '@/lib/offline-db';
import { StatCard } from '@/components/ui/stat-card';
import { SkeletonGrid } from '@/components/ui/skeleton-card';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { Link, useNavigate } from 'react-router-dom';
import DailyProgressBar from '@/components/gamification/DailyProgressBar';
import LiveFeed, { type FeedEvent } from '@/components/gamification/LiveFeed';
import DailyMissions, { type Mission } from '@/components/gamification/DailyMissions';
import LevelBadge from '@/components/gamification/LevelBadge';
import { useSubscription } from '@/hooks/useSubscription';

export default function DashboardPage() {
  const { user, role } = useAuth();
  const { commerceIds, loading: commerceLoading } = useCommerceIds();
  const { products } = useProducts(commerceIds);
  const isOnline = useOnlineStatus();
  const navigate = useNavigate();
  const sub = useSubscription();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    ventesJour: 0, ventesTotal: 0, sessionsOuvertes: 0, credits: 0,
    produitsFaibles: 0, depensesJour: 0, transactionsJour: 0,
    profitJour: 0, profitTotal: 0, coutProduitsVendus: 0,
  });
  const [profile, setProfile] = useState<{ nom: string } | null>(null);
  const [topProduits, setTopProduits] = useState<{ nom: string; total: number }[]>([]);
  const [subscription, setSubscription] = useState<{ plan_type: string; trial_end_date: string | null; end_date: string | null } | null>(null);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [totalTransactions, setTotalTransactions] = useState(0);

  const isManager = role === 'gerant';
  const isOwner = role === 'proprietaire' || role === 'super_admin';

  // Generate live feed events from current stats
  const feedEvents = useMemo<FeedEvent[]>(() => {
    const events: FeedEvent[] = [];
    const now = new Date();
    
    if (stats.ventesJour > 0) {
      events.push({
        id: 'sale-today',
        type: 'sale',
        message: `💰 ${stats.transactionsJour} vente(s) aujourd'hui`,
        timestamp: now,
        amount: stats.ventesJour,
      });
    }

    if (topProduits.length > 0) {
      events.push({
        id: 'trend-top',
        type: 'trend',
        message: `🔥 ${topProduits[0]?.nom} est en forte demande`,
        timestamp: now,
      });
    }

    if (stats.produitsFaibles > 0) {
      events.push({
        id: 'stock-alert',
        type: 'stock',
        message: `⚠ ${stats.produitsFaibles} produit(s) en stock faible`,
        timestamp: now,
      });
    }

    if (stats.profitJour > 0 && isOwner) {
      const pctStr = stats.ventesTotal > 0
        ? `+${Math.round((stats.ventesJour / stats.ventesTotal) * 100)}%`
        : '';
      events.push({
        id: 'profit-trend',
        type: 'trend',
        message: `📈 Bénéfice du jour : ${stats.profitJour.toLocaleString()} F ${pctStr}`,
        timestamp: now,
      });
    }

    if (stats.credits > 0) {
      events.push({
        id: 'credits-pending',
        type: 'alert',
        message: `💳 ${stats.credits.toLocaleString()} F de crédits en cours`,
        timestamp: now,
      });
    }

    return events;
  }, [stats, topProduits, isOwner]);

  // Generate daily missions from stats
  const missions = useMemo<Mission[]>(() => {
    const dailyGoal = 50000;
    const txGoal = 10;
    const m: Mission[] = [
      {
        id: 'sales-goal',
        label: `Atteindre ${dailyGoal.toLocaleString()} F de ventes`,
        current: Math.min(stats.ventesJour, dailyGoal),
        target: dailyGoal,
        completed: stats.ventesJour >= dailyGoal,
      },
      {
        id: 'tx-goal',
        label: `Faire ${txGoal} ventes`,
        current: Math.min(stats.transactionsJour, txGoal),
        target: txGoal,
        completed: stats.transactionsJour >= txGoal,
      },
    ];

    if (stats.produitsFaibles > 0) {
      m.push({
        id: 'stock-check',
        label: 'Vérifier les stocks faibles',
        current: 0,
        target: 1,
        completed: false,
      });
    }

    return m;
  }, [stats]);

  useEffect(() => {
    if (!user || commerceLoading) return;
    const load = async () => {
      try {
        const cachedStats = await getCachedDashboardData<DashboardStats>('stats');
        const cachedReport = await getCachedDashboardData<DailyReport>('report');
        const cachedProfile = await getCachedDashboardData<{ nom: string }>('profile');
        const cachedTop = await getCachedDashboardData<{ nom: string; total: number }[]>('topProduits');

        if (cachedStats) setStats(cachedStats.data);
        if (cachedProfile) setProfile(cachedProfile.data);
        if (cachedTop) setTopProduits(cachedTop.data);
        if (cachedReport && isOwner) setReport(cachedReport.data);

        const offlineSales = await getOfflineSales();
        const offlineTotal = offlineSales.reduce((s, sale) => s + (sale.total || 0), 0);

        if (!isOnline) {
          if (cachedStats) {
            setStats(prev => ({
              ...prev,
              ventesJour: prev.ventesJour + offlineTotal,
              transactionsJour: prev.transactionsJour + offlineSales.length,
            }));
          }
          setLoading(false);
          return;
        }

        const [profileRes] = await Promise.all([
          supabase.from('profiles').select('nom').eq('id', user.id).single(),
        ]);
        setProfile(profileRes.data);
        if (profileRes.data) await cacheDashboardData('profile', profileRes.data);

        if (isOwner) {
          const { data: subData } = await supabase.from('subscriptions').select('plan_type, trial_end_date, end_date').eq('proprietaire_id', user.id).eq('status', 'active').order('created_at', { ascending: false }).limit(1).single();
          setSubscription(subData);
        }

        if (commerceIds.length > 0) {
          const [dashStats, topRes, dailyReport] = await Promise.all([
            fetchDashboardStats(commerceIds, products),
            supabase.from('vue_top_produits').select('produit_nom, total_quantite').in('commerce_id', commerceIds).order('total_quantite', { ascending: false }).limit(6),
            isOwner ? fetchDailyReport(commerceIds) : Promise.resolve(null),
          ]);

          // Get total transaction count separately
          const { count: txCount } = await supabase.from('factures').select('id', { count: 'exact', head: true });
          setTotalTransactions(txCount || 0);

          dashStats.ventesJour += offlineTotal;
          dashStats.transactionsJour += offlineSales.length;

          setStats(dashStats);
          // totalTransactions already set above
          await cacheDashboardData('stats', dashStats);

          const topData = topRes.data?.map(p => ({ nom: p.produit_nom || '', total: Number(p.total_quantite) || 0 })) || [];
          setTopProduits(topData);
          await cacheDashboardData('topProduits', topData);

          if (dailyReport) {
            setReport(dailyReport);
            await cacheDashboardData('report', dailyReport);
          }
        }
      } catch {
        // Fail silently — cache data already shown
      }
      setLoading(false);
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, role, commerceLoading, commerceIds.length, isOnline]);

  if (loading || commerceLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-8 w-48 skeleton-shimmer rounded-lg" />
        <SkeletonGrid count={4} />
      </div>
    );
  }

  const planLabel: Record<string, string> = { free: 'Gratuit', commerce_1: 'Formule 1', multi_3: 'Formule 2', multi_6: 'Formule 3', multi_10: 'Formule 4' };

  return (
    <div className="p-4 space-y-5 max-w-6xl mx-auto pb-32">
      {/* Header + Level badge */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            Bonjour, {profile?.nom || (isManager ? 'Gérant' : 'Propriétaire')} 👋
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
            {isManager ? 'Tableau de bord gérant' : 'Vue d\'ensemble'}
            {!isOnline && <><WifiOff size={11} className="text-warning" /> Hors ligne</>}
          </p>
        </div>
        <LevelBadge totalSales={totalTransactions || stats.transactionsJour} compact />
      </div>

      {/* Daily Progress Bar — always visible */}
      <DailyProgressBar
        current={stats.ventesJour}
        goal={100000}
        label="Objectif du jour"
      />

      {/* Subscription banner */}
      {isOwner && !sub.loading && (
        <motion.button
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`w-full border rounded-xl px-4 py-3 flex items-center justify-between ${
            sub.isTrial ? 'bg-primary/8 border-primary/20' : sub.isExpired ? 'bg-destructive/8 border-destructive/20' : 'bg-primary/6 border-primary/15'
          }`}
          onClick={() => navigate('/app/abonnements')}
        >
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${sub.isTrial ? 'bg-primary/15' : sub.isExpired ? 'bg-destructive/15' : 'bg-primary/10'}`}>
              {sub.isTrial ? <Zap size={16} className="text-primary" /> : sub.isExpired ? <AlertTriangle size={16} className="text-destructive" /> : <Crown size={16} className="text-primary" />}
            </div>
            <div className="text-left">
              <span className="text-sm font-semibold text-foreground">
                {sub.isTrial ? 'Essai gratuit — Formule 1' : sub.isExpired ? 'Essai expiré — Plan Gratuit' : planLabel[sub.planType] || sub.plan}
              </span>
              {sub.isTrial && sub.daysRemaining !== null && (
                <p className="text-[10px] text-primary font-medium">{sub.daysRemaining} jour(s) restant(s)</p>
              )}
              {!sub.isTrial && !sub.isExpired && sub.daysRemaining !== null && (
                <p className="text-[10px] text-muted-foreground">Expire dans {sub.daysRemaining} jour(s)</p>
              )}
              {sub.isExpired && (
                <p className="text-[10px] text-destructive">Passez à une formule pour continuer</p>
              )}
            </div>
          </div>
          <ChevronRight size={16} className="text-muted-foreground" />
        </motion.button>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div onClick={() => navigate('/app/factures')} className="cursor-pointer">
          <StatCard label="Ventes aujourd'hui" value={`${stats.ventesJour.toLocaleString()} F`} icon={DollarSign} color="bg-primary/10 text-primary" delay={0} />
        </div>
        <div onClick={() => navigate('/app/factures')} className="cursor-pointer">
          <StatCard label="Transactions" value={stats.transactionsJour} icon={Hash} color="bg-info/10 text-info" delay={0.05} />
        </div>

        {isOwner && (
          <div onClick={() => navigate('/app/benefice')} className="cursor-pointer">
            <StatCard
              label="Bénéfice du jour"
              value={`${stats.profitJour.toLocaleString()} F`}
              icon={stats.profitJour >= 0 ? TrendingUp : TrendingDown}
              color={stats.profitJour >= 0 ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}
              delay={0.1}
            />
          </div>
        )}

        {isOwner && (
          <div onClick={() => navigate('/app/credits')} className="cursor-pointer">
            <StatCard label="Crédits en cours" value={`${stats.credits.toLocaleString()} F`} icon={CreditCard} color="bg-warning/10 text-warning" delay={0.15} />
          </div>
        )}

        <div onClick={() => navigate('/app/produits')} className="cursor-pointer">
          <StatCard label="Stock faible" value={stats.produitsFaibles} icon={Package} color="bg-destructive/10 text-destructive" delay={0.2} />
        </div>

        {isOwner && (
          <div onClick={() => navigate('/app/depenses')} className="cursor-pointer">
            <StatCard label="Dépenses du jour" value={`${stats.depensesJour.toLocaleString()} F`} icon={Wallet} color="bg-accent text-accent-foreground" delay={0.25} />
          </div>
        )}

        {isOwner && (
          <div onClick={() => navigate('/app/benefice')} className="cursor-pointer">
            <StatCard label="Bénéfice total" value={`${stats.profitTotal.toLocaleString()} F`} icon={Award} color="bg-primary/10 text-primary" delay={0.3} />
          </div>
        )}

        <div onClick={() => navigate('/app/factures')} className="cursor-pointer">
          <StatCard label="Total ventes" value={`${stats.ventesTotal.toLocaleString()} F`} icon={TrendingUp} color="bg-secondary/10 text-secondary" delay={0.35} />
        </div>
      </div>

      {/* Quick Actions — Apple-style grid */}
      <div className="grid grid-cols-3 gap-2.5">
        <Link to="/app/caisse" className="bg-primary text-primary-foreground rounded-2xl p-4 flex flex-col items-center gap-2 text-center card-float">
          <div className="w-10 h-10 rounded-xl bg-primary-foreground/15 flex items-center justify-center">
            <ShoppingBag size={20} />
          </div>
          <span className="text-xs font-semibold">Nouvelle vente</span>
        </Link>
        <Link to="/app/produits" className="bg-card text-foreground rounded-2xl p-4 flex flex-col items-center gap-2 text-center border border-border card-float">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
            <Plus size={20} className="text-accent-foreground" />
          </div>
          <span className="text-xs font-semibold">Ajouter produit</span>
        </Link>
        {isOwner ? (
          <Link to="/app/gerants" className="bg-card text-foreground rounded-2xl p-4 flex flex-col items-center gap-2 text-center border border-border card-float">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <Users size={20} className="text-accent-foreground" />
            </div>
            <span className="text-xs font-semibold">Gérants</span>
          </Link>
        ) : (
          <Link to="/app/depenses" className="bg-card text-foreground rounded-2xl p-4 flex flex-col items-center gap-2 text-center border border-border card-float">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <Wallet size={20} className="text-accent-foreground" />
            </div>
            <span className="text-xs font-semibold">Dépense</span>
          </Link>
        )}
      </div>

      {/* Live Feed */}
      {feedEvents.length > 0 && <LiveFeed events={feedEvents} />}

      {/* Daily Missions */}
      <DailyMissions missions={missions} />

      {/* Alert banner */}
      {stats.produitsFaibles > 0 && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full bg-warning/8 border border-warning/15 rounded-xl px-4 py-3 flex items-center gap-3"
          onClick={() => navigate('/app/produits')}
        >
          <div className="w-8 h-8 rounded-lg bg-warning/15 flex items-center justify-center shrink-0">
            <AlertTriangle size={16} className="text-warning" />
          </div>
          <p className="text-sm text-foreground flex-1 text-left">{stats.produitsFaibles} produit(s) en stock faible</p>
          <ChevronRight size={16} className="text-muted-foreground" />
        </motion.button>
      )}

      {/* Level & Progression */}
      <LevelBadge totalSales={totalTransactions || stats.transactionsJour} />

      {/* Daily Report */}
      {isOwner && report && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl border border-border p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-primary" />
            <h2 className="font-semibold text-sm text-foreground">Rapport intelligent</h2>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <button onClick={() => navigate('/app/produits')} className="bg-muted rounded-xl p-3 text-left">
              <p className="text-[9px] text-muted-foreground uppercase font-semibold tracking-wide">Top produit</p>
              <p className="text-xs font-bold text-foreground mt-1 flex items-center gap-1">
                <Star size={10} className="text-warning" /> {report.topProduit}
              </p>
            </button>
            <button onClick={() => navigate('/app/produits')} className="bg-muted rounded-xl p-3 text-left">
              <p className="text-[9px] text-muted-foreground uppercase font-semibold tracking-wide">Non vendus</p>
              <p className="text-xs font-bold text-foreground mt-1">{report.produitNonVendu}</p>
            </button>
            <div className="bg-muted rounded-xl p-3">
              <p className="text-[9px] text-muted-foreground uppercase font-semibold tracking-wide">Heure active</p>
              <p className="text-xs font-bold text-foreground mt-1 flex items-center gap-1">
                <Clock size={10} className="text-info" /> {report.heureActive}
              </p>
            </div>
          </div>

          {report.anomalies.length > 0 && (
            <div className="space-y-1.5 mt-1">
              <p className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                <FileWarning size={10} /> Anomalies
              </p>
              {report.anomalies.map((a, i) => (
                <div key={i} className={`text-xs rounded-lg p-2.5 flex items-center gap-2 ${
                  a.severity === 'danger' ? 'bg-destructive/8 text-destructive' : 'bg-warning/8 text-warning-foreground'
                }`}>
                  <AlertTriangle size={11} className="shrink-0" />
                  {a.message}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Top products chart */}
      {topProduits.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl border border-border p-4 cursor-pointer"
          onClick={() => navigate('/app/produits')}
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-primary" />
            <h2 className="font-semibold text-sm text-foreground">Produits populaires</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topProduits} layout="vertical" margin={{ left: 0, right: 12 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis type="category" dataKey="nom" width={90} fontSize={11} tick={{ fill: 'hsl(var(--foreground))' }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 11 }} />
              <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* More actions for owner */}
      {isOwner && (
        <div className="grid grid-cols-2 gap-2.5">
          <Link to="/app/fidelite" className="bg-card text-foreground rounded-xl p-3.5 flex items-center gap-3 border border-border card-float">
            <Award size={18} className="text-primary shrink-0" />
            <span className="text-xs font-semibold">Cartes fidélité</span>
            <ChevronRight size={14} className="ml-auto text-muted-foreground" />
          </Link>
          <Link to="/app/commerces" className="bg-card text-foreground rounded-xl p-3.5 flex items-center gap-3 border border-border card-float">
            <Package size={18} className="text-primary shrink-0" />
            <span className="text-xs font-semibold">Mes commerces</span>
            <ChevronRight size={14} className="ml-auto text-muted-foreground" />
          </Link>
        </div>
      )}
      {isManager && (
        <div className="grid grid-cols-2 gap-2.5">
          <Link to="/app/credits" className="bg-card text-foreground rounded-xl p-3.5 flex items-center gap-3 border border-border card-float">
            <CreditCard size={18} className="text-warning shrink-0" />
            <span className="text-xs font-semibold">Crédits</span>
            <ChevronRight size={14} className="ml-auto text-muted-foreground" />
          </Link>
          <Link to="/app/messages" className="bg-card text-foreground rounded-xl p-3.5 flex items-center gap-3 border border-border card-float">
            <DollarSign size={18} className="text-info shrink-0" />
            <span className="text-xs font-semibold">Messages</span>
            <ChevronRight size={14} className="ml-auto text-muted-foreground" />
          </Link>
        </div>
      )}
    </div>
  );
}
