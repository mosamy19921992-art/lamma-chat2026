create extension if not exists pgcrypto;

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
        raw_user_meta_data->>'role' in (
          'owner',
          'admin',
          'Owner',
          'Admin',
          'المالك',
          'أدمن'
        )
      )
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon;

create or replace function public.is_owner()
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
        raw_user_meta_data->>'role' in (
          'owner',
          'Owner',
          'malek',
          'المالك'
        )
      )
  );
$$;

revoke all on function public.is_owner() from public;
grant execute on function public.is_owner() to authenticated, anon;

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

alter table public.messages enable row level security;

drop policy if exists "Allow anonymous read access" on public.messages;
drop policy if exists "Allow read access to all" on public.messages;
create policy "Allow read access to all" on public.messages
  for select
  using (true);

drop policy if exists "Allow anonymous insert access" on public.messages;
drop policy if exists "Allow insert for authenticated or with sender_uid" on public.messages;
create policy "Allow insert for authenticated or with sender_uid" on public.messages
  for insert
  with check (
    (auth.uid() is not null)
    or (sender_uid is not null and length(sender_uid) > 0)
  );

drop policy if exists "Allow update to own messages" on public.messages;
create policy "Allow update to own messages" on public.messages
  for update
  using (auth.uid()::text = sender_uid)
  with check (auth.uid()::text = sender_uid);

drop policy if exists "Allow delete access" on public.messages;
create policy "Allow delete access" on public.messages
  for delete
  using (
    public.is_admin()
    or auth.uid()::text = sender_uid
  );

create table if not exists public.banned_users (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  uid text not null,
  author text not null,
  banner text not null,
  reason text
);

alter table public.banned_users enable row level security;

drop policy if exists "Allow anonymous read access on banned_users" on public.banned_users;
drop policy if exists "Allow read access to banned list" on public.banned_users;
create policy "Allow read access to banned list" on public.banned_users
  for select
  using (true);

drop policy if exists "Allow anonymous insert access on banned_users" on public.banned_users;
drop policy if exists "Only admins can ban users" on public.banned_users;
create policy "Only admins can ban users" on public.banned_users
  for insert
  with check (public.is_admin());

drop policy if exists "Only admins can unban" on public.banned_users;
drop policy if exists "Only admins can unban users" on public.banned_users;
create policy "Only admins can unban users" on public.banned_users
  for delete
  using (public.is_admin());

create table if not exists public.vip_subscriptions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id text not null,
  plan text not null default 'vip',
  is_active boolean not null default true,
  expires_at timestamp with time zone not null,
  badge text,
  avatar text,
  granted_by text
);

alter table public.vip_subscriptions enable row level security;

drop policy if exists "Users read own subscriptions" on public.vip_subscriptions;
create policy "Users read own subscriptions" on public.vip_subscriptions
  for select
  using (user_id = auth.uid()::text or public.is_admin());

drop policy if exists "Admins manage subscriptions" on public.vip_subscriptions;
create policy "Admins manage subscriptions" on public.vip_subscriptions
  for all
  using (public.is_admin())
  with check (public.is_admin());

create table if not exists public.pm_messages (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  sender_uid text not null,
  sender_nickname text not null,
  receiver_uid text not null,
  receiver_nickname text not null,
  text text,
  type text not null default 'text',
  media_url text,
  is_read boolean not null default false
);

alter table public.pm_messages enable row level security;

drop policy if exists "Users read own pm messages" on public.pm_messages;
create policy "Users read own pm messages" on public.pm_messages
  for select
  using (
    sender_uid = auth.uid()::text
    or receiver_uid = auth.uid()::text
  );

drop policy if exists "Users insert own pm messages" on public.pm_messages;
create policy "Users insert own pm messages" on public.pm_messages
  for insert
  with check (sender_uid = auth.uid()::text);

drop policy if exists "Users delete own pm messages" on public.pm_messages;
create policy "Users delete own pm messages" on public.pm_messages
  for delete
  using (
    sender_uid = auth.uid()::text
    or receiver_uid = auth.uid()::text
  );

drop policy if exists "Admins read all pm messages" on public.pm_messages;
create policy "Admins read all pm messages" on public.pm_messages
  for select
  using (public.is_admin());

