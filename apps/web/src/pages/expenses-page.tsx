import { useState } from "react";
import { Button, Card, Input, Screen } from "@kobina/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useActiveBusiness } from "../hooks/use-active-business";
import { useExpenses } from "../hooks/use-pos-data";
import { createWithOfflineQueue } from "../lib/offline-mutations";

export function ExpensesPage(): JSX.Element {
  const business = useActiveBusiness();
  const businessId = business.data?.id;
  const expenses = useExpenses(businessId);
  const qc = useQueryClient();

  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error("business manquant");
      await createWithOfflineQueue("expenses", {
        business_id: businessId,
        category: category.trim() || "general",
        amount: Number(amount || 0),
        description: description.trim() || null
      });
    },
    onSuccess: async () => {
      setCategory("");
      setAmount("");
      setDescription("");
      await qc.invalidateQueries({ queryKey: ["expenses", businessId] });
    }
  });

  return (
    <Screen title="Depenses" subtitle={business.data?.name ?? "Business"}>
      <Card>
        <div style={{ display: "grid", gap: 8 }}>
          <Input placeholder="Categorie" value={category} onChange={(e) => setCategory(e.target.value)} />
          <Input placeholder="Montant" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Button loading={mutation.isPending} onClick={() => mutation.mutate()}>
            Ajouter depense
          </Button>
        </div>
      </Card>
      {expenses.isLoading ? <Card>Chargement...</Card> : null}
      {expenses.isError ? <Card>Erreur de chargement.</Card> : null}
      {(expenses.data ?? []).map((e) => (
        <Card key={e.id}>
          {e.category} - {e.amount.toLocaleString()} XOF
        </Card>
      ))}
    </Screen>
  );
}
