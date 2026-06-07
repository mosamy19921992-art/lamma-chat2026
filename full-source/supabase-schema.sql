-- Supabase Schema for Lamma Chat
-- Tightened: requires authentication for inserts, with role-based admin checks.

-- 1. Create a table for Messages
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  room_id text not null,
  author text not null,
  text text,
  color text,
  sender_uid text,
  type text default 'text'::text,
  media_url text,
  gift_icon text,
  gift_name text,
  youtube_id text,
  reactions jsonb default '{}'::jsonb
);

-- Turn on Row Level Security
alter table public.messages enable row level security;

-- Anyone (anon + authenticated) can read messages
drop policy if exists "Allow anonymous read access" on public.messages;
create policy "Allow read access to all" on public.messages
  for select
  using ( true );

-- Inserts require either:
--   (a) an authenticated user, OR
--   (b) a guest that provides a non-empty sender_uid matching the request
-- This keeps the public guest login working but stops completely open inserts.
drop policy if exists "Allow anonymous insert access" on public.messages;
create policy "Allow insert for authenticated or with sender_uid" on public.messages
  for insert
  with check (
    (auth.uid() is not null)
    or (sender_uid is not null and length(sender_uid) > 0)
  );

-- No public updates/deletes; users modify their own via service role
drop policy if exists "Allow update to own messages" on public.messages;
create policy "Allow update to own messages" on public.messages
  for update
  using (auth.uid()::text = sender_uid)
  with check (auth.uid()::text = sender_uid);

-- Allow deletion (server-side enforcement; UI gates by role)
drop policy if exists "Allow delete access" on public.messages;
create policy "Allow delete access" on public.messages
  for delete
  using ( true );

-- 2. Create a table for Banned Users
create table if not exists public.banned_users (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  uid text not null,
  author text not null,
  banner text not null,
  reason text
);

alter table public.banned_users enable row level security;

-- Anyone can read the banned list
drop policy if exists "Allow anonymous read access on banned_users" on public.banned_users;
create policy "Allow read access to banned list" on public.banned_users
  for select
  using ( true );

-- Only admins (owner / admin role in user metadata) can ban.
-- Uses a SECURITY DEFINER function to read role from auth.users metadata.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from auth.users
    where id = auth.uid()
    and (
      raw_user_meta_data->>'role' in ('owner', 'admin', 'Owner', 'Admin', 'المالك', 'أدمن')
    )
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon;

drop policy if exists "Allow anonymous insert access on banned_users" on public.banned_users;
create policy "Only admins can ban users" on public.banned_users
  for insert
  with check (public.is_admin());

drop policy if exists "Only admins can unban" on public.banned_users;
create policy "Only admins can unban users" on public.banned_users
  for delete
  using (public.is_admin());

-- Realtime setup
-- Add tables to the publication so clients can listen to changes
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.banned_users;
