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
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;

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
