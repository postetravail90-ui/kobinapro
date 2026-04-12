import { useEffect, useState, type ReactNode } from "react";

/** Skeleton limité dans le temps : jamais de spinner infini sans contenu. */
export function SmartLoader({
  loading,
  hasData,
  children,
  skeleton,
}: {
  loading: boolean;
  hasData: boolean;
  children: ReactNode;
  /** Si fourni, remplace les barres par défaut (même gabarit que l’écran). */
  skeleton?: ReactNode;
}) {
  const [maxWait, setMaxWait] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setMaxWait(false), 3000);
    return () => clearTimeout(t);
  }, []);

  if (loading && !hasData && maxWait) {
    if (skeleton != null) return <>{skeleton}</>;
    return (
      <div className="p-4 space-y-2" aria-busy="true">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[60px] rounded-lg bg-muted animate-pulse"
          />
        ))}
      </div>
    );
  }
  return <>{children}</>;
}
