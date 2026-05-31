-- Supabase Schema for Lamma Chat

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

-- Allow anonymous read access
create policy "Allow anonymous read access" on public.messages
  for select
  using ( true );

-- Allow anonymous insert access
create policy "Allow anonymous insert access" on public.messages
  for insert
  with check ( true );

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

create policy "Allow anonymous read access on banned_users" on public.banned_users
  for select using ( true );
create policy "Allow anonymous insert access on banned_users" on public.banned_users
  for insert with check ( true );
  
-- Realtime setup
-- Add tables to the publication so clients can listen to changes
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.banned_users;
