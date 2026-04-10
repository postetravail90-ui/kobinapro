-- Idempotence webhooks Paystack + audit systeme (webhook sans acteur humain)

create table if not exists public.paystack_webhook_events (
  id uuid primary key default gen_random_uuid(),
  reference text not null,
  event text,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (reference)
);

create index if not exists idx_paystack_webhook_events_created_at on public.paystack_webhook_events (created_at desc);

alter table public.paystack_webhook_events enable row level security;
-- Aucune policy pour le role authenticated : acces via service_role (Edge Functions) uniquement.

alter table public.audit_logs alter column actor_user_id drop not null;
