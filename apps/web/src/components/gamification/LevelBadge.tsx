import { memo } from 'react';
import { motion } from 'framer-motion';
import { Star, Zap, Crown, Award, Flame } from 'lucide-react';

const LEVELS = [
  { min: 0, name: 'Débutant', icon: Star, color: 'text-muted-foreground' },
  { min: 10, name: 'Vendeur', icon: Zap, color: 'text-info' },
  { min: 50, name: 'Pro', icon: Award, color: 'text-primary' },
  { min: 100, name: 'Expert', icon: Flame, color: 'text-warning' },
  { min: 500, name: 'Maître', icon: Crown, color: 'text-primary' },
];

function getLevel(totalSales: number) {
  let level = LEVELS[0];
  for (const l of LEVELS) {
    if (totalSales >= l.min) level = l;
  }
  const nextLevel = LEVELS[LEVELS.indexOf(level) + 1];
  return { ...level, nextLevel };
}

interface Props {
  totalSales: number;
  compact?: boolean;
}

function LevelBadge({ totalSales, compact = false }: Props) {
  const level = getLevel(totalSales);
  const Icon = level.icon;

  if (compact) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted ${level.color}`}
      >
        <Icon size={12} />
        <span className="text-[10px] font-bold">{level.name}</span>
      </motion.div>
    );
  }

  const nextMin = level.nextLevel?.min || level.min;
  const progress = level.nextLevel
    ? Math.min(100, Math.round(((totalSales - level.min) / (nextMin - level.min)) * 100))
    : 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border p-4"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center ${level.color}`}>
          <Icon size={20} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground">{level.name}</p>
          <p className="text-[10px] text-muted-foreground">
            {totalSales} ventes réalisées
          </p>
        </div>
        {level.nextLevel && (
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">Prochain</p>
            <p className="text-xs font-semibold text-foreground">{level.nextLevel.name}</p>
          </div>
        )}
      </div>
      {level.nextLevel && (
        <div className="mt-3">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.4 }}
              className="h-full bg-primary rounded-full"
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Encore {nextMin - totalSales} ventes pour {level.nextLevel.name}
          </p>
        </div>
      )}
    </motion.div>
  );
}

export default memo(LevelBadge);
