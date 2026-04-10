import {
  boolean,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid
} from "drizzle-orm/pg-core";

export const appRole = pgEnum("app_role", ["owner", "manager", "superadmin"]);
export const saleStatus = pgEnum("sale_status", ["complete", "partial", "credit"]);
export const sessionStatus = pgEnum("session_status", ["open", "closed"]);
export const creditStatus = pgEnum("credit_status", ["pending", "partial", "paid"]);

const common = {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true })
};

export const users = pgTable("users", {
  ...common,
  phone: text("phone"),
  email: text("email"),
  name: text("name").notNull(),
  role: appRole("role").notNull()
});

export const businesses = pgTable("businesses", {
  ...common,
  ownerId: uuid("owner_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  planId: uuid("plan_id"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  isActive: boolean("is_active").default(true).notNull()
});

export const products = pgTable("products", {
  ...common,
  businessId: uuid("business_id").notNull(),
  name: text("name").notNull(),
  price: numeric("price", { precision: 14, scale: 2 }).notNull(),
  costPrice: numeric("cost_price", { precision: 14, scale: 2 }),
  barcode: text("barcode"),
  category: text("category"),
  unit: text("unit")
});

export const managers = pgTable("managers", {
  ...common,
  userId: uuid("user_id").notNull(),
  businessId: uuid("business_id").notNull(),
  permissions: jsonb("permissions").notNull()
});
