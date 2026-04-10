import { Bell, Check, CheckCheck, AlertTriangle, ShoppingBag, CreditCard, Users, Shield, MessageSquare } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { motion } from 'framer-motion';
import { useNotifications } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

const typeIcon: Record<string, any> = {
  sale: ShoppingBag,
  stock_alert: AlertTriangle,
  credit: CreditCard,
  expense: ShoppingBag,
  manager: Users,
  security: Shield,
  subscription: CreditCard,
  message: MessageSquare,
  system: Bell,
};

const typeColor: Record<string, string> = {
  sale: 'bg-success/10 text-success',
  stock_alert: 'bg-warning/10 text-warning',
  credit: 'bg-destructive/10 text-destructive',
  expense: 'bg-orange-500/10 text-orange-500',
  manager: 'bg-info/10 text-info',
  security: 'bg-destructive/10 text-destructive',
  subscription: 'bg-primary/10 text-primary',
  message: 'bg-info/10 text-info',
  system: 'bg-muted text-muted-foreground',
};

export default function NotificationsPage() {
  const { notifications, loading, unreadCount, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();

  const handleClick = (n: any) => {
    if (!n.read) markRead(n.id);
    if (n.route) navigate(n.route);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "À l'instant";
    if (mins < 60) return `Il y a ${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="p-4 max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-5 w-28" />
        </div>
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 text-sm font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </h1>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-sm text-primary font-medium flex items-center gap-1"
          >
            <CheckCheck size={14} />
            Tout marquer lu
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Aucune notification"
          description="Vous serez notifié pour les ventes, alertes stock, crédits et activités de vos gérants"
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((n, i) => {
            const Icon = typeIcon[n.type] || Bell;
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => handleClick(n)}
                className={`bg-card rounded-xl p-4 border flex items-start gap-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                  n.read ? 'border-border opacity-70' : 'border-primary/30 bg-primary/[0.02]'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${typeColor[n.type] || typeColor.system}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{formatDate(n.created_at)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!n.read && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                  {!n.read && (
                    <button
                      onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                      className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center"
                    >
                      <Check size={14} />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
