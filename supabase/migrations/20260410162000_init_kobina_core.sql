create extension if not exists pgcrypto;

create type public.app_role as enum ('owner', 'manager', 'superadmin');
create type public.sale_status as enum ('complete', 'partial', 'credit');
create type public.credit_status as enum ('pending', 'partial', 'paid');
create type public.session_status as enum ('open', 'closed');

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique,
  email text unique,
  name text not null,
  role public.app_role not null default 'owner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price_xof bigint not null default 0,
  max_businesses integer not null default 1,
  max_managers integer not null default 1,
  features jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id),
  name text not null,
  type text not null,
  plan_id uuid references public.plans(id),
  trial_ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.managers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  business_id uuid not null references public.businesses(id) on delete cascade,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, business_id)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  price numeric(14,2) not null check (price >= 0),
  cost_price numeric(14,2) check (cost_price is null or cost_price >= 0),
  barcode text,
  category text,
  unit text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.stock_levels (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  quantity numeric(14,3) not null default 0,
  alert_threshold numeric(14,3) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (product_id, business_id)
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  manager_id uuid references public.managers(id),
  total numeric(14,2) not null default 0,
  paid_amount numeric(14,2) not null default 0,
  credit_amount numeric(14,2) not null default 0,
  payment_method text not null,
  status public.sale_status not null default 'complete',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity numeric(14,3) not null check (quantity > 0),
  unit_price numeric(14,2) not null,
  subtotal numeric(14,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.credits (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_name text not null,
  client_phone text,
  total_amount numeric(14,2) not null default 0,
  paid_amount numeric(14,2) not null default 0,
  status public.credit_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.credit_payments (
  id uuid primary key default gen_random_uuid(),
  credit_id uuid not null references public.credits(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  paid_at timestamptz not null default now(),
  manager_id uuid references public.managers(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  manager_id uuid references public.managers(id),
  amount numeric(14,2) not null check (amount >= 0),
  category text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  manager_id uuid references public.managers(id),
  table_name text,
  status public.session_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.session_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity numeric(14,3) not null check (quantity > 0),
  unit_price numeric(14,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  paystack_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  sender_id uuid not null references public.users(id),
  recipient_id uuid not null references public.users(id),
  content text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references public.users(id),
  business_id uuid references public.businesses(id),
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_businesses_owner_id on public.businesses(owner_id);
create index if not exists idx_managers_user_id on public.managers(user_id);
create index if not exists idx_managers_business_id on public.managers(business_id);
create index if not exists idx_products_business_id_created_at on public.products(business_id, created_at desc);
create index if not exists idx_stock_levels_business_id on public.stock_levels(business_id);
create index if not exists idx_sales_business_id_created_at on public.sales(business_id, created_at desc);
create index if not exists idx_sale_items_sale_id on public.sale_items(sale_id);
create index if not exists idx_credits_business_id_created_at on public.credits(business_id, created_at desc);
create index if not exists idx_expenses_business_id_created_at on public.expenses(business_id, created_at desc);
create index if not exists idx_sessions_business_id_created_at on public.sessions(business_id, created_at desc);
create index if not exists idx_messages_business_id_created_at on public.messages(business_id, created_at desc);
create index if not exists idx_notifications_user_id_created_at on public.notifications(user_id, created_at desc);
create index if not exists idx_subscriptions_business_id on public.subscriptions(business_id);
create index if not exists idx_credit_payments_credit_id on public.credit_payments(credit_id);

create or replace function public.current_is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.users u
    where u.id = auth.uid()
      and u.role = 'superadmin'
      and u.deleted_at is null
  );
$$;

create or replace function public.has_business_access(_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_is_superadmin()
    or exists (
      select 1
      from public.businesses b
      where b.id = _business_id
        and b.owner_id = auth.uid()
        and b.deleted_at is null
    )
    or exists (
      select 1
      from public.managers m
      where m.business_id = _business_id
        and m.user_id = auth.uid()
        and m.deleted_at is null
    );
$$;

alter table public.users enable row level security;
alter table public.plans enable row level security;
alter table public.businesses enable row level security;
alter table public.managers enable row level security;
alter table public.products enable row level security;
alter table public.stock_levels enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.credits enable row level security;
alter table public.credit_payments enable row level security;
alter table public.expenses enable row level security;
alter table public.sessions enable row level security;
alter table public.session_items enable row level security;
alter table public.subscriptions enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

create policy "users_self_or_superadmin" on public.users
for all to authenticated
using (id = auth.uid() or public.current_is_superadmin())
with check (id = auth.uid() or public.current_is_superadmin());

create policy "plans_read_authenticated" on public.plans
for select to authenticated
using (true);

create policy "plans_mutate_superadmin" on public.plans
for all to authenticated
using (public.current_is_superadmin())
with check (public.current_is_superadmin());

create policy "businesses_tenant_access" on public.businesses
for all to authenticated
using (public.has_business_access(id))
with check (
  public.current_is_superadmin()
  or owner_id = auth.uid()
);

create policy "managers_tenant_access" on public.managers
for all to authenticated
using (public.has_business_access(business_id))
with check (public.has_business_access(business_id));

create policy "products_tenant_access" on public.products
for all to authenticated
using (public.has_business_access(business_id))
with check (public.has_business_access(business_id));

create policy "stock_levels_tenant_access" on public.stock_levels
for all to authenticated
using (public.has_business_access(business_id))
with check (public.has_business_access(business_id));

create policy "sales_tenant_access" on public.sales
for all to authenticated
using (public.has_business_access(business_id))
with check (public.has_business_access(business_id));

create policy "sale_items_tenant_access" on public.sale_items
for all to authenticated
using (
  exists (
    select 1 from public.sales s
    where s.id = sale_id and public.has_business_access(s.business_id)
  )
)
with check (
  exists (
    select 1 from public.sales s
    where s.id = sale_id and public.has_business_access(s.business_id)
  )
);

create policy "credits_tenant_access" on public.credits
for all to authenticated
using (public.has_business_access(business_id))
with check (public.has_business_access(business_id));

create policy "credit_payments_tenant_access" on public.credit_payments
for all to authenticated
using (
  exists (
    select 1 from public.credits c
    where c.id = credit_id and public.has_business_access(c.business_id)
  )
)
with check (
  exists (
    select 1 from public.credits c
    where c.id = credit_id and public.has_business_access(c.business_id)
  )
);

create policy "expenses_tenant_access" on public.expenses
for all to authenticated
using (public.has_business_access(business_id))
with check (public.has_business_access(business_id));

create policy "sessions_tenant_access" on public.sessions
for all to authenticated
using (public.has_business_access(business_id))
with check (public.has_business_access(business_id));

create policy "session_items_tenant_access" on public.session_items
for all to authenticated
using (
  exists (
    select 1 from public.sessions s
    where s.id = session_id and public.has_business_access(s.business_id)
  )
)
with check (
  exists (
    select 1 from public.sessions s
    where s.id = session_id and public.has_business_access(s.business_id)
  )
);

create policy "subscriptions_tenant_access" on public.subscriptions
for all to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = business_id and public.has_business_access(b.id)
  )
)
with check (
  exists (
    select 1 from public.businesses b
    where b.id = business_id and public.has_business_access(b.id)
  )
);

create policy "messages_tenant_access" on public.messages
for all to authenticated
using (public.has_business_access(business_id))
with check (public.has_business_access(business_id));

create policy "notifications_self_or_superadmin" on public.notifications
for all to authenticated
using (user_id = auth.uid() or public.current_is_superadmin())
with check (user_id = auth.uid() or public.current_is_superadmin());

create policy "audit_logs_tenant_access" on public.audit_logs
for select to authenticated
using (
  public.current_is_superadmin()
  or (business_id is not null and public.has_business_access(business_id))
  or actor_user_id = auth.uid()
);

