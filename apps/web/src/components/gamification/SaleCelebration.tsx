import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface Props {
  show: boolean;
  amount?: number;
  message?: string;
  onDone?: () => void;
}

const CONFETTI = ['🎉', '💰', '🔥', '⭐', '✨', '🎊', '💎', '🏆'];

export default function SaleCelebration({ show, amount, message, onDone }: Props) {
  useEffect(() => {
    if (show) {
      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
      const timer = setTimeout(() => onDone?.(), 2400);
      return () => clearTimeout(timer);
    }
  }, [show, onDone]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/30 backdrop-blur-sm"
          onClick={onDone}
        >
          {/* Confetti particles */}
          {CONFETTI.map((emoji, i) => (
            <motion.span
              key={i}
              initial={{
                opacity: 1,
                x: 0,
                y: 0,
                scale: 0,
              }}
              animate={{
                opacity: [1, 1, 0],
                x: (Math.random() - 0.5) * 300,
                y: (Math.random() - 0.5) * 400 - 100,
                scale: [0, 1.5, 0.5],
                rotate: Math.random() * 360,
              }}
              transition={{
                duration: 1.5,
                delay: i * 0.08,
                ease: 'easeOut',
              }}
              className="absolute text-2xl pointer-events-none"
            >
              {emoji}
            </motion.span>
          ))}

          {/* Central card */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="bg-card rounded-3xl p-6 shadow-2xl text-center max-w-[280px] mx-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"
            >
              <CheckCircle2 size={32} className="text-primary" />
            </motion.div>

            {amount && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-foreground mb-1"
              >
                +{amount.toLocaleString()} F
              </motion.p>
            )}

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-sm text-muted-foreground"
            >
              {message || 'Vente enregistrée avec succès !'}
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-xs text-primary font-semibold mt-3"
            >
              💰 Continuez comme ça !
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
