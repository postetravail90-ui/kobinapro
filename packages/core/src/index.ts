export type AppRole = "owner" | "manager" | "superadmin";

export type PaymentMethod = "cash" | "mobile_money" | "card" | "bank";

export interface Money {
  amount: number;
  currency: "XOF";
}

export interface DomainAuditEvent {
  id: string;
  actorUserId: string;
  businessId: string | null;
  action:
    | "login"
    | "plan_change"
    | "manager_created"
    | "data_deleted";
  createdAt: string;
  meta: Record<string, unknown>;
}

export * from "./sales";
export * from "./plans";
