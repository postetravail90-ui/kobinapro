import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/app');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card rounded-2xl border border-border p-8 max-w-md w-full text-center shadow-lg"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle2 size={40} className="text-primary" />
        </motion.div>

        <h1 className="text-2xl font-bold text-foreground mb-2">Paiement réussi !</h1>
        <p className="text-muted-foreground text-sm mb-2">
          Votre abonnement KOBINA PRO est activé.
        </p>
        <p className="text-muted-foreground text-sm mb-6">
          Toutes les fonctionnalités sont maintenant disponibles.
        </p>

        <p className="text-xs text-muted-foreground">
          Redirection automatique dans {countdown} seconde{countdown > 1 ? 's' : ''}…
        </p>

        <button
          onClick={() => navigate('/app')}
          className="mt-4 bg-primary text-primary-foreground rounded-xl px-6 py-3 text-sm font-medium w-full hover:opacity-90 transition-opacity"
        >
          Retour au tableau de bord
        </button>
      </motion.div>
    </div>
  );
}
