import { motion, AnimatePresence } from 'framer-motion';
import kobinaLogo from '@/assets/kobina-logo.jpg';

interface SplashScreenProps {
  show: boolean;
}

export default function SplashScreen({ show }: SplashScreenProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100] bg-[hsl(210,20%,8%)] flex flex-col items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            className="flex flex-col items-center gap-6"
          >
            <motion.img
              src={kobinaLogo}
              alt="Kobina"
              className="h-24 w-24 rounded-3xl object-cover"
              animate={{
                boxShadow: [
                  '0 0 0px hsl(145 63% 42% / 0)',
                  '0 0 40px hsl(145 63% 42% / 0.4)',
                  '0 0 0px hsl(145 63% 42% / 0)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-extrabold text-white tracking-wide"
            >
              KOBINA
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 0.6 }}
              className="text-sm text-white/60"
            >
              Gestion multi-commerce
            </motion.p>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.8, duration: 1.2, ease: 'easeInOut' }}
              className="h-1 w-32 rounded-full bg-gradient-to-r from-primary to-secondary origin-left"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
