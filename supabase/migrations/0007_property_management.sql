create table public.properties (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  address text not null,
  status text not null default 'occupied' check (status in ('occupied', 'vacant', 'maintenance', 'listed')),
  notes text,
  created_at timestamptz not null default now()
);

create table public.property_tenants (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  tenant_name text,
  phone text,
  email text,
  emergency_contact text,
  lease_start date,
  lease_end date,
  monthly_rent numeric(12, 2),
  security_deposit numeric(12, 2),
  pets text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id)
);

create table public.property_financials (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  mortgage numeric(12, 2) not null default 0,
  insurance numeric(12, 2) not null default 0,
  taxes numeric(12, 2) not null default 0,
  hoa numeric(12, 2) not null default 0,
  utilities numeric(12, 2) not null default 0,
  maintenance numeric(12, 2) not null default 0,
  cleaning numeric(12, 2) not null default 0,
  other_expenses numeric(12, 2) not null default 0,
  rent numeric(12, 2) not null default 0,
  late_fees numeric(12, 2) not null default 0,
  other_income numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id)
);

create table public.property_maintenance_items (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  title text not null,
  due_date date,
  status text not null default 'open' check (status in ('open', 'done', 'archived')),
  notes text,
  created_at timestamptz not null default now()
);

create table public.property_documents (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  document_type text not null,
  title text not null,
  file_url text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.properties enable row level security;
alter table public.property_tenants enable row level security;
alter table public.property_financials enable row level security;
alter table public.property_maintenance_items enable row level security;
alter table public.property_documents enable row level security;

create policy "members can manage properties"
on public.properties for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create policy "members can manage property tenants"
on public.property_tenants for all
using (
  exists (
    select 1
    from public.properties
    where properties.id = property_tenants.property_id
      and public.is_household_member(properties.household_id)
  )
)
with check (
  exists (
    select 1
    from public.properties
    where properties.id = property_tenants.property_id
      and public.is_household_member(properties.household_id)
  )
);

create policy "members can manage property financials"
on public.property_financials for all
using (
  exists (
    select 1
    from public.properties
    where properties.id = property_financials.property_id
      and public.is_household_member(properties.household_id)
  )
)
with check (
  exists (
    select 1
    from public.properties
    where properties.id = property_financials.property_id
      and public.is_household_member(properties.household_id)
  )
);

create policy "members can manage property maintenance"
on public.property_maintenance_items for all
using (
  exists (
    select 1
    from public.properties
    where properties.id = property_maintenance_items.property_id
      and public.is_household_member(properties.household_id)
  )
)
with check (
  exists (
    select 1
    from public.properties
    where properties.id = property_maintenance_items.property_id
      and public.is_household_member(properties.household_id)
  )
);

create policy "members can manage property documents"
on public.property_documents for all
using (
  exists (
    select 1
    from public.properties
    where properties.id = property_documents.property_id
      and public.is_household_member(properties.household_id)
  )
)
with check (
  exists (
    select 1
    from public.properties
    where properties.id = property_documents.property_id
      and public.is_household_member(properties.household_id)
  )
);
