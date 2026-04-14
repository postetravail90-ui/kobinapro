import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, Package, ShoppingCart, Check, ChevronRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Step {
  id: string;
  title: string;
  description: string;
  icon: typeof Store;
  route: string;
  checkComplete: () => Promise<boolean>;
}

const ONBOARDING_DISMISSED_KEY = 'onboarding_dismissed';

function onboardingAllDoneKey(userId: string) {
  return `onboarding_all_done_${userId}`;
}

export default function OnboardingWizard() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [currentStep, setCurrentStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const steps: Step[] = useMemo(() => {
    const uid = user?.id;
    if (!uid) return [];

    return [
      {
        id: 'commerce',
        title: 'Créer votre commerce',
        description: 'Optionnel — utile pour plusieurs points de vente',
        icon: Store,
        route: '/app/commerces',
        checkComplete: async () => {
          const { count } = await supabase
            .from('commerces')
            .select('id', { count: 'exact', head: true })
            .eq('proprietaire_id', uid);
          return (count || 0) > 0;
        },
      },
      {
        id: 'product',
        title: 'Ajouter un produit',
        description: 'Ajoutez votre premier produit au catalogue',
        icon: Package,
        route: '/app/produits/nouveau',
        checkComplete: async () => {
          const { data: commerces } = await supabase
            .from('commerces')
            .select('id')
            .eq('proprietaire_id', uid);
          const commerceIds = commerces?.map((c) => c.id) || [];
          if (commerceIds.length === 0) return false;
          const { count } = await supabase
            .from('produits')
            .select('id', { count: 'exact', head: true })
            .in('commerce_id', commerceIds);
          return (count || 0) > 0;
        },
      },
      {
        id: 'sale',
        title: 'Faire une vente',
        description: 'Réalisez votre première vente via la caisse',
        icon: ShoppingCart,
        route: '/app/caisse',
        checkComplete: async () => {
          const { data: commerces } = await supabase
            .from('commerces')
            .select('id')
            .eq('proprietaire_id', uid);
          const commerceIds = commerces?.map((c) => c.id) || [];
          if (commerceIds.length === 0) return false;

          const { data: sessions } = await supabase
            .from('sessions')
            .select('id')
            .in('commerce_id', commerceIds);
          const sessionIds = sessions?.map((s) => s.id) || [];
          if (sessionIds.length === 0) return false;

          const { count } = await supabase
            .from('factures')
            .select('id', { count: 'exact', head: true })
            .in('session_id', sessionIds);
          return (count || 0) > 0;
        },
      },
    ];
  }, [user?.id]);

  useEffect(() => {
    if (!user || role !== 'proprietaire' || steps.length === 0) return;

    if (localStorage.getItem(ONBOARDING_DISMISSED_KEY) === 'true') {
      setDismissed(true);
      return;
    }
    if (localStorage.getItem(onboardingAllDoneKey(user.id))) return;

    const checkAll = async () => {
      const results = await Promise.all(steps.map((s) => s.checkComplete()));
      const completed = new Set<string>();
      results.forEach((done, i) => {
        if (done) completed.add(steps[i].id);
      });
      setCompletedSteps(completed);

      const coreDone = completed.has('product') && completed.has('sale');
      const allThree = completed.size === steps.length;
      if (coreDone || allThree) {
        localStorage.setItem(onboardingAllDoneKey(user.id), '1');
        setVisible(false);
        return;
      }

      setVisible(true);
      const firstIncomplete = steps.findIndex((s) => !completed.has(s.id));
      setCurrentStep(firstIncomplete >= 0 ? firstIncomplete : 0);
    };

    void checkAll();
  }, [user, role, steps]);

  const handleDismiss = () => {
    setDismissed(true);
    setVisible(false);
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, 'true');
  };

  const handleGoToStep = (index: number) => {
    navigate(steps[index].route);
    setVisible(false);
  };

  const progress = steps.length > 0 ? (completedSteps.size / steps.length) * 100 : 0;

  if (!visible || dismissed || steps.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="mx-4 mb-4 bg-card rounded-2xl border border-border shadow-lg overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 pb-3 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-foreground text-sm">Bienvenue sur Kobina Pro 🎉</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {completedSteps.size}/{steps.length} étapes complétées
            </p>
          </div>
          <button type="button" onClick={handleDismiss} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-4 pb-3">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="px-4 pb-4 space-y-2">
          {steps.map((step, i) => {
            const isCompleted = completedSteps.has(step.id);
            const isCurrent = i === currentStep && !isCompleted;
            return (
              <button
                type="button"
                key={step.id}
                onClick={() => handleGoToStep(i)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                  isCompleted
                    ? 'bg-primary/5 opacity-60'
                    : isCurrent
                      ? 'bg-primary/10 border border-primary/20'
                      : 'bg-muted/50 hover:bg-muted'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isCompleted ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isCompleted ? <Check size={18} /> : <step.icon size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}
                  >
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{step.description}</p>
                </div>
                {!isCompleted && <ChevronRight size={16} className="text-muted-foreground shrink-0" />}
              </button>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
