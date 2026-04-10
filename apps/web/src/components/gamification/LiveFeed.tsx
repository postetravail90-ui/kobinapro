import { memo } from 'react';
import { DollarSign, TrendingUp, AlertTriangle, Package, Flame, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface FeedEvent {
  id: string;
  type: 'sale' | 'trend' | 'alert' | 'stock' | 'milestone' | 'tip';
  message: string;
  timestamp: Date;
  amount?: number;
}

const iconMap = {
  sale: DollarSign,
  trend: TrendingUp,
  alert: AlertTriangle,
  stock: Package,
  milestone: Flame,
  tip: Zap,
};

const colorMap = {
  sale: 'bg-primary/10 text-primary',
  trend: 'bg-info/10 text-info',
  alert: 'bg-warning/10 text-warning',
  stock: 'bg-destructive/10 text-destructive',
  milestone: 'bg-primary/10 text-primary',
  tip: 'bg-accent text-accent-foreground',
};

interface Props {
  events: FeedEvent[];
  maxVisible?: number;
}

function LiveFeed({ events, maxVisible = 5 }: Props) {
  const visible = events.slice(0, maxVisible);

  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <span className="text-xs font-semibold text-foreground">Activité en direct</span>
      </div>
      <div className="space-y-1.5">
        {visible.map((event) => {
          const Icon = iconMap[event.type];
          return (
            <div
              key={event.id}
              className="bg-card rounded-xl p-3 flex items-center gap-3 border border-border"
            >
              <div className={`w-8 h-8 rounded-lg ${colorMap[event.type]} flex items-center justify-center shrink-0`}>
                <Icon size={14} />
              </div>
              <p className="text-xs text-foreground flex-1 leading-snug">{event.message}</p>
              {event.amount && (
                <span className="text-xs font-bold text-primary whitespace-nowrap">
                  +{event.amount.toLocaleString()} F
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(LiveFeed);
