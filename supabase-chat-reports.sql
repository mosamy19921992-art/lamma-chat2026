-- Member message reports (complaints) — open to authenticated users, staff read/update.
create table if not exists public.chat_reports (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  reporter_uid text not null,
  reporter_nickname text not null,
  reported_nickname text not null,
  room_id text not null,
  room_name text,
  message_id text,
  message_excerpt text not null default '',
  reason text,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolved_by text,
  resolved_at timestamp with time zone
);

create index if not exists chat_reports_status_created_idx
  on public.chat_reports (status, created_at desc);

alter table public.chat_reports enable row level security;

drop policy if exists "Users submit chat reports" on public.chat_reports;
create policy "Users submit chat reports" on public.chat_reports
  for insert
  to authenticated
  with check (
    reporter_uid = auth.uid()::text
    and status = 'open'
  );

drop policy if exists "Users read own chat reports" on public.chat_reports;
create policy "Users read own chat reports" on public.chat_reports
  for select
  to authenticated
  using (reporter_uid = auth.uid()::text);

drop policy if exists "Admins read chat reports" on public.chat_reports;
create policy "Admins read chat reports" on public.chat_reports
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins update chat reports" on public.chat_reports;
create policy "Admins update chat reports" on public.chat_reports
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'chat_reports'
  ) then
    alter publication supabase_realtime add table public.chat_reports;
  end if;
end $$;
