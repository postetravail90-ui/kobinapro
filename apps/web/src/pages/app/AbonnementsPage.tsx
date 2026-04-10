import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Crown, Check, X, CreditCard, Clock, AlertTriangle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';

interface PlanDef {
  id: string;
  name: string;
  subtitle: string;
  price: number;
  planCode: string | null;
  features: { text: string; included: boolean }[];
  popular?: boolean;
  maxCommerces: number;
  maxManagers: number;
  maxProducts: string;
}

const plans: PlanDef[] = [
  {
    id: 'free', name: 'Gratuit', subtitle: 'Pour démarrer simplement', price: 0, planCode: null,
    maxCommerces: 1, maxManagers: 1, maxProducts: '20',
    features: [
      { text: '1 commerce', included: true },
      { text: '1 gérant', included: true },
      { text: '20 produits maximum', included: true },
      { text: 'Reçu avec logo KOBINA PRO', included: true },
      { text: 'Scanner code-barres', included: false },
      { text: 'Messagerie', included: false },
      { text: 'Crédit / moitié', included: false },
      { text: 'Session', included: false },
      { text: 'Support', included: false },
    ],
  },
  {
    id: 'formule1', name: 'Formule 1', subtitle: 'Idéal pour un commerce en croissance', price: 2000, planCode: 'PLN_zqhcjizmrlrjvvf',
    maxCommerces: 1, maxManagers: 2, maxProducts: '50', popular: true,
    features: [
      { text: '1 commerce', included: true },
      { text: '2 gérants', included: true },
      { text: '50 produits', included: true },
      { text: 'Scanner code-barres', included: true },
      { text: 'Messagerie interne', included: true },
      { text: 'Crédit / moitié', included: true },
      { text: 'Impression des reçus', included: true },
      { text: 'Commande en session', included: true },
      { text: 'Tous les rapports', included: true },
      { text: 'Support inclus', included: true },
      { text: 'Accès global de la plateforme', included: true },
    ],
  },
  {
    id: 'formule2', name: 'Formule 2', subtitle: 'Pour gérer plusieurs commerces facilement', price: 5000, planCode: 'PLN_ypdprdmm17yrye2',
    maxCommerces: 3, maxManagers: 8, maxProducts: 'Illimité',
    features: [
      { text: '3 commerces', included: true },
      { text: '8 gérants', included: true },
      { text: 'Produits illimités', included: true },
      { text: 'Toutes les fonctionnalités incluses', included: true },
    ],
  },
  {
    id: 'formule3', name: 'Formule 3', subtitle: 'Pour les réseaux de commerces en expansion', price: 10000, planCode: 'PLN_35obbbevhsy1wwr',
    maxCommerces: 6, maxManagers: 16, maxProducts: 'Illimité',
    features: [
      { text: '6 commerces', included: true },
      { text: '16 gérants', included: true },
      { text: 'Produits illimités', included: true },
      { text: 'Toutes les fonctionnalités incluses', included: true },
    ],
  },
  {
    id: 'formule4', name: 'Formule 4', subtitle: 'Solution complète pour les grandes structures', price: 18000, planCode: 'PLN_jy4wyrg57jbsdwf',
    maxCommerces: 10, maxManagers: 24, maxProducts: 'Illimité',
    features: [
      { text: '10 commerces', included: true },
      { text: '24 gérants', included: true },
      { text: 'Produits illimités', included: true },
      { text: 'Toutes les fonctionnalités incluses', included: true },
    ],
  },
];

type Duration = 1 | 6 | 12;

