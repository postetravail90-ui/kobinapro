import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  trend?: string;
  delay?: number;
}

export function StatCard({ label, value, icon: Icon, color = 'bg-primary/10 text-primary', trend, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: 'easeOut' }}
      className="bg-card rounded-xl p-4 border border-border card-float"
    >
      <div className="flex items-center justify-between mb-3">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: delay + 0.1, type: 'spring', stiffness: 300 }}
          className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}
        >
          <Icon size={20} />
        </motion.div>
        {trend && <span className="text-xs font-medium text-success">{trend}</span>}
      </div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.15 }}
        className="text-2xl font-bold text-card-foreground"
      >
        {value}
      </motion.p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </motion.div>
  );
}
