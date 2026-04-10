import { useState } from "react";
import { Button, Card, Input, Screen } from "@kobina/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { computeSaleTotals } from "@kobina/core";
import { useActiveBusiness } from "../hooks/use-active-business";
import { createWithOfflineQueue } from "../lib/offline-mutations";

export function SalesPage(): JSX.Element {
  const business = useActiveBusiness();
  const businessId = business.data?.id;
  const qc = useQueryClient();

  const [qty, setQty] = useState("1");
  const [unitPrice, setUnitPrice] = useState("0");
  const [paidAmount, setPaidAmount] = useState("0");

  const totals = computeSaleTotals(
    [{ productId: "manual", quantity: Number(qty || 0), unitPrice: Number(unitPrice || 0) }],
    Number(paidAmount || 0)
  );

  const saleMutation = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error("business manquant");
      await createWithOfflineQueue("sales", {
        business_id: businessId,
        total: totals.total,
        paid_amount: totals.paidAmount,
        credit_amount: totals.creditAmount,
        payment_method: "cash",
        status: totals.status
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["sales-total-today", businessId] });
    }
  });

  return (
    <Screen title="Vente" subtitle={business.data?.name ?? "Business"}>
      <Card>
        <div style={{ display: "grid", gap: 8 }}>
          <Input placeholder="Quantite" value={qty} onChange={(e) => setQty(e.target.value)} />
          <Input placeholder="Prix unitaire" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
          <Input placeholder="Montant paye" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
          <p style={{ margin: 0 }}>
            Total {totals.total.toLocaleString()} / Credit {totals.creditAmount.toLocaleString()} ({totals.status})
          </p>
          <Button loading={saleMutation.isPending} onClick={() => saleMutation.mutate()}>
            Encaisser
          </Button>
        </div>
      </Card>
    </Screen>
  );
}