export default function AbonnementsPage() {
  const { user } = useAuth();
  const sub = useSubscription();
  const [searchParams] = useSearchParams();
  const [currentPlan, setCurrentPlan] = useState('free');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const [expiry, setExpiry] = useState<string | null>(null);
  const [isTrial, setIsTrial] = useState(false);
  const [duration, setDuration] = useState<Duration>(1);
  const [usage, setUsage] = useState({ commerces: 0, gerants: 0, produits: 0, maxC: 1, maxG: 1, maxP: 20 });

  useEffect(() => {
    if (searchParams.get('payment') === 'success') {
      toast.success('Paiement réussi ! Votre abonnement KOBINA PRO est activé.');
    }
  }, [searchParams]);

  useEffect(() => {
    if (sub.loading) return;
    setCurrentPlan(sub.plan);
    setIsTrial(sub.isTrial);
    setExpiry(sub.endDate || sub.trialEndDate);
    setUsage({
      commerces: sub.usage.commerces,
      gerants: sub.usage.gerants,
      produits: sub.usage.produits || 0,
      maxC: sub.limits.max_commerces,
      maxG: sub.limits.max_managers,
      maxP: sub.limits.max_products || 20,
    });
    setLoading(false);
  }, [sub]);

  const getPrice = (basePrice: number) => {
    if (basePrice === 0) return 0;
    const total = basePrice * duration;
    if (duration >= 12) return Math.round(total * 0.80);
    if (duration >= 6) return Math.round(total * 0.90);
    return total;
  };

  const handleSubscribe = async (planId: string) => {
    if (!user || planId === 'free') return;
    const planDef = plans.find(p => p.id === planId);
    if (!planDef) return;

    setPaying(planId);
    try {
      const { data, error } = await supabase.functions.invoke('paystack-init', {
        body: {
          plan: planId,
          plan_code: planDef.planCode,
          payment_type: 'subscription',
          duration_months: duration,
          email: user.email,
          callback_url: `${window.location.origin}/app/abonnements?payment=success`,
        },
      });
      if (error) throw error;
      if (data?.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        toast.error("Impossible d'initialiser le paiement");
      }
    } catch (e: any) {
      toast.error(e?.message || 'Erreur de paiement');
    } finally {
      setPaying(null);
    }
  };

  const daysUntilExpiry = expiry ? Math.max(0, Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000)) : null;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0;
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry > 0;

  if (loading) return (
    <div className="p-4 space-y-4">
      <div className="h-8 bg-muted rounded animate-pulse w-48" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map(i => <div key={i} className="h-64 bg-muted rounded-xl animate-pulse" />)}</div>
    </div>
  );

  const currentPlanDef = plans.find(p => p.id === currentPlan);

  return (
    <div className="p-4 space-y-6 max-w-5xl mx-auto pb-32">
      {/* Expired subscription */}
      {isExpired && !sub.isFreePlan && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-destructive">Abonnement expiré</p>
            <p className="text-xs text-muted-foreground mt-1">Renouvelez pour retrouver l'accès complet à toutes les fonctionnalités.</p>
          </div>
        </motion.div>
      )}

      {/* Expiring soon */}
      {isExpiringSoon && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-warning/10 border border-warning/30 rounded-xl p-4 flex items-start gap-3">
          <Clock size={20} className="text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-warning">Expire dans {daysUntilExpiry} jours</p>
            <p className="text-xs text-muted-foreground mt-1">Renouvelez maintenant pour éviter toute interruption.</p>
          </div>
        </motion.div>
      )}

      {/* Trial banner */}
      {isTrial && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex items-start gap-3">
          <Zap size={20} className="text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-primary">Essai gratuit actif (14 jours)</p>
            <p className="text-xs text-muted-foreground mt-1">
              Vous bénéficiez actuellement de la Formule 1 gratuite pendant 14 jours.
              {daysUntilExpiry !== null && ` Il vous reste ${daysUntilExpiry} jour(s).`}
              {' '}Vous pouvez vous abonner à tout moment.
            </p>
          </div>
        </motion.div>
      )}

      {/* Expired trial banner */}
      {sub.isExpired && sub.isFreePlan && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-destructive">Votre essai gratuit est terminé</p>
            <p className="text-xs text-muted-foreground mt-1">Passez à une formule pour continuer à utiliser toutes les fonctionnalités.</p>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Choisissez la formule adaptée à votre commerce</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Développez votre activité avec KOBINA PRO. Profitez de 14 jours gratuits sur la Formule 1, puis choisissez votre formule.
        </p>
      </div>

      {/* Current plan summary */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Votre abonnement actuel</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          <span className="text-muted-foreground">Formule actuelle</span>
          <span className="font-medium text-foreground">{isTrial ? 'Formule 1 (essai)' : currentPlanDef?.name || 'Gratuit'}</span>
          <span className="text-muted-foreground">Statut</span>
          <span className="font-medium text-foreground">{isTrial ? 'Essai gratuit' : isExpired ? 'Expiré' : sub.isFreePlan ? 'Gratuit' : 'Actif'}</span>
          {expiry && !isExpired && (
            <>
              <span className="text-muted-foreground">Expire le</span>
              <span className="font-medium text-foreground">{new Date(expiry).toLocaleDateString('fr-FR')}</span>
            </>
          )}
        </div>
        {/* Usage bars */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          <div>
            <p className="text-xs text-muted-foreground">Commerces</p>
            <p className="text-sm font-bold text-foreground">{usage.commerces} <span className="text-xs font-normal text-muted-foreground">/ {usage.maxC}</span></p>
            <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(100, (usage.commerces / usage.maxC) * 100)}%` }} />
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Gérants</p>
            <p className="text-sm font-bold text-foreground">{usage.gerants} <span className="text-xs font-normal text-muted-foreground">/ {usage.maxG}</span></p>
            <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(100, (usage.gerants / usage.maxG) * 100)}%` }} />
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Produits</p>
            <p className="text-sm font-bold text-foreground">{usage.produits} <span className="text-xs font-normal text-muted-foreground">/ {usage.maxP === 9999 ? '∞' : usage.maxP}</span></p>
            <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(100, usage.maxP === 9999 ? 10 : (usage.produits / usage.maxP) * 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Duration */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-2">Choisissez la durée</h2>
        <div className="flex items-center gap-2 bg-card rounded-xl p-1.5 border border-border w-fit">
          {([1, 6, 12] as Duration[]).map(d => (
            <button key={d} onClick={() => setDuration(d)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${duration === d ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {d === 1 ? '1 mois' : `${d} mois`}
              {d >= 6 && <span className="ml-1 text-[10px]">({d === 6 ? '-10%' : '-20%'})</span>}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">Plus vous vous engagez longtemps, plus vous économisez.</p>
      </div>

      {/* Plans */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan, i) => {
          const isCurrent = currentPlan === plan.id;
          const price = getPrice(plan.price);
          const isUpgrade = plans.findIndex(p => p.id === currentPlan) < i;

          return (
            <motion.div key={plan.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`relative bg-card rounded-xl p-5 border-2 transition-all ${isCurrent ? 'border-primary shadow-lg' : plan.popular ? 'border-primary/40 shadow-md' : 'border-border'}`}>
              {plan.popular && !isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full">RECOMMANDÉ</span>
              )}
              {isCurrent && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 rounded-full px-2 py-0.5 mb-3">
                  <Crown size={10} /> Plan actuel
                </span>
              )}
              <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{plan.subtitle}</p>
              <div className="mt-2">
                {plan.price === 0 ? (
                  <p className="text-2xl font-bold text-primary">0 F <span className="text-xs font-normal text-muted-foreground">/ mois</span></p>
                ) : (
                  <>
                    <div className="flex items-baseline gap-1">
                      <p className="text-2xl font-bold text-primary">{price.toLocaleString()} F</p>
                      <span className="text-xs text-muted-foreground">/{duration === 1 ? 'mois' : `${duration} mois`}</span>
                    </div>
                    {duration > 1 && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        soit {Math.round(price / duration).toLocaleString()} F/mois
                        {duration >= 6 && <span className="text-primary font-bold ml-1">{duration >= 12 ? '-20%' : '-10%'}</span>}
                      </p>
                    )}
                  </>
                )}
              </div>
              <div className="mt-3 text-[10px] text-muted-foreground space-y-0.5">
                <p>{plan.maxCommerces} commerce{plan.maxCommerces > 1 ? 's' : ''} • {plan.maxManagers} gérant{plan.maxManagers > 1 ? 's' : ''} • {plan.maxProducts} produits</p>
              </div>
              <ul className="mt-3 space-y-1.5">
                {plan.features.map(f => (
                  <li key={f.text} className={`flex items-center gap-2 text-sm ${f.included ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                    {f.included ? <Check size={14} className="text-primary shrink-0" /> : <X size={14} className="text-muted-foreground/50 shrink-0" />}
                    {f.text}
                  </li>
                ))}
              </ul>
              {!isCurrent && plan.id === 'free' && (
                <Button className="w-full mt-4" variant="outline" disabled>
                  Utiliser l'offre gratuite
                </Button>
              )}
              {!isCurrent && plan.id !== 'free' && (
                <Button className="w-full mt-4" variant={isUpgrade ? 'default' : 'outline'} disabled={paying === plan.id}
                  onClick={() => handleSubscribe(plan.id)}>
                  {paying === plan.id ? 'Redirection…' : "S'abonner"}
                </Button>
              )}
              {isCurrent && plan.id !== 'free' && (isExpired || isExpiringSoon) && (
                <Button className="w-full mt-4" onClick={() => handleSubscribe(plan.id)} disabled={paying === plan.id}>
                  {paying === plan.id ? 'Redirection…' : 'Renouveler'}
                </Button>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Payment methods */}
      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <CreditCard size={16} className="text-primary" /> Choisissez votre moyen de paiement
        </h3>
        <div className="flex flex-wrap gap-2">
          {['MTN Mobile Money', 'Orange Money', 'Wave', 'Carte Visa', 'Carte Mastercard'].map(m => (
            <span key={m} className="text-xs bg-muted text-muted-foreground px-2.5 py-1.5 rounded-lg">{m}</span>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-3 flex items-center gap-1">
          🔒 Paiement 100% sécurisé — Vos données sont protégées
        </p>
      </div>
    </div>
  );
}
