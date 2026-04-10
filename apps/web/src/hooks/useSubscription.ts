import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PlanLimits {
  plan: string;
  max_commerces: number;
  max_managers: number;
  max_products: number;
  scanner: boolean;
  messagerie: boolean;
  credit_module: boolean;
  session_module: boolean;
  rapport_avance: boolean;
  benefice: boolean;
  fidelite: boolean;
  favoris: boolean;
}

export interface SubscriptionState {
  plan: string; // formule1, formule2, etc.
  planType: string; // DB enum: free, commerce_1, etc.
  status: 'trial' | 'active' | 'expired' | 'free';
  isTrial: boolean;
  isExpired: boolean;
  trialEndDate: string | null;
  endDate: string | null;
  limits: PlanLimits;
  loading: boolean;
  daysRemaining: number | null;
  // Usage
  usage: { commerces: number; gerants: number; produits: number };
  // Helpers
  canUseFeature: (feature: keyof Pick<PlanLimits, 'scanner' | 'messagerie' | 'credit_module' | 'session_module' | 'rapport_avance' | 'benefice' | 'fidelite' | 'favoris'>) => boolean;
  canAddCommerce: () => boolean;
  canAddGerant: () => boolean;
  canAddProduct: () => boolean;
  isFreePlan: boolean;
  refresh: () => Promise<void>;
}

const FREE_LIMITS: PlanLimits = {
  plan: 'free',
  max_commerces: 1,
  max_managers: 1,
  max_products: 20,
  scanner: false,
  messagerie: false,
  credit_module: false,
  session_module: false,
  rapport_avance: false,
  benefice: false,
  fidelite: false,
  favoris: false,
};

const planTypeToLimitsPlan: Record<string, string> = {
  free: 'free',
  commerce_1: 'formule1',
  multi_3: 'formule2',
  multi_6: 'formule3',
  multi_10: 'formule4',
};

export function useSubscription(): SubscriptionState {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState('free');
  const [planType, setPlanType] = useState('free');
  const [status, setStatus] = useState<SubscriptionState['status']>('free');
  const [isTrial, setIsTrial] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [trialEndDate, setTrialEndDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [limits, setLimits] = useState<PlanLimits>(FREE_LIMITS);
  const [usage, setUsage] = useState({ commerces: 0, gerants: 0, produits: 0 });

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }

    try {
      // 1. Get subscription status (uses the DB function for consistency)
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('proprietaire_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let currentPlan = 'free';
      let currentPlanType = 'free';
      let currentStatus: SubscriptionState['status'] = 'free';
      let trial = false;
      let expired = false;
      let tEnd: string | null = null;
      let eEnd: string | null = null;

      if (subData) {
        trial = !!subData.trial_end_date && !subData.end_date && subData.montant === 0;
        tEnd = subData.trial_end_date;
        eEnd = subData.end_date;

        if (trial) {
          expired = !!subData.trial_end_date && new Date(subData.trial_end_date) < new Date();
        } else {
          expired = !!subData.end_date && new Date(subData.end_date) < new Date();
        }

        currentPlanType = subData.plan_type;
        currentPlan = expired ? 'free' : (planTypeToLimitsPlan[subData.plan_type] || 'free');
        currentStatus = expired ? 'expired' : trial ? 'trial' : 'active';
      }

      // Super-admin & équipe plateforme : pas de plafond côté abonnement (interface admin ou contrôle total)
      if (role === 'super_admin' || role === 'admin_staff') {
        currentPlan = 'formule4';
        currentStatus = 'active';
        expired = false;
      }

      setPlan(currentPlan);
      setPlanType(currentPlanType);
      setStatus(currentStatus);
      setIsTrial(trial && !expired);
      setIsExpired(expired);
      setTrialEndDate(tEnd);
      setEndDate(eEnd);

      // 2. Get plan limits
      const { data: limitsData } = await supabase
        .from('plan_limits')
        .select('*')
        .eq('plan', currentPlan)
        .maybeSingle();

      setLimits(limitsData ? {
        plan: limitsData.plan,
        max_commerces: limitsData.max_commerces,
        max_managers: limitsData.max_managers,
        max_products: limitsData.max_products,
        scanner: limitsData.scanner,
        messagerie: limitsData.messagerie,
        credit_module: limitsData.credit_module,
        session_module: limitsData.session_module,
        rapport_avance: limitsData.rapport_avance,
        benefice: limitsData.benefice,
        fidelite: limitsData.fidelite,
        favoris: limitsData.favoris,
      } : FREE_LIMITS);

      // 3. Compteurs d’usage limités aux commerces du propriétaire (isolation multi-tenant côté client + cohérence quotas)
      const isOwner = role === 'proprietaire' || role === 'super_admin';
      if (isOwner) {
        const { data: myCommerces, error: commListErr } = await supabase
          .from('commerces')
          .select('id')
          .eq('proprietaire_id', user.id);

        if (commListErr) {
          console.error('[useSubscription] commerces:', commListErr);
          setUsage({ commerces: 0, gerants: 0, produits: 0 });
        } else {
          const commerceIds = (myCommerces || []).map((c) => c.id);
          const commCount = commerceIds.length;

          let gerCount = 0;
          let prodCount = 0;

          if (commerceIds.length > 0) {
            const [gerRows, commRows, prodRes] = await Promise.all([
              supabase.from('gerants').select('id, user_id, commerce_id').in('commerce_id', commerceIds),
              supabase.from('commerces').select('id, proprietaire_id').in('id', commerceIds),
              supabase
                .from('produits')
                .select('id', { count: 'exact', head: true })
                .eq('actif', true)
                .in('commerce_id', commerceIds),
            ]);
            if (!gerRows.error && !commRows.error) {
              const ownerByCommerce = new Map(
                (commRows.data || []).map((c) => [c.id, c.proprietaire_id])
              );
              gerCount = (gerRows.data || []).filter(
                (g) => ownerByCommerce.get(g.commerce_id) !== g.user_id
              ).length;
            }
            prodCount = prodRes.count || 0;
          }

          setUsage({
            commerces: commCount,
            gerants: gerCount,
            produits: prodCount,
          });
        }
      }
    } catch {
      // Fail silently, defaults to free
    }

    setLoading(false);
  }, [user, role]);

  useEffect(() => { load(); }, [load]);

  const daysRemaining = (() => {
    const ref = endDate || trialEndDate;
    if (!ref) return null;
    return Math.max(0, Math.ceil((new Date(ref).getTime() - Date.now()) / 86400000));
  })();

  return {
    plan,
    planType,
    status,
    isTrial,
    isExpired,
    trialEndDate,
    endDate,
    limits,
    loading,
    daysRemaining,
    usage,
    isFreePlan: plan === 'free',
    canUseFeature: (feature) => limits[feature],
    canAddCommerce: () => usage.commerces < limits.max_commerces,
    canAddGerant: () => usage.gerants < limits.max_managers,
    canAddProduct: () => usage.produits < limits.max_products,
    refresh: load,
  };
}
