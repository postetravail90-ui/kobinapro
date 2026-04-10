export interface SaleItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface ComputedSale {
  total: number;
  paidAmount: number;
  creditAmount: number;
  status: "complete" | "partial" | "credit";
}

export function computeSaleTotals(items: SaleItemInput[], paidAmount: number): ComputedSale {
  const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const safePaid = Math.max(0, paidAmount);
  const creditAmount = Math.max(0, total - safePaid);

  let status: ComputedSale["status"] = "complete";
  if (safePaid <= 0) status = "credit";
  else if (safePaid < total) status = "partial";

  return {
    total,
    paidAmount: Math.min(safePaid, total),
    creditAmount,
    status
  };
}
