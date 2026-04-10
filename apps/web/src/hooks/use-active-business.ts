import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/auth-store";

export interface BusinessRow {
  id: string;
  name: string;
}

export function useActiveBusiness() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ["active-business", user?.id],
    enabled: !!user?.id,
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
      return data;
    }
  });
}