create table if not exists public.owner_settings (
  id text primary key default 'global',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  ghost_mode boolean not null default false,
  spy_mode boolean not null default false,
  maintenance_mode boolean not null default false,
  global_mute boolean not null default false,
  global_mic_mute boolean not null default false,
  vip_only_images boolean not null default false,
  bot_silent boolean not null default false,
  ads_enabled boolean not null default true,
  greetings_enabled boolean not null default true,
  banned_words jsonb not null default '[]'::jsonb,
  owner_bg_image text,
  custom_logo_url text,
  glow_color text default '#e4e4e7',
  wall_theme text default 'fire',
  room_bg_map jsonb not null default '{}'::jsonb,
  design_presets jsonb not null default '[]'::jsonb
);

alter table public.owner_settings enable row level security;

drop policy if exists "Owner settings readable by all" on public.owner_settings;
create policy "Owner settings readable by all" on public.owner_settings
  for select
  using (true);

drop policy if exists "Only owner manages owner settings" on public.owner_settings;
create policy "Only owner manages owner settings" on public.owner_settings
  for all
  using (public.is_owner())
  with check (public.is_owner());

insert into public.owner_settings (id)
values ('global')
on conflict (id) do nothing;

create table if not exists public.owner_member_permissions (
  nickname text primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_by text,
  recording_allowed boolean not null default false,
  calls_allowed boolean not null default false,
  music_radio_allowed boolean not null default false,
  room_creation_allowed boolean not null default false
);

alter table public.owner_member_permissions enable row level security;

drop policy if exists "Owner member permissions readable by all" on public.owner_member_permissions;
create policy "Owner member permissions readable by all" on public.owner_member_permissions
  for select
  using (true);

drop policy if exists "Only owner manages member permissions" on public.owner_member_permissions;
create policy "Only owner manages member permissions" on public.owner_member_permissions
  for all
  using (public.is_owner())
  with check (public.is_owner());

create table if not exists public.owner_activity_logs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  time text not null,
  type text not null,
  user_nickname text not null,
  operator_nickname text not null,
  details text not null
);

alter table public.owner_activity_logs enable row level security;

drop policy if exists "Admins read owner activity logs" on public.owner_activity_logs;
create policy "Admins read owner activity logs" on public.owner_activity_logs
  for select
  using (public.is_admin());

drop policy if exists "Admins insert owner activity logs" on public.owner_activity_logs;
create policy "Admins insert owner activity logs" on public.owner_activity_logs
  for insert
  with check (public.is_admin());

create table if not exists public.nickname_change_requests (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id text not null,
  user_email text,
  current_nickname text not null,
  requested_nickname text not null,
  status text not null default 'pending',
  owner_note text,
  processed_at timestamp with time zone,
  processed_by text
);

alter table public.nickname_change_requests enable row level security;

drop policy if exists "Users read own nickname requests" on public.nickname_change_requests;
create policy "Users read own nickname requests" on public.nickname_change_requests
  for select
  using (
    user_id = auth.uid()::text
    or public.is_owner()
  );

drop policy if exists "Users create own nickname requests" on public.nickname_change_requests;
create policy "Users create own nickname requests" on public.nickname_change_requests
  for insert
  with check (
    user_id = auth.uid()::text
    and status = 'pending'
  );

drop policy if exists "Only owner updates nickname requests" on public.nickname_change_requests;
create policy "Only owner updates nickname requests" on public.nickname_change_requests
  for update
  using (public.is_owner())
  with check (public.is_owner());

drop policy if exists "Only owner deletes nickname requests" on public.nickname_change_requests;
create policy "Only owner deletes nickname requests" on public.nickname_change_requests
  for delete
  using (public.is_owner());

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'banned_users'
  ) then
    alter publication supabase_realtime add table public.banned_users;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'vip_subscriptions'
  ) then
    alter publication supabase_realtime add table public.vip_subscriptions;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'pm_messages'
  ) then
    alter publication supabase_realtime add table public.pm_messages;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'owner_settings'
  ) then
    alter publication supabase_realtime add table public.owner_settings;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'owner_member_permissions'
  ) then
    alter publication supabase_realtime add table public.owner_member_permissions;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'owner_activity_logs'
  ) then
    alter publication supabase_realtime add table public.owner_activity_logs;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'nickname_change_requests'
  ) then
    alter publication supabase_realtime add table public.nickname_change_requests;
  end if;
end $$;

insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', true)
on conflict (id) do nothing;

drop policy if exists "Public read chat-media" on storage.objects;
create policy "Public read chat-media"
on storage.objects
for select
using (bucket_id = 'chat-media');

drop policy if exists "Auth upload chat-media" on storage.objects;
create policy "Auth upload chat-media"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'chat-media');
