import { cn } from '@/lib/utils';

function Shimmer({ className }: { className?: string }) {
  return <div className={cn("rounded-lg skeleton-shimmer", className)} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-card rounded-xl p-4 space-y-3 border border-border animate-fade-in">
      <Shimmer className="h-4 w-24" />
      <Shimmer className="h-8 w-32" />
      <Shimmer className="h-3 w-16" />
    </div>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-card rounded-xl p-4 flex items-center gap-3 border border-border"
          style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}
        >
          <Shimmer className="h-10 w-10 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <Shimmer className="h-4 w-3/4" />
            <Shimmer className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
