import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/auth-store";

export type AppRole = "owner" | "manager" | "superadmin";

export function useAppRole() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ["app-role", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<AppRole | null> => {
      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", user!.id)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      return (data?.role as AppRole | undefined) ?? null;
    }
  });
}
