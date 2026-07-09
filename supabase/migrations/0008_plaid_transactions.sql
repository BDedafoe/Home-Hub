alter table public.transactions
add column if not exists source text not null default 'manual' check (source in ('manual', 'plaid')),
add column if not exists plaid_transaction_id text unique,
add column if not exists plaid_account_id text,
add column if not exists plaid_item_id text,
add column if not exists pending boolean not null default false,
add column if not exists category_source text not null default 'manual' check (category_source in ('manual', 'plaid', 'homehub')),
add column if not exists raw_plaid_transaction jsonb;

create table public.plaid_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null unique,
  access_token text not null,
  institution_name text,
  transactions_cursor text,
  status text not null default 'active' check (status in ('active', 'error', 'disconnected')),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.plaid_accounts (
  id uuid primary key default gen_random_uuid(),
  plaid_item_id uuid not null references public.plaid_items(id) on delete cascade,
  plaid_account_id text not null unique,
  name text not null,
  official_name text,
  mask text,
  type text,
  subtype text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.plaid_items enable row level security;
alter table public.plaid_accounts enable row level security;

create policy "members can view plaid accounts"
on public.plaid_accounts for select
using (
  exists (
    select 1
    from public.plaid_items
    where plaid_items.id = plaid_accounts.plaid_item_id
      and public.is_household_member(plaid_items.household_id)
  )
);
