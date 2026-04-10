import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

interface SyncOperation {
  id: string;
  table: string;
  operation: "INSERT" | "UPDATE" | "DELETE";
  payload: Record<string, unknown>;
  created_at: number;
  retries: number;
  status: "pending" | "syncing" | "error";
}

const MAX_PER_MINUTE = 100;

serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return new Response("Server misconfigured", { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const jwt = authHeader.slice("Bearer ".length).trim();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser(jwt);

  if (authError || !user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: allowed, error: rateError } = await supabase.rpc("consume_edge_rate_limit", {
    p_user_id: user.id,
    p_bucket: "sync-batch",
    p_max_per_minute: MAX_PER_MINUTE
  });

  if (rateError) {
    console.error("[sync-batch] rate limit", rateError);
    return Response.json({ error: "Rate limit check failed" }, { status: 500 });
  }

  if (allowed !== true) {
    return Response.json(
      { error: "Too many requests", limit: MAX_PER_MINUTE, window: "1 minute" },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null) as {
    operations?: SyncOperation[];
    conflictPolicy?: Record<string, string>;
  } | null;
  const operations = body?.operations ?? [];

  if (operations.length === 0 || operations.length > 50) {
    return Response.json({ error: "operations must be 1..50" }, { status: 400 });
  }

  void body?.conflictPolicy;

  return Response.json({ ok: true, processed: operations.length, user_id: user.id });
});
