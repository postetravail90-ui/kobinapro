import { memo } from 'react';
import { motion } from 'framer-motion';
import { Target, Flame } from 'lucide-react';

interface Props {
  current: number;
  goal: number;
  label?: string;
}

function DailyProgressBar({ current, goal, label = 'Objectif du jour' }: Props) {
  const pct = Math.min(100, Math.round((current / goal) * 100));
  const reached = pct >= 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl p-4 border ${
        reached
          ? 'bg-primary/8 border-primary/20'
          : 'bg-card border-border'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {reached ? (
            <Flame size={16} className="text-primary" />
          ) : (
            <Target size={16} className="text-muted-foreground" />
          )}
          <span className="text-xs font-semibold text-foreground">{label}</span>
        </div>
        <span className={`text-xs font-bold ${reached ? 'text-primary' : 'text-muted-foreground'}`}>
          {pct}%
        </span>
      </div>

      <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.3 }}
          className={`absolute inset-y-0 left-0 rounded-full ${
            reached
              ? 'bg-gradient-to-r from-primary to-primary/70'
              : 'bg-primary'
          }`}
        />
      </div>

      <div className="flex items-center justify-between mt-2">
        <span className="text-[11px] text-muted-foreground">
          {current.toLocaleString()} F
        </span>
        <span className="text-[11px] font-medium text-foreground">
          {goal.toLocaleString()} F
        </span>
      </div>

      {reached && (
        <motion.p
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-xs font-semibold text-primary mt-2 text-center"
        >
          🔥 Objectif atteint ! Bravo !
        </motion.p>
      )}
    </motion.div>
  );
}

export default memo(DailyProgressBar);
