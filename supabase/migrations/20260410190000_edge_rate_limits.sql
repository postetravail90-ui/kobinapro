-- Compteur par minute / utilisateur / bucket (Edge Functions avec service_role)

create table if not exists public.edge_rate_counters (
  user_id uuid not null references auth.users (id) on delete cascade,
  bucket text not null,
  minute_ts timestamptz not null,
  count integer not null default 0,
  primary key (user_id, bucket, minute_ts)
);

create index if not exists idx_edge_rate_counters_minute on public.edge_rate_counters (minute_ts);

alter table public.edge_rate_counters enable row level security;

create or replace function public.consume_edge_rate_limit(
  p_user_id uuid,
  p_bucket text,
  p_max_per_minute integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  m timestamptz := date_trunc('minute', timezone('utc', now()));
  new_count integer;
begin
  insert into public.edge_rate_counters (user_id, bucket, minute_ts, count)
  values (p_user_id, p_bucket, m, 1)
  on conflict (user_id, bucket, minute_ts)
  do update set count = edge_rate_counters.count + 1
  returning count into new_count;

  return new_count <= p_max_per_minute;
end;
$$;

comment on function public.consume_edge_rate_limit(uuid, text, integer) is
  'Reserve pour Edge Functions (service_role): retourne false si depassement du plafond sur la minute UTC courante.';

revoke all on function public.consume_edge_rate_limit(uuid, text, integer) from public;
grant execute on function public.consume_edge_rate_limit(uuid, text, integer) to service_role;
