import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  DollarSign, CreditCard, Wallet, Package, Hash, ChevronRight,
  ShoppingBag, WifiOff, Clock, Receipt, MessageCircle, AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCommerceIds } from '@/hooks/useCommerceIds';
import { useProducts } from '@/hooks/useProducts';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useManagerPermissions } from '@/hooks/useManagerPermissions';
import { StatCard } from '@/components/ui/stat-card';
import { SkeletonGrid } from '@/components/ui/skeleton-card';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';

interface ManagerStats {
  ventesJour: number;
  transactionsJour: number;
  creditsJour: number;
  creditsCount: number;
  depensesJour: number;
  depensesCount: number;
  produitsFaibles: number;
  sessionsOuvertes: number;
  montantAVerser: number;
}

export default function ManagerDashboardPage() {
  const { user } = useAuth();
  const { commerceIds, commerces, loading: commerceLoading } = useCommerceIds();
  const { products } = useProducts(commerceIds);
  const isOnline = useOnlineStatus();
  const navigate = useNavigate();
  const { permissions } = useManagerPermissions();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ nom: string } | null>(null);
  const [stats, setStats] = useState<ManagerStats>({
    ventesJour: 0, transactionsJour: 0, creditsJour: 0, creditsCount: 0,
    depensesJour: 0, depensesCount: 0, produitsFaibles: 0, sessionsOuvertes: 0,
    montantAVerser: 0,
  });

  const commerceName = commerces[0]?.nom || 'Commerce';
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Bonjour' : now.getHours() < 18 ? 'Bon après-midi' : 'Bonsoir';

  const load = useCallback(async () => {
    if (!user || commerceIds.length === 0) { setLoading(false); return; }

    try {
      const [profileRes, salesRes, creditsRes, depensesRes, sessionsRes] = await Promise.all([
        supabase.from('profiles').select('nom').eq('id', user.id).single(),
        supabase.from('daily_sales_summary').select('total_sales, transactions_count').in('commerce_id', commerceIds).eq('date', today),
        supabase.from('credits').select('total_amount, montant_restant, created_at').eq('statut', 'en_cours'),
        supabase.from('depenses').select('montant, created_at').in('commerce_id', commerceIds).gte('created_at', today + 'T00:00:00'),
        supabase.from('sessions').select('id', { count: 'exact', head: true }).in('commerce_id', commerceIds).eq('statut', 'ouverte'),
      ]);

      setProfile(profileRes.data);

      const ventesJour = salesRes.data?.reduce((s, r) => s + Number(r.total_sales || 0), 0) || 0;
      const transactionsJour = salesRes.data?.reduce((s, r) => s + (r.transactions_count || 0), 0) || 0;

      const todayCredits = creditsRes.data?.filter(c => c.created_at?.startsWith(today)) || [];
      const creditsJour = todayCredits.reduce((s, r) => s + Number((r as any).total_amount || 0), 0);
      const creditsCount = todayCredits.length;

      const depensesJour = depensesRes.data?.reduce((s, r) => s + Number(r.montant || 0), 0) || 0;
      const depensesCount = depensesRes.data?.length || 0;

      const produitsFaibles = products.filter(p => p.stock < 5).length;
      const montantAVerser = ventesJour - depensesJour;

      setStats({
        ventesJour, transactionsJour, creditsJour, creditsCount,
        depensesJour, depensesCount, produitsFaibles,
        sessionsOuvertes: sessionsRes.count || 0,
        montantAVerser,
      });
    } catch {
      // silently fail
    }
    setLoading(false);
  }, [user, commerceIds, today, products]);

  useEffect(() => {
    if (!commerceLoading) load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commerceLoading, commerceIds.length]);

  if (loading || commerceLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-8 w-48 skeleton-shimmer rounded-lg" />
        <SkeletonGrid count={4} />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5 max-w-3xl mx-auto pb-32">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">
          {greeting}, {profile?.nom || 'Gérant'} 👋
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
          {commerceName} · {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          {!isOnline && <><WifiOff size={11} className="text-warning ml-1" /> Hors ligne</>}
        </p>
      </div>

      {/* Session banner */}
      {permissions.can_use_sessions && stats.sessionsOuvertes > 0 && (
        <motion.button
          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="w-full bg-primary/8 border border-primary/20 rounded-xl px-4 py-3 flex items-center gap-3"
          onClick={() => navigate('/app/sessions')}
        >
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <Clock size={16} className="text-primary" />
          </div>
          <div className="text-left flex-1">
            <span className="text-sm font-semibold text-foreground">{stats.sessionsOuvertes} session(s) en cours</span>
            <p className="text-[10px] text-muted-foreground">Cliquez pour voir les sessions actives</p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground" />
        </motion.button>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        {permissions.can_sell && (
          <div onClick={() => navigate('/app/factures')} className="cursor-pointer">
            <StatCard label="Ventes du jour" value={`${stats.ventesJour.toLocaleString()} F`} icon={DollarSign} color="bg-primary/10 text-primary" delay={0} />
          </div>
        )}
        {permissions.can_sell && (
          <div onClick={() => navigate('/app/factures')} className="cursor-pointer">
            <StatCard label="Transactions" value={stats.transactionsJour} icon={Hash} color="bg-info/10 text-info" delay={0.05} />
          </div>
        )}
        {permissions.can_use_credit && (
          <div onClick={() => navigate('/app/credits')} className="cursor-pointer">
            <StatCard label="Crédits du jour" value={`${stats.creditsJour.toLocaleString()} F`} icon={CreditCard} color="bg-warning/10 text-warning" delay={0.1} />
          </div>
        )}
        {permissions.can_add_expenses && (
          <div onClick={() => navigate('/app/depenses')} className="cursor-pointer">
            <StatCard label="Dépenses du jour" value={`${stats.depensesJour.toLocaleString()} F`} icon={Wallet} color="bg-destructive/10 text-destructive" delay={0.15} />
          </div>
        )}
        <div onClick={() => navigate('/app/factures')} className="cursor-pointer">
          <StatCard label="À verser" value={`${stats.montantAVerser.toLocaleString()} F`} icon={Receipt} color="bg-secondary/10 text-secondary" delay={0.2} />
        </div>
        <div onClick={() => navigate('/app/produits')} className="cursor-pointer">
          <StatCard label="Stock faible" value={stats.produitsFaibles} icon={Package} color={stats.produitsFaibles > 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"} delay={0.25} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-2.5">
        {permissions.can_sell && (
          <Link to="/app/caisse" className="bg-primary text-primary-foreground rounded-2xl p-4 flex flex-col items-center gap-2 text-center card-float">
            <div className="w-10 h-10 rounded-xl bg-primary-foreground/15 flex items-center justify-center">
              <ShoppingBag size={20} />
            </div>
            <span className="text-xs font-semibold">Vendre</span>
          </Link>
        )}
        {permissions.can_manage_products && (
          <Link to="/app/produits" className="bg-card text-foreground rounded-2xl p-4 flex flex-col items-center gap-2 text-center border border-border card-float">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <Package size={20} className="text-accent-foreground" />
            </div>
            <span className="text-xs font-semibold">Produits</span>
          </Link>
        )}
        {permissions.can_use_messaging && (
          <Link to="/app/messages" className="bg-card text-foreground rounded-2xl p-4 flex flex-col items-center gap-2 text-center border border-border card-float">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <MessageCircle size={20} className="text-accent-foreground" />
            </div>
            <span className="text-xs font-semibold">Messages</span>
          </Link>
        )}
      </div>

      {/* Stock alert */}
      {stats.produitsFaibles > 0 && (
        <motion.button
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
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

      {/* More links */}
      <div className="grid grid-cols-2 gap-2.5">
        {permissions.can_use_credit && (
          <Link to="/app/credits" className="bg-card text-foreground rounded-xl p-3.5 flex items-center gap-3 border border-border card-float">
            <CreditCard size={18} className="text-warning shrink-0" />
            <span className="text-xs font-semibold">Crédits</span>
            <ChevronRight size={14} className="ml-auto text-muted-foreground" />
          </Link>
        )}
        {permissions.can_use_sessions && (
          <Link to="/app/sessions" className="bg-card text-foreground rounded-xl p-3.5 flex items-center gap-3 border border-border card-float">
            <Clock size={18} className="text-info shrink-0" />
            <span className="text-xs font-semibold">Sessions</span>
            <ChevronRight size={14} className="ml-auto text-muted-foreground" />
          </Link>
        )}
      </div>
    </div>
  );
}
