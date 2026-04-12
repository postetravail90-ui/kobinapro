import { useState } from "react";
import { Button, Card, Input, Screen } from "@kobina/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useActiveBusiness } from "../hooks/use-active-business";
import { useCredits } from "../hooks/use-pos-data";
import { createWithOfflineQueue } from "../lib/offline-mutations";

export function CreditsPage(): JSX.Element {
  const business = useActiveBusiness();
  const businessId = business.data?.id;
  const credits = useCredits(businessId);
  const qc = useQueryClient();
  const [clientName, setClientName] = useState("");
  const [amount, setAmount] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error("business manquant");
      const total = Number(amount || 0);
      await createWithOfflineQueue("credits", {
        business_id: businessId,
        client_name: clientName.trim(),
        total_amount: total,
        paid_amount: 0,
        status: "pending"
      });
    },
    onSuccess: async () => {
      setClientName("");
      setAmount("");
      await qc.invalidateQueries({ queryKey: ["credits", businessId] });
    }
  });

  return (
    <Screen title="Credits" subtitle={business.data?.name ?? "Business"}>
      <Card>
        <div style={{ display: "grid", gap: 8 }}>
          <Input placeholder="Nom client" value={clientName} onChange={(e) => setClientName(e.target.value)} />
          <Input placeholder="Montant" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Button loading={mutation.isPending} onClick={() => mutation.mutate()}>
            Creer credit
          </Button>
        </div>
      </Card>
      {credits.isPending && !(credits.data?.length) ? <Card>Chargement...</Card> : null}
      {credits.isError && !(credits.data?.length) ? <Card>Aucune donnée disponible pour le moment.</Card> : null}
      {(credits.data ?? []).map((c) => (
        <Card key={c.id}>
          {c.client_name} - {(c.total_amount - c.paid_amount).toLocaleString()} XOF ({c.status})
        </Card>
      ))}
    </Screen>
  );
}
