import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "../stores/auth-store";
import { cacheGet, cacheGetStale, cacheSet } from "@/lib/cache";

export type AppRole = "owner" | "manager" | "superadmin";

export function useAppRole() {
  const user = useAuthStore((s) => s.user);
  const cacheKey = `legacy_app_role:${user?.id ?? ""}`;
  return useQuery({
    queryKey: ["app-role", user?.id],
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    initialData: () => (user?.id ? cacheGet<AppRole | null>(cacheKey) : null) ?? undefined,
    placeholderData: () => (user?.id ? cacheGetStale<AppRole | null>(cacheKey) : null) ?? undefined,
    queryFn: async (): Promise<AppRole | null> => {
      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", user!.id)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      const role = (data?.role as AppRole | undefined) ?? null;
      if (user?.id) cacheSet(cacheKey, role, 3600 * 24);
      return role;
    },
  });
}
