create extension if not exists pgcrypto;

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'mod', 'user')),
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.user_roles enable row level security;

drop policy if exists "Allow users to read their own role" on public.user_roles;
create policy "Allow users to read their own role" on public.user_roles
  for select
  using (auth.uid() = user_id);

create or replace function public.current_app_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (
      select ur.role
      from public.user_roles ur
      where ur.user_id = auth.uid()
    ),
    (
      select lower(coalesce(raw_user_meta_data->>'role', ''))
      from auth.users
      where id = auth.uid()
    )
  );
$$;

revoke all on function public.current_app_role() from public;
grant execute on function public.current_app_role() to authenticated, anon;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_app_role() in ('owner', 'admin', 'المالك', 'أدمن');
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
  select public.current_app_role() in ('owner', 'malek', 'المالك');
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
  design_presets jsonb not null default '[]'::jsonb,
  chat_theme text default 'classic'
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
  video_calls_allowed boolean not null default false,
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

-- ============================================================
-- Store Bot: Real Subscription Plans & Orders System
-- ============================================================

-- Add payment_info column to owner_settings
alter table public.owner_settings
  add column if not exists payment_info jsonb not null default '{}'::jsonb;

-- Subscription Plans (owner-defined catalog)
create table if not exists public.subscription_plans (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  name text not null,
  description text not null default '',
  price numeric not null default 0,
  duration_days int not null default 30,
  badge text not null default '💎',
  color text not null default '#10b981',
  features jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  sort_order int not null default 0
);

alter table public.subscription_plans enable row level security;

drop policy if exists "Anyone reads active plans" on public.subscription_plans;
create policy "Anyone reads active plans" on public.subscription_plans
  for select using (is_active = true or public.is_owner());

drop policy if exists "Only owner manages plans" on public.subscription_plans;
create policy "Only owner manages plans" on public.subscription_plans
  for all using (public.is_owner()) with check (public.is_owner());

-- Subscription Orders (user payment requests)
create table if not exists public.subscription_orders (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  user_id text not null,
  user_nickname text not null,
  user_email text,
  plan_id uuid references public.subscription_plans(id),
  plan_name text not null,
  amount numeric not null,
  payment_method text not null,
  payment_ref text,
  payment_phone text,
  status text not null default 'pending',
  owner_note text,
  confirmed_at timestamptz,
  confirmed_by text
);

alter table public.subscription_orders enable row level security;

drop policy if exists "Users read own orders" on public.subscription_orders;
create policy "Users read own orders" on public.subscription_orders
  for select using (user_id = coalesce(auth.uid()::text, '') or public.is_owner());

drop policy if exists "Users create orders" on public.subscription_orders;
create policy "Users create orders" on public.subscription_orders
  for insert with check (user_id is not null and length(user_id) > 0);

drop policy if exists "Owner manages orders" on public.subscription_orders;
create policy "Owner manages orders" on public.subscription_orders
  for update using (public.is_owner()) with check (public.is_owner());

-- Add user_id unique constraint to vip_subscriptions for upsert
alter table public.vip_subscriptions
  drop constraint if exists vip_subscriptions_user_id_key;
alter table public.vip_subscriptions
  add constraint vip_subscriptions_user_id_key unique (user_id);

-- Realtime for new tables
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'subscription_plans') then
    alter publication supabase_realtime add table public.subscription_plans;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'subscription_orders') then
    alter publication supabase_realtime add table public.subscription_orders;
  end if;
end $$;

-- ============================================================
-- Guard Bot: Server-Side Moderation Hardening
-- Blocks banned words and external links at the database level
-- so no client bypass (localStorage clear, private tab, etc.)
-- can circumvent the rules.
-- ============================================================

