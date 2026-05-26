alter table public.tasks
add column if not exists due_time time,
add column if not exists reminder_minutes integer not null default 30 check (reminder_minutes between 0 and 40320),
add column if not exists google_calendar_event_id text,
add column if not exists google_calendar_html_link text,
add column if not exists google_calendar_synced_at timestamptz;

create table if not exists public.google_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  google_email text,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz not null,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_connections enable row level security;

drop policy if exists "users can manage own google connection" on public.google_connections;

create policy "users can manage own google connection"
on public.google_connections for all
using (user_id = auth.uid())
with check (user_id = auth.uid());
