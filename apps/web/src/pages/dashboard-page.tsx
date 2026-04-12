import { Card, Screen } from "@kobina/ui";
import { useActiveBusiness } from "../hooks/use-active-business";
import { useCredits, useExpenses, useProducts, useSalesTotalToday } from "../hooks/use-pos-data";

export function DashboardPage(): JSX.Element {
  const business = useActiveBusiness();
  const businessId = business.data?.id;

  const products = useProducts(businessId);
  const credits = useCredits(businessId);
  const expenses = useExpenses(businessId);
  const salesToday = useSalesTotalToday(businessId);

  if (business.isLoading) return <Screen title="Dashboard">Chargement du business...</Screen>;
  if (!businessId) return <Screen title="Dashboard">Aucun business actif.</Screen>;

  return (
    <Screen title="Dashboard" subtitle={business.data?.name}>
      <Card>Ventes du jour: {salesToday.data?.toLocaleString() ?? 0} XOF</Card>
      <Card>Produits: {products.data?.length ?? 0}</Card>
      <Card>Credits en cours: {(credits.data ?? []).filter((c) => c.status !== "paid").length}</Card>
      <Card>Depenses: {(expenses.data ?? []).reduce((s, x) => s + x.amount, 0).toLocaleString()} XOF</Card>
    </Screen>
  );
}
