import { motion } from 'framer-motion';
import { Package, CreditCard, DollarSign, UserPlus, Check } from 'lucide-react';
import { useStore } from '@/store/useStore';

const typeIcons = { stock: Package, credit: CreditCard, sale: DollarSign, manager: UserPlus };
const typeColors = { stock: 'bg-warning/15 text-warning', credit: 'bg-destructive/15 text-destructive', sale: 'bg-success/15 text-success', manager: 'bg-info/15 text-info' };

export default function NotificationsPage() {
  const { notifications, markNotificationRead } = useStore();

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Notifications</h1>

      <div className="space-y-2">
        {notifications.map((n, i) => {
          const Icon = typeIcons[n.type];
          return (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`bg-card card-float rounded-xl p-4 flex items-center gap-3 ${n.read ? 'opacity-60' : ''}`}
            >
              <div className={`w-10 h-10 rounded-lg ${typeColors[n.type]} flex items-center justify-center shrink-0`}>
                <Icon size={18} />
              </div>
              <p className="flex-1 text-sm text-card-foreground">{n.message}</p>
              {!n.read && (
                <button onClick={() => markNotificationRead(n.id)} className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center touch-target">
                  <Check size={14} />
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
