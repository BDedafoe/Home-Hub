create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  unique (household_id, user_id)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount numeric(12, 2) not null,
  category text not null,
  merchant text,
  note text,
  transaction_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.recurring_bills (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  amount numeric(12, 2),
  category text,
  due_day integer check (due_day between 1 and 31),
  autopay boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  assigned_to uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  status text not null default 'open' check (status in ('open', 'done', 'archived')),
  due_date date,
  repeat_rule text,
  created_at timestamptz not null default now()
);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  source_url text,
  prep_minutes integer,
  cook_minutes integer,
  servings integer,
  instructions text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  name text not null,
  quantity text,
  sort_order integer not null default 0
);

create table public.meal_plan_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  recipe_id uuid references public.recipes(id) on delete set null,
  meal_date date not null,
  meal_type text not null default 'dinner',
  notes text
);

create table public.grocery_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  added_by uuid references auth.users(id) on delete set null,
  name text not null,
  quantity text,
  category text,
  store text,
  checked boolean not null default false,
  needed_by date,
  created_at timestamptz not null default now()
);

create table public.home_assets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  category text,
  location text,
  purchase_date date,
  warranty_expires date,
  notes text,
  created_at timestamptz not null default now()
);

create table public.maintenance_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  due_date date,
  repeat_rule text,
  status text not null default 'open' check (status in ('open', 'done', 'archived')),
  notes text,
  created_at timestamptz not null default now()
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  body text,
  category text,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.is_household_member(target_household_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.household_members
    where household_id = target_household_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.transactions enable row level security;
alter table public.recurring_bills enable row level security;
alter table public.tasks enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.meal_plan_items enable row level security;
alter table public.grocery_items enable row level security;
alter table public.home_assets enable row level security;
alter table public.maintenance_items enable row level security;
alter table public.notes enable row level security;

create policy "profiles are visible to owner"
on public.profiles for select
using (id = auth.uid());

create policy "profiles can be updated by owner"
on public.profiles for update
using (id = auth.uid());

create policy "members can view households"
on public.households for select
using (public.is_household_member(id));

create policy "creators can view own households"
on public.households for select
using (created_by = auth.uid());

create policy "users can create households"
on public.households for insert
with check (created_by = auth.uid());

create policy "members can view memberships"
on public.household_members for select
using (public.is_household_member(household_id));

create policy "users can join households they create"
on public.household_members for insert
with check (user_id = auth.uid());

create policy "members can manage transactions"
on public.transactions for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create policy "members can manage recurring bills"
on public.recurring_bills for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create policy "members can manage tasks"
on public.tasks for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create policy "members can manage recipes"
on public.recipes for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create policy "members can manage meal plans"
on public.meal_plan_items for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create policy "members can manage groceries"
on public.grocery_items for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create policy "members can manage home assets"
on public.home_assets for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create policy "members can manage maintenance"
on public.maintenance_items for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create policy "members can manage notes"
on public.notes for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create policy "members can view recipe ingredients"
on public.recipe_ingredients for select
using (
  exists (
    select 1
    from public.recipes
    where recipes.id = recipe_ingredients.recipe_id
      and public.is_household_member(recipes.household_id)
  )
);

create policy "members can manage recipe ingredients"
on public.recipe_ingredients for all
using (
  exists (
    select 1
    from public.recipes
    where recipes.id = recipe_ingredients.recipe_id
      and public.is_household_member(recipes.household_id)
  )
)
with check (
  exists (
    select 1
    from public.recipes
    where recipes.id = recipe_ingredients.recipe_id
      and public.is_household_member(recipes.household_id)
  )
);