-- Function: returns FALSE if the message should be blocked.
-- Owner/admin are always exempt.
-- Reads banned_words from owner_settings where id = 'global'.
-- Also blocks obvious external URLs.
create or replace function public.is_message_clean(msg_text text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  bw_array jsonb;
  bword    text;
begin
  -- Admins and owners bypass all moderation
  if public.is_admin() then
    return true;
  end if;

  -- Empty/null text is fine
  if msg_text is null or msg_text = '' then
    return true;
  end if;

  -- Read the banned words list (single global row)
  select banned_words
  into bw_array
  from public.owner_settings
  where id = 'global'
  limit 1;

  -- Check each banned word (case-insensitive)
  if bw_array is not null and jsonb_array_length(bw_array) > 0 then
    for bword in select jsonb_array_elements_text(bw_array)
    loop
      if bword <> '' and msg_text ilike '%' || bword || '%' then
        return false;
      end if;
    end loop;
  end if;

  -- Block obvious external URLs
  if msg_text ~* '(https?://[^\s]+|www\.[a-z0-9\-]+\.[a-z]{2,}[^\s]*)' then
    return false;
  end if;

  return true;
end;
$$;

revoke all on function public.is_message_clean(text) from public;
grant execute on function public.is_message_clean(text) to authenticated, anon;

-- Update the INSERT policy on messages to include server-side moderation.
-- Non-text messages (gifts, system events, youtube) are always allowed.
drop policy if exists "Allow insert for authenticated or with sender_uid" on public.messages;
create policy "Allow insert for authenticated or with sender_uid" on public.messages
  for insert
  with check (
    -- Must have a valid sender identity
    (
      (auth.uid() is not null)
      or (sender_uid is not null and length(sender_uid) > 0)
    )
    and (
      -- Non-text message types skip content check
      (type is distinct from 'text')
      or (text is null)
      or (public.is_message_clean(text))
    )
  );

-- ============================================================
-- WebRTC Call Signaling (dual-server failover)
-- ============================================================
create table if not exists public.call_signals (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  call_id uuid not null,
  from_uid text not null,
  from_nickname text not null,
  to_uid text not null,
  to_nickname text not null,
  call_type text not null check (call_type in ('audio', 'video')),
  signal_type text not null check (signal_type in ('ring', 'offer', 'answer', 'ice', 'accept', 'reject', 'hangup', 'server-switch')),
  payload jsonb not null default '{}'::jsonb
);

alter table public.call_signals enable row level security;

drop policy if exists "Users read own call signals" on public.call_signals;
create policy "Users read own call signals" on public.call_signals
  for select
  using (from_uid = auth.uid()::text or to_uid = auth.uid()::text);

drop policy if exists "Users send call signals" on public.call_signals;
create policy "Users send call signals" on public.call_signals
  for insert
  with check (from_uid = auth.uid()::text);

create index if not exists call_signals_to_uid_idx on public.call_signals (to_uid, created_at desc);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'call_signals'
  ) then
    alter publication supabase_realtime add table public.call_signals;
  end if;
end $$;

-- Split video call permission from audio calls
alter table public.owner_member_permissions
  add column if not exists video_calls_allowed boolean not null default false;

-- Owner-granted cosmetics (VIP / frames without store subscription)
create table if not exists public.owner_member_cosmetics (
  nickname text primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_by text,
  vip_tier text check (vip_tier is null or vip_tier in ('vip', 'platinum')),
  frame text
);

alter table public.owner_member_cosmetics enable row level security;

drop policy if exists "Owner member cosmetics readable by all" on public.owner_member_cosmetics;
create policy "Owner member cosmetics readable by all" on public.owner_member_cosmetics
  for select using (true);

drop policy if exists "Only owner manages member cosmetics" on public.owner_member_cosmetics;
create policy "Only owner manages member cosmetics" on public.owner_member_cosmetics
  for all
  using (public.is_owner())
  with check (public.is_owner());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'owner_member_cosmetics'
  ) then
    alter publication supabase_realtime add table public.owner_member_cosmetics;
  end if;
end $$;

-- Per-member media permissions (images / YouTube)
alter table public.owner_member_permissions
  add column if not exists images_allowed boolean not null default false,
  add column if not exists youtube_allowed boolean not null default false;

-- Room DJ broadcast (owner plays → all users in room hear)
alter table public.owner_settings
  add column if not exists room_dj_map jsonb not null default '{}'::jsonb;

-- Owner-uploaded music library
alter table public.owner_settings
  add column if not exists dj_library jsonb not null default '[]'::jsonb;

-- Bot control toggles (synced from owner panel to all clients)
alter table public.owner_settings
  add column if not exists bot_enabled boolean not null default true,
  add column if not exists bot_rule_anti_links boolean not null default true,
  add column if not exists bot_rule_anti_spam boolean not null default true,
  add column if not exists bot_rule_swear_filter boolean not null default true;
