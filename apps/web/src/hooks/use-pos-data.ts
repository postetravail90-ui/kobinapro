import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cacheGet, cacheGetStale, cacheSet } from "@/lib/cache";

export interface ProductRow {
  id: string;
  name: string;
  price: number;
  stock?: number;
}

export interface CreditRow {
  id: string;
  client_name: string;
  total_amount: number;
  paid_amount: number;
  status: "pending" | "partial" | "paid";
}

export interface ExpenseRow {
  id: string;
  category: string;
  amount: number;
  description: string | null;
}

export function useProducts(businessId: string | undefined) {
  const cacheKey = `pos_products:${businessId}`;
  return useQuery({
    queryKey: ["products", businessId],
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000,
    gcTime: 1000 * 60 * 30,
    initialData: () => (businessId ? cacheGet<ProductRow[]>(cacheKey) : null) ?? undefined,
    placeholderData: () => (businessId ? cacheGetStale<ProductRow[]>(cacheKey) : null) ?? [],
    queryFn: async (): Promise<ProductRow[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,price")
        .eq("business_id", businessId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []).map((row) => ({ ...row, price: Number(row.price) }));
      cacheSet(cacheKey, rows, 3600 * 24);
      return rows;
    },
  });
}

export function useCredits(businessId: string | undefined) {
  const cacheKey = `pos_credits:${businessId}`;
  return useQuery({
    queryKey: ["credits", businessId],
    enabled: !!businessId,
    gcTime: 1000 * 60 * 30,
    initialData: () => (businessId ? cacheGet<CreditRow[]>(cacheKey) : null) ?? undefined,
    placeholderData: () => (businessId ? cacheGetStale<CreditRow[]>(cacheKey) : null) ?? [],
    queryFn: async (): Promise<CreditRow[]> => {
      const { data, error } = await supabase
        .from("credits")
        .select("id,client_name,total_amount,paid_amount,status")
        .eq("business_id", businessId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []).map((row) => ({
        ...row,
        total_amount: Number(row.total_amount),
        paid_amount: Number(row.paid_amount),
      }));
      cacheSet(cacheKey, rows, 3600 * 24);
      return rows;
    },
  });
}

export function useExpenses(businessId: string | undefined) {
  const cacheKey = `pos_expenses:${businessId}`;
  return useQuery({
    queryKey: ["expenses", businessId],
    enabled: !!businessId,
    gcTime: 1000 * 60 * 30,
    initialData: () => (businessId ? cacheGet<ExpenseRow[]>(cacheKey) : null) ?? undefined,
    placeholderData: () => (businessId ? cacheGetStale<ExpenseRow[]>(cacheKey) : null) ?? [],
    queryFn: async (): Promise<ExpenseRow[]> => {
      const { data, error } = await supabase
        .from("expenses")
        .select("id,category,amount,description")
        .eq("business_id", businessId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []).map((row) => ({ ...row, amount: Number(row.amount) }));
      cacheSet(cacheKey, rows, 3600 * 24);
      return rows;
    },
  });
}

export function useSalesTotalToday(businessId: string | undefined) {
  const cacheKey = `pos_sales_today:${businessId}`;
  return useQuery({
    queryKey: ["sales-total-today", businessId],
    enabled: !!businessId,
    staleTime: 30 * 1000,
    gcTime: 1000 * 60 * 30,
    initialData: () => (businessId ? cacheGet<number>(cacheKey) : null) ?? undefined,
    placeholderData: () => (businessId ? cacheGetStale<number>(cacheKey) : null) ?? 0,
    queryFn: async (): Promise<number> => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("sales")
        .select("total")
        .eq("business_id", businessId!)
        .gte("created_at", start.toISOString())
        .is("deleted_at", null);
      if (error) throw error;
      const total = (data ?? []).reduce((sum, row) => sum + Number(row.total), 0);
      cacheSet(cacheKey, total, 3600);
      return total;
    },
  });
}
