-- Lamma Chat — Social Network (Phase 1 polish + Phase 2)
-- Run after supabase-schema.sql on production Supabase.

-- ── PM: allow offline delivery + read receipts ─────────────────────────────
alter table public.pm_messages
  alter column receiver_uid drop not null;

drop policy if exists "Receivers mark pm as read" on public.pm_messages;
create policy "Receivers mark pm as read" on public.pm_messages
  for update
  using (receiver_uid = auth.uid()::text)
  with check (receiver_uid = auth.uid()::text);

-- ── User profiles (server-side bio + avatar lookup) ────────────────────────
create table if not exists public.user_profiles (
  user_uid text primary key,
  nickname text not null,
  bio text not null default '',
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create unique index if not exists user_profiles_nickname_key
  on public.user_profiles (lower(nickname));

alter table public.user_profiles enable row level security;

drop policy if exists "Profiles are readable by authenticated users" on public.user_profiles;
create policy "Profiles are readable by authenticated users" on public.user_profiles
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "Users upsert own profile" on public.user_profiles;
create policy "Users upsert own profile" on public.user_profiles
  for insert
  with check (user_uid = auth.uid()::text);

drop policy if exists "Users update own profile" on public.user_profiles;
create policy "Users update own profile" on public.user_profiles
  for update
  using (user_uid = auth.uid()::text)
  with check (user_uid = auth.uid()::text);

-- ── Social posts (feed + profile timeline) ─────────────────────────────────
create table if not exists public.social_posts (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  author_uid text not null,
  author_nickname text not null,
  text text not null default '',
  type text not null default 'text',
  media_url text,
  color text
);

create index if not exists social_posts_author_uid_idx
  on public.social_posts (author_uid, created_at desc);

create index if not exists social_posts_created_at_idx
  on public.social_posts (created_at desc);

alter table public.social_posts enable row level security;

drop policy if exists "Social posts readable by authenticated" on public.social_posts;
create policy "Social posts readable by authenticated" on public.social_posts
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "Users publish own social posts" on public.social_posts;
create policy "Users publish own social posts" on public.social_posts
  for insert
  with check (author_uid = auth.uid()::text);

drop policy if exists "Authors delete own social posts" on public.social_posts;
create policy "Authors delete own social posts" on public.social_posts
  for delete
  using (author_uid = auth.uid()::text);

-- ── Likes ───────────────────────────────────────────────────────────────────
create table if not exists public.post_likes (
  post_id uuid not null references public.social_posts(id) on delete cascade,
  user_uid text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (post_id, user_uid)
);

alter table public.post_likes enable row level security;

drop policy if exists "Likes readable by authenticated" on public.post_likes;
create policy "Likes readable by authenticated" on public.post_likes
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "Users like posts" on public.post_likes;
create policy "Users like posts" on public.post_likes
  for insert
  with check (user_uid = auth.uid()::text);

drop policy if exists "Users unlike posts" on public.post_likes;
create policy "Users unlike posts" on public.post_likes
  for delete
  using (user_uid = auth.uid()::text);

-- ── Comments ─────────────────────────────────────────────────────────────────
create table if not exists public.post_comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid not null references public.social_posts(id) on delete cascade,
  author_uid text not null,
  author_nickname text not null,
  text text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists post_comments_post_id_idx
  on public.post_comments (post_id, created_at asc);

alter table public.post_comments enable row level security;

drop policy if exists "Comments readable by authenticated" on public.post_comments;
create policy "Comments readable by authenticated" on public.post_comments
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "Users comment on posts" on public.post_comments;
create policy "Users comment on posts" on public.post_comments
  for insert
  with check (author_uid = auth.uid()::text);

drop policy if exists "Authors delete own comments" on public.post_comments;
create policy "Authors delete own comments" on public.post_comments
  for delete
  using (author_uid = auth.uid()::text);

-- ── Realtime ─────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'social_posts'
  ) then
    alter publication supabase_realtime add table public.social_posts;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'post_likes'
  ) then
    alter publication supabase_realtime add table public.post_likes;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'post_comments'
  ) then
    alter publication supabase_realtime add table public.post_comments;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'user_profiles'
  ) then
    alter publication supabase_realtime add table public.user_profiles;
  end if;
end $$;
