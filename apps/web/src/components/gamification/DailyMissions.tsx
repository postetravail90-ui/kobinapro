import { memo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Trophy, Target } from 'lucide-react';

export interface Mission {
  id: string;
  label: string;
  current: number;
  target: number;
  completed: boolean;
  icon?: string;
}

interface Props {
  missions: Mission[];
}

function DailyMissions({ missions }: Props) {
  const completed = missions.filter(m => m.completed).length;
  const total = missions.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="bg-card rounded-2xl border border-border p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-warning" />
          <span className="text-sm font-semibold text-foreground">Missions du jour</span>
        </div>
        <span className="text-xs font-bold text-primary">{completed}/{total}</span>
      </div>

      <div className="space-y-2">
        {missions.map((mission, i) => {
          const pct = Math.min(100, Math.round((mission.current / mission.target) * 100));
          return (
            <motion.div
              key={mission.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className={`rounded-xl p-3 flex items-center gap-3 ${
                mission.completed ? 'bg-primary/6' : 'bg-muted'
              }`}
            >
              {mission.completed ? (
                <CheckCircle2 size={18} className="text-primary shrink-0" />
              ) : (
                <Circle size={18} className="text-muted-foreground shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium ${mission.completed ? 'text-primary line-through' : 'text-foreground'}`}>
                  {mission.label}
                </p>
                {!mission.completed && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                        className="h-full bg-primary rounded-full"
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium">{mission.current}/{mission.target}</span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

export default memo(DailyMissions);
