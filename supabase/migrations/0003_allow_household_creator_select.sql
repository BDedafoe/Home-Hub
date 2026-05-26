create policy "creators can view own households"
on public.households for select
using (created_by = auth.uid());
