import { useQuery } from "@tanstack/react-query";
import { Card, Screen } from "@kobina/ui";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

export function AdminDashboardPage(): JSX.Element {
  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [biz, usr] = await Promise.all([
        supabase.from("businesses").select("id", { count: "exact", head: true }).is("deleted_at", null),
        supabase.from("users").select("id", { count: "exact", head: true }).is("deleted_at", null)
      ]);
      if (biz.error) throw biz.error;
      if (usr.error) throw usr.error;
      return { businesses: biz.count ?? 0, users: usr.count ?? 0 };
    }
  });

  if (stats.isLoading) return <Screen title="Super Admin">Chargement...</Screen>;
  if (stats.isError) return <Screen title="Super Admin">Erreur chargement statistiques.</Screen>;

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
