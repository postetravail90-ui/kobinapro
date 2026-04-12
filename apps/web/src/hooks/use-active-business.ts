import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "../stores/auth-store";
import { cacheGet, cacheGetStale, cacheSet } from "@/lib/cache";

export interface BusinessRow {
  id: string;
  name: string;
}

export function useActiveBusiness() {
  const user = useAuthStore((s) => s.user);
  const cacheKey = `active_business:${user?.id ?? ""}`;
  return useQuery({
    queryKey: ["active-business", user?.id],
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    initialData: () => (user?.id ? cacheGet<BusinessRow | null>(cacheKey) : null) ?? undefined,
    placeholderData: () => (user?.id ? cacheGetStale<BusinessRow | null>(cacheKey) : null) ?? undefined,
    queryFn: async (): Promise<BusinessRow | null> => {
      const { data, error } = await supabase
        .from("businesses")
        .select("id,name")
        .eq("owner_id", user!.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (user?.id) cacheSet(cacheKey, data, 3600 * 24);
      return data;
    },
  });
}
