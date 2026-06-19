-- Lamma Chat — Identity hardening (guest optional + anti-spoof)
-- Run after supabase-production-hardening.sql and supabase-social-network.sql
-- Requires: Supabase Auth → Anonymous sign-ins ENABLED

-- ── Guest sessions (nickname bound server-side to auth.uid) ───────────────
create table if not exists public.guest_sessions (
  auth_uid text primary key,
  nickname text not null check (char_length(trim(nickname)) between 1 and 48),
  color text not null default '#10b981',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.guest_sessions enable row level security;

drop policy if exists "Guest reads own session row" on public.guest_sessions;
create policy "Guest reads own session row" on public.guest_sessions
  for select
  to authenticated
  using (auth_uid = auth.uid()::text);

drop policy if exists "Guest upserts own session row" on public.guest_sessions;
create policy "Guest upserts own session row" on public.guest_sessions
  for insert
  to authenticated
  with check (auth_uid = auth.uid()::text);

drop policy if exists "Guest updates own session row" on public.guest_sessions;
create policy "Guest updates own session row" on public.guest_sessions
  for update
  to authenticated
  using (auth_uid = auth.uid()::text)
  with check (auth_uid = auth.uid()::text);

-- ── Resolve display nickname from server tables ───────────────────────────
create or replace function public.resolve_bound_nickname(p_uid text)
returns text
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  bound text;
begin
  select nickname into bound
  from public.user_profiles
  where user_uid = p_uid
  limit 1;

  if bound is not null and trim(bound) <> '' then
    return trim(bound);
  end if;

  select nickname into bound
  from public.guest_sessions
  where auth_uid = p_uid
  limit 1;

  if bound is not null and trim(bound) <> '' then
    return trim(bound);
  end if;

  return coalesce(
    nullif(trim((auth.jwt()->'user_metadata'->>'nickname')), ''),
    nullif(trim((auth.jwt()->'user_metadata'->>'name')), ''),
    'Guest'
  );
end;
$$;

revoke all on function public.resolve_bound_nickname(text) from public;
grant execute on function public.resolve_bound_nickname(text) to authenticated;

-- ── Room messages: bind sender_uid + author on INSERT ───────────────────
create or replace function public.bind_message_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  new.sender_uid := auth.uid()::text;
  new.author := public.resolve_bound_nickname(new.sender_uid);

  return new;
end;
$$;

drop trigger if exists messages_bind_identity on public.messages;
create trigger messages_bind_identity
  before insert on public.messages
  for each row
  execute function public.bind_message_identity();

drop policy if exists "Allow insert for authenticated or with sender_uid" on public.messages;
drop policy if exists "Authenticated users insert own messages" on public.messages;
create policy "Authenticated users insert own messages" on public.messages
  for insert
  to authenticated
  with check (
    sender_uid = auth.uid()::text
    and (text is null or public.is_message_clean(text))
    and (media_url is null or public.is_message_clean(media_url))
  );

-- ── PM: bind sender identity ──────────────────────────────────────────────
create or replace function public.bind_pm_message_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  new.sender_uid := auth.uid()::text;
  new.sender_nickname := public.resolve_bound_nickname(new.sender_uid);

  return new;
end;
$$;

drop trigger if exists pm_messages_bind_identity on public.pm_messages;
create trigger pm_messages_bind_identity
  before insert on public.pm_messages
  for each row
  execute function public.bind_pm_message_identity();

-- ── Social posts + comments: bind author identity ───────────────────────
create or replace function public.bind_social_post_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  new.author_uid := auth.uid()::text;
  new.author_nickname := public.resolve_bound_nickname(new.author_uid);

  return new;
end;
$$;

drop trigger if exists social_posts_bind_identity on public.social_posts;
create trigger social_posts_bind_identity
  before insert on public.social_posts
  for each row
  execute function public.bind_social_post_identity();

create or replace function public.bind_post_comment_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  new.author_uid := auth.uid()::text;
  new.author_nickname := public.resolve_bound_nickname(new.author_uid);

  return new;
end;
$$;

drop trigger if exists post_comments_bind_identity on public.post_comments;
create trigger post_comments_bind_identity
  before insert on public.post_comments
  for each row
  execute function public.bind_post_comment_identity();

-- ── Storage: uploads only inside auth.uid() folder ───────────────────────
drop policy if exists "Auth upload chat-media" on storage.objects;
drop policy if exists "Auth upload own folder chat-media" on storage.objects;
create policy "Auth upload own folder chat-media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'chat-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users delete own chat-media" on storage.objects;
create policy "Users delete own chat-media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'chat-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);
