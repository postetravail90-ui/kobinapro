import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifySignature(rawBody: string, secret: string, incoming: string | null): Promise<boolean> {
  if (!incoming) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const digest = toHex(new Uint8Array(signature));
  return digest === incoming;
}

interface PaystackBody {
  event?: string;
  data?: {
    reference?: string;
    metadata?: Record<string, string | undefined>;
  };
}

serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!secret || !supabaseUrl || !serviceKey) {
    return new Response("Server misconfigured", { status: 500 });
  }

  const signature = req.headers.get("x-paystack-signature");
  const raw = await req.text();
  if (!(await verifySignature(raw, secret, signature))) {
    return new Response("Invalid signature", { status: 401 });
  }

  let parsed: PaystackBody;
  try {
    parsed = JSON.parse(raw) as PaystackBody;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const reference = parsed.data?.reference;
  if (!reference) return new Response("Missing reference", { status: 400 });

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: existing } = await supabase
    .from("paystack_webhook_events")
    .select("id")
    .eq("reference", reference)
    .maybeSingle();

  if (existing) {
    return Response.json({ ok: true, duplicate: true, reference });
  }

  const { error: insertErr } = await supabase.from("paystack_webhook_events").insert({
    reference,
    event: parsed.event ?? null,
    payload: parsed as unknown as Record<string, unknown>
  });

  if (insertErr) {
    console.error("[paystack-webhook] insert event", insertErr);
    return new Response("Persist failed", { status: 500 });
  }

  if (parsed.event === "charge.success" && parsed.data?.metadata) {
    const meta = parsed.data.metadata;
    const businessId = meta.business_id;
    const planId = meta.plan_id;
    if (businessId && planId) {
      const now = new Date().toISOString();
      const { data: existing } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("business_id", businessId)
        .is("deleted_at", null)
        .maybeSingle();

      if (existing?.id) {
        const { error: upErr } = await supabase
          .from("subscriptions")
          .update({
            plan_id: planId,
            status: "active",
            paystack_ref: reference,
            updated_at: now
          })
          .eq("id", existing.id);
        if (upErr) console.error("[paystack-webhook] subscription update", upErr);
      } else {
        const { error: insErr } = await supabase.from("subscriptions").insert({
          business_id: businessId,
          plan_id: planId,
          status: "active",
          starts_at: now,
          paystack_ref: reference
        });
        if (insErr) console.error("[paystack-webhook] subscription insert", insErr);
      }
    }
  }

  const { error: auditErr } = await supabase.from("audit_logs").insert({
    actor_user_id: null,
    business_id: parsed.data?.metadata?.business_id ?? null,
    action: "paystack_webhook",
    payload: { event: parsed.event ?? null, reference }
  });
  if (auditErr) {
    console.error("[paystack-webhook] audit", auditErr);
  }

  return Response.json({ ok: true, reference });
});
