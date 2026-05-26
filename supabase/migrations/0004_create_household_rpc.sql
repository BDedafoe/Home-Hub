create or replace function public.create_household_for_current_user(household_name text default null)
returns table (id uuid, name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  new_household_id uuid;
  new_household_name text;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  new_household_name := coalesce(nullif(household_name, ''), 'My Home');

  insert into public.households (name, created_by)
  values (new_household_name, current_user_id)
  returning households.id into new_household_id;

  insert into public.household_members (household_id, user_id, role)
  values (new_household_id, current_user_id, 'owner')
  on conflict (household_id, user_id) do nothing;

  return query
  select households.id, households.name
  from public.households
  where households.id = new_household_id;
end;
$$;

grant execute on function public.create_household_for_current_user(text) to authenticated;
