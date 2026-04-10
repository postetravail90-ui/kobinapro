import { useState } from "react";
import { Button, Card, Input, Screen } from "@kobina/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useActiveBusiness } from "../hooks/use-active-business";
import { useProducts } from "../hooks/use-pos-data";
import { createWithOfflineQueue } from "../lib/offline-mutations";

export function ProductsPage(): JSX.Element {
  const business = useActiveBusiness();
  const businessId = business.data?.id;
  const products = useProducts(businessId);
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!businessId) throw new Error("business manquant");
      await createWithOfflineQueue("products", {
        business_id: businessId,
        name: name.trim(),
        price: Number(price || 0)
      });
    },
    onSuccess: async () => {
      setName("");
      setPrice("");
      await qc.invalidateQueries({ queryKey: ["products", businessId] });
    }
  });

  return (
    <Screen title="Produits" subtitle={business.data?.name ?? "Business"}>
      <Card>
        <div style={{ display: "grid", gap: 8 }}>
          <Input placeholder="Nom produit" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Prix XOF" value={price} onChange={(e) => setPrice(e.target.value)} />
          <Button loading={createMutation.isPending} onClick={() => createMutation.mutate()}>
            Ajouter produit
          </Button>
        </div>
      </Card>
      {products.isLoading ? <Card>Chargement...</Card> : null}
      {products.isError ? <Card>Erreur de chargement.</Card> : null}
      {(products.data ?? []).map((p) => (
        <Card key={p.id}>
          {p.name} - {p.price.toLocaleString()} XOF
        </Card>
      ))}
    </Screen>
  );
}
