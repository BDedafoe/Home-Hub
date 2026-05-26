alter table public.profiles
add column if not exists email text;

update public.profiles
set email = auth.users.email
from auth.users
where profiles.id = auth.users.id
  and profiles.email is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  household_id uuid;
  household_name text;
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email)
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(public.profiles.full_name, excluded.full_name);

  household_name := coalesce(
    nullif(new.raw_user_meta_data->>'household_name', ''),
    split_part(new.email, '@', 1) || '''s Home',
    'My Home'
  );

  insert into public.households (name, created_by)
  values (household_name, new.id)
  returning id into household_id;

  insert into public.household_members (household_id, user_id, role)
  values (household_id, new.id, 'owner')
  on conflict (household_id, user_id) do nothing;

  return new;
end;
$$;

create or replace function public.is_household_owner(target_household_id uuid)
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
      and role = 'owner'
  );
$$;

create or replace function public.get_household_members(target_household_id uuid)
returns table (
  user_id uuid,
  email text,
  full_name text,
  role text,
  joined_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    household_members.user_id,
    coalesce(profiles.email, auth.users.email) as email,
    profiles.full_name,
    household_members.role,
    household_members.created_at as joined_at
  from public.household_members
  left join public.profiles on profiles.id = household_members.user_id
  left join auth.users on auth.users.id = household_members.user_id
  where household_members.household_id = target_household_id
    and public.is_household_member(target_household_id)
  order by
    case household_members.role when 'owner' then 0 else 1 end,
    household_members.created_at asc;
$$;

create or replace function public.rename_household(target_household_id uuid, new_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_household_owner(target_household_id) then
    raise exception 'Only household owners can rename the household';
  end if;

  if nullif(trim(new_name), '') is null then
    raise exception 'Household name is required';
  end if;

  update public.households
  set name = trim(new_name)
  where id = target_household_id;
end;
$$;

create or replace function public.add_household_member_by_email(target_household_id uuid, member_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
begin
  if not public.is_household_owner(target_household_id) then
    raise exception 'Only household owners can add members';
  end if;

  select id into target_user_id
  from auth.users
  where lower(email) = lower(trim(member_email))
  limit 1;

  if target_user_id is null then
    raise exception 'No signed-up user found with that email';
  end if;

  insert into public.household_members (household_id, user_id, role)
  values (target_household_id, target_user_id, 'member')
  on conflict (household_id, user_id) do nothing;
end;
$$;

create or replace function public.remove_household_member(target_household_id uuid, member_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_household_owner(target_household_id) then
    raise exception 'Only household owners can remove members';
  end if;

  if member_user_id = auth.uid() then
    raise exception 'Owners cannot remove themselves';
  end if;

  delete from public.household_members
  where household_id = target_household_id
    and user_id = member_user_id
    and role <> 'owner';
end;
$$;

grant execute on function public.get_household_members(uuid) to authenticated;
grant execute on function public.rename_household(uuid, text) to authenticated;
grant execute on function public.add_household_member_by_email(uuid, text) to authenticated;
grant execute on function public.remove_household_member(uuid, uuid) to authenticated;
