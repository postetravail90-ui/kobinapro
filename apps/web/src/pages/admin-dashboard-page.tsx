import { useQuery } from "@tanstack/react-query";
import { Card, Screen } from "@kobina/ui";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cacheGet, cacheGetStale, cacheSet } from "@/lib/cache";

export function AdminDashboardPage(): JSX.Element {
  const cacheKey = "admin_stats_counts";
  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [biz, usr] = await Promise.all([
        supabase.from("businesses").select("id", { count: "exact", head: true }).is("deleted_at", null),
        supabase.from("users").select("id", { count: "exact", head: true }).is("deleted_at", null),
      ]);
      if (biz.error) throw biz.error;
      if (usr.error) throw usr.error;
      const row = { businesses: biz.count ?? 0, users: usr.count ?? 0 };
      cacheSet(cacheKey, row, 3600 * 24);
      return row;
    },
    initialData: () => cacheGet<{ businesses: number; users: number }>(cacheKey) ?? undefined,
    placeholderData: () => cacheGetStale<{ businesses: number; users: number }>(cacheKey) ?? { businesses: 0, users: 0 },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  const hasData = stats.data != null;
  const showSkeleton = stats.isPending && !hasData;

  if (showSkeleton) return <Screen title="Super Admin">Chargement...</Screen>;

  return (
    <Screen title="Super Admin" subtitle="Vue plateforme">
      <p>
        <Link to="/app/sale">Retour app</Link>
      </p>
      <Card>Businesses: {stats.data?.businesses ?? 0}</Card>
      <Card>Utilisateurs: {stats.data?.users ?? 0}</Card>
    </Screen>
  );
}
