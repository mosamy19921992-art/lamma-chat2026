-- Lamma Chat — Participation hardening (run after launch-hardening)
-- Server-side enforcement for bans, invite-only mode, and call permissions.

-- ── Ban check ─────────────────────────────────────────────────────────────
create or replace function public.is_user_banned(p_uid text, p_nickname text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.banned_users bu
    where bu.uid = p_uid
       or lower(trim(bu.author)) = lower(trim(coalesce(p_nickname, '')))
  );
$$;

revoke all on function public.is_user_banned(text, text) from public;
grant execute on function public.is_user_banned(text, text) to authenticated;

-- ── Invite-only: block anonymous sessions when enabled ────────────────────
create or replace function public.participation_allowed()
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  invite_only boolean := false;
  is_anonymous boolean := false;
begin
  if auth.uid() is null then
    return false;
  end if;

  if public.is_admin() then
    return true;
  end if;

  select coalesce(os.invite_only_mode, false)
  into invite_only
  from public.owner_settings os
  where os.id = 'global'
  limit 1;

  if not invite_only then
    return true;
  end if;

  is_anonymous := coalesce(
    (auth.jwt()->>'is_anonymous')::boolean,
    false
  );

  -- Registered (non-anonymous) users may participate when invite-only is on.
  return not is_anonymous;
end;
$$;

revoke all on function public.participation_allowed() from public;
grant execute on function public.participation_allowed() to authenticated;

-- ── Call permissions from owner_member_permissions ────────────────────────
create or replace function public.can_place_call(p_call_type text)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  bound_nickname text;
  perm record;
begin
  if auth.uid() is null then
    return false;
  end if;

  if public.is_admin() then
    return true;
  end if;

  bound_nickname := public.resolve_bound_nickname(auth.uid()::text);

  select
    coalesce(calls_allowed, false) as calls_allowed,
    coalesce(video_calls_allowed, false) as video_calls_allowed
  into perm
  from public.owner_member_permissions
  where lower(trim(nickname)) = lower(trim(bound_nickname))
  limit 1;

  if not found then
    return false;
  end if;

  if lower(coalesce(p_call_type, 'audio')) = 'video' then
    return perm.video_calls_allowed;
  end if;

  return perm.calls_allowed;
end;
$$;

revoke all on function public.can_place_call(text) from public;
grant execute on function public.can_place_call(text) to authenticated;

-- ── Room messages: ban + invite checks ────────────────────────────────────
drop policy if exists "Authenticated users insert own messages" on public.messages;
create policy "Authenticated users insert own messages" on public.messages
  for insert
  to authenticated
  with check (
    sender_uid = auth.uid()::text
    and public.participation_allowed()
    and not public.is_user_banned(
      auth.uid()::text,
      public.resolve_bound_nickname(auth.uid()::text)
    )
    and (text is null or public.is_message_clean(text))
    and (media_url is null or public.is_message_clean(media_url))
  );

-- ── PM: ban + invite checks ───────────────────────────────────────────────
drop policy if exists "Users send PM messages" on public.pm_messages;
drop policy if exists "Authenticated users insert PM" on public.pm_messages;
drop policy if exists "Users insert own pm messages" on public.pm_messages;
create policy "Authenticated users insert PM" on public.pm_messages
  for insert
  to authenticated
  with check (
    sender_uid = auth.uid()::text
    and public.participation_allowed()
    and not public.is_user_banned(
      auth.uid()::text,
      public.resolve_bound_nickname(auth.uid()::text)
    )
  );

-- ── Call signals: permission + ban checks ─────────────────────────────────
drop policy if exists "Users send call signals" on public.call_signals;
create policy "Users send call signals" on public.call_signals
  for insert
  to authenticated
  with check (
    from_uid = auth.uid()::text
    and public.can_place_call(call_type)
    and not public.is_user_banned(
      auth.uid()::text,
      public.resolve_bound_nickname(auth.uid()::text)
    )
  );

-- ── Purge stale call signals (>24h) — run via pg_cron or manual ───────────
create or replace function public.purge_stale_call_signals(max_age interval default interval '24 hours')
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count bigint;
begin
  delete from public.call_signals
  where created_at < timezone('utc'::text, now()) - max_age;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.purge_stale_call_signals(interval) from public;
grant execute on function public.purge_stale_call_signals(interval) to service_role;
